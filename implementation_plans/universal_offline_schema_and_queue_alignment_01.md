# Implementation Plan: Universal Offline Schema, Dexie Mirroring & Mutation Queue Alignment_01

## Problem Description
Per our offline-first workspace rule, every table, schema, and operation must have corresponding Dexie/IndexedDB schemas in `js/data/db.js`, caching pipelines & fallback queries in `js/db.js`, and offline mutation queue handlers in `js/offline_queue.js`.

### Identified Gaps:
1. **Dexie LocalDB Schema (`js/data/db.js`)**:
   - `localDb` version 5 is missing indexes for `attendance`, `payroll`, `shifts`, `stock_movements`, `promotions`, `goals`, `purchase_orders`, `messages`, `asset_maintenance`, `inventory_purchases`, and `custom_roles`.
   - `scrubForeignTenantIndexedDBData` needs to include the newly indexed stores.
2. **Offline Mutation Queue (`js/offline_queue.js`)**:
   - `syncOfflineOperations()` switch block was missing handlers for `business_loans`, `capital_accounts`, `business_assets`, `attendance`, `shifts`, `promotions`, `goals`, `quotations`, `documents`, `announcements`, `stock_transfers`, and `purchase_orders`.
3. **Database Caching & Fallback Queries (`js/db.js`)**:
   - `dbAttendance`, `dbPayroll`, `dbShifts`, `dbPromotions`, `dbGoals`, `dbPurchaseOrders`, `dbStockMovements`, `dbStockTransfers`, `dbReturns`, and `dbAssetMaintenance` need `cacheLocalItems` and `getLocalItems` integration so they immediately return cached data during offline or unstable network conditions.

---

## Proposed Changes

### 1. `js/data/db.js`
- Define `localDb.version(6)` with all missing entity stores.
- Update `scrubForeignTenantIndexedDBData` to clean all multi-tenant tables.

### 2. `js/offline_queue.js`
- Add cases in `syncOfflineOperations()` for all entity types so queued records sync smoothly when connection restores.

### 3. `js/db.js`
- Integrate `cacheLocalItems` and `getLocalItems` across `dbAttendance`, `dbPayroll`, `dbShifts`, `dbPromotions`, `dbGoals`, `dbPurchaseOrders`, `dbStockMovements`, `dbStockTransfers`, `dbReturns`, and `dbAssetMaintenance`.

---

## Verification Plan
1. **Build Verification**:
   - Run `npm run build` to verify 0 syntax or bundling errors.
2. **Local Dexie Check**:
   - Verify all stores initialize cleanly in IndexedDB without version upgrade errors.
