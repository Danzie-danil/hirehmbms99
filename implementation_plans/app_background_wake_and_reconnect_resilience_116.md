# Implementation Plan - App Background Wake, Reconnect & View Transition Resilience (116)

## Problem Analysis
1. **Artificial Watchdog Timeout Killing View Transitions on Wake:**
   - In `js/app.js`, `switchView()` ran a 5000ms–7000ms `Promise.race` watchdog (`timeoutTask`) on every view render.
   - When returning from background (PWA or desktop tab sleep), TCP sockets and Gotrue auth locks take a few moments to thaw.
   - The 5s watchdog aborted `renderTask`, throwing an artificial timeout error and replacing the entire UI with `renderOfflineViewPlaceholder` ("Network Interrupted, failed to load...").
2. **Destructive Screen Wiping on Tab Navigation:**
   - `switchView()` cleared `mainContent.innerHTML` with a loading spinner before rendering finished.
   - If a view timed out or had a delayed cloud network query, `mainContent` became stuck on the error placeholder.
   - Navigating back to the previously cached view also suffered the same fate because its DOM was wiped and hit the same watchdog timeout.

## Proposed Changes
1. **Remove Artificial Watchdog Timeout in View Router (`js/app.js`):**
   - Remove the hard 5s `Promise.race` watchdog from `switchView()`.
   - Views already load their IndexedDB snapshot immediately (< 15ms) and hydrate cloud data in the background.
   - Allow natural completion without throwing artificial cancellations.
2. **Non-Destructive View Transitions (`js/app.js`):**
   - Prevent wiping existing view DOM if cached content is present.
   - If an unexpected error occurs during view rendering, preserve existing cached content and display a non-intrusive warning toast rather than blanking the page.
3. **Resilient Lazy Module Loader & Wake Warm-Up (`js/app.js`):**
   - In `ensureViewModule()`, if a dynamic `import()` fails on initial wake, evict the failed module promise and retry once automatically before throwing.
   - On `visibilitychange` and `focus`, proactively warm the auth token via `supabase.auth.getSession()` in the background and clear any failed lazy-load entries via `clearViewModuleErrors()`.
4. **App Version & Build Verification:**
   - Bump app version to `3.9.11`.
   - Verify `npm run build` compiles with 0 errors.
