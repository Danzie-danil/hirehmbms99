# App Hibernation Resume & Cloud Sync Recovery (#155)

## Overview
When the application is left in the background or tab hibernation, the browser/OS network stack suspends TCP connections. Upon waking up:
1. Supabase queries stall silently because the browser's HTTP/2 connection pool is dead.
2. Memory caches were cleared in `handleAppResume`, leading to 0 values when watchdog timeouts trigger.
3. The 5-minute background reload safeguard was rejected due to strict 20-minute inactivity thresholds.
4. The warm-up probe in `lifecycle.js` ignored failure results and allowed hung queries to proceed.

## Proposed Changes

### 1. `js/lifecycle.js`
- Enforce the connection warm-up probe (`_warmUpSupabaseConnection`). If the probe fails, immediately trigger `window.triggerInactivityReload('manual_force')` to cleanly reset the network stack.
- Fix the 5-minute background duration check to pass `'manual_force'` so that `inactivityManager.js` does not reject the reload.
- Preserve fallback caches instead of zeroing them if a reload isn't triggered, preventing modules like Inventory from showing 0 values.

### 2. `js/db.js`
- Wrap `dbCentralInventory.fetchAll`, `dbCentralInventory.fetchOne`, and other primary fetch functions with `withTimeout(..., 7000)` so that if a network stall occurs, it fails quickly and hydrates seamlessly from Dexie/IndexedDB local storage.

### 3. `release_notes.json` & `js/updateChecker.js`
- Auto-sync and bump version to `3.9.107`.

## Verification Plan
1. Run `npm run build` to verify full compilation without lint/syntax errors.
2. Confirm that `_warmUpSupabaseConnection` handles hung connections and triggers recovery.
3. Confirm Dexie fallbacks properly activate on query timeouts.

