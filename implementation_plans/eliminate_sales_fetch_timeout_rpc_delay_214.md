# Implementation Plan: Eliminate Sales Fetch Timeout & Slow RPC Hang (214)

## Overview
The user reported console warnings indicating that `refreshSalesModuleData()` timed out after 5500ms (`[BranchSales] Background fetch notice: sales_fetch_timeout`), followed by three 12,000ms timeouts from `dbSales.fetchSummary` (`get_branch_sales_summary`), `dbSales.fetchProfit` (`get_branch_profit_stats`), and `dbInventory.fetchAll`. 

Bundling these heavy, slow-to-respond RPCs and a 1,000-item inventory fetch into `Promise.all` on every sales list render blocks the remote data pipeline and triggers timeout warnings.

---

## Proposed Changes

### 1. Decouple and Replace Slow RPCs with Direct Table Queries (`js/branch/sales.js`)
- Replace the dependency on `dbSales.fetchSummary(branchId)` and `dbSales.fetchProfit(branchId)` with a direct, fast indexed query on `sales`:
  - `client.from('sales').select('amount,gross_profit,profit,cost_amount,items,item_name,item_type').eq('branch_id', branchId)...`
  - Runs in ~150ms instead of 12,000ms RPC timeout.
  - Automatically computes today's total, transaction count, average ticket, and profit margin.
  - Falls back instantly to local Dexie cache if offline or slow network.

### 2. Cache & Asynchronously Hydrate Service Names (`js/branch/sales.js`)
- Do not block the primary sales page fetch on `dbInventory.fetchAll(branchId, { pageSize: 1000 })`.
- Utilize `window.localDb.inventory` immediately for instant service resolution.
- Keep in-memory cache `window._branchServiceNamesCache` so repeated list updates, page changes, and searches take 0ms for service classification.

### 3. Eliminate `sales_fetch_timeout` Race Failure
- With direct table queries completing in < 300ms, the remote fetch will resolve well within the timeout threshold without throwing errors or blocking the UI.

---

## Verification Plan
1. `node scripts/lint_check.cjs` (0 issues).
2. `npm run build` (0 bundling errors).
3. Bump version to `v3.9.226` in `release_notes.json` and `js/updateChecker.js`.
4. Prepend log entry to `Chat_History/chat_history.txt`.
