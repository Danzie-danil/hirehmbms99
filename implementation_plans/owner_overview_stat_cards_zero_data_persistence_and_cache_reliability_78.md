# Implementation Plan: Universal Zero-Data Persistence & Cache Integrity Architecture across Owner, Branch, and Sysadmin

**Date:** 2026-08-22  
**Scope:** `#global` (Owner, Branch, Sysadmin, all modules, KPIs & stats)  
**Target Files:**
- [`js/data/repositories/dashboardRepository.js`](file:///d:/v2%20BMS%20OFFICIAL/js/data/repositories/dashboardRepository.js)
- [`js/data/db.js`](file:///d:/v2%20BMS%20OFFICIAL/js/data/db.js)
- [`js/owner/overview.js`](file:///d:/v2%20BMS%20OFFICIAL/js/owner/overview.js)
- [`js/admin/dashboard.js`](file:///d:/v2%20BMS%20OFFICIAL/js/admin/dashboard.js)
- [`js/db.js`](file:///d:/v2%20BMS%20OFFICIAL/js/db.js)

---

## 1. Problem Statement & User Directive

### User Voice Transcript & Chat:
> *"When I'm on mobile or desktop... all stat cards (sales today, gross profit, total available capital, branch inventory cost, branch expected sales) show zero. It's like they're not being pulled... only when I completely close the app and reopen it, then the stat cards were loaded for a while, but disappeared again... quick update: I just cleared all cache which logged me out, after logging back in the data was back. I think there is a mismatch in local data and cloud data persistence and reliability."*
> 
> **User Directive:** *"this fix should be applied across all modules, data, kpis, stats, and for all users (owner, branch, sysadmin)"*

---

## 2. Universal Root Cause Matrix

| Role / Module | Failure Point | Manifestation |
|---|---|---|
| **Owner Overview** (`dashboardRepository.js` & `overview.js`) | 4.5s query timeout + unconditional `saveLocalSnapshot` overwrite of `{ data: [] }` | Sales Today, Gross Profit, Inventory Cost, Expected Sales reset to `0` |
| **Branch Dashboard** (`dashboardRepository.js` & `shifts.js` / POS) | 4.5s query timeout in `_syncBranchDashboard` + empty payload overwrite | Today's sales, drawer totals, stock count, and pending tasks reset to `0` |
| **SysAdmin Dashboard** (`admin/dashboard.js`) | 2.5s query timeout in `queryWithTimeout` + empty `adminProfiles = []` / `adminBranches = []` catch blocks with no IndexedDB caching | Total Businesses, Active Branches, MRR, Platform Health reset to `0` |
| **Core Storage Engine** (`data/db.js`) | `saveLocalSnapshot` had no integrity check; permitted empty/poisoned payloads to overwrite valid cached data | Once a bad sync occurred, subsequent loads read empty cache |
| **Entity Fallback** (`db.js` & `dashboardRepository.js`) | Background sync bypassed local IndexedDB entity tables (`localDb.sales`, `localDb.inventory`) | Failed cloud queries didn't fallback to offline Dexie data |

---

## 3. Comprehensive Multi-Role Solution Architecture

### 1. Core Cache Integrity Guard (`js/data/db.js`)
- **Non-Destructive Snapshot Protection:** Upgrade `saveLocalSnapshot(key, role, targetId, newData)`:
  - If existing snapshot in IndexedDB contains valid populated records (e.g. `sales.length > 0` or `inventory.length > 0`), and `newData` contains empty arrays or undefined/error objects due to query timeout/failure, **preserve the existing valid records** rather than overwriting with empty data.
  - Strictly sanitize all collections to ensure arrays are valid (`Array.isArray(x) ? x : []`), preventing object errors from entering the cache.

### 2. Owner & Branch Dashboard Synchronization (`js/data/repositories/dashboardRepository.js`)
- **Extend Timeout Window:** Increase the network query timeout from 4.5s to 12s to accommodate slow mobile cellular connections.
- **Local Dexie Entity Fallback:** If cloud queries fail or time out:
  - Automatically query local IndexedDB stores (`localDb.sales`, `localDb.inventory`, `localDb.expenses`, `localDb.tasks`, `localDb.branches`) to compute and hydrate the dashboard metrics.
- **Sanitized Extraction:** Clean every query result with robust checks (`Array.isArray(res?.data) ? res.data : (Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []))`).
- **Branch Resolution Guard:** Ensure `branches` is properly fetched via `dbBranches.fetchAll(ownerId)` if `state.branches` is not yet initialized.

### 3. SysAdmin Dashboard Persistence (`js/admin/dashboard.js`)
- **Extend Query Timeout:** Increase `queryWithTimeout` from 2.5s to 12s.
- **IndexedDB Snapshot Caching for SysAdmin:** Store `sysadmin_summary`, `profiles`, and `branches` in `localDb.dashboard_snapshots` so sysadmin views load instantly (< 20ms) and retain data even during transient network drops or slow cloud responses.
- **Resilient Fallback:** If cloud queries fail, retain and reuse the existing in-memory/cached profiles and branches rather than resetting arrays to `[]`.

### 4. Overview KPI Computations (`js/owner/overview.js`)
- **Capital Accounts Resilience:** Check `state.ownerId`, `state.profile?.id`, and cached accounts so `dbCapital.fetchAccounts` does not return 0 when user ID is loading.
- **Date Matching Robustness:** Ensure `isCreatedToday(s)` accounts for local vs UTC timestamps accurately.

### 5. Entity Store Protection (`js/db.js`)
- Ensure `dbSales`, `dbInventory`, `dbExpenses`, `dbTasks`, `dbCustomers`, and `dbBranches` maintain resilient cache reads via `getLocalItems` whenever cloud queries fail.

---

## 4. Verification & Testing Plan

### Automated Build Verification:
- Run `npm run build` to ensure 0 bundling, lint, or syntax errors.

### Multi-Role Manual Verification:
1. **Owner Overview:** Verify Sales Today, Gross Profit, Total Capital, Branch Inventory Cost, and Expected Sales render correctly, survive page switches, and do not drop to 0 on slow networks or reload.
2. **Branch Dashboard:** Verify Branch Sales, Expenses, and Inventory counts render immediately from cache and stay intact during background revalidation.
3. **SysAdmin Dashboard:** Verify Businesses, Branches, MRR, and platform metrics remain stable and cached without dropping to 0 on network latency.
4. **Offline / Cache Inspection:** Inspect DevTools IndexedDB (`BMSTz_LocalDB -> dashboard_snapshots`) to verify that valid data structures are preserved and never overwritten with empty arrays.
