# Tab Switch & App Resume Session Persistence Fix

## Problem Description
When the user switches to another window, minimizes the application, or navigates to another app and returns, the dashboard data stops loading and becomes stuck/stale, with the sidebar `#currentUser` element losing the active user's identity.

## Root Cause Analysis
1. **Race Condition in `js/lifecycle.js`**: On `visibilitychange` and `focus`, `handleAppResume` explicitly called `supabase.auth.refreshSession()` with a 3-second timeout. Since `@supabase/supabase-js` is configured with `autoRefreshToken: true`, Supabase already manages token refreshes internally. When `refreshSession()` is called manually upon resume, it causes a concurrency collision with Supabase's Refresh Token Rotation (RTR). The server rejects the duplicate/already-rotated token with a 400 error, which causes Supabase client to trigger a `SIGNED_OUT` event.
2. **Unguarded `SIGNED_OUT` Handler in `js/auth.js`**: In `initPasswordRecoveryListener()`, the `SIGNED_OUT` handler unconditionally set `state.profile = null; state.currentUser = null; state.role = null;` even when the user never clicked logout (i.e., background auth token glitch).
3. **No UI Identity Fallback in `js/ui/dashboardView.js`**: When `state.currentUser` was set to `null`, the observer cleared `#currentUser.textContent`, causing the sidebar to revert to blank / default text.

## Proposed Changes

### 1. `js/lifecycle.js`
- Remove the conflicting manual `supabase.auth.refreshSession()` call on app resume.
- Add resilient session verification: if `state.role` or `state.currentUser` is missing upon resume, automatically restore state in memory from the verified offline session cache without triggering disruptive view re-renders.

### 2. `js/auth.js`
- In `logout()`, set `sessionStorage.setItem('bms_is_logging_out', 'true')` before initiating signout.
- In `initPasswordRecoveryListener()`, only clear memory state on `SIGNED_OUT` if `bms_is_logging_out` is `true`. If triggered in the background without explicit user logout, immediately restore state from `_tryRestoreOfflineSession(null, false)` to keep the app active and resilient.
- Update `_tryRestoreOfflineSession(session, shouldReRenderUI = true)` to allow memory-only restoration when `shouldReRenderUI` is `false`.

### 3. `js/ui/dashboardView.js`
- Add resilient fallback to `currentUser` observer in `initDashboardView()` to prevent blanking if a transient null assignment occurs.

### 4. App Version Bump
- Bump to `v2.8.6` across `release_notes.json`, `public/release_notes.json`, `js/updateChecker.js`, and `public/sw.js`.

## Verification Plan
- Build verification: `npm run build` with 0 errors.
- Manual test scenario: switch window / tab away and back, verify user identity in sidebar remains solid and modules continue fetching data seamlessly.
