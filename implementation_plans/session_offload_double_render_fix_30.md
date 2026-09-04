# Session "Offloaded/Logged Out" State — Double Render Race Condition Fix

## Problem Description

The user reports that navigating between modules causes the app to get stuck in a "Loading..." state with the sidebar showing "Admin / Manage Account" instead of the actual user email. This resolves only with a hard refresh.

## Root Cause Analysis

The issue is a **double-render race condition** in `initAuth()` caused by the optimistic restore + full session revalidation flow:

### The Chain of Events

1. **`_tryOptimisticRestore()`** runs first (line 1099 in `auth.js`):
   - Hydrates `state` from localStorage cache
   - Calls `setupDashboard()` → `applyDashboardRole('owner')` → `switchView(lastOwnerView)`
   - The view starts rendering (e.g., "Loading branches..." then fetches data)
   - Returns `true`

2. **`initAuth()` continues executing** (does NOT return early after optimistic restore):
   - `dbAuth.getSession()` fetches from Supabase (1-4 seconds)
   - `Promise.allSettled([7 queries])` runs (2-5 seconds)
   - Re-sets all `state.*` properties (triggers Proxy subscribers)
   - **Calls `setupDashboard()` AGAIN** at line 1263
   - **Calls `applyDashboardRole()` AGAIN** at line 1265
   - This triggers `switchView(lastOwnerView)` AGAIN, which:
     - Wipes `mainContent` to "Loading view..." spinner
     - Re-renders the module from scratch
     - Races with the 5-second watchdog timeout

3. **Additionally**, `state.role = 'owner'` being re-set at line 1246 fires the `subscribe` handler in `dashboardView.js` line 235-237, which calls `applyDashboardRole(value)` → `switchView(lastView)` for a potential **THIRD** render pass.

### Why the Sidebar Shows "Admin"

- The HTML default for `#currentUser` is `"Admin"` (line 970 in `index.html`)
- During the second render cycle, the `switchView` call blanks mainContent but the sidebar `#currentUser` element reverts to default when the DOM is re-parsed or when the subscriber fires with a stale value
- The `TOKEN_REFRESHED` `onAuthStateChange` handler (line 559-574) may silently fail to re-fetch the profile, leaving `state.currentUser` unset

## Proposed Changes

### 1. `js/auth.js` — Prevent Double Dashboard Initialization

#### [MODIFY] [auth.js](file:///d:/v2%20BMS%20OFFICIAL/js/auth.js)

After the full session revalidation succeeds and `hadOptimisticRestore` is `true`:
- **Skip** `setupDashboard()` and `applyDashboardRole()` (already called by optimistic restore)
- **Only silently update** `state` properties and refresh the localStorage cache
- This eliminates the second render pass that wipes the already-rendered module

Changes at lines 1257-1266:
```diff
-        document.getElementById('loginScreen')?.classList.add('hidden');
-        document.getElementById('app')?.classList.remove('hidden');
-        setupDashboard();
-        if (typeof window.applyDashboardRole === 'function') {
-            window.applyDashboardRole(state.role);
-        }
+        if (!hadOptimisticRestore) {
+            document.getElementById('loginScreen')?.classList.add('hidden');
+            document.getElementById('app')?.classList.remove('hidden');
+            setupDashboard();
+            if (typeof window.applyDashboardRole === 'function') {
+                window.applyDashboardRole(state.role);
+            }
+        } else {
+            // Optimistic restore already initialized the dashboard.
+            // Silently update the sidebar user display with verified data.
+            const elCurrentUser = document.getElementById('currentUser');
+            if (elCurrentUser && state.currentUser) {
+                elCurrentUser.textContent = state.currentUser;
+            }
+            if (typeof updateSidebarAvatar === 'function') updateSidebarAvatar();
+        }
```

### 2. `js/auth.js` — Harden TOKEN_REFRESHED Handler

#### [MODIFY] [auth.js](file:///d:/v2%20BMS%20OFFICIAL/js/auth.js)

The `TOKEN_REFRESHED` handler (lines 559-574) should:
- Always preserve `state.currentUser` and `state.ownerId` even if profile re-fetch fails
- Update the sidebar `#currentUser` element after successful refresh

### 3. `js/state.js` — Add `currentUserUuid` to Initial State

#### [MODIFY] [state.js](file:///d:/v2%20BMS%20OFFICIAL/js/state.js)

Add `currentUserUuid: null` to `_internalState` so the Proxy tracks it from the start and subscribers fire reliably.

### 4. `js/ui/dashboardView.js` — Guard Against Re-Renders

#### [MODIFY] [dashboardView.js](file:///d:/v2%20BMS%20OFFICIAL/js/ui/dashboardView.js)

In the `role` state subscriber (line 235-237), add a guard to prevent `applyDashboardRole` from being called if the role hasn't actually changed:
```diff
 case 'role': {
-    applyDashboardRole(value);
+    if (value && value !== previousValue) {
+        applyDashboardRole(value);
+    }
     break;
 }
```

## Verification Plan

### Automated Tests
- `npm run build` — ensure 0 errors

### Manual Verification
- Login as owner → navigate between modules → confirm no "Loading..." hang or "Admin" sidebar regression
- Force token refresh (leave app idle 60 min) → navigate → confirm state persists
