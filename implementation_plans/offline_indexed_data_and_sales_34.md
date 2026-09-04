# Offline Indexed Storage & Offline Sales Implementation Plan

## Problem Statement
Branches cannot add sales or view essential data offline because product lists (inventory), customer directories, and stock items are not persisted and indexed in local IndexedDB storage. Similarly, Owner modules (central inventory catalog, quotations, staff directory, suppliers, tasks) cannot be viewed when offline because their fetch operations lack local IndexedDB caching and fallback mechanisms.

## Objectives
1. **Extend Dexie IndexedDB Schema (`js/data/db.js`)**:
   - Define version 2 schema including `inventory`, `customers`, `sales`, `expenses`, `central_inventory`, `quotations`, `staff`, `branches`, `suppliers`, `tasks`, `notes`, `loans`, `requests`, and `documents`.
   - Provide helper utilities (`cacheLocalItems`, `getLocalItemsByFilter`, `upsertLocalItem`, `deleteLocalItem`) for safe IndexedDB read/write operations.

2. **Equip Data Access Methods with Cache & Offline Fallback (`js/db.js`)**:
   - `dbInventory.fetchAll`, `fetchOne`, `fetchLowStockCount`, `fetchTotalValue`: Save to `localDb.inventory` on success; query `localDb.inventory` when offline.
   - `dbCustomers.fetchAll`, `fetchAllList`, `fetchOne`: Save to `localDb.customers` on success; query `localDb.customers` when offline.
   - `dbSales.fetchAll`, `fetchSummary`, `fetchProfit`, `fetchOne`: Save to `localDb.sales` on success; query `localDb.sales` and compute local metrics when offline.
   - `dbCentralInventory.fetchAll`: Save to `localDb.central_inventory` on success; query `localDb.central_inventory` when offline.
   - `dbQuotations.fetchAll`: Save to `localDb.quotations` on success; query `localDb.quotations` when offline.
   - `dbStaff.fetchAll`: Save to `localDb.staff` on success; query `localDb.staff` when offline.
   - `dbSuppliers.fetchAll`: Save to `localDb.suppliers` on success; query `localDb.suppliers` when offline.
   - `dbTasks.fetchAll`, `fetchByOwner`: Save to `localDb.tasks` on success; query `localDb.tasks` when offline.
   - `dbLoans.fetchAll`: Save to `localDb.loans` on success; query `localDb.loans` when offline.
   - `dbNotes.fetchAll`: Save to `localDb.notes` on success; query `localDb.notes` when offline.
   - `dbRequests.fetchAll`, `fetchByBranch`: Save to `localDb.requests` on success; query `localDb.requests` when offline.
   - `dbDocuments.fetchAll`, `fetchInvoices`: Save to `localDb.documents` on success; query `localDb.documents` when offline.

3. **Enhance Offline Sales POS Workflow**:
   - In `js/branch/sales.js` (`openAddSaleModal`): Safely load cached products and customers from local storage when offline.
   - In `js/modals.js` (`handleAddSale`): Robust offline queueing on network drop, optimistic stock deduction in local IndexedDB, and graceful UI feedback.

4. **Version Bump & Verification**:
   - Increment app version to `v2.8.9` across `release_notes.json`, `public/release_notes.json`, `js/updateChecker.js`, and `public/sw.js`.
   - Run `npm run build` to confirm 0 compilation or lint errors.
   - Record user message and changes in `Chat_History/chat_history.txt`.
