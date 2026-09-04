# Immediate Full App Reload on App Resume After Inactivity (117)

## Problem
When devices or browsers remain inactive or backgrounded for prolonged periods, background TCP sockets to cloud endpoints are suspended by mobile OS and Chromium power managers. Upon wake, soft in-memory reconciliation could experience connection latency or display stale local snapshot data.

## Solution
1. **Immediate Full Reload on Resume After Inactivity:**
   - In `js/inactivityManager.js`, whenever the user returns to the app (via tab visibility change, window focus, BFCache/pageshow restore, or mobile PWA resume) after being idle or backgrounded for >= 5 minutes, immediately trigger `window.location.reload()`.
   - Before reloading, preserve the active view in URL hash (`#view=...`) so the user returns to the exact same screen.
   - Clear backgrounded timestamp flags so the fresh reload starts cleanly without reload loops.

2. **Lifecycle Coordination:**
   - In `js/lifecycle.js`, if `timeInBackground >= 5 * 60 * 1000` (5 minutes), coordinate with `inactivityManager` to trigger an immediate clean full reload.

3. **Simplified Release Notes:**
   - Synchronized version `3.9.13` across `release_notes.json`, `public/release_notes.json`, `js/updateChecker.js`, and `public/sw.js`.
   - Release notes text simplified to "Minor bugs and fixes".

## Verification
- Run `npm run build` to compile assets and verify zero build/lint errors.
- Verified reload logic retains user session, avoids reload loops, and preserves view routing.
