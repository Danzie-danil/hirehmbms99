# Implementation Plan: Branch Expenses Daily View & Multi-Day History Filtering (212)

## Overview
Replicate the high-performance daily-first and on-demand history architecture established for sales in the Branch Expense Tracker (`js/branch/expenses.js`). By default, the Branch Expense Tracker will query only today's expenses, with instant local IndexedDB cache hydration, debounced server-side search, a segmented toggle between Today and History, quick time range pills (All History, Yesterday, Last 7 Days, Last 30 Days), strict boundaries for Yesterday (`< todayStart`), inclusion of today's expenses in multi-day history ranges, and the premium droplist for page size controls (`10 / page`, `25 / page`, `50 / page`).

---

## Proposed Changes

### 1. State & Controls (`js/branch/expenses.js`)
- Update `expensesPageState`:
  ```javascript
  let expensesPageState = {
      page: 1,
      pageSize: 10,
      totalCount: 0,
      filterMode: 'today', // 'today' | 'history'
      historyRange: 'all', // 'all' | 'yesterday' | '7d' | '30d'
      searchQuery: ''
  };
  ```
- Add pagination and mode switch handlers:
  - `changeExpensesPage(delta)`
  - `changeExpensesPageTo(page)`
  - `changeExpensesPageSize(size)` (with synchronization to desktop and mobile dropdown labels)
  - `setExpensesFilterMode(mode)`
  - `setExpensesHistoryRange(range)`
  - `handleExpensesSearchInput(value)` (debounced 300ms)
  - `updateExpensesFilterUI()`
  - `renderExpensesPageSizeDroplist(id, isMobile)` using `window.renderPremiumSelect`

### 2. Query Engine & Safe Date Boundaries (`js/branch/expenses.js`)
- Add `fetchBranchExpensesServer(branchId, { page, pageSize, dateFilterStart, dateFilterEnd, searchQuery })`:
  - Directly queries Supabase `expenses` table via `window.supabaseClient || window.supabase` (strictly avoiding modifications to protected `js/db.js`).
  - Supports `.gte('created_at', dateFilterStart)` and `.lt('created_at', dateFilterEnd)`.
  - Supports `.or('description.ilike,category.ilike')`.
  - Supports `.order('created_at', { ascending: false }).range(from, to)`.
  - Offline Dexie fallback via `window.localDb.expenses`.
- Date range rules:
  - **`today`**: `dateFilterStart = todayStart`, `dateFilterEnd = null`.
  - **`yesterday`**: `dateFilterStart = yesterdayStart`, `dateFilterEnd = todayStart` (strictly `< todayStart` so today's expenses never leak into yesterday).
  - **`7d`**: `dateFilterStart = 7 days ago`, `dateFilterEnd = null` (seamlessly includes today).
  - **`30d`**: `dateFilterStart = 30 days ago`, `dateFilterEnd = null` (seamlessly includes today).
  - **`all`**: `dateFilterStart = null`, `dateFilterEnd = null`.

### 3. DOM & UI Layout (`js/branch/expenses.js`)
- Shell mounting pattern (`#expensesShell` container) to avoid wiping the entire DOM and showing loaders on tab clicks.
- Segmented mode toggle: `[ • Today's Expenses ]` vs `[ Expense History ]`.
- Range pills: `All History`, `Yesterday`, `Last 7 Days`, `Last 30 Days`.
- Premium droplist for page sizes: desktop header + mobile footer.
- Dynamic ledger header (`#expensesLedgerTitle`) and badge (`#expensesFilterModeBadge`).
- Informative empty states with 1-click action buttons (`+ Add Expense`, `Fetch Expense History`, `Back to Today's Expenses`, `Clear Search`).

---

## Verification Plan
1. `node scripts/lint_check.cjs` (0 issues).
2. `npm run build` (0 bundling errors).
3. Bump version to `v3.9.224` in `release_notes.json` and `js/updateChecker.js`.
4. Update `Chat_History/chat_history.txt`.
