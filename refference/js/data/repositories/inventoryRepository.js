import { dbInventory } from '../../db.js';
import { localDb, setSyncMetadata } from '../db.js';
import { isOnline } from '../networkStatus.js';

/**
 * Inventory Repository (Data Access Layer)
 * Provides cache-first inventory lookups, low stock thresholds, and offline reads.
 */

export async function getInventory(branchId, options = {}) {
    if (!branchId) return { items: [], total: 0 };

    try {
        const localItems = await localDb.inventory.where('branch_id').equals(branchId).sortBy('name');

        if (isOnline()) {
            dbInventory.fetchAll(branchId, options).then(async (remoteRes) => {
                if (remoteRes && Array.isArray(remoteRes.items)) {
                    await localDb.inventory.bulkPut(remoteRes.items);
                    await setSyncMetadata(`inventory_${branchId}`, 'SUCCESS');
                }
            }).catch(e => {
                console.warn('[InventoryRepo] Background inventory fetch warning:', e.message);
            });
        }

        return {
            items: localItems.length > 0 ? localItems : [],
            total: localItems.length,
            isFromCache: true
        };
    } catch (err) {
        console.warn('[InventoryRepo] Local fetch fallback:', err);
        return dbInventory.fetchAll(branchId, options);
    }
}
