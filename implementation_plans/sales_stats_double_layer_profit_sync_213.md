# Implementation Plan: Eliminate Double Data Layer & Synchronize Sales Stats / Profit (213)

## Overview
The user reported a "double data layer" effect on the Branch Sales Register:
1. **Profit Margin jumping from `67,000` to `1,133,600`:**
   During initial fast-path hydration (< 10ms), local Dexie sales correctly calculated today's profit margin (`67,000`). When the remote fetch completed, `dbSales.fetchProfit(branchId)` returned the branch's **cumulative all-time gross profit** (`1,133,600`) from `get_branch_profit_stats`, overwriting the today's profit stat card.
2. **Item tag jumping from `CUSTOM` to `SERVICE` & subtitle jumping from `1 orders` to `0 orders, 1 service`:**
   The fast-path passed an empty `new Set()` for `serviceNames` because `inventory` was only fetched in the second remote phase. Without service names, "ANDIKO LA MRADI" was classified as a custom product price (`CUSTOM`), and the order breakdown defaulted to `1 orders`. When the remote inventory arrived, it re-classified it as `SERVICE` and updated the breakdown to `0 orders, 1 service`.

---

## Proposed Changes

### 1. Unified Fast-Path Hydration (`js/branch/sales.js`)
- In `refreshSalesModuleData()`:
  - Concurrently load `window.localDb.inventory` alongside `window.localDb.sales` in the fast-path.
  - Pre-populate `serviceNames` immediately in < 10ms from local inventory (`item_type === 'service'` or category/unit 'service').
  - Immediately compute `localBreakdown = { productOrders, services }` in the fast path.
  - Pass `serviceNames` and `localBreakdown` to `_renderSalesItemsToDOM` and `renderSalesStatsDOM` during fast path.
  - Result: The sale item is rendered with the `SERVICE` badge on Frame 1, and the subtitle reads `0 orders, 1 service` immediately without flickering or jumping.

### 2. Timeframe-Scoped Profit Calculation (`js/branch/sales.js`)
- In `refreshSalesModuleData()` remote completion:
  - When `salesPageState.filterMode === 'today'`:
    - Compute `todayGrossProfit` strictly from today's sales items (`todayItems.reduce(...)`).
    - Pass `{ gross_profit: todayGrossProfit }` (evaluating to `67,000`) to `renderSalesStatsDOM`.
    - Both fast-path and remote finish will display `67,000 Net earnings`, eliminating the jump to `1,133,600`.
  - When `salesPageState.filterMode === 'history'`:
    - If `historyRange === 'all'`: use all-time `profit.gross_profit` (`1,133,600`).
    - If `yesterday`, `7d`, or `30d`: compute the profit from the sales of that specific timeframe.
- In `renderSalesStatsDOM()`:
  - Dynamically update stat title: `${salesPageState.filterMode === 'today' ? "Today's Profit" : "Gross Profit"}`.

---

## Verification Plan
1. `node scripts/lint_check.cjs` (0 issues).
2. `npm run build` (0 bundling errors).
3. Bump version to `v3.9.225` in `release_notes.json` and `js/updateChecker.js`.
4. Prepend log entry to `Chat_History/chat_history.txt`.
