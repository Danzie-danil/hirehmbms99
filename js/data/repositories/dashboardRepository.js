import { supabase } from '../../supabase.js';
import { dbTasks, dbBranches, dbActivities, dbRequests, dbStockMovements, dbSales, dbExpenses, dbInventory, dbCentralInventory, cacheLocalItems } from '../../db.js';
import { getLocalSnapshot, saveLocalSnapshot, setSyncMetadata, getLocalItems, localDb } from '../db.js';
import { setSyncingState, isOnline } from '../networkStatus.js';
import { syncLogger } from '../../utils/syncLogger.js';

const _dashboardListeners = new Set();
const _syncLocks = new Map();

export function onDashboardUpdated(callback) {
    _dashboardListeners.add(callback);
    return () => _dashboardListeners.delete(callback);
}

function _notifyDashboardUpdated(key, data) {
    _dashboardListeners.forEach(fn => {
        try {
            fn(key, data);
        } catch (e) {
            syncLogger.error('dashboard', 'DashboardRepo Listener Error:', e);
        }
    });
}

/**
 * Patch the Owner Dashboard snapshot in memory and IndexedDB immediately upon receiving a live mutation event.
 */
export async function patchOwnerDashboardWithLiveRecord(ownerId, table, eventType, record) {
    if (!ownerId || !table || !record) return;
    if (record.owner_id && record.owner_id !== ownerId) return;

    // Verify branch ownership if branch_id is present
    if (record.branch_id && window.state?.branches && window.state.branches.length > 0) {
        const isOwnedBranch = window.state.branches.some(b => b.id === record.branch_id);
        if (!isOwnedBranch && record.branch_id !== 'all') return;
    }

    const branchId = record.branch_id || 'all';
    const keys = [`owner_${ownerId}_all`];
    if (branchId && branchId !== 'all') {
        keys.push(`owner_${ownerId}_${branchId}`);
    }

    for (const key of keys) {
        try {
            const cached = await getLocalSnapshot(key);
            if (!cached || !cached.data) continue;
            const payload = { ...cached.data };

            if (table === 'sales') {
                const sales = Array.isArray(payload.sales) ? [...payload.sales] : [];
                if (eventType === 'INSERT') {
                    const idx = sales.findIndex(s => s.id === record.id || (record.client_tx_id && s.client_tx_id === record.client_tx_id));
                    if (idx >= 0) sales[idx] = record;
                    else sales.unshift(record);

                    // Add live activity entry
                    const bName = window.state?.branches?.find(b => b.id === record.branch_id)?.name || record.branches?.name || 'Branch';
                    const act = {
                        type: 'sale',
                        message: (record.customer_name || record.customer) && (record.customer_name || record.customer) !== 'Walk-in Customer' ? `Sale to ${record.customer_name || record.customer}` : 'New sale recorded',
                        branch: bName,
                        amount: Number(record.amount || 0),
                        created_at: record.created_at || new Date().toISOString(),
                        time: new Date(record.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    };
                    const activities = Array.isArray(payload.activities) ? [...payload.activities] : [];
                    activities.unshift(act);
                    payload.activities = activities.slice(0, 50);
                } else if (eventType === 'UPDATE') {
                    const idx = sales.findIndex(s => s.id === record.id);
                    if (idx >= 0) sales[idx] = { ...sales[idx], ...record };
                    else sales.unshift(record);
                } else if (eventType === 'DELETE') {
                    const idToDelete = record.id || record;
                    const idx = sales.findIndex(s => s.id === idToDelete);
                    if (idx >= 0) sales.splice(idx, 1);
                }
                payload.sales = sales;
            } else if (table === 'expenses') {
                const expenses = Array.isArray(payload.expenses) ? [...payload.expenses] : [];
                if (eventType === 'INSERT') {
                    expenses.unshift(record);

                    const bName = window.state?.branches?.find(b => b.id === record.branch_id)?.name || record.branches?.name || 'Branch';
                    const act = {
                        type: 'expense',
                        message: record.description || 'Expense recorded',
                        branch: bName,
                        amount: Number(record.amount || 0),
                        created_at: record.created_at || new Date().toISOString(),
                        time: new Date(record.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    };
                    const activities = Array.isArray(payload.activities) ? [...payload.activities] : [];
                    activities.unshift(act);
                    payload.activities = activities.slice(0, 50);
                } else if (eventType === 'UPDATE') {
                    const idx = expenses.findIndex(e => e.id === record.id);
                    if (idx >= 0) expenses[idx] = { ...expenses[idx], ...record };
                } else if (eventType === 'DELETE') {
                    const idToDelete = record.id || record;
                    const idx = expenses.findIndex(e => e.id === idToDelete);
                    if (idx >= 0) expenses.splice(idx, 1);
                }
                payload.expenses = expenses;
            } else if (table === 'inventory' || table === 'central_inventory') {
                const inv = Array.isArray(payload.inventory) ? [...payload.inventory] : [];
                if (eventType === 'INSERT') {
                    const idx = inv.findIndex(i => i.id === record.id);
                    if (idx >= 0) inv[idx] = record;
                    else inv.unshift(record);
                } else if (eventType === 'UPDATE') {
                    const idx = inv.findIndex(i => i.id === record.id);
                    if (idx >= 0) inv[idx] = { ...inv[idx], ...record };
                    else inv.unshift(record);
                } else if (eventType === 'DELETE') {
                    const idToDelete = record.id || record;
                    const idx = inv.findIndex(i => i.id === idToDelete);
                    if (idx >= 0) inv.splice(idx, 1);
                }
                payload.inventory = inv;
            } else if (table === 'tasks') {
                const tasks = Array.isArray(payload.tasks) ? [...payload.tasks] : [];
                if (eventType === 'INSERT') tasks.unshift(record);
                else if (eventType === 'UPDATE') {
                    const idx = tasks.findIndex(t => t.id === record.id);
                    if (idx >= 0) tasks[idx] = { ...tasks[idx], ...record };
                } else if (eventType === 'DELETE') {
                    const idx = tasks.findIndex(t => t.id === (record.id || record));
                    if (idx >= 0) tasks.splice(idx, 1);
                }
                payload.tasks = tasks;
            } else if (table === 'requests') {
                const reqs = Array.isArray(payload.requests) ? [...payload.requests] : [];
                if (eventType === 'INSERT') reqs.unshift(record);
                else if (eventType === 'UPDATE') {
                    const idx = reqs.findIndex(r => r.id === record.id);
                    if (idx >= 0) reqs[idx] = { ...reqs[idx], ...record };
                } else if (eventType === 'DELETE') {
                    const idx = reqs.findIndex(r => r.id === (record.id || record));
                    if (idx >= 0) reqs.splice(idx, 1);
                }
                payload.requests = reqs;
            } else if (table === 'capital_accounts') {
                const accs = Array.isArray(payload.capital_accounts) ? [...payload.capital_accounts] : [];
                if (eventType === 'INSERT') {
                    const idx = accs.findIndex(a => a.id === record.id);
                    if (idx >= 0) accs[idx] = record;
                    else accs.unshift(record);
                } else if (eventType === 'UPDATE') {
                    const idx = accs.findIndex(a => a.id === record.id);
                    if (idx >= 0) accs[idx] = { ...accs[idx], ...record };
                    else accs.unshift(record);
                } else if (eventType === 'DELETE') {
                    const idx = accs.findIndex(a => a.id === (record.id || record));
                    if (idx >= 0) accs.splice(idx, 1);
                }
                payload.capital_accounts = accs;
            }


            payload.syncedAt = new Date().toISOString();
            payload._isAuthoritativeCloudSync = false;
            await saveLocalSnapshot(key, 'owner', key.endsWith('_all') ? 'all' : branchId, payload);
            _notifyDashboardUpdated(key, payload);
        } catch (err) {
            syncLogger.warn('dashboard', 'Live patch warning:', err);
        }
    }
}
window.patchOwnerDashboardWithLiveRecord = patchOwnerDashboardWithLiveRecord;

/**
 * Patch the Branch Dashboard snapshot immediately in memory and IndexedDB upon receiving a live mutation event.
 */
export async function patchBranchDashboardWithLiveRecord(branchId, table, eventType, record) {
    if (!branchId || !table || !record) return;
    if (record.branch_id && record.branch_id !== branchId) return;
    const key = `branch_${branchId}`;

    try {
        const cached = await getLocalSnapshot(key);
        if (!cached || !cached.data) return;
        const payload = { ...cached.data };

        if (table === 'sales') {
            const sales = Array.isArray(payload.sales) ? [...payload.sales] : [];
            if (eventType === 'INSERT') {
                const idx = sales.findIndex(s => s.id === record.id || (record.client_tx_id && s.client_tx_id === record.client_tx_id));
                if (idx >= 0) sales[idx] = record;
                else sales.unshift(record);
            } else if (eventType === 'UPDATE') {
                const idx = sales.findIndex(s => s.id === record.id);
                if (idx >= 0) sales[idx] = { ...sales[idx], ...record };
            }
            payload.sales = sales;
        } else if (table === 'expenses') {
            const expenses = Array.isArray(payload.expenses) ? [...payload.expenses] : [];
            if (eventType === 'INSERT') expenses.unshift(record);
            else if (eventType === 'UPDATE') {
                const idx = expenses.findIndex(e => e.id === record.id);
                if (idx >= 0) expenses[idx] = { ...expenses[idx], ...record };
            }
            payload.expenses = expenses;
        } else if (table === 'inventory') {
            const inv = Array.isArray(payload.inventory) ? [...payload.inventory] : [];
            if (eventType === 'INSERT') inv.unshift(record);
            else if (eventType === 'UPDATE') {
                const idx = inv.findIndex(i => i.id === record.id);
                if (idx >= 0) inv[idx] = { ...inv[idx], ...record };
            }
            payload.inventory = inv;
        } else if (table === 'tasks') {
            const tasks = Array.isArray(payload.tasks) ? [...payload.tasks] : [];
            if (eventType === 'INSERT') tasks.unshift(record);
            else if (eventType === 'UPDATE') {
                const idx = tasks.findIndex(t => t.id === record.id);
                if (idx >= 0) tasks[idx] = { ...tasks[idx], ...record };
            }
            payload.tasks = tasks;
        } else if (table === 'requests') {
            const reqs = Array.isArray(payload.requests) ? [...payload.requests] : [];
            if (eventType === 'INSERT') reqs.unshift(record);
            else if (eventType === 'UPDATE') {
                const idx = reqs.findIndex(r => r.id === record.id);
                if (idx >= 0) reqs[idx] = { ...reqs[idx], ...record };
            }
            payload.requests = reqs;
        }

        payload.syncedAt = new Date().toISOString();
        payload._isAuthoritativeCloudSync = false;
        await saveLocalSnapshot(key, 'branch', branchId, payload);
        _notifyDashboardUpdated(key, payload);
    } catch (err) {
        syncLogger.warn('dashboard', 'Branch live patch warning:', err);
    }
}
window.patchBranchDashboardWithLiveRecord = patchBranchDashboardWithLiveRecord;


function _extractArray(res) {
    if (Array.isArray(res)) return res;
    if (res && typeof res === 'object') {
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.items)) return res.items;
    }
    return null;
}

