# Implementation Plan: Offline Sync Pipeline & RPC Signature Alignment (221)

## Problem & Background
When transactions (sales, expenses, customers) are recorded on mobile, network instability or timeouts (>5s) cause operations to fallback into the local IndexedDB/Dexie cache (`localDb`) and offline queues (`sync_queue` and `bms_offline_sales_queue`).
However, when the phone attempts to replay pending sales:
1. `js/data/syncManager.js` invokes `create_sale` RPC with parameter names `p_payment_method` and `p_amount_paid` instead of the database RPC's expected `p_payment` and `p_amount`.
2. As a result, PostgreSQL rejects the replay with a signature error, permanently stalling the queue.
3. Because the records never commit to the remote Supabase database, Supabase Realtime CDC never broadcasts them to other devices or the owner account.
4. Mobile devices often don't trigger the browser's `online` event when resuming from sleep while connected to cellular/Wi-Fi, leaving queued mutations unflushed until a hard reload.

## Proposed Changes

### 1. Align RPC Parameter Signatures in `js/data/syncManager.js`
- Update `op.operation_type === 'CREATE_SALE'` in `processPendingQueue()`:
  - Map `p_amount: Number(op.payload.amount || op.payload.amount_paid || op.payload.total || 0)`
  - Map `p_payment: op.payload.payment || op.payload.payment_method || 'cash'`
  - Map `p_product_id: op.payload.product_id || op.payload.productId || null`
  - Map `p_qty: parseInt(op.payload.quantity || op.payload.qty) || 1`
  - Map `p_price_type: op.payload.price_type || 'retail'`
  - Keep `p_client_tx_id: op.operation_id` for backend idempotency.
- If the sale has additional `cart_items`, deduct local and cloud inventory for secondary items as done in `dbSales.add`.

### 2. Multi-Trigger Queue Replay & Flushing
- In `js/data/syncManager.js`, ensure `processPendingQueue()` is actively invoked:
  - When the window receives `focus` or `visibilitychange` (app resume).
  - Immediately after adding an item to `localDb.sync_queue` in `js/db.js` if the network is online.

### 3. Mobile Sync Status & Manual Flush
- In `js/offline_queue.js` or top status bar, provide an unobtrusive sync status indicator showing when offline items are pending sync, with a direct "Sync Now" tap action to allow immediate manual retry.

## Verification Plan
1. `node scripts/lint_check.cjs` to ensure 0 syntax/lint errors.
2. `npm run build` to verify clean bundle compilation.
