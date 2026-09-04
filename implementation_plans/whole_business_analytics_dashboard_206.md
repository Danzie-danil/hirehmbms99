# Implementation Plan - Whole Business Analytics Dashboard

## Goal
Transition the Owner Analytics Dashboard from daily-only sales metrics to cumulative, whole-business enterprise analytics across all operating branches, providing accurate all-time revenue, expenses, net profit, branch performance comparisons, and dynamic branch filtering.

---

## User Review & Decisions

> [!NOTE]
> 1. **Whole Business Scope:** Total Revenue, Total Expenses, Net Profit, Average Revenue per Branch, and Inventory Turnover are now calculated from the complete sales and expense datasets across all active branches, rather than restricting to today's daily tally.
> 2. **Dynamic Branch Filter Integration:** Added seamless consolidated and single-branch filtering (`window.handleAnalyticsBranchChange`) so owners can view analytics for the whole business enterprise or isolate a specific outlet.
> 3. **Consistent Chart Visualizations:** Updated Revenue by Branch and Revenue vs Target charts to display cumulative business throughput against branch performance targets.

---

## Proposed Changes

### Owner Analytics Module (`js/owner/analytics.js`)
- [MODIFY] `js/owner/analytics.js`:
  - Fetched all sales and expenses across all registered branches.
  - Computed `b.totalRevenue` and `b.todaySales` for each branch.
  - Calculated cumulative `totalSales`, `totalExpenses`, and `netProfit` across the entire enterprise or selected branch filter.
  - Updated KPI cards and subtitles to reflect consolidated enterprise performance.
  - Updated `revenueChart` and `targetChart` in `initAnalyticsCharts` to plot whole-business branch figures.
  - Connected `analyticsBranchFilter` dropdown with live `window.handleAnalyticsBranchChange`.

---

## Verification Plan

### Automated Tests
1. `npm run build`
2. `node scripts/lint_check.cjs`

### Manual Verification
1. Navigate to Analytics view in Owner portal.
2. Confirm that Total Revenue, Total Expenses, Net Profit, and Avg / Branch display whole business data (not just "Today").
3. Change Branch filter in dropdown to verify instantaneous update of KPIs and charts for individual branches and consolidated views.
