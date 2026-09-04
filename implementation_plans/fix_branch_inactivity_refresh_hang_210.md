# Implementation Plan - Fix Branch Inactivity Refresh Hang & Instant Cache Hydration

## Goal
Eliminate the perpetual skeleton loading state on the Branch Sales Register after background/inactivity wake-up and automate the top nav refresh trigger upon resuming from prolonged idle sessions.

---

## User Review & Decisions

> [!NOTE]
> 1. **Auto-Refresh Trigger on Inactivity Wake (`js/inactivityManager.js`):**
>    - Connected `visibilitychange`, `focus`, and `resume` wake listeners to check whether the inactive duration exceeds the 10-minute threshold (`INACTIVITY_LIMIT_MS`).
>    - When exceeded, `triggerInactivityReload()` automatically executes `triggerAppRefresh()`, spinning the top nav refresh icon, clearing memory caches, and performing a clean re-fetch without requiring manual button clicks.
> 2. **Instant Local IndexedDB Hydration (`js/branch/sales.js`):**
>    - In `refreshSalesModuleData()`, immediately query local Dexie sales records and render the transaction list and KPI cards in < 10ms.
>    - Replaced the blocking `Promise.all` with a resilient race against a 5.5-second fail-safe timeout, preventing network stalls from leaving the UI stuck on skeleton placeholders.

---

## Proposed Changes

### Inactivity Manager (`js/inactivityManager.js`)
- [MODIFY] `js/inactivityManager.js`:
  - Added `checkAndHandleWake` handler on `visibilitychange`, `focus`, and `pageshow`.
  - Automatically invokes `triggerInactivityReload` when wake duration exceeds `INACTIVITY_LIMIT_MS`.

### Branch Sales Register (`js/branch/sales.js`)
- [MODIFY] `js/branch/sales.js`:
  - Implemented `_renderSalesItemsToDOM` helper for instant local hydration and server data updates.
  - Added instant local IndexedDB query in `refreshSalesModuleData` to display transactions immediately.
  - Added 5.5s timeout guarantee to remote fetch race.

---

## Verification Plan

### Automated Tests
1. `npm run build`
2. `node scripts/lint_check.cjs`

### Manual Verification
1. Log in as a branch manager and navigate to the Sales Register.
2. Background or leave the tab inactive for > 10 minutes (or test via `window.recoverAfterInactivity()` / `window.triggerInactivityReload()`).
3. Verify that the app automatically refreshes, immediately populates local sales and KPIs, and does not hang on skeleton pulse blocks or stay in "Syncing...".
