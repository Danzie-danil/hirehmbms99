# End-to-End Real-Time Inventory, Restocking & Stock Requests Sync Plan (144)

## Problem & Root Cause Analysis
1. **Missing Broadcast Triggers in Data Operations:**
   - In `js/db.js`, `broadcastDataMutation` was only wired up for `sales`, `expenses`, `central_inventory`, and `capital_accounts`.
   - Core stock operations (`dbInventory.add`, `dbInventory.updateQty`, `dbInventory.update`, `dbInventory.delete`, `dbRequests.add`, `dbRequests.update`, `dbRequests.delete`, `dbStockMovements.add`, `dbStockTransfers.add`, `dbStockTransfers.update`, `dbCentralInventory.dispatchStock`) were missing mutation broadcast triggers.
   - As a result, when an owner approved a stock request or dispatched stock, or when a branch submitted a request or restocked an item, the other connected devices received no live WebSocket mutation notification.

2. **Missing Realtime Table Subscriptions & Routing:**
   - In `js/realtime.js`, `stock_movements` was absent from `SUBSCRIPTIONS`.
   - `BRANCH_TABLE_VIEWS` lacked view routing for `inventory` changes when active in POS/Sales view, and `OWNER_TABLE_VIEWS` lacked view routing for `requests` to refresh the Owner Overview restock requests counter/widget.
   - Multi-tenant record validation (`isRecordForCurrentTenant`) did not inspect fallback `payload.owner_id` / `payload.branch_id` when raw record objects omit explicit tenant foreign keys.

## Proposed Changes

### 1. Real-Time Engine & Subscriptions (`js/realtime.js`)
- Add `stock_movements` to `SUBSCRIPTIONS` list.
- Expand `BRANCH_TABLE_VIEWS`:
  - Map `inventory` and `central_inventory` to both `inventory` and `sales` (POS product catalog refresh) as well as `dashboard`.
  - Map `requests` to `requests` and `dashboard`.
  - Map `stock_movements` to `inventory` and `shift_summary`.
- Expand `OWNER_TABLE_VIEWS`:
  - Map `requests` to both `requests` view and `overview` view (live update of `overviewBranchRequestsWidget` counter & list).
  - Map `inventory` and `central_inventory` to `central_inventory`, `overview`, and `branches` (live update of Branch Details modal if open).
  - Map `stock_movements` to `stock_movements`, `overview`, and `central_inventory`.
- Enhance `isRecordForCurrentTenant` to check `payload.owner_id` and `payload.branch_id` as robust fallbacks.

### 2. Mutation Broadcast Pipeline in Database Layer (`js/db.js`)
- Integrate `window.broadcastDataMutation` across:
  - `dbInventory.add` -> `('inventory', 'INSERT', item)`
  - `dbInventory.updateQty` -> `('inventory', 'UPDATE', { id: itemId, quantity, branch_id })`
  - `dbInventory.update` -> `('inventory', 'UPDATE', { id, ...payload })`
  - `dbInventory.delete` / `bulkDelete` -> `('inventory', 'DELETE', { id, ids })`
  - `dbInventory.bulkAdd` / `bulkRestock` -> `('inventory', 'INSERT' / 'UPDATE', ...)`
  - `dbRequests.add` -> `('requests', 'INSERT', createdRequest)`
  - `dbRequests.update` -> `('requests', 'UPDATE', { id, ...data })`
  - `dbRequests.delete` -> `('requests', 'DELETE', { id })`
  - `dbStockMovements.add` -> `('stock_movements', 'INSERT', payload)`
  - `dbStockTransfers.add` / `update` -> `('stock_transfers', 'INSERT' / 'UPDATE', ...)`
  - `dbCentralInventory.dispatchStock` -> `('central_inventory', 'UPDATE')`, `('inventory', 'UPDATE')`, `('stock_movements', 'INSERT')`

### 3. Build & Verification
- Compile and test with `npm run build`.
- Verify 0 errors, sync app version to `v3.9.83`, and update `Chat_History/chat_history.txt`.
