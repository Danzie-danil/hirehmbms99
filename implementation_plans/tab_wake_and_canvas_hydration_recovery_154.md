# Implementation Plan - Tab Wake and Canvas Hydration Recovery (154)

Address the empty main content canvas issue when reopening/waking backgrounded or discarded tabs.

## Root Causes Identified
1. **Double-Invocation in `initAuth()`**: `_tryOptimisticRestore()` fires an initial `setupDashboard()` / `applyDashboardRole()`, while `initAuth()` fires a duplicate `setupDashboard()` when network revalidation completes, producing race conditions on dynamic module loading.
2. **Defensive Identity in `renderOwnerOverview()`**: `renderOwnerOverview()` early-returns silently if `state.ownerId` is temporarily unpopulated during optimistic microtasks.
3. **Dormant Client Reference in `handleGlobalAppWake()`**: `supabaseClient` is undefined in `js/app.js` (should be `supabase`).
4. **Missing Canvas Self-Healing Watchdog**: When `#app` is visible and the user is logged in, but `#mainContent` is blank or left with an aborted spinner, the system needs an automatic fallback to trigger `switchView(currentView)`.

## Proposed Changes

### [js/auth.js](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/auth.js)
- Guard `setupDashboard()` and `applyDashboardRole()` in `initAuth()` so that if an optimistic restore has already mounted the dashboard canvas, revalidation smoothly syncs profile/state in-place without abruptly firing duplicate view render calls.

### [js/owner/overview.js](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/owner/overview.js)
- Ensure `renderOwnerOverview()` defensively retrieves `ownerId` from `state.ownerId || state.currentUserUuid || state.profile?.id || localStorage.getItem('bms_last_active_user')` so it never aborts early during wake/cold-boot transitions.

### [js/app.js](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/app.js)
- Fix `supabaseClient` to `supabase` in `handleGlobalAppWake()`.
- Add an automatic canvas self-healing check in `handleGlobalAppWake()` and `switchView()`: if `#mainContent` is detected as empty while the app is active, automatically recover and render the active view.

## Verification Plan
1. Validate JS syntax and module references.
2. Run `npm run build` to confirm production build compiles with 0 errors.
3. Log all changes in `Chat_History/chat_history.txt`.
