# Implementation Plan - Re-enable IndexedDB and Eliminate Aggressive Query Timeouts

## Goal
Re-enable IndexedDB local offline storage caching as requested by the user, and eliminate aggressive short timeouts (3000ms - 4000ms) across database fetch queries and UI hydration layers that were causing `fetchCapitalAccounts timed out after 4000ms` and resulting in dashboard KPI / data disappearance.

---

## User Review & Decisions

> [!NOTE]
> 1. **IndexedDB Restored:** `INDEXEDDB_ENABLED` is set to `true` in `js/data/db.js`, restoring all local caching, Dexie schema stores (v1-v9), offline fallbacks, and sync queues.
> 2. **Query Timeout Expansion:** All aggressive `3000ms`, `3500ms`, and `4000ms` query racing limits have been elevated to `12000ms` (12 seconds). This ensures cloud PostgreSQL queries (including cold start connection overhead and concurrent bulk requests) have ample time to resolve completely instead of prematurely aborting and dropping into empty local state.

---

## Proposed Changes

### Local Storage & IndexedDB Layer
- [MODIFY] `js/data/db.js`: Set `INDEXEDDB_ENABLED = true;`.

### Database Access Layer (`js/db.js`)
- [MODIFY] `js/db.js`:
  - Raised default `withTimeout` from 3500ms to 12000ms.
  - Raised default `_resilientFetch` `timeoutMs` from 4000ms to 12000ms.
  - Raised explicit `withTimeout` limits on sales summary, profit stats, central inventory, stock movements, requests, attendance, asset maintenance, loan repayments, announcements, promotions, goals, stock transfers, and returns from 3500ms to 12000ms.

### Owner Views & Repositories
- [MODIFY] `js/owner/financial_reports.js`: Elevated `_withTimeout` race from 3000ms to 12000ms.
- [MODIFY] `js/owner/analytics.js`: Elevated `_withTimeout` race from 3000ms to 12000ms.
- [MODIFY] `js/owner/tasks.js`: Elevated race timeout from 3500ms to 12000ms.
- [MODIFY] `js/owner/staff.js`: Elevated race timeout from 3500ms to 12000ms.
- [MODIFY] `js/owner/loans.js`: Elevated race timeout from 3500ms to 12000ms.
- [MODIFY] `js/owner/capital.js`: Elevated race timeout from 3500ms to 12000ms.
- [MODIFY] `js/owner/assets.js`: Elevated race timeout from 3500ms to 12000ms.
- [MODIFY] `js/owner/report_pdf_engine.js`: Elevated `_safeFetch` timeout from 3500ms to 12000ms.

---

## Verification Plan

### Automated Tests
1. `npm run build`
2. `node scripts/lint_check.cjs`

### Manual Verification
1. Load Owner Overview Dashboard.
2. Verify all KPI cards (Sales Today, Gross Profit, Total Capital, Stock Cost, Expected Sales) hydrate without `timed out after 4000ms` errors.
