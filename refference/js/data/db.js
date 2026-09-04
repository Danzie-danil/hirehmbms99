import Dexie from 'dexie';

/**
 * BMSTZ Persistent Local Database Engine (IndexedDB via Dexie)
 * Platform-independent, fast (< 15ms), schema-versioned local data store.
 */
export const localDb = new Dexie('BMSTZ_LocalDB');

// Schema Definition Version 1 (Initial release)
localDb.version(1).stores({
    dashboard_snapshots: 'key, role, target_id, updated_at',
    sales: 'id, branch_id, client_tx_id, customer_id, created_at, sync_status',
    inventory: 'id, branch_id, name, sku, updated_at',
    customers: 'id, branch_id, name, phone, updated_at',
    expenses: 'id, branch_id, category, created_at, sync_status',
    purchases: 'id, owner_id, supplier_id, created_at',
    sync_queue: '++id, operation_id, operation_type, entity_type, entity_id, created_at, status',
    sync_metadata: 'entity, last_synced_at, sync_status',
    subscription_snapshot: 'user_id, plan, status, verified_at'
});

// Schema Definition Version 3 (Comprehensive indexing for all entities across sysadmin, owner, and branch)
localDb.version(3).stores({
    dashboard_snapshots: 'key, role, target_id, updated_at',
    sales: 'id, branch_id, client_tx_id, customer_id, created_at, sync_status',
    inventory: 'id, branch_id, name, sku, category, updated_at',
    customers: 'id, branch_id, name, phone, updated_at',
    expenses: 'id, branch_id, category, created_at, sync_status',
    purchases: 'id, owner_id, supplier_id, created_at',
    central_inventory: 'id, owner_id, name, sku, category, updated_at',
    quotations: 'id, owner_id, branch_id, quote_number, customer_name, status, created_at',
    staff: 'id, owner_id, branch_id, full_name, email, role, updated_at',
    branches: 'id, owner_id, name, updated_at',
    suppliers: 'id, owner_id, enterprise_id, name, phone, updated_at',
    tasks: 'id, branch_id, owner_id, status, priority, deadline, updated_at',
    notes: 'id, branch_id, updated_at',
    loans: 'id, branch_id, customer_id, status, updated_at',
    requests: 'id, branch_id, owner_id, status, updated_at',
    documents: 'id, branch_id, type, updated_at',
    announcements: 'id, owner_id, branch_id, title, created_at',
    product_returns: 'id, branch_id, sale_id, created_at',
    stock_transfers: 'id, owner_id, from_branch_id, to_branch_id, status, created_at',
    notifications: 'id, user_id, read, created_at',
    users: 'id, email, role, updated_at',
    sync_queue: '++id, operation_id, operation_type, entity_type, entity_id, created_at, status',
    sync_metadata: 'entity, last_synced_at, sync_status',
    subscription_snapshot: 'user_id, plan, status, verified_at'
});

/**
 * Helper to safely get snapshot from local DB
 */
export async function getLocalSnapshot(key) {
    try {
        const item = await localDb.dashboard_snapshots.get(key);
        return item || null;
    } catch (err) {
        console.warn('[LocalDB] getSnapshot error:', err);
        return null;
    }
}

/**
 * Helper to safely save snapshot to local DB with non-destructive cache integrity protection.
 * Prevents transient query timeouts or errors from wiping existing valid snapshot data.
 */
export async function saveLocalSnapshot(key, role, targetId, data) {
    if (!key || !data || typeof data !== 'object') return;
    try {
        const existing = await localDb.dashboard_snapshots.get(key);
        const existingData = existing && existing.data && typeof existing.data === 'object' ? existing.data : null;

        // Sanitize incoming payload to guarantee pure arrays, never error objects
        const sanitized = {};
        for (const [prop, val] of Object.entries(data)) {
            if (Array.isArray(val)) {
                sanitized[prop] = val;
            } else if (val && typeof val === 'object' && Array.isArray(val.data)) {
                sanitized[prop] = val.data;
            } else if (val && typeof val === 'object' && Array.isArray(val.items)) {
                sanitized[prop] = val.items;
            } else if (val && typeof val === 'object' && val.error) {
                // Supabase error object: preserve existing cache for this property if available
                sanitized[prop] = (existingData && Array.isArray(existingData[prop])) ? existingData[prop] : [];
            } else {
                sanitized[prop] = val;
            }
        }

        // Cache Integrity Guard: if incoming critical arrays (sales, inventory) are empty,
        // but existing cache has valid items, retain existing to protect against timeout wipes
        if (existingData) {
            const criticalProps = ['sales', 'inventory', 'expenses', 'tasks', 'branches', 'profiles', 'requests', 'activities', 'stockMovements'];
            for (const prop of criticalProps) {
                const incomingArr = sanitized[prop];
                const existingArr = existingData[prop];
                if (Array.isArray(existingArr) && existingArr.length > 0) {
                    if (!Array.isArray(incomingArr) || incomingArr.length === 0) {
                        // Check if incoming was a failed/timeout fallback vs verified cloud empty
                        if (data._isVerifiedEmpty !== true && data._hasQueryFailures === true) {
                            sanitized[prop] = existingArr;
                        }
                    }
                }
            }
        }

        await localDb.dashboard_snapshots.put({
            key,
            role: role || 'owner',
            target_id: targetId || 'all',
            data: sanitized,
            updated_at: new Date().toISOString()
        });
    } catch (err) {
        console.warn('[LocalDB] saveSnapshot error:', err);
    }
}

