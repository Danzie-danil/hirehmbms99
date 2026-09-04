
class OfflineQueueManager {
    constructor(dbName = 'BMSTZ_OfflineDB', version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.storeName = 'failed_sales';
        this.db = null;
        this.initPromise = this.initDB();
    }

    initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {

                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };

            request.onerror = (event) => {
                console.error('[OfflineQueue] IndexedDB error:', event.target.error);
                reject(event.target.error);
            };
        });
    }


    async queueSale(saleData) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            const queuedItem = {
                ...saleData,
                // Stable idempotency key — used as p_client_tx_id on sync to prevent duplicate sales
                client_tx_id: saleData.client_tx_id || crypto.randomUUID(),
                id: 'offline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                queued_at: new Date().toISOString()
            };

            const request = store.add(queuedItem);

            request.onsuccess = () => resolve(queuedItem);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async getQueuedSales() {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async removeQueuedSale(id) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    }
}

window.offlineQueue = new OfflineQueueManager();

window.addEventListener('online', async () => {

    if (typeof showToast === 'function') {
        showToast('Back online! Syncing offline sales...', 'info');
    }

    try {
        const queuedSales = await window.offlineQueue.getQueuedSales();
        if (queuedSales.length === 0) return;

        let successCount = 0;
        for (const sale of queuedSales) {
            const { id, queued_at, client_tx_id, ...supabaseData } = sale;

            // Use the server-authoritative RPC so the backend validates, calculates
            // profit/cost, and deducts stock atomically. client_tx_id ensures idempotency.
            const { error } = await supabase.rpc('create_sale', {
                p_branch_id:    supabaseData.branch_id || null,
                p_customer:     supabaseData.customer   || null,
                p_items:        supabaseData.items       || null,
                p_amount:       Number(supabaseData.amount) || 0,
                p_payment:      supabaseData.payment     || 'cash',
                p_product_id:   supabaseData.product_id  || null,
                p_qty:          parseInt(supabaseData.quantity || supabaseData.qty) || 1,
                p_price_type:   supabaseData.price_type  || 'retail',
                p_client_tx_id: client_tx_id             || null
            });

            if (!error) {
                await window.offlineQueue.removeQueuedSale(id);
                successCount++;
            } else {
                console.error('[OfflineQueue] Failed to sync sale:', error);
            }
        }

        if (successCount > 0 && typeof showToast === 'function') {
            showToast(`Successfully synced ${successCount} offline sale(s)!`, 'success');

            if (typeof renderBranchSales === 'function') {
                await renderBranchSales();
            }
        }
    } catch (err) {
        console.error('[OfflineQueue] Sync error:', err);
    }
});