/**
 * Retrieve Owner Overview Dashboard snapshot.
 * Immediately returns cached snapshot (< 20ms) if present, and starts background live sync.
 */
export async function getOwnerDashboardData(ownerId, branchFilter = 'all', branchesList = []) {
    if (!ownerId) return { data: null, isCached: false };
    const snapshotKey = `owner_${ownerId}_${branchFilter}`;

    // 1. Immediate Cache Read
    const cached = await getLocalSnapshot(snapshotKey);
    const cachedData = cached ? cached.data : null;
    const cachedAt = cached ? cached.updated_at : null;

    // 2. Trigger non-blocking background cloud revalidation and live update
    _syncOwnerDashboard(ownerId, branchFilter, branchesList, snapshotKey).catch(err => {
        syncLogger.warn('dashboard', 'Background sync notice:', err.message);
    });

    return {
        data: cachedData,
        cachedAt,
        isCached: !!cachedData
    };
}

async function _syncOwnerDashboard(ownerId, branchFilter, branchesList, snapshotKey) {
    if (_syncLocks.get(snapshotKey)) return;
    _syncLocks.set(snapshotKey, true);
    setSyncingState(true);

    try {
        if (navigator.onLine && supabase?.auth) {
            try {
                const { data: sessData } = await supabase.auth.getSession();
                const session = sessData?.session;
                if (!session || (session.expires_at && session.expires_at * 1000 - Date.now() < 60000)) {
                    syncLogger.log('dashboard', 'Auth token expired or near expiry. Refreshing before owner sync...');
                    await supabase.auth.refreshSession();
                }
            } catch (e) {
                syncLogger.warn('dashboard', 'Pre-sync auth refresh error:', e.message);
            }
        }

        let branches = branchesList;
        if (!branches || branches.length === 0) {
            try {
                branches = await dbBranches.fetchAll(ownerId);
            } catch (e) {
                branches = await getLocalItems('branches', b => b.owner_id === ownerId || !b.owner_id);
            }
        }

        const targetBranches = branchFilter === 'all' ? branches : (branches || []).filter(b => b.id === branchFilter);
        const targetIds = (targetBranches || []).map(b => b.id).filter(Boolean);

        // Fetch recent sales (up to 500) for KPI cards excluding heavy JSON items payload to save egress
        const salesFields = 'id, branch_id, customer, customer_name, amount, cost_amount, gross_profit, created_at, payment, payment_method, item_type';
        const salesQuery = targetIds.length > 0
            ? supabase.from('sales').select(salesFields).in('branch_id', targetIds).order('created_at', { ascending: false }).limit(500)
            : supabase.from('sales').select(salesFields).order('created_at', { ascending: false }).limit(500);

        const inventoryQuery = targetIds.length > 0
            ? supabase.from('inventory').select('*, branches(name)').in('branch_id', targetIds)
            : supabase.from('inventory').select('*, branches(name)');

        const centralInventoryQuery = dbCentralInventory.fetchAll(ownerId).catch(() => []);

        const tasksQuery = targetIds.length > 0
            ? supabase.from('tasks').select('branch_id, status').in('branch_id', targetIds)
            : supabase.from('tasks').select('branch_id, status');

        const capitalQuery = dbCapital.fetchAccounts(ownerId).catch(() => []);

        const queries = [
            salesQuery,
            inventoryQuery,
            centralInventoryQuery,
            tasksQuery,
            targetIds.length > 0 ? dbActivities.fetchRecent(targetIds).catch(() => []) : dbActivities.fetchRecent([]).catch(() => []),
            dbRequests.fetchAll(ownerId).catch(() => []),
            dbStockMovements.fetchAll(ownerId, { limit: 200 }).catch(() => []),
            capitalQuery
        ];


        // 15-second bounded timeout — warm-up can take 6s and the query itself needs time.
        const timeoutPromise = new Promise((resolve) =>
            setTimeout(() => resolve('TIMEOUT'), 15000)
        );

        const raceWinner = await Promise.race([
            Promise.allSettled(queries),
            timeoutPromise
        ]);

        let settled = [];
        let hasFailures = false;

        if (raceWinner === 'TIMEOUT') {
            syncLogger.warn('dashboard', 'Owner queries reached 15s timeout. Hydrating with local offline fallback.');
            hasFailures = true;
            // Give in-flight queries 500ms to complete instead of resolving immediately with null
            settled = await Promise.allSettled(queries.map(q => Promise.race([q, new Promise(r => setTimeout(() => r(null), 500))])));
        } else {
            settled = raceWinner || [];
        }

        // Extract or fallback to local Dexie tables
        let salesData = _extractArray(settled[0]?.value);
        if (salesData === null) {
            hasFailures = true;
            salesData = await getLocalItems('sales', s => {
                if (targetIds.length > 0 && !targetIds.includes(s.branch_id)) return false;
                return true;
            });
        } else if (Array.isArray(salesData) && salesData.length > 0) {
            cacheLocalItems('sales', salesData);
        }

        let branchInventoryData = _extractArray(settled[1]?.value);
        if (branchInventoryData === null) {
            hasFailures = true;
            branchInventoryData = await getLocalItems('inventory', i => {
                return targetIds.length === 0 || targetIds.includes(i.branch_id);
            });
        } else if (Array.isArray(branchInventoryData) && branchInventoryData.length > 0) {
            cacheLocalItems('inventory', branchInventoryData);
        }

        let centralItems = _extractArray(settled[2]?.value);
        if (centralItems === null) {
            centralItems = await getLocalItems('central_inventory', i => !ownerId || i.owner_id === ownerId);
        } else if (Array.isArray(centralItems) && centralItems.length > 0) {
            cacheLocalItems('central_inventory', centralItems);
        }

        // Combine inventory: if central items exist and branchFilter is all, include both
        let mergedInventory = [];
        if (branchFilter === 'all') {
            if (Array.isArray(centralItems) && centralItems.length > 0) {
                mergedInventory = [...centralItems];
            } else if (Array.isArray(branchInventoryData)) {
                mergedInventory = [...branchInventoryData];
            }
        } else {
            mergedInventory = Array.isArray(branchInventoryData) ? branchInventoryData : [];
        }

        let tasksData = _extractArray(settled[3]?.value);
        if (tasksData === null) {
            hasFailures = true;
            tasksData = await getLocalItems('tasks', t => targetIds.length === 0 || targetIds.includes(t.branch_id));
        }

        let activitiesData = _extractArray(settled[4]?.value) || [];
        let requestsData = _extractArray(settled[5]?.value);
        if (requestsData === null) {
            requestsData = await getLocalItems('requests', r => !ownerId || r.owner_id === ownerId);
        }

        let stockMovementsData = _extractArray(settled[6]?.value) || [];
        let capitalAccountsData = _extractArray(settled[7]?.value);
        if (capitalAccountsData === null) {
            capitalAccountsData = await getLocalItems('capital_accounts', a => !ownerId || a.owner_id === ownerId || !a.owner_id);
        } else if (Array.isArray(capitalAccountsData) && capitalAccountsData.length > 0) {
            cacheLocalItems('capital_accounts', capitalAccountsData);
        }

        // Read previous cached snapshot to guard against transient zero-wipe
        const prevCached = await getLocalSnapshot(snapshotKey);
        const prevData = prevCached?.data;

        const isSuspectedAuthDrop = prevData && (
            (Array.isArray(prevData.sales) && prevData.sales.length > 0 && (!salesData || salesData.length === 0)) ||
            (Array.isArray(prevData.inventory) && prevData.inventory.length > 0 && (!mergedInventory || mergedInventory.length === 0))
        );

        if (prevData && typeof prevData === 'object' && (hasFailures || isSuspectedAuthDrop)) {
            if ((!salesData || salesData.length === 0) && Array.isArray(prevData.sales) && prevData.sales.length > 0) {
                salesData = prevData.sales;
                hasFailures = true;
            }
            if ((!mergedInventory || mergedInventory.length === 0) && Array.isArray(prevData.inventory) && prevData.inventory.length > 0) {
                mergedInventory = prevData.inventory;
                hasFailures = true;
            }
            if ((!capitalAccountsData || capitalAccountsData.length === 0) && Array.isArray(prevData.capital_accounts) && prevData.capital_accounts.length > 0) {
                capitalAccountsData = prevData.capital_accounts;
            }
        }

        const payload = {
            sales: salesData || [],
            inventory: mergedInventory || [],
            capital_accounts: capitalAccountsData || [],
            tasks: tasksData || [],
            activities: activitiesData || [],
            requests: requestsData || [],
            stockMovements: stockMovementsData || [],
            branches: (branches && branches.length > 0) ? branches : (prevData?.branches || []),
            syncedAt: new Date().toISOString(),
            _isAuthoritativeCloudSync: !hasFailures,
            _hasQueryFailures: hasFailures
        };


        await saveLocalSnapshot(snapshotKey, 'owner', branchFilter, payload);
        await setSyncMetadata(snapshotKey, hasFailures ? 'OFFLINE_FALLBACK' : 'SUCCESS');
        setSyncingState(false);

        _notifyDashboardUpdated(snapshotKey, payload);
        return payload;
    } catch (err) {
        syncLogger.warn('dashboard', 'Sync error:', err.message);
        await setSyncMetadata(snapshotKey, 'ERROR', err);
        setSyncingState(false, true);
        throw err;
    } finally {
        _syncLocks.delete(snapshotKey);
    }
}

