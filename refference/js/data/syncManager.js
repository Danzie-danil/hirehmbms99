import { localDb } from './db.js';
import { isOnline, setSyncingState } from './networkStatus.js';
import { supabase } from '../supabase.js';
import { state } from '../state.js';

let _isSyncing = false;
let _syncInterval = null;

export const syncManager = {
    /**
     * Initialize background sync triggers
     */
    init() {
        window.addEventListener('online', () => {
            console.log('[SyncManager] Online detected. Processing pending queue & syncing...');
            this.processPendingQueue();
        });

        window.addEventListener('focus', () => {
            if (isOnline() && document.visibilityState === 'visible') {
                this.processPendingQueue();
            }
        });

        // Periodic sync every 2 minutes
        if (_syncInterval) clearInterval(_syncInterval);
        _syncInterval = setInterval(() => {
            if (isOnline() && document.visibilityState === 'visible') {
                this.processPendingQueue();
            }
        }, 120000);
    },

    /**
     * Process all queued offline mutations with server idempotency
     */
    async processPendingQueue() {
        if (_isSyncing || !isOnline()) return;
        _isSyncing = true;

        try {
            const pendingOperations = await localDb.sync_queue.where('status').equals('PENDING').toArray();
            if (pendingOperations.length === 0) {
                _isSyncing = false;
                return;
            }

            setSyncingState(true);
            console.log(`[SyncManager] Syncing ${pendingOperations.length} queued mutations...`);

            for (const op of pendingOperations) {
                try {
                    op.attempt_count = (op.attempt_count || 0) + 1;
                    op.status = 'SYNCING';
                    await localDb.sync_queue.put(op);

                    if (op.operation_type === 'CREATE_SALE') {
                        const { data, error } = await supabase.rpc('create_sale', {
                            p_branch_id: op.payload.branch_id || state.branchId,
                            p_customer: op.payload.customer || null,
                            p_items: op.payload.items || null,
                            p_payment_method: op.payload.payment_method || 'cash',
                            p_amount_paid: op.payload.amount_paid || op.payload.total,
                            p_discount: op.payload.discount || 0,
                            p_notes: op.payload.notes || null,
                            p_client_tx_id: op.operation_id
                        });

                        if (error) throw error;

                        op.status = 'CONFIRMED';
                        await localDb.sync_queue.put(op);

                        // Update local sale record
                        const localSale = await localDb.sales.where('client_tx_id').equals(op.operation_id).first();
                        if (localSale) {
                            localSale.sync_status = 'SYNCED';
                            if (data && data.id) localSale.id = data.id;
                            await localDb.sales.put(localSale);
                        }
                    }
                } catch (opErr) {
                    console.error(`[SyncManager] Failed op ${op.id}:`, opErr.message);
                    op.status = op.attempt_count >= 5 ? 'REJECTED' : 'PENDING';
                    op.last_error = opErr.message;
                    await localDb.sync_queue.put(op);
                }
            }

            setSyncingState(false);
        } catch (err) {
            console.error('[SyncManager] Queue run error:', err);
            setSyncingState(false, true);
        } finally {
            _isSyncing = false;
        }
    }
};

export default syncManager;
