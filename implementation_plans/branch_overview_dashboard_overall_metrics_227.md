# Branch Overview Dashboard Overall Metrics Architecture (#branch, #dashboard, #kpi)

## Executive Summary
This implementation plan adjusts the Branch Overview Dashboard (`js/branch/dashboard.js`) to display **overall (all-time aggregate)** metrics instead of daily metrics, while preserving daily sales metric cards inside the dedicated Sales module (`js/branch/sales.js`).

## User Requirement
> "branch overview dashborad should show overal metrics, not daily. daily metrics stay on the sales metric cards."

## Scope & Boundaries
- Role Scope: `#branch`
- Preserved & Protected:
  - `js/branch/sales.js`: All daily metric cards (`Today's Sales`, `Transactions`, `Daily Target Goal`, `Average Ticket Size`) remain untouched and continue serving daily POS analytics.
  - Real-Time & Sync engine: `js/realtime.js`, `js/data/repositories/dashboardRepository.js`, `js/db.js`, `js/data/db.js`, `js/data/syncManager.js` are strictly guarded and untouched.
- Modified File:
  - `js/branch/dashboard.js`: Switch overview KPI cards, target progress, recent stream, and top sellers from daily-filtered datasets to overall branch metrics.
  - `js/i18n.js`: Ensure localization keys for total sales, all-time orders, and recent transactions are mapped in English and Swahili.

## Proposed Changes

### 1. Overall Calculations in `_populateBranchDashboardDOM` (`js/branch/dashboard.js`)
- Calculate overall revenue:
  `overallSalesTotal = rawSales.reduce((s, r) => s + Number(r.amount || 0), 0)`
- Calculate overall expenses:
  `overallExpensesTotal = rawExpenses.reduce((s, e) => s + Number(e.amount || 0), 0)`
- Calculate overall transaction volume:
  `overallTxCount = rawSales.length`
- Retain `todaySalesTotal` and `todayExpenses` strictly for the physical cash drawer & till status widget (`dashTillWidget`).

### 2. Top Bento KPI Cards Row (`#dashKPIs`)
- **Card 1 (Total Sales)**:
  - Title: `Total Sales` (`window.t('total_sales', 'Total Sales')`)
  - Value: `fmt.number(overallSalesTotal)`
  - Subtitle: `${overallTxCount} ${window.t('all_time_sales', 'total sales')}`
  - Tooltip: `Total sales revenue collected by this branch`
- **Card 2 (Total Transactions)**:
  - Title: `Transactions` (`window.t('transactions', 'Transactions')`)
  - Value: `${overallTxCount}`
  - Subtitle: `${completedOrders} completed orders`
  - Tooltip: `Total completed checkouts across all time`
- **Card 3 (Total Expenses)**:
  - Title: `Total Expenses` (`window.t('total_expenses', 'Total Expenses')`)
  - Value: `fmt.number(overallExpensesTotal)`
  - Subtitle: `${rawExpenses.length} ${window.t('entries', 'entries')}`
  - Tooltip: `Total operational costs and payouts recorded`
- **Card 4 (Open Tasks)**:
  - Title: `Open Tasks` (`window.t('nav_my_tasks', 'Open Tasks')`)
  - Value: `${tasks.filter(t => t.status !== 'completed').length}`
  - Subtitle: `To complete`
- **Card 5 (Goals & Targets)**:
  - Title: `Goals & Targets` (`window.t('nav_goals', 'Sales Target')`)
  - Value: `fmt.number(target)`
  - Subtitle: `${target > 0 ? Math.min(100, Math.round((overallSalesTotal / target) * 100)) + '% achieved' : 'No target set'}`
  - Tooltip: `Target sales goal vs overall branch revenue`

### 3. Center Target Radial Progress (`#dashTargetProgress`)
- Calculate achievement based on `overallSalesTotal` vs `target`.
- Label achieved as `Total Sales` rather than `Achieved Today`.

### 4. Recent Transactions Feed (`#dashLiveSalesList`)
- Slices the most recent 6 sales from `rawSales` (not only `sales` filtered by today), allowing the branch team to view the latest order stream regardless of whether transactions occurred today or earlier.
- Updates heading to `Recent Transactions`.

### 5. Top Sellers Leaderboard (`#dashTopSellersCard`)
- Evaluates sold quantities over `rawSales` to display accurate overall top sellers for the branch.

### 6. Verification & Version Sync
- Validate syntax with `node scripts/lint_check.cjs`.
- Run `npm run build`.
- Bump app version in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
- Record changes and lines in `Chat_History/chat_history.txt`.