/**
 * Retrieve Branch Dashboard snapshot.
 * Immediately returns cached snapshot (< 20ms) and starts background sync.
 */
export async function getBranchDashboardData(branchId) {
    if (!branchId) return { data: null, isCached: false };
    const snapshotKey = `branch_${branchId}`;

    // 1. Immediate Cache Read
    const cached = await getLocalSnapshot(snapshotKey);
    const cachedData = cached ? cached.data : null;
    const cachedAt = cached ? cached.updated_at : null;

    // 2. Trigger non-blocking background revalidation
    _syncBranchDashboard(branchId, snapshotKey).catch(err => {
        syncLogger.warn('dashboard', 'Branch background sync notice:', err.message);
    });

    return {
        data: cachedData,
        cachedAt,
        isCached: !!cachedData
    };
}

async function _syncBranchDashboard(branchId, snapshotKey) {
    if (_syncLocks.get(snapshotKey)) return;
    _syncLocks.set(snapshotKey, true);
    setSyncingState(true);

    try {
        if (navigator.onLine && supabase?.auth) {
            try {
                const { data: sessData } = await supabase.auth.getSession();
                const session = sessData?.session;
                if (!session || (session.expires_at && session.expires_at * 1000 - Date.now() < 60000)) {
                    syncLogger.log('dashboard', 'Auth token expired or near expiry. Refreshing before branch sync...');
                    await supabase.auth.refreshSession();
                }
            } catch (e) {
                syncLogger.warn('dashboard', 'Pre-sync branch auth refresh error:', e.message);
            }
        }

        const queries = [
            dbSales.fetchAll(branchId, { pageSize: 1000 }),
            dbExpenses.fetchAll(branchId, { pageSize: 1000 }),
            dbTasks.fetchAll(branchId, { pageSize: 1000 }),
            dbInventory.fetchAll(branchId, { pageSize: 1000 }),
            dbRequests.fetchByBranch(branchId),
            supabase.from('branches').select('*').eq('id', branchId).maybeSingle()
        ];

        // 15-second bounded timeout — warm-up can take 6s and the query itself needs time.
        const timeoutPromise = new Promise((resolve) =>
            setTimeout(() => resolve('TIMEOUT'), 15000)
        );

        const raceWinner = await Promise.race([
            Promise.allSettled(queries),
            timeoutPromise
        ]);

        let settled = [];
        let hasFailures = false;

        if (raceWinner === 'TIMEOUT') {
            syncLogger.warn('dashboard', 'Branch queries reached 15s timeout. Hydrating with local offline fallback.');
            hasFailures = true;
            settled = await Promise.allSettled(queries.map(q => Promise.race([q, new Promise(r => setTimeout(() => r(null), 500))])));
        } else {
            settled = raceWinner || [];
        }

        let salesData = _extractArray(settled[0]?.value);
        if (salesData === null) {
            hasFailures = true;
            salesData = await getLocalItems('sales', s => s.branch_id === branchId);
        } else if (Array.isArray(salesData) && salesData.length > 0) {
            cacheLocalItems('sales', salesData);
        }

        let expensesData = _extractArray(settled[1]?.value);
        if (expensesData === null) {
            hasFailures = true;
            expensesData = await getLocalItems('expenses', e => e.branch_id === branchId);
        } else if (Array.isArray(expensesData) && expensesData.length > 0) {
            cacheLocalItems('expenses', expensesData);
        }

        let tasksData = _extractArray(settled[2]?.value);
        if (tasksData === null) {
            hasFailures = true;
            tasksData = await getLocalItems('tasks', t => t.branch_id === branchId);
        }

        let inventoryData = _extractArray(settled[3]?.value);
        if (inventoryData === null) {
            hasFailures = true;
            inventoryData = await getLocalItems('inventory', i => i.branch_id === branchId);
        } else if (Array.isArray(inventoryData) && inventoryData.length > 0) {
            cacheLocalItems('inventory', inventoryData);
        }

        let requestsData = _extractArray(settled[4]?.value);
        if (requestsData === null) {
            requestsData = await getLocalItems('requests', r => r.branch_id === branchId);
        }

        const branchData = settled[5]?.status === 'fulfilled' ? (settled[5].value?.data || null) : null;
        if (branchData && window.state && window.state.role === 'branch') {
            window.state.branchProfile = { ...(window.state.branchProfile || {}), ...branchData };
        }

        // Read previous cached snapshot to guard against transient zero-wipe
        const prevCached = await getLocalSnapshot(snapshotKey);
        const prevData = prevCached?.data;

        const isSuspectedAuthDrop = prevData && (
            (Array.isArray(prevData.sales) && prevData.sales.length > 0 && (!salesData || salesData.length === 0)) ||
            (Array.isArray(prevData.inventory) && prevData.inventory.length > 0 && (!inventoryData || inventoryData.length === 0))
        );

        if (prevData && typeof prevData === 'object' && (hasFailures || isSuspectedAuthDrop)) {
            if ((!salesData || salesData.length === 0) && Array.isArray(prevData.sales) && prevData.sales.length > 0) {
                salesData = prevData.sales;
                hasFailures = true;
            }
            if ((!expensesData || expensesData.length === 0) && Array.isArray(prevData.expenses) && prevData.expenses.length > 0) {
                expensesData = prevData.expenses;
                hasFailures = true;
            }
            if ((!inventoryData || inventoryData.length === 0) && Array.isArray(prevData.inventory) && prevData.inventory.length > 0) {
                inventoryData = prevData.inventory;
                hasFailures = true;
            }
        }

        const payload = {
            sales: salesData || [],
            expenses: expensesData || [],
            tasks: tasksData || [],
            inventory: inventoryData || [],
            requests: requestsData || [],
            branch: branchData || window.state?.branchProfile || prevData?.branch || null,
            syncedAt: new Date().toISOString(),
            _isAuthoritativeCloudSync: !hasFailures,
            _hasQueryFailures: hasFailures
        };

        await saveLocalSnapshot(snapshotKey, 'branch', branchId, payload);
        await setSyncMetadata(snapshotKey, hasFailures ? 'OFFLINE_FALLBACK' : 'SUCCESS');
        setSyncingState(false);

        _notifyDashboardUpdated(snapshotKey, payload);
        return payload;
    } catch (err) {
        syncLogger.warn('dashboard', 'Branch sync error:', err.message);
        await setSyncMetadata(snapshotKey, 'ERROR', err);
        setSyncingState(false, true);
        throw err;
    } finally {
        _syncLocks.delete(snapshotKey);
    }
}