/**
 * Bulk cache items into a specific localDb table safely
 */
export async function cacheLocalItems(tableName, items) {
    if (!items || !Array.isArray(items) || items.length === 0) return;
    try {
        if (localDb[tableName]) {
            // Clean items to ensure they have an id
            const validItems = items.filter(item => item && item.id);
            if (validItems.length > 0) {
                await localDb[tableName].bulkPut(validItems);
            }
        }
    } catch (err) {
        console.warn(`[LocalDB] cacheLocalItems error on table ${tableName}:`, err);
    }
}

/**
 * Query items from a local table with optional filtering and sorting
 */
export async function getLocalItems(tableName, filterFn = null, sortField = null, ascending = true) {
    try {
        if (!localDb[tableName]) return [];
        let items = await localDb[tableName].toArray();
        if (typeof filterFn === 'function') {
            items = items.filter(filterFn);
        }
        if (sortField) {
            items.sort((a, b) => {
                const valA = a[sortField] ?? '';
                const valB = b[sortField] ?? '';
                if (valA < valB) return ascending ? -1 : 1;
                if (valA > valB) return ascending ? 1 : -1;
                return 0;
            });
        }
        return items;
    } catch (err) {
        console.warn(`[LocalDB] getLocalItems error on table ${tableName}:`, err);
        return [];
    }
}

/**
 * Upsert a single item into localDb
 */
export async function upsertLocalItem(tableName, item) {
    if (!item || !item.id) return;
    try {
        if (localDb[tableName]) {
            await localDb[tableName].put(item);
        }
    } catch (err) {
        console.warn(`[LocalDB] upsertLocalItem error on table ${tableName}:`, err);
    }
}

/**
 * Delete an item from localDb
 */
export async function deleteLocalItem(tableName, id) {
    if (!id) return;
    try {
        if (localDb[tableName]) {
            await localDb[tableName].delete(id);
        }
    } catch (err) {
        console.warn(`[LocalDB] deleteLocalItem error on table ${tableName}:`, err);
    }
}

/**
 * Update entity synchronization metadata
 */
export async function setSyncMetadata(entity, status, error = null) {
    try {
        await localDb.sync_metadata.put({
            entity,
            last_synced_at: new Date().toISOString(),
            sync_status: status,
            last_error: error ? (error.message || String(error)) : null
        });
    } catch (err) {
        console.warn('[LocalDB] setSyncMetadata error:', err);
    }
}

/**
 * Get sync metadata for a given entity
 */
export async function getSyncMetadata(entity) {
    try {
        return await localDb.sync_metadata.get(entity);
    } catch (err) {
        return null;
    }
}

/**
 * Save verified server entitlements to IndexedDB
 */
export async function saveEntitlementsToIndexedDB(userId, entitlements) {
    if (!userId || !entitlements || typeof entitlements !== 'object') return;
    try {
        await localDb.subscription_snapshot.put({
            user_id: userId,
            plan: entitlements.plan_id || 'free_trial',
            status: entitlements.is_active ? 'active' : 'inactive',
            entitlements: entitlements,
            verified_at: new Date().toISOString()
        });
    } catch (err) {
        console.warn('[LocalDB] Entitlements save warning:', err);
    }
}

/**
 * Get verified server entitlements from IndexedDB
 */
export async function getEntitlementsFromIndexedDB(userId) {
    if (!userId) return null;
    try {
        const item = await localDb.subscription_snapshot.get(userId);
        return item && item.entitlements ? item.entitlements : null;
    } catch (err) {
        console.warn('[LocalDB] Entitlements read warning:', err);
        return null;
    }
}

export default localDb;

if (typeof window !== 'undefined') {
    window.localDb = localDb;
    window.saveEntitlementsToIndexedDB = saveEntitlementsToIndexedDB;
    window.getEntitlementsFromIndexedDB = getEntitlementsFromIndexedDB;
}
