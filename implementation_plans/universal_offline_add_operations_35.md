# Universal Offline "Add +" Operations & Multi-Entity Sync Engine

## Problem & Goal
Currently, offline queueing and automatic sync was primarily wired for Sales transactions. The user wants **all "Add +" operations across both Branch and Owner modules** to be fully functional offline:
- When a user (Branch or Owner) adds a **Customer**, **Expense**, **Product / Stock item**, **Task**, **Note**, **Loan**, **Request**, **Quotation**, **Staff member**, **Supplier**, or **Central Catalog item** while offline:
  1. The item must immediately get an optimistic local ID (e.g. `cust_off_...`).
  2. The item must immediately be persisted into `localDb.<table_name>` so it shows up instantly in data tables, select dropdowns, POS product pickers, and KPI stats.
  3. The operation is queued into the offline sync queue.
  4. When internet connection is restored, the queue engine automatically replays the pending creations to Supabase sequentially and updates local records to the authoritative server IDs.

## Proposed Architecture

### 1. Universal Offline Queue Engine (`js/offline_queue.js`)
Upgrade `offline_queue.js` from a sales-only queue into a multi-entity sync processor:
- **`queueOfflineOperation(entityType, operationType, payload, meta)`**:
  - Generates client idempotency UUID (`client_tx_id`).
  - Generates temporary ID (`${prefix}_off_${timestamp}_${rand}`).
  - Puts the record immediately into `localDb[entityType]` with `sync_status = 'LOCAL_PENDING'`.
  - Pushes operation to the persistent offline queue.
  - Updates offline status indicator badge in the UI (`X pending offline changes`).
- **`syncOfflineOperations()`**:
  - Processes queued operations in topological order:
    1. Base entities: `suppliers`, `customers`, `staff`
    2. Catalog/Inventory: `central_inventory`, `inventory`
    3. Transactions: `sales`, `expenses`, `quotations`, `documents`, `loans`, `requests`, `tasks`, `notes`
  - Calls the corresponding `db<Entity>.add` or Supabase API for each queued operation.
  - On server response, updates the record in `localDb` with its permanent server ID and marks `sync_status = 'SYNCED'`.
  - Shows clear, non-intrusive sync toasts ("✅ Synced 4 offline changes").

### 2. Modal Handlers Universal Offline Interception (`js/modals.js`)
Wrap all modal addition handlers with offline detection & graceful queueing:
- **`handleAddCustomer`**: Queues customer offline, immediately saves to `localDb.customers`, closes modal, shows success toast.
- **`handleAddExpense`**: Queues expense offline, immediately saves to `localDb.expenses`, closes modal, shows success toast.
- **`handleAddProduct` / `handleQuickAddProduct`**: Queues product offline, immediately saves to `localDb.inventory`, closes modal, shows success toast.
- **`handleAddTask`**: Queues task offline, saves to `localDb.tasks`.
- **`handleAddNote`**: Queues note offline, saves to `localDb.notes`.
- **`handleAddLoan`**: Queues loan offline, saves to `localDb.loans`.
- **`handleAddRequest`**: Queues request offline, saves to `localDb.requests`.
- **`handleAddStaff`**: Queues staff member offline, saves to `localDb.staff`.
- **`handleAddSupplier`**: Queues supplier offline, saves to `localDb.suppliers`.
- **`handleAddQuotation`**: Queues quotation offline, saves to `localDb.quotations`.
- **`handleAddCentralProduct`**: Queues central inventory item offline, saves to `localDb.central_inventory`.

### 3. Data Access Layer Local Cache Sync (`js/db.js`)
- Ensure all `db<Entity>.add` methods automatically upsert to `localDb` upon server return.
- Handle transient network drops during `db<Entity>.add` by falling back to `queueOfflineOperation`.

### 4. UI & Sync Status Visuals
- Update `offlineSyncBanner` to display total count of all pending offline operations (e.g. `3 sales, 1 customer pending`).
- Add "Sync Now" button that triggers `syncOfflineOperations()`.

## Verification Plan
1. **Offline Adding**:
   - Disconnect or simulate offline mode.
   - Add a Customer -> Verify customer appears immediately in customer list & POS modal dropdown.
   - Add an Expense -> Verify expense appears in expense table and updates totals.
   - Add an Inventory Item -> Verify product appears in inventory table and POS product select.
   - Add a Task/Note/Loan/Quotation/Staff/Supplier -> Verify instant local reflection.
2. **Reconnection & Sync**:
   - Reconnect online -> Verify `online` listener fires and syncs all queued items to Supabase.
   - Verify server IDs replace temporary IDs without duplicates.
3. **Build Integrity**:
   - Run `npm run build` to verify 0 build errors.
   - Bump app version to `v2.9.0`.
