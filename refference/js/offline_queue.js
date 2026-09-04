// ─── BMSTz Universal Offline Queue & Auto-Sync Engine ─────────────────────────

import { state } from './state.js';
import { localDb } from './data/db.js';
import {
    dbSales,
    dbCustomers,
    dbExpenses,
    dbInventory,
    dbTasks,
    dbNotes,
    dbLoans,
    dbRequests,
    dbStaff,
    dbSuppliers,
    dbCentralInventory
} from './db.js';

const SALES_QUEUE_KEY = 'bms_offline_sales_queue';
const OPS_QUEUE_KEY = 'bms_offline_ops_queue';
const REJECTED_QUEUE_KEY = 'bms_rejected_sales_queue';
let syncAllInFlight = null;

// ── 1. Sales Queue ─────────────────────────────────────────────────────────────

export function getOfflineQueue() {
    try {
        return JSON.parse(localStorage.getItem(SALES_QUEUE_KEY) || '[]');
    } catch (e) {
        return [];
    }
}

export function saveOfflineQueue(queue) {
    localStorage.setItem(SALES_QUEUE_KEY, JSON.stringify(queue));
    updateOfflineStatusUI();
}

export function queueOfflineSale(salePayload) {
    const queue = getOfflineQueue();
    const queuedSale = {
        client_tx_id: crypto.randomUUID(),
        id: 'off_sale_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        branch_id: state.branchId,
        created_at: new Date().toISOString(),
        queued_at: Date.now(),
        sync_status: 'LOCAL_PENDING',
        ...salePayload
    };
    queue.push(queuedSale);
    saveOfflineQueue(queue);

    // Save to localDb.sales for instant offline list rendering
    try {
        if (window.localDb && window.localDb.sales) {
            window.localDb.sales.put({
                id: queuedSale.id,
                branch_id: queuedSale.branch_id,
                client_tx_id: queuedSale.client_tx_id,
                customer_name: queuedSale.customer,
                amount: Number(queuedSale.amount) || 0,
                payment_method: queuedSale.payment,
                items: queuedSale.items,
                product_id: queuedSale.productId,
                quantity: queuedSale.qty,
                price_type: queuedSale.price_type,
                created_at: queuedSale.created_at,
                sync_status: 'LOCAL_PENDING'
            });
        }
        // Optimistically deduct local inventory quantity
        if (queuedSale.productId && window.localDb && window.localDb.inventory) {
            window.localDb.inventory.get(queuedSale.productId).then(item => {
                if (item) {
                    const currentQty = Number(item.quantity) || 0;
                    const deductedQty = Math.max(0, currentQty - (parseInt(queuedSale.qty) || 1));
                    window.localDb.inventory.update(queuedSale.productId, { quantity: deductedQty });
                }
            }).catch(e => console.warn('[OfflineQueue] Local stock deduction notice:', e));
        }
    } catch (e) {
        console.warn('[OfflineQueue] LocalDB mirror warning:', e);
    }

    if (window.showToast) {
        showToast(`${window.t('offline_sales_queued', 'Sale queued offline')} (${queue.length} pending)`, 'info');
    }
    return queuedSale;
}

// ── 2. Universal Operations Queue (All "Add +" Entities) ──────────────────────

export function getOfflineOpsQueue() {
    try {
        return JSON.parse(localStorage.getItem(OPS_QUEUE_KEY) || '[]');
    } catch (e) {
        return [];
    }
}

export function saveOfflineOpsQueue(queue) {
    localStorage.setItem(OPS_QUEUE_KEY, JSON.stringify(queue));
    updateOfflineStatusUI();
}

/**
 * Universally queue any "Add +" operation offline, save immediately into IndexedDB,
 * and schedule automatic background sync upon network reconnection.
 */
