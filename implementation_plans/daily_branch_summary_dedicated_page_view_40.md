# Implementation Plan: Daily Branch Summary Dedicated Page View (Rewrite) - #40

## Objective
Completely rewrite the **Daily Branch Summary** from a modal dialog into a first-class, standalone BMSTZ Page View (`daily_summary`) that renders directly into `#mainContent` with a dedicated top header (pill back navigation, title, date subtitle, transaction and branch badges), responsive 4-KPI metrics strip, financial breakdown cards (mobile) / matrix table (desktop), and a bottom action bar with a prominent "Back to Overview" button.

## Proposed Changes

### 1. View Routing & Lazy Loading (`js/app.js`)
- Add `daily_summary: () => import('./owner/overview.js')` to `ownerViewLoaders`.
- Add `case 'daily_summary': await window.renderDailySummaryView?.(extraData); break;` to `renderOwnerView()`.

### 2. Dedicated View Implementation (`js/owner/overview.js`)
- Implement `export async function renderDailySummaryView(breakdownData)`.
- Self-recovering data pipeline: if `window.currentBranchBreakdown` is missing (e.g. on direct deep-link or page refresh), automatically fetch fresh branches and today's sales to compute metrics.
- Render rich, responsive mobile-first UI with:
  * Top navigation header with pill back button (`switchView('overview')`), icon, title, date, and branch badges.
  * 4 KPI summary cards (Total Revenue, COGS, Gross Profit %, Active Branches).
  * Mobile cards with progress bar and 3-stat financial summary.
  * Desktop matrix table with consolidated footer.
  * Bottom action bar with centered, comfortable "Back to Overview" pill button.
- Update overview trigger button to call `switchView('daily_summary')`.

### 3. Version Bump & Sync
- Bump version to `2.9.10` across `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.

### 4. Build & Verification
- Execute `npm run build` to verify 0 errors.
