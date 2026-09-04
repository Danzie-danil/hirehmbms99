# Implementation Plan - Branch and Owner KPI Local Dexie/IndexedDB Caching & Offline Synchronization

## Goal Description
Ensure all KPI stat cards across Branch Sales, Branch Expenses, Owner Branches, and Owner Overview instantly reflect and update from the persistent local database (`Dexie`/`IndexedDB` in `js/data/db.js`, `js/db.js`), local caching stores, fallback queries, and offline mutation queues/handlers without delay or discrepancy.

## User Review Required
> [!IMPORTANT]
> - **Dual-Confirmation & Real-Time Sync Guard Check**: This plan refines KPI calculation methods in `js/db.js` (`dbSales.fetchSummary`, `dbSales.fetchProfit`, `dbSales.todayTotal`) and UI module hydration in `js/branch/sales.js` and `js/branch/expenses.js`. It does NOT touch or refactor the real-time websocket engine (`js/realtime.js`) or core pipeline structures.
> - **Instant Offline-First Hydration**: Branch Sales module will render KPIs instantly (< 10ms) from local Dexie IndexedDB upon opening (matching the Branch Dashboard behavior) before reconciling in the background.

## Root Causes Identified
1. **Cloud-Only RPC Skew in `dbSales.fetchSummary` & `dbSales.fetchProfit`**: `dbSales.fetchSummary` calls Supabase RPC `get_branch_sales_summary`, which only counts server records. Local offline sales (`sync_status === 'LOCAL_PENDING'`) recorded in Dexie are ignored until synced.
2. **UTC vs Local Date Timezone Mismatch in Fallback**: In `dbSales.fetchSummary` fallback, `(s.created_at || '').startsWith(todayIso)` compares against UTC date `todayIso`, failing for timezones such as GMT+3 (East Africa / Tanzania).
3. **Missing Instant Local Hydration in `js/branch/sales.js`**: `refreshSalesModuleData()` clears the UI with skeleton loaders and waits on remote network promises instead of immediately populating stats from Dexie IndexedDB.
4. **Paginated Slice Summation in `js/branch/expenses.js`**: Expense total in the module was computed from the paginated 5-item slice rather than all local expenses for the branch.
5. **Offline Sales Omission in `dbSales.todayTotal`**: `dbSales.todayTotal` queried remote Supabase without merging un-synced Dexie records.

---

## Proposed Changes

### 1. Database Helpers & Local Caching (`js/db.js`)
- **[MODIFY] [`js/db.js`](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/db.js)**
  - Update `dbSales.fetchSummary`:
    - First compute immediate local KPI metrics from IndexedDB (`localDb.sales`) using timezone-aware `isCreatedToday`.
    - If online, query cloud RPC with `withTimeout(3500)`, merge local pending offline sales, and cache to IndexedDB.
    - Return resilient, timezone-accurate metrics: `{ today_total, transaction_count, avg_sale }`.
  - Update `dbSales.fetchProfit`:
    - Compute gross profit accurately from local Dexie sales for today (item margins, cart items, or fallback 20%), merged with cloud profit stats.
  - Update `dbSales.todayTotal`:
    - Aggregate today's sales directly from Dexie (`localDb.sales`) with `isCreatedToday` to guarantee offline sales and cloud sales are always included.

### 2. Branch Sales Module Instant Local Hydration (`js/branch/sales.js`)
- **[MODIFY] [`js/branch/sales.js`](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/branch/sales.js)**
  - Add instant local cache hydration to `refreshSalesModuleData()`:
    - Immediately query `localDb.sales` for `state.branchId`, compute KPI numbers, and populate `#salesStatsGrid` with zero latency.
    - In the background, execute `Promise.allSettled` to fetch remote paginated list and refresh the UI smoothly.

### 3. Branch Expenses Module Local KPI Aggregation (`js/branch/expenses.js`)
- **[MODIFY] [`js/branch/expenses.js`](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/branch/expenses.js)**
  - Update KPI calculation to compute total and today's expenses from all local IndexedDB expenses for the branch rather than the 5-item page slice.

---

## Verification Plan

### Automated Build & Lint Check
- Run `npm run build` to verify clean compilation with 0 lint/type errors and service worker sync.

### Manual Verification
1. **Branch Sales KPI Instant Update**:
   - Open Branch Sales module; verify KPI numbers (Today's Sales, Orders, Daily Target, Avg Order, Gross Profit) appear instantly without hanging skeleton loaders.
2. **Offline Sale KPI Reflection**:
   - Record a sale while offline; verify the Sales module and Dashboard KPIs immediately increment according to local Dexie store.
3. **Owner Overview & Branches Reflection**:
   - Switch to Owner view; verify `Branch Management` and `Owner Overview` show accurate branch sales totals reflecting both local and cloud sales.
