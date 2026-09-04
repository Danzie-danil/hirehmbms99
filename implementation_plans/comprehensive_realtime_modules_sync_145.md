# Comprehensive Real-Time Sync for Operational Modules Plan (145)

## Overview & Scope
Extend real-time WebSocket replication, cache invalidation, and active-view reactivity across:
1. **Customers & Debtors/Credit (`customers`)**
2. **Staff & Roles & Attendance (`staff`, `sys_custom_roles`, `attendance`, `payroll`)**
3. **Suppliers & Purchase Orders (`suppliers`, `purchase_orders`)**
4. **Loans & Liabilities (`loans`, `business_loans`)**
5. **Expenses & Operating Costs (`expenses`, `expense_categories`)**
6. **Capital & Assets (`capital_accounts`, `capital_transactions`, `business_assets`, `asset_maintenance`)**
7. **Tasks & Task Comments (`tasks`, `task_comments`)**

## Proposed Changes

### 1. `js/db.js`
Integrate `window.broadcastDataMutation` across:
- `dbExpenses`: `add`, `update`, `delete`, `bulkDelete`
- `dbCustomers`: `add`, `update`, `delete`, `bulkDelete`, `updateBalance`
- `dbTasks`: `add`, `update`, `delete`, `bulkDelete`, `toggleComplete`, `updateStatus`
- `dbTaskComments`: `add`
- `dbLoans`: `add`, `update`, `delete`, `addRepayment`
- `dbBusinessLoans`: `add`, `update`, `delete`, `addRepayment`
- `dbStaff`: `add`, `update`, `delete`, `bulkDelete`
- `dbAttendance`: `clockIn`, `clockOut`, `record`
- `dbSuppliers`: `add`, `update`, `delete`
- `dbPurchaseOrders`: `add`, `update`, `delete`
- `dbAssets`: `add`, `update`, `delete`
- `dbAssetMaintenance`: `add`, `update`, `delete`

### 2. `js/realtime.js`
- Ensure all operational tables are included in `SUBSCRIPTIONS`.
- Ensure `BRANCH_TABLE_VIEWS` and `OWNER_TABLE_VIEWS` have proper view routing for all operational tables.
- Ensure cache invalidation resets cached objects when mutations arrive (`window.currentAllStaff = null`, `window.currentSuppliersList = null`, `window._cachedCustomers = null`, etc.).

### 3. Build & Version Sync
- Verify with `npm run build`.
- Bump app version to `v3.9.84`.
- Log session in `Chat_History/chat_history.txt`.
