import { supabase } from '../../supabase.js';
import { dbTasks, dbBranches, dbActivities, dbRequests, dbStockMovements, dbSales, dbExpenses, dbInventory } from '../../db.js';
import { getLocalSnapshot, saveLocalSnapshot, setSyncMetadata, getLocalItems, localDb } from '../db.js';
import { setSyncingState, isOnline } from '../networkStatus.js';

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
            console.error('[DashboardRepo Listener Error]:', e);
        }
    });
}

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
 * Immediately returns cached snapshot (< 20ms) if present, and starts background sync.
 */
export async function getOwnerDashboardData(ownerId, branchFilter = 'all', branchesList = []) {
    if (!ownerId) return { data: null, isCached: false };
    const snapshotKey = `owner_${ownerId}_${branchFilter}`;

    // 1. Immediate Cache Read
    const cached = await getLocalSnapshot(snapshotKey);
    const cachedData = cached ? cached.data : null;
    const cachedAt = cached ? cached.updated_at : null;

    // 2. Trigger non-blocking background revalidation
    _syncOwnerDashboard(ownerId, branchFilter, branchesList, snapshotKey).catch(err => {
        console.warn('[DashboardRepo] Background sync notice:', err.message);
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
        let branches = branchesList;
        if (!branches || branches.length === 0) {
            try {
                branches = await dbBranches.fetchAll(ownerId);
            } catch (e) {
                // Fallback to local Dexie branches store
                branches = await getLocalItems('branches', b => b.owner_id === ownerId || !b.owner_id);
            }
        }

        const targetBranches = branchFilter === 'all' ? branches : branches.filter(b => b.id === branchFilter);
        const targetIds = targetBranches.map(b => b.id);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const salesQuery = targetIds.length > 0
            ? supabase.from('sales').select('*').in('branch_id', targetIds).gte('created_at', todayStart.toISOString())
            : supabase.from('sales').select('*').gte('created_at', todayStart.toISOString());

        const inventoryQuery = targetIds.length > 0
            ? supabase.from('inventory').select('*, branches(name)').in('branch_id', targetIds)
            : supabase.from('inventory').select('*, branches(name)');

        const tasksQuery = targetIds.length > 0
            ? supabase.from('tasks').select('branch_id, status').in('branch_id', targetIds)
            : supabase.from('tasks').select('branch_id, status');

        const queries = [
            salesQuery,
            inventoryQuery,
            tasksQuery,
            targetIds.length > 0 ? dbActivities.fetchRecent(targetIds).catch(() => []) : dbActivities.fetchRecent([]).catch(() => []),
            dbRequests.fetchAll(ownerId).catch(() => []),
            dbStockMovements.fetchAll(ownerId, { limit: 200 }).catch(() => [])
        ];

        // Resilient 12-second timeout for mobile networks
        const timeoutPromise = new Promise((resolve) =>
            setTimeout(() => resolve('TIMEOUT'), 12000)
        );

        const raceWinner = await Promise.race([
            Promise.allSettled(queries),
            timeoutPromise
        ]);

        let settled = [];
        let hasFailures = false;

        if (raceWinner === 'TIMEOUT') {
            console.warn('[DashboardRepo] Owner queries reached 12s timeout. Hydrating with local offline fallback.');
            hasFailures = true;
            settled = await Promise.allSettled(queries.map(q => Promise.race([q, Promise.resolve(null)])));
        } else {
            settled = raceWinner || [];
        }

        // Extract or fallback to local Dexie tables
        let salesData = _extractArray(settled[0]?.value);
        if (salesData === null) {
            hasFailures = true;
            salesData = await getLocalItems('sales', s => {
                if (targetIds.length > 0 && !targetIds.includes(s.branch_id)) return false;
                const created = new Date(s.created_at || s.timestamp || 0);
                return created >= todayStart;
            });
        }

        let inventoryData = _extractArray(settled[1]?.value);
        if (inventoryData === null) {
            hasFailures = true;
            inventoryData = await getLocalItems('inventory', i => {
                return targetIds.length === 0 || targetIds.includes(i.branch_id);
            });
        }

        let tasksData = _extractArray(settled[2]?.value);
        if (tasksData === null) {
            hasFailures = true;
            tasksData = await getLocalItems('tasks', t => targetIds.length === 0 || targetIds.includes(t.branch_id));
        }

        let activitiesData = _extractArray(settled[3]?.value) || [];
        let requestsData = _extractArray(settled[4]?.value);
        if (requestsData === null) {
            requestsData = await getLocalItems('requests', r => !ownerId || r.owner_id === ownerId);
        }

        let stockMovementsData = _extractArray(settled[5]?.value) || [];

        const payload = {
            sales: salesData || [],
            inventory: inventoryData || [],
            tasks: tasksData || [],
            activities: activitiesData || [],
            requests: requestsData || [],
            stockMovements: stockMovementsData || [],
            branches,
            syncedAt: new Date().toISOString(),
            _hasQueryFailures: hasFailures,
            _isVerifiedEmpty: !hasFailures && (salesData?.length === 0 && inventoryData?.length === 0)
        };

        await saveLocalSnapshot(snapshotKey, 'owner', branchFilter, payload);
        await setSyncMetadata(snapshotKey, hasFailures ? 'OFFLINE_FALLBACK' : 'SUCCESS');
        setSyncingState(false);

        _notifyDashboardUpdated(snapshotKey, payload);
        return payload;
    } catch (err) {
        console.warn('[DashboardRepo] Sync error:', err.message);
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
        console.warn('[DashboardRepo] Branch background sync notice:', err.message);
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
        const queries = [
            dbSales.fetchAll(branchId, { pageSize: 1000 }),
            dbExpenses.fetchAll(branchId, { pageSize: 1000 }),
            dbTasks.fetchAll(branchId, { pageSize: 1000 }),
            dbInventory.fetchAll(branchId, { pageSize: 1000 }),
            dbRequests.fetchByBranch(branchId),
            supabase.from('branches').select('*').eq('id', branchId).maybeSingle()
        ];

        // Resilient 12-second timeout for branch mobile connections
        const timeoutPromise = new Promise((resolve) =>
            setTimeout(() => resolve('TIMEOUT'), 12000)
        );

        const raceWinner = await Promise.race([
            Promise.allSettled(queries),
            timeoutPromise
        ]);

        let settled = [];
        let hasFailures = false;

        if (raceWinner === 'TIMEOUT') {
            console.warn('[DashboardRepo] Branch queries reached 12s timeout. Hydrating with local offline fallback.');
            hasFailures = true;
            settled = await Promise.allSettled(queries.map(q => Promise.race([q, Promise.resolve(null)])));
        } else {
            settled = raceWinner || [];
        }

        let salesData = _extractArray(settled[0]?.value);
        if (salesData === null) {
            hasFailures = true;
            salesData = await getLocalItems('sales', s => s.branch_id === branchId);
        }

        let expensesData = _extractArray(settled[1]?.value);
        if (expensesData === null) {
            hasFailures = true;
            expensesData = await getLocalItems('expenses', e => e.branch_id === branchId);
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
        }

        let requestsData = _extractArray(settled[4]?.value);
        if (requestsData === null) {
            requestsData = await getLocalItems('requests', r => r.branch_id === branchId);
        }

        const branchData = settled[5]?.status === 'fulfilled' ? (settled[5].value?.data || null) : null;
        if (branchData && window.state && window.state.role === 'branch') {
            window.state.branchProfile = { ...(window.state.branchProfile || {}), ...branchData };
        }

        const payload = {
            sales: salesData || [],
            expenses: expensesData || [],
            tasks: tasksData || [],
            inventory: inventoryData || [],
            requests: requestsData || [],
            branch: branchData || window.state?.branchProfile || null,
            syncedAt: new Date().toISOString(),
            _hasQueryFailures: hasFailures,
            _isVerifiedEmpty: !hasFailures && (salesData?.length === 0 && inventoryData?.length === 0)
        };

        await saveLocalSnapshot(snapshotKey, 'branch', branchId, payload);
        await setSyncMetadata(snapshotKey, hasFailures ? 'OFFLINE_FALLBACK' : 'SUCCESS');
        setSyncingState(false);

        _notifyDashboardUpdated(snapshotKey, payload);
        return payload;
    } catch (err) {
        console.warn('[DashboardRepo] Branch sync error:', err.message);
        await setSyncMetadata(snapshotKey, 'ERROR', err);
        setSyncingState(false, true);
        throw err;
    } finally {
        _syncLocks.delete(snapshotKey);
    }
}

