import { localDb, cacheLocalItems, getLocalItems, bulkDeleteLocalItems, setSyncMetadata, getSyncMetadata, scrubForeignTenantIndexedDBData, INDEXEDDB_ENABLED } from './db.js';
import { isOnline, setSyncingState } from './networkStatus.js';
import { supabase } from '../supabase.js';
import { state } from '../state.js';
import { syncLogger } from '../utils/syncLogger.js';

function isValidUUID(val) {
    if (!val || typeof val !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}


let _isProcessingQueue = false;
let _isReconciling = false;
let _syncInterval = null;
let _lastReconciliationTime = 0;
let _lastVisibilitySyncTime = 0;
let _consecutiveSyncFailures = 0;

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // Periodic check every 5 minutes (Realtime handles instant updates)
const CLOCK_SKEW_BUFFER_MS = 30 * 1000; // 30s safety overlap for timestamps
const MIN_RECONCILE_GAP_MS = 3000; // Throttle reconciliation calls to at most once per 3s
const MIN_VISIBILITY_RECONCILE_GAP_MS = 3 * 60 * 1000; // 3m throttle for visibility and window focus triggers

/**
 * Entities supported by incremental sync with verified column mappings
 */
const SYNCABLE_ENTITIES = [
    { table: 'sales', timestampCol: 'created_at', requiresBranchOrOwner: true },
    { table: 'expenses', timestampCol: 'created_at', requiresBranchOrOwner: true },
    { table: 'inventory', timestampCol: 'updated_at', requiresBranchOrOwner: true }, // Scoped catalog sync with delta updates
    { table: 'central_inventory', timestampCol: 'updated_at', ownerOnly: true },
    { table: 'tasks', timestampCol: 'created_at', requiresBranchOrOwner: true },
    { table: 'requests', timestampCol: 'created_at', requiresBranchOrOwner: true },
    { table: 'branches', timestampCol: 'created_at', ownerOnly: true },
    { table: 'customers', timestampCol: 'created_at', requiresBranchOrOwner: true },
    { table: 'staff', timestampCol: 'created_at', ownerOnly: true },
    { table: 'stock_movements', timestampCol: 'created_at', ownerOnly: true },
    { table: 'capital_accounts', timestampCol: 'created_at', ownerOnly: true },
    { table: 'business_assets', timestampCol: 'created_at', ownerOnly: true },
    { table: 'loans', timestampCol: 'created_at', requiresBranchOrOwner: true },
    { table: 'quotations', timestampCol: 'created_at', requiresBranchOrOwner: true },
    { table: 'suppliers', timestampCol: 'created_at', ownerOnly: true },
    { table: 'purchase_orders', timestampCol: 'created_at', requiresBranchOrOwner: true },
    { table: 'shifts', timestampCol: 'created_at', requiresBranchOrOwner: true },
    { table: 'cash_drawer', timestampCol: 'created_at', requiresBranchOrOwner: true },
    { table: 'attendance', timestampCol: 'created_at', requiresBranchOrOwner: true },
    { table: 'payroll', timestampCol: 'created_at', ownerOnly: true },
    { table: 'stock_transfers', timestampCol: 'created_at', requiresBranchOrOwner: true },
    { table: 'product_returns', timestampCol: 'created_at', requiresBranchOrOwner: true },
    { table: 'categories', timestampCol: 'created_at', ownerOnly: true },
    { table: 'business_loans', timestampCol: 'created_at', ownerOnly: true },
    { table: 'goals', timestampCol: 'created_at', ownerOnly: true },
    { table: 'promotions', timestampCol: 'created_at', ownerOnly: true },
    { table: 'announcements', timestampCol: 'created_at', requiresBranchOrOwner: true }
];

export const syncManager = {
    /**
     * Initialize background sync triggers and lifecycle listeners
     */
    init() {
        if (!INDEXEDDB_ENABLED) {
            syncLogger.log('sync', 'SyncManager running in Pure Supabase mode (IndexedDB disabled).');
            return;
        }
        syncLogger.log('sync', 'SyncManager initialized with resilient incremental engine.');

        // Immediate simultaneous bidirectional sync on app startup (no waiting, zero delay)
        const runStartupSync = () => {
            if (isOnline()) {
                this.processPendingQueue();
                this.reconcile(false, 'app_init');
                if (typeof window.syncAllOfflineData === 'function') {
                    window.syncAllOfflineData().catch(() => {});
                }
            }
        };

        // Deferred startup sync allows initial page render to acquire network first without contention
        setTimeout(runStartupSync, 1200);

        window.addEventListener('online', () => {
            syncLogger.log('sync', 'Browser came online. Triggering pending queue & cloud reconciliation.');
            this.processPendingQueue();
            this.reconcile(false, 'online_event');
        });

        window.addEventListener('focus', () => {
            const now = Date.now();
            if (isOnline() && document.visibilityState === 'visible' && (now - _lastVisibilitySyncTime >= MIN_VISIBILITY_RECONCILE_GAP_MS)) {
                _lastVisibilitySyncTime = now;
                this.processPendingQueue();
                this.reconcile(false, 'window_focus');
            }
        });

        document.addEventListener('visibilitychange', () => {
            const now = Date.now();
            if (document.visibilityState === 'visible' && isOnline() && (now - _lastVisibilitySyncTime >= MIN_VISIBILITY_RECONCILE_GAP_MS)) {
                _lastVisibilitySyncTime = now;
                this.processPendingQueue();
                this.reconcile(false, 'visibility_visible');
            }
        });

        // Periodic reconciliation timer
        if (_syncInterval) clearInterval(_syncInterval);
        _syncInterval = setInterval(() => {
            if (isOnline() && document.visibilityState === 'visible') {
                this.reconcile(false, 'periodic_interval');
            }
        }, SYNC_INTERVAL_MS);
    },

    /**
     * Process all queued offline mutations with server idempotency
     */
    async processPendingQueue() {
        if (!INDEXEDDB_ENABLED || _isProcessingQueue || !isOnline()) return;
        _isProcessingQueue = true;

        try {
            const pendingOperations = await localDb.sync_queue.where('status').equals('PENDING').toArray();
            if (pendingOperations.length === 0) {
                _isProcessingQueue = false;
                return;
            }

            setSyncingState(true);
            syncLogger.log('sync', `Processing ${pendingOperations.length} queued mutations...`);

            for (const op of pendingOperations) {
                try {
                    op.attempt_count = (op.attempt_count || 0) + 1;
                    op.status = 'SYNCING';
                    await localDb.sync_queue.put(op);

                    if (op.operation_type === 'CREATE_SALE') {
                        const priceType = op.payload.price_type || 'retail';
                        const validPriceType = ['retail', 'wholesale', 'custom'].includes(priceType) ? priceType : 'retail';
                        const saleAmount = Number(op.payload.amount ?? op.payload.amount_paid ?? op.payload.total ?? 0);
                        const salePayment = op.payload.payment || op.payload.payment_method || 'cash';
                        const prodId = op.payload.productId || op.payload.product_id || null;
                        const saleQty = parseInt(op.payload.quantity || op.payload.qty) || 1;

                        const { data, error } = await supabase.rpc('create_sale', {
                            p_branch_id: op.payload.branch_id || state.branchId,
                            p_customer: op.payload.customer || null,
                            p_items: op.payload.items || null,
                            p_amount: saleAmount,
                            p_payment: salePayment,
                            p_product_id: prodId,
                            p_qty: saleQty,
                            p_price_type: validPriceType,
                            p_client_tx_id: op.operation_id
                        });

                        if (error) throw error;

                        if (Array.isArray(op.payload.cart_items) && op.payload.cart_items.length > 1) {
                            for (let idx = 1; idx < op.payload.cart_items.length; idx++) {
                                const cItem = op.payload.cart_items[idx];
                                if (cItem.product_id && cItem.item_type !== 'service') {
                                    try {
                                        const { data: dbItem } = await supabase.from('inventory').select('quantity').eq('id', cItem.product_id).single();
                                        if (dbItem) {
                                            const newQ = Math.max(0, (Number(dbItem.quantity) || 0) - (parseInt(cItem.qty) || 1));
                                            await supabase.from('inventory').update({ quantity: newQ }).eq('id', cItem.product_id);
                                        }
                                    } catch (e) {
                                        console.warn('[SyncManager] Error deducting stock for cart item:', cItem.name, e.message);
                                    }
                                }
                            }
                        }

                        op.status = 'CONFIRMED';
                        await localDb.sync_queue.put(op);

                        let localSale = await localDb.sales.where('client_tx_id').equals(op.operation_id).first();
                        if (!localSale && op.entity_id) {
                            localSale = await localDb.sales.get(op.entity_id);
                        }
                        if (localSale) {
                            localSale.sync_status = 'SYNCED';
                            if (data && data.id) {
                                if (localSale.id && localSale.id !== data.id) {
                                    await localDb.sales.delete(localSale.id);
                                }
                                localSale.id = data.id;
                            }
                            await localDb.sales.put(localSale);
                        }
                    } else if (op.operation_type === 'CREATE_EXPENSE') {
                        const { data, error } = await supabase.rpc('create_expense', {
                            p_branch_id: op.payload.branch_id,
                            p_category: op.payload.category,
                            p_description: op.payload.description || null,
                            p_amount: Number(op.payload.amount),
                            p_client_tx_id: op.operation_id
                        });
                        if (error) throw error;

                        op.status = 'CONFIRMED';
                        await localDb.sync_queue.put(op);

                        const localExp = await localDb.expenses.get(op.entity_id);
                        if (localExp) {
                            localExp.sync_status = 'SYNCED';
                            if (data && data.id) {
                                await localDb.expenses.delete(op.entity_id);
                                localExp.id = data.id;
                            }
                            await localDb.expenses.put(localExp);
                        }
                    } else if (op.operation_type === 'CREATE_CUSTOMER') {
                        const { data, error } = await supabase.from('customers').insert(op.payload).select().single();
                        if (error) throw error;

                        op.status = 'CONFIRMED';
                        await localDb.sync_queue.put(op);

                        const localCust = await localDb.customers.get(op.entity_id);
                        if (localCust) {
                            if (data && data.id && data.id !== op.entity_id) {
                                await localDb.customers.delete(op.entity_id);
                                localCust.id = data.id;
                            }
                            await localDb.customers.put(localCust);
                        }
                    } else if (op.operation_type === 'CREATE_INVENTORY') {
                        // 1. Remap central_item_id if it was created offline and updated to a server ID
                        if (op.payload.central_item_id) {
                            const localCI = await localDb.central_inventory.get(op.payload.central_item_id);
                            if (!localCI && op.payload.sku) {
                                const foundCI = await localDb.central_inventory.where('sku').equals(op.payload.sku).first();
                                if (foundCI && foundCI.id) {
                                    op.payload.central_item_id = foundCI.id;
                                }
                            }
                        }

                        let res = await supabase.from('inventory').insert(op.payload).select().single();
                        if (res.error && res.error.message?.includes('column')) {
                            const clean = { ...op.payload };
                            delete clean.unit;
                            delete clean.retail_price;
                            delete clean.wholesale_price;
                            res = await supabase.from('inventory').insert(clean).select().single();
                        }

                        // 2. Handle foreign key constraint error (e.g. central_item_id not yet synced or temporary UUID)
                        if (res.error && (res.error.code === '23503' || res.error.message?.includes('foreign key constraint') || res.error.message?.includes('inventory_central_item_id_fkey'))) {
                            let resolvedCentralId = null;
                            if (op.payload.sku) {
                                const { data: cloudCI } = await supabase.from('central_inventory')
                                    .select('id')
                                    .eq('sku', op.payload.sku)
                                    .maybeSingle();
                                if (cloudCI?.id) resolvedCentralId = cloudCI.id;
                            }
                            const clean = { ...op.payload };
                            if (resolvedCentralId) {
                                clean.central_item_id = resolvedCentralId;
                            } else {
                                delete clean.central_item_id;
                            }
                            res = await supabase.from('inventory').insert(clean).select().single();
                        }

                        // 3. Handle 409 Conflict (item already exists on branch with this SKU)
                        if (res.error && (res.error.code === '23505' || res.error.message?.includes('duplicate key') || res.status === 409)) {
                            if (op.payload.branch_id && op.payload.sku) {
                                const { data: existingInv } = await supabase.from('inventory')
                                    .select('id')
                                    .eq('branch_id', op.payload.branch_id)
                                    .eq('sku', op.payload.sku)
                                    .maybeSingle();
                                if (existingInv?.id) {
                                    res = await supabase.from('inventory').update(op.payload).eq('id', existingInv.id).select().single();
                                }
                            }
                        }

                        if (res.error) throw res.error;

                        op.status = 'CONFIRMED';
                        await localDb.sync_queue.put(op);

                        const localInv = await localDb.inventory.get(op.entity_id);
                        if (localInv && res.data?.id && res.data.id !== op.entity_id) {
                            await localDb.inventory.delete(op.entity_id);
                            localInv.id = res.data.id;
                            await localDb.inventory.put(localInv);
                        }
                    } else if (op.operation_type === 'CREATE_CENTRAL_ITEM') {
                        const supplierId = (op.payload.supplier_id && isValidUUID(op.payload.supplier_id)) ? op.payload.supplier_id : null;
                        const initialStock = Number(op.payload.main_store_stock) || 0;
                        const costPrice = Number(op.payload.cost_price) || 0;
                        const retailPrice = Number(op.payload.retail_price || op.payload.price || 0);
                        const wholesalePrice = Number(op.payload.wholesale_price || retailPrice || 0);

                        const { data, error } = await supabase.rpc('create_central_item', {
                            p_name: op.payload.name,
                            p_sku: op.payload.sku || null,
                            p_category: op.payload.category || null,
                            p_price: retailPrice,
                            p_cost_price: costPrice,
                            p_min_threshold: parseInt(op.payload.min_threshold) || 5,
                            p_supplier_id: supplierId,
                            p_description: op.payload.description || null,
                            p_requires_approval: op.payload.requires_approval || false
                        });
                        if (error) throw error;

                        let newItemId = null;
                        if (typeof data === 'string') {
                            newItemId = data;
                        } else if (data && typeof data === 'object') {
                            if (Array.isArray(data) && data.length > 0) {
                                const first = data[0];
                                newItemId = (typeof first === 'string') ? first : (first.id || first.item_id || first.create_central_item || Object.values(first)[0]);
                            } else {
                                newItemId = data.id || data.item_id || data.create_central_item || Object.values(data)[0];
                            }
                        }

                        if (!newItemId && op.payload.owner_id && op.payload.sku) {
                            const { data: fetched } = await supabase.from('central_inventory')
                                .select('id')
                                .eq('owner_id', op.payload.owner_id)
                                .eq('sku', op.payload.sku)
                                .order('created_at', { ascending: false })
                                .limit(1)
                                .maybeSingle();
                            if (fetched && fetched.id) newItemId = fetched.id;
                        }

                        if (newItemId) {
                            await supabase.from('central_inventory')
                                .update({
                                    main_store_stock: initialStock,
                                    cost_price: costPrice,
                                    retail_price: retailPrice,
                                    wholesale_price: wholesalePrice,
                                    price: retailPrice,
                                    item_type: op.payload.item_type || 'product'
                                })
                                .eq('id', newItemId);
                        }

                        op.status = 'CONFIRMED';
                        await localDb.sync_queue.put(op);

                        // Clean up temporary local item and persist confirmed record with server ID
                        const localCI = await localDb.central_inventory.get(op.entity_id);
                        if (localCI) {
                            await localDb.central_inventory.delete(op.entity_id);
                            if (newItemId) {
                                localCI.id = newItemId;
                                localCI.main_store_stock = initialStock;
                                localCI.cost_price = costPrice;
                                localCI.retail_price = retailPrice;
                                localCI.wholesale_price = wholesalePrice;
                                localCI.price = retailPrice;
                                localCI.sync_status = 'SYNCED';
                                await localDb.central_inventory.put(localCI);
                                try { window.broadcastDataMutation?.('central_inventory', 'UPDATE', localCI); } catch (e) { }

                                // Cascade ID update to all pending sync_queue items and local Dexie rows
                                try {
                                    const pendingBranchOps = await localDb.sync_queue
                                        .filter(q => q.status === 'PENDING' && q.payload?.central_item_id === op.entity_id)
                                        .toArray();
                                    for (const pOp of pendingBranchOps) {
                                        pOp.payload.central_item_id = newItemId;
                                        await localDb.sync_queue.put(pOp);
                                    }
                                    const linkedLocalBranchInv = await localDb.inventory
                                        .filter(inv => inv.central_item_id === op.entity_id)
                                        .toArray();
                                    for (const bInv of linkedLocalBranchInv) {
                                        bInv.central_item_id = newItemId;
                                        await localDb.inventory.put(bInv);
                                    }
                                } catch (cascadeErr) {
                                    console.warn('[SyncManager] Cascade remap notice:', cascadeErr.message);
                                }
                            }
                        }

                    } else if (op.operation_type === 'CREATE_SUPPLIER') {
                        const { data, error } = await supabase.from('suppliers').insert([op.payload]).select().single();
                        if (error) throw error;

                        op.status = 'CONFIRMED';
                        await localDb.sync_queue.put(op);

                        const localSup = await localDb.suppliers.get(op.entity_id);
                        if (localSup && data?.id && data.id !== op.entity_id) {
                            await localDb.suppliers.delete(op.entity_id);
                            localSup.id = data.id;
                            await localDb.suppliers.put(localSup);
                        }
                    } else if (op.operation_type === 'CREATE_LOAN') {
                        const { data, error } = await supabase.from('loans').insert([op.payload]).select().single();
                        if (error) throw error;

                        op.status = 'CONFIRMED';
                        await localDb.sync_queue.put(op);
                    } else if (op.operation_type === 'CREATE_BUSINESS_LOAN') {
                        const { data, error } = await supabase.from('business_loans').insert([op.payload]).select().single();
                        if (error) throw error;

                        op.status = 'CONFIRMED';
                        await localDb.sync_queue.put(op);
                    } else if (op.operation_type === 'CREATE_TRANSFER') {
                        const { data, error } = await supabase.from('stock_transfers').insert([op.payload]).select().single();
                        if (error) throw error;

                        op.status = 'CONFIRMED';
                        await localDb.sync_queue.put(op);
                    } else if (op.operation_type === 'CREATE_RETURN') {
                        const { data, error } = await supabase.from('product_returns').insert([op.payload]).select().single();
                        if (error) throw error;

                        op.status = 'CONFIRMED';
                        await localDb.sync_queue.put(op);
                    } else if (op.operation_type === 'CREATE_TASK') {
                        const { data, error } = await supabase.from('tasks').insert([op.payload]).select().single();
                        if (error) throw error;

                        op.status = 'CONFIRMED';
                        await localDb.sync_queue.put(op);
                    } else if (op.operation_type === 'CREATE_CAPITAL_ACCOUNT') {
                        const { data, error } = await supabase.from('capital_accounts').insert([op.payload]).select().single();
                        if (error) throw error;

                        op.status = 'CONFIRMED';
                        await localDb.sync_queue.put(op);

                        const localAcc = await localDb.capital_accounts.get(op.entity_id);
                        if (localAcc && data?.id && data.id !== op.entity_id) {
                            await localDb.capital_accounts.delete(op.entity_id);
                            localAcc.id = data.id;
                            await localDb.capital_accounts.put(localAcc);
                        }
                    } else if (op.operation_type === 'CREATE_CAPITAL_TX') {
                        const { data, error } = await supabase.from('capital_transactions').insert([op.payload]).select().single();
                        if (error) throw error;

                        op.status = 'CONFIRMED';
                        await localDb.sync_queue.put(op);
                    } else if (op.operation_type === 'CREATE_ASSET') {
                        const { data, error } = await supabase.from('business_assets').insert([op.payload]).select().single();
                        if (error) throw error;

                        op.status = 'CONFIRMED';
                        await localDb.sync_queue.put(op);

                        const localAsset = await localDb.business_assets.get(op.entity_id);
                        if (localAsset && data?.id && data.id !== op.entity_id) {
                            await localDb.business_assets.delete(op.entity_id);
                            localAsset.id = data.id;
                            localAsset.sync_status = 'SYNCED';
                            await localDb.business_assets.put(localAsset);
                        }
                    }



                } catch (opErr) {
                    syncLogger.error('sync', `Failed op ${op.id}`, opErr);
                    if (opErr.message?.includes('invalid input syntax for type uuid') && op.payload?.supplier_id && !isValidUUID(op.payload.supplier_id)) {
                        op.payload.supplier_id = null;
                        op.status = 'PENDING';
                        op.attempt_count = (op.attempt_count || 1) - 1;
                    } else {
                        op.status = op.attempt_count >= 5 ? 'REJECTED' : 'PENDING';
                    }
                    op.last_error = opErr.message;
                    await localDb.sync_queue.put(op);
                }
            }


            setSyncingState(false);
        } catch (err) {
            syncLogger.error('sync', 'Queue run error', err);
            setSyncingState(false, true);
        } finally {
            _isProcessingQueue = false;
        }
    },

    /**
     * Incremental Cloud-to-Local Database Reconciliation
     * Fetches records changed since lastSuccessfulSyncAt, merges into IndexedDB, and updates cursors.
     */
    async reconcile(forceFull = false, trigger = 'manual') {
        if (!INDEXEDDB_ENABLED) return;
        const now = Date.now();
        if (_isReconciling || !isOnline()) return;
        if (!forceFull && (now - _lastReconciliationTime < MIN_RECONCILE_GAP_MS)) return;
        if (!state.role || (!state.ownerId && !state.branchId && state.role !== 'sysadmin')) return;

        _isReconciling = true;
        _lastReconciliationTime = now;
        setSyncingState(true);

        syncLogger.log('sync', `Started reconciliation (trigger: ${trigger}, forceFull: ${forceFull})`);

        let totalRecordsApplied = 0;
        let totalDeletionsApplied = 0;
        let hasErrors = false;

        try {
            const role = state.role;
            const ownerId = state.ownerId || (state.profile && state.profile.id);
            const branchId = state.branchId;

            // Purge any foreign tenant artifacts from local IndexedDB
            await scrubForeignTenantIndexedDBData();

            for (const entity of SYNCABLE_ENTITIES) {
                if (entity.ownerOnly && role !== 'owner' && role !== 'sysadmin') continue;
                if (!localDb[entity.table]) continue;

                try {
                    const metadata = await getSyncMetadata(entity.table);
                    const lastSyncedAt = (!forceFull && metadata && metadata.last_synced_at) ? metadata.last_synced_at : null;

                    // Resolve owner branch IDs ahead of query
                    let ownerBranchIds = [];
                    if (role === 'owner' && ownerId) {
                        ownerBranchIds = (state.branches || []).map(b => b.id).filter(Boolean);
                        if (ownerBranchIds.length === 0) {
                            try {
                                const cachedBranches = await localDb.branches.where('owner_id').equals(ownerId).toArray();
                                ownerBranchIds = cachedBranches.map(b => b.id).filter(Boolean);
                            } catch (e) {}
                        }
                    }

                    // Build base query with strict tenant isolation
                    const buildQuery = (useTimeFilter = true) => {
                        let q = supabase.from(entity.table).select('*');

                        // Filter based on user's authorized scope
                        if (role === 'branch' && branchId) {
                            if (entity.table === 'branches') {
                                q = q.eq('id', branchId);
                            } else if (entity.table === 'stock_transfers') {
                                q = q.or(`from_branch_id.eq.${branchId},to_branch_id.eq.${branchId}`);
                            } else if (['sales', 'expenses', 'inventory', 'customers', 'tasks', 'loans', 'requests', 'notes', 'shifts', 'cash_drawer', 'attendance', 'quotations', 'purchase_orders', 'product_returns', 'announcements'].includes(entity.table)) {
                                q = q.eq('branch_id', branchId);
                            }
                        } else if (role === 'owner' && ownerId) {
                            if (['branches', 'central_inventory', 'requests', 'staff', 'capital_accounts', 'business_assets', 'stock_movements', 'suppliers', 'payroll', 'categories', 'business_loans', 'goals', 'promotions', 'announcements', 'stock_transfers'].includes(entity.table)) {
                                q = q.eq('owner_id', ownerId);
                            } else if (['sales', 'expenses', 'inventory', 'tasks', 'loans', 'customers', 'shifts', 'cash_drawer', 'attendance', 'quotations', 'purchase_orders', 'product_returns'].includes(entity.table)) {
                                if (ownerBranchIds.length > 0) {
                                    q = q.in('branch_id', ownerBranchIds);
                                } else {
                                    // Air-gap guard: Owner with no branches yet will never execute an un-scoped query
                                    q = q.eq('branch_id', '00000000-0000-0000-0000-000000000000');
                                }
                            }
                        }

                        // Delta filter if column is available
                        if (useTimeFilter && lastSyncedAt && entity.timestampCol) {
                            const bufferDate = new Date(new Date(lastSyncedAt).getTime() - CLOCK_SKEW_BUFFER_MS).toISOString();
                            q = q.gte(entity.timestampCol, bufferDate);
                        }

                        if (entity.timestampCol) {
                            q = q.order(entity.timestampCol, { ascending: false });
                        }

                        return q.limit(500);
                    };

                    let res = await buildQuery(true);

                    // Automatic graceful fallback if column filter is rejected by PostgREST
                    if (res.error && (res.error.message?.includes('column') || res.error.code === '42703')) {
                        syncLogger.log('sync', `Timestamp column ${entity.timestampCol} not present on ${entity.table}, querying scoped table without time filter.`);
                        res = await buildQuery(false);
                    }

                    if (res.error) {
                        syncLogger.warn('sync', `Query error for ${entity.table}:`, res.error.message);
                        hasErrors = true;
                        await setSyncMetadata(entity.table, 'ERROR', res.error);
                        continue;
                    }

                    const records = res.data;
                    if (Array.isArray(records) && records.length > 0) {
                        // Separate active vs soft-deleted records
                        const toDelete = records.filter(r => r.status === 'deleted' || r.is_deleted === true || r.deleted_at).map(r => r.id);
                        const toUpsert = records.filter(r => r.status !== 'deleted' && !r.is_deleted && !r.deleted_at);

                        if (toUpsert.length > 0) {
                            await cacheLocalItems(entity.table, toUpsert);
                            totalRecordsApplied += toUpsert.length;
                        }

                        if (toDelete.length > 0) {
                            await bulkDeleteLocalItems(entity.table, toDelete);
                            totalDeletionsApplied += toDelete.length;
                        }
                    }

                    await setSyncMetadata(entity.table, 'SYNCED');
                } catch (entityErr) {
                    syncLogger.warn('sync', `Entity reconciliation error on ${entity.table}:`, entityErr);
                    hasErrors = true;
                }
            }

            // Also process pending outbound queue
            await this.processPendingQueue();

            if (!hasErrors) {
                _consecutiveSyncFailures = 0;
            } else {
                _consecutiveSyncFailures++;
            }

            syncLogger.log('sync', `Reconciliation finished. Applied ${totalRecordsApplied} updates, ${totalDeletionsApplied} deletions. Errors: ${hasErrors}`);
            setSyncingState(false, hasErrors);

            // If updates were applied, notify dashboard & active view listeners
            if (totalRecordsApplied > 0 || totalDeletionsApplied > 0) {
                this.notifyLocalDataChanged();
            }
        } catch (globalErr) {
            syncLogger.error('sync', 'Global reconciliation failed', globalErr);
            _consecutiveSyncFailures++;
            setSyncingState(false, true);
        } finally {
            _isReconciling = false;
        }
    },

    /**
     * Notify application components and active views that local data has been updated
     */
    notifyLocalDataChanged() {
        try {
            if (typeof window.broadcastDataMutation === 'function') {
                window._cachedCentralItems = null;
                window._cachedBranchInventory = null;
            }

            if (state.role === 'owner' && state.ownerId) {
                const activeFilter = state._overviewBranchFilter || 'all';
                if (typeof window.getOwnerDashboardData === 'function') {
                    window.getOwnerDashboardData(state.ownerId, activeFilter, state.branches || []).catch(() => {});
                }
            } else if (state.role === 'branch' && state.branchId) {
                if (typeof window.getBranchDashboardData === 'function') {
                    window.getBranchDashboardData(state.branchId).catch(() => {});
                }
            }
        } catch (e) {
            syncLogger.warn('sync', 'Data change notify warning:', e);
        }
    }
};

if (typeof window !== 'undefined') {
    window.syncManager = syncManager;
}

export default syncManager;
