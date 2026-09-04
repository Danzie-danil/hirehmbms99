# [Implementation Plan] App Resume & Unopened Background Sidebar Navigation & View Recovery

Fixing the issue where opening the app after extended background sleep or inactivity leaves the side navigation empty and main page view blank.

## Problem Analysis

When the application is unopened for a certain duration or left backgrounded on mobile/desktop:
1. Mobile OS hibernation, tab sleep, or screen lock suspends JS execution and can discard volatile memory state.
2. Upon opening the app (visibility change, tab focus, or app resume), session restoration or background auth revalidation re-hydrates state in memory (`state.role = 'owner'`).
3. However, the role-specific sidebar navigation containers (`#ownerNav`, `#branchNav`, and `#sysadminNav`) in `app/index.html` default to `class="hidden"`.
4. When `_tryRestoreOfflineSession` or background resume logic executed without calling `applyDashboardRole` or un-hiding the active role container, all three sidebar navigation containers remained hidden. This caused `#sidebarNav` to render as a completely blank white sidebar (except for the bottom user avatar card).
5. Additionally, if network session re-verification timed out or view module loading was interrupted during wake-up, `#mainContent` remained empty/blank until the user manually refreshed the application twice.

## Proposed Changes

### Core Architecture & UI Layer

#### [MODIFY] [`js/ui/dashboardView.js`](file:///d:/v2%20BMS%20OFFICIAL/js/ui/dashboardView.js)
- Add `window.ensureSidebarNavVisible(role)` global helper function:
  - Takes `role` (or falls back to `state.role` or `localStorage.getItem('bms_last_role')`).
  - Ensures `#ownerNav`, `#branchNav`, or `#sysadminNav` is explicitly un-hidden (`classList.remove('hidden')`) while hiding the other role containers.
  - Ensures `#app` is visible and `#loginScreen` is hidden.
  - Checks if `#sidebarNav` has any visible child element; if all are hidden, forces the matching role container to be visible immediately.
- Update `applyDashboardRole(role)` to call `ensureSidebarNavVisible(role)` automatically.

#### [MODIFY] [`js/lifecycle.js`](file:///d:/v2%20BMS%20OFFICIAL/js/lifecycle.js)
- Enhance `handleAppResume(reason)`:
  1. Restore session from cached verified session if `state.role` or memory state was cleared during background sleep.
  2. Call `window.ensureSidebarNavVisible(state.role)` and `window.applyDashboardRole(state.role)` immediately on every resume event (`visible`, `pageshow`, `focus`, `online`, `resume`).
  3. Clear module loading errors (`window.clearViewModuleErrors()`).
  4. Inspect both `#sidebarNav` and `#mainContent`: If `#sidebarNav` navigation items are missing or `#mainContent` is empty/blank/stuck loading, trigger `window.switchView(getCurrentView(), null, true)` to restore full view state without requiring manual refresh.

#### [MODIFY] [`js/auth.js`](file:///d:/v2%20BMS%20OFFICIAL/js/auth.js)
- Update `_tryRestoreOfflineSession(session, shouldReRenderUI)`:
  - Call `window.ensureSidebarNavVisible(cached.role)` even when `shouldReRenderUI` is `false`, ensuring DOM navigation is 100% synchronized with memory state.
- Update `_tryOptimisticRestore()`:
  - Ensure `state.role` is assigned prior to running `setupDashboard()`.
- Update `initAuth()`:
  - Handle wake-up network timeouts gracefully: If backend session fetch times out during background wake-up, fall back to cached verified session and keep sidebar & main view active rather than resetting memory or leaving DOM unrendered.

#### [MODIFY] [`js/app.js`](file:///d:/v2%20BMS%20OFFICIAL/js/app.js)
- Update `window.applyModuleRestrictions()`:
  - Invoke `window.ensureSidebarNavVisible(state.role)` to ensure active navigation container is visible before filtering buttons.

## Verification Plan

### Manual Verification
1. Test switching between tabs, locking device, and resuming after extended inactivity.
2. Verify sidebar navigation (`#ownerNav` / `#branchNav` / `#sysadminNav`) links render cleanly upon opening the app.
3. Verify main content dashboard loads smoothly without requiring double refresh.
4. Test offline resume behavior to ensure cached session renders sidebar and main content instantly.

### Automated Verification
1. Run `npm run build` to compile Service Worker and Vite bundle, ensuring zero build or lint errors.
