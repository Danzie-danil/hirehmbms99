import { supabase } from '../../supabase.js';
import { dbSales } from '../../db.js';
import { localDb, setSyncMetadata } from '../db.js';
import { isOnline, setSyncingState } from '../networkStatus.js';

/**
 * Sales Repository (Data Access Layer)
 * Handles cache-first sales querying, offline persistence, and idempotent checkout operations.
 */

export async function getSales(branchId, options = {}) {
    if (!branchId) return { items: [], total: 0 };

    try {
        // 1. Try reading from local IndexedDB first
        const localSales = await localDb.sales.where('branch_id').equals(branchId).reverse().sortBy('created_at');
        
        // 2. Trigger background fetch if online
        if (isOnline()) {
            dbSales.fetchAll(branchId, options).then(async (remoteRes) => {
                if (remoteRes && Array.isArray(remoteRes.items)) {
                    await localDb.sales.bulkPut(remoteRes.items);
                    await setSyncMetadata(`sales_${branchId}`, 'SUCCESS');
                }
            }).catch(e => {
                console.warn('[SalesRepo] Background sales fetch warning:', e.message);
            });
        }

        return {
            items: localSales.length > 0 ? localSales : [],
            total: localSales.length,
            isFromCache: true
        };
    } catch (err) {
        console.warn('[SalesRepo] Local fetch fallback:', err);
        return dbSales.fetchAll(branchId, options);
    }
}

/**
 * Creates a sale transaction with an idempotent client_tx_id UUID.
 */
export async function createSaleTransaction(salePayload, branchId) {
    const clientTxId = salePayload.client_tx_id || crypto.randomUUID();
    const localSale = {
        id: 'off_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        branch_id: branchId,
        client_tx_id: clientTxId,
        created_at: new Date().toISOString(),
        sync_status: isOnline() ? 'SYNCING' : 'LOCAL_PENDING',
        ...salePayload
    };

    // Store in local DB immediately
    await localDb.sales.put(localSale);

    if (isOnline()) {
        try {
            setSyncingState(true);
            const { data, error } = await supabase.rpc('create_sale', {
                p_branch_id: branchId,
                p_customer: salePayload.customer || null,
                p_items: salePayload.items || null,
                p_payment_method: salePayload.payment_method || 'cash',
                p_amount_paid: salePayload.amount_paid || salePayload.total,
                p_discount: salePayload.discount || 0,
                p_notes: salePayload.notes || null,
                p_client_tx_id: clientTxId
            });

            if (error) throw error;

            // Mark confirmed in local DB
            localSale.sync_status = 'SYNCED';
            if (data && data.id) localSale.id = data.id;
            await localDb.sales.put(localSale);
            setSyncingState(false);
            return { success: true, data };
        } catch (err) {
            console.warn('[SalesRepo] Online sale creation failed, queued locally:', err.message);
            localSale.sync_status = 'LOCAL_PENDING';
            await localDb.sales.put(localSale);
            await localDb.sync_queue.add({
                operation_id: clientTxId,
                operation_type: 'CREATE_SALE',
                entity_type: 'sales',
                entity_id: localSale.id,
                payload: salePayload,
                created_at: new Date().toISOString(),
                attempt_count: 1,
                status: 'PENDING',
                last_error: err.message
            });
            setSyncingState(false, true);
            return { success: true, offline: true, data: localSale };
        }
    } else {
        // Enqueue to persistent sync_queue for background replay
        await localDb.sync_queue.add({
            operation_id: clientTxId,
            operation_type: 'CREATE_SALE',
            entity_type: 'sales',
            entity_id: localSale.id,
            payload: salePayload,
            created_at: new Date().toISOString(),
            attempt_count: 0,
            status: 'PENDING',
            last_error: null
        });
        return { success: true, offline: true, data: localSale };
    }
}