export async function queueOfflineOperation(entityType, payload) {
    const queue = getOfflineOpsQueue();
    const clientTxId = crypto.randomUUID();
    const tempId = `off_${entityType}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    const opRecord = {
        id: tempId,
        client_tx_id: clientTxId,
        entityType,
        payload,
        created_at: new Date().toISOString(),
        queued_at: Date.now(),
        sync_status: 'LOCAL_PENDING'
    };

    queue.push(opRecord);
    saveOfflineOpsQueue(queue);

    // Optimistically write directly to local IndexedDB table for instant UI visibility
    try {
        if (window.localDb && window.localDb[entityType]) {
            await window.localDb[entityType].put({
                id: tempId,
                client_tx_id: clientTxId,
                branch_id: payload.branch_id || state.branchId || null,
                created_at: opRecord.created_at,
                sync_status: 'LOCAL_PENDING',
                ...payload
            });
        }
    } catch (err) {
        console.warn(`[OfflineQueue] LocalDB put error for ${entityType}:`, err);
    }

    const entityLabel = entityType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    if (window.showToast) {
        showToast(`${entityLabel} saved locally (offline mode). Will auto-sync when reconnected.`, 'info');
    }

    return opRecord;
}

// ── 3. Universal Sync Engine ──────────────────────────────────────────────────

export function getRejectedQueue() {
    try {
        return JSON.parse(localStorage.getItem(REJECTED_QUEUE_KEY) || '[]');
    } catch (e) {
        return [];
    }
}

export function saveRejectedQueue(rejectedQueue) {
    localStorage.setItem(REJECTED_QUEUE_KEY, JSON.stringify(rejectedQueue));
    updateOfflineStatusUI();
}

export function dismissRejectedSale(clientId) {
    const queue = getRejectedQueue().filter(item => item.client_tx_id !== clientId && item.id !== clientId);
    saveRejectedQueue(queue);
}

export async function syncOfflineOperations() {
    const opsQueue = getOfflineOpsQueue();
    if (opsQueue.length === 0) return;

    if (!navigator.onLine) return;

    const remaining = [];
    let syncedOpsCount = 0;

    for (const op of opsQueue) {
        try {
            const { entityType, payload, id: tempId } = op;
            let res = null;

            switch (entityType) {
                case 'customers':
                    res = await dbCustomers.add(payload.branch_id || state.branchId, payload);
                    break;
                case 'expenses':
                    res = await dbExpenses.add(payload.branch_id || state.branchId, payload);
                    break;
                case 'inventory':
                    res = await dbInventory.add(payload.branch_id || state.branchId, payload);
                    break;
                case 'tasks':
                    res = await dbTasks.add(payload.branch_id || state.branchId, payload);
                    break;
                case 'notes':
                    res = await dbNotes.add(payload.branch_id || state.branchId, payload);
                    break;
                case 'loans':
                    res = await dbLoans.add(payload.branch_id || state.branchId, payload);
                    break;
                case 'requests':
                    res = await dbRequests.add(payload);
                    break;
                case 'staff':
                    res = await dbStaff.add(payload);
                    break;
                case 'suppliers':
                    res = await dbSuppliers.add(payload);
                    break;
                case 'central_inventory':
                    res = await dbCentralInventory.add(payload);
                    break;
                default:
                    console.warn('[OfflineSync] Unhandled entity type:', entityType);
            }

            // Remove temp record from localDb and replace with official server record
            if (res && window.localDb && window.localDb[entityType]) {
                try {
                    await window.localDb[entityType].delete(tempId);
                    await window.localDb[entityType].put(res);
                } catch (e) {}
            }

            syncedOpsCount++;
        } catch (err) {
            console.error(`[OfflineSync] Error syncing ${op.entityType}:`, err);
            remaining.push(op);
        }
    }

    saveOfflineOpsQueue(remaining);

    if (syncedOpsCount > 0 && window.showToast) {
        showToast(`Synced ${syncedOpsCount} offline record(s) to server.`, 'success');
    }
}

export async function syncOfflineSales() {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    if (!navigator.onLine) {
        if (window.showToast) showToast(window.t('you_are_offline', 'You are currently offline.'), 'warning');
        return;
    }

    // Session guard
    try {
        const client = window.supabaseClient || window.supabase;
        const { data: { session } } = await client.auth.getSession();
        if (!session || !session.user) {
            if (window.showToast) showToast(window.t('session_expired', 'Session expired. Please log in to sync offline sales.'), 'warning');
            return;
        }
    } catch (e) {
        console.error('[OfflineSync] Session check error:', e);
        return;
    }

    if (window.showToast) showToast(`${window.t('syncing_now', 'Syncing offline records...')} (${queue.length})`, 'info');

    const remaining = [];
    const rejectedQueue = getRejectedQueue();
    let syncedCount = 0;
    let rejectedCount = 0;

    for (const sale of queue) {
        sale.sync_status = 'SYNCING';
        try {
            const { id, queued_at, client_tx_id, sync_status, ...payload } = sale;

            const client = window.supabaseClient || window.supabase;
            const { data, error } = await client.rpc('create_sale', {
                p_branch_id:    payload.branch_id || state.branchId,
                p_customer:     payload.customer   || null,
                p_items:        payload.items       || null,
                p_amount:       Number(payload.amount) || 0,
                p_payment:      payload.payment     || 'cash',
                p_product_id:   payload.product_id  || payload.productId || null,
                p_qty:          parseInt(payload.quantity || payload.qty) || 1,
                p_price_type:   payload.price_type  || 'retail',
                p_client_tx_id: client_tx_id        || null
            });

            if (error) {
                console.error('[OfflineSync] Server returned error for sale:', error);
                const errMsg = error.message || String(error);
                const isPermanentConflict = errMsg.toLowerCase().includes('stock') ||
                                            errMsg.toLowerCase().includes('unauthorized') ||
                                            errMsg.toLowerCase().includes('invalid');

                if (isPermanentConflict) {
                    rejectedCount++;
                    rejectedQueue.push({
                        ...sale,
                        sync_status: 'SERVER_REJECTED',
                        reject_reason: errMsg,
                        rejected_at: new Date().toISOString()
                    });
                } else {
                    sale.sync_status = 'LOCAL_PENDING';
                    remaining.push(sale);
                }
            } else {
                sale.sync_status = 'SERVER_ACCEPTED';
                syncedCount++;
            }
        } catch (err) {
            console.error('[OfflineSync] Transient error syncing sale:', err);
            sale.sync_status = 'LOCAL_PENDING';
            remaining.push(sale);
        }
    }

    saveOfflineQueue(remaining);
    saveRejectedQueue(rejectedQueue);

    if (syncedCount > 0) {
        if (window.showToast) {
            showToast(`${window.t('sync_complete', 'Offline sales synced!')} (${syncedCount} ${window.t('sales', 'sales')})`, 'success');
        }
    }

    if (rejectedCount > 0) {
        if (window.showToast) {
            showToast(`${rejectedCount} ${window.t('rejected_sales_notice', 'offline sale(s) rejected by server (stock/permission conflict).')}`, 'error');
        }
    }
}

export async function syncAllOfflineData() {
    // `online`, `focus`, `visibilitychange`, and `pageshow` can all fire together
    // when a phone resumes. One shared promise prevents duplicate creates while
    // queued operations are still being sent.
    if (syncAllInFlight) return syncAllInFlight;

    syncAllInFlight = (async () => {
        await syncOfflineOperations();
        await syncOfflineSales();
        updateOfflineStatusUI();

        // Auto-refresh active view so newly synced data updates live on screen.
        if (state.activeView && typeof window.switchView === 'function') {
            await window.switchView(state.activeView, state.activeViewContext, true);
        }
    })();

    try {
        return await syncAllInFlight;
    } finally {
        syncAllInFlight = null;
    }
}

// ── 4. Offline Banner UI Management ──────────────────────────────────────────

export function updateOfflineStatusUI() {
    const salesQueue = getOfflineQueue();
    const opsQueue = getOfflineOpsQueue();
    const totalPending = salesQueue.length + opsQueue.length;
    const rejectedQueue = getRejectedQueue();
    const isOffline = !navigator.onLine;

    let banner = document.getElementById('offlineSyncBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'offlineSyncBanner';
        banner.className = 'fixed bottom-4 right-4 z-[9999] transition-all duration-300 transform';
        document.body.appendChild(banner);
    }

    if (totalPending > 0 || rejectedQueue.length > 0 || isOffline) {
        banner.innerHTML = `
        <div class="flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-gray-800 text-white rounded-2xl shadow-xl border border-gray-700 slide-in text-xs font-bold">
            <div class="w-2.5 h-2.5 rounded-full ${isOffline ? 'bg-amber-500 animate-ping' : rejectedQueue.length > 0 ? 'bg-red-500' : 'bg-emerald-500'} flex-shrink-0"></div>
            <div>
                <p class="font-black text-white leading-tight">
                    ${isOffline ? window.t('offline_mode', 'Offline Mode') : window.t('syncing_now', 'Online')}
                </p>
                <p class="text-[10px] text-gray-400 font-medium">
                    ${totalPending} ${window.t('offline_sales_queued', 'records pending')} ${rejectedQueue.length > 0 ? `<span class="text-red-400 font-bold">(${rejectedQueue.length} rejected)</span>` : ''}
                </p>
            </div>
            ${totalPending > 0 && navigator.onLine ? `
            <button onclick="if(window.triggerIconSpin) window.triggerIconSpin(this); window.syncAllOfflineData()" class="ml-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer">
                <i data-lucide="refresh-cw" class="w-3 h-3"></i> ${window.t('retry_sync', 'Sync Now')}
            </button>` : ''}
        </div>`;
        banner.style.display = 'block';
        if (window.lucide) lucide.createIcons({ scope: banner });
    } else {
        // Hide and clear banner when online and 0 items in queue
        banner.style.display = 'none';
    }
}

// ── 5. Lifecycle Initializer ──────────────────────────────────────────────────

export function initOfflineSyncEngine() {
    if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then(granted => {
            if (granted) console.log('[OfflineQueue] Persistent storage granted by browser.');
        }).catch(e => console.error('[OfflineQueue] Storage persist request error:', e));
    }

    window.addEventListener('online', async () => {
        updateOfflineStatusUI();
        if (typeof syncAllOfflineData === 'function') {
            await syncAllOfflineData();
        }
    });

    window.addEventListener('offline', () => {
        showToast(window.t('you_are_offline', 'You are offline. Additions and sales will be queued automatically.'), 'warning');
        updateOfflineStatusUI();
    });

    // Mobile browsers do not always emit an `online` event after a frozen app is
    // resumed. Re-check queued mutations whenever the user returns so locally
    // saved work is not left pending until the next full reload.
    const syncPendingWorkOnResume = () => {
        if (!navigator.onLine) return;
        if (getOfflineQueue().length === 0 && getOfflineOpsQueue().length === 0) return;
        syncAllOfflineData().catch(err => {
            console.warn('[OfflineQueue] Resume sync notice:', err.message || err);
        });
    };
    window.addEventListener('focus', syncPendingWorkOnResume);
    window.addEventListener('pageshow', syncPendingWorkOnResume);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') syncPendingWorkOnResume();
    });

    updateOfflineStatusUI();

    if (navigator.onLine && (getOfflineQueue().length > 0 || getOfflineOpsQueue().length > 0)) {
        setTimeout(syncAllOfflineData, 2000);
    }
}

// Global window bindings
window.queueOfflineSale = queueOfflineSale;
window.queueOfflineOperation = queueOfflineOperation;
window.syncOfflineSales = syncOfflineSales;
window.syncAllOfflineData = syncAllOfflineData;
window.getOfflineQueue = getOfflineQueue;
window.getOfflineOpsQueue = getOfflineOpsQueue;
