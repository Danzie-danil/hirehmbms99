# Implementation Plan - Offline Session Retention, Role Guard & Offline-First Dexie Fallback

## Goal Description
Enforce strict session and UI retention so that logged-in users (Owner, Branch, Manager, Cashier) are **NEVER logged out, purged, or redirected to the login screen** when the device goes offline, loses network, or enters airplane mode. The application must retain the active user, role, permissions, and layout, falling back entirely to persistent IndexedDB/Dexie local data stores without invoking any login screen or network errors.

## User Review Required
> [!IMPORTANT]
> - **Zero Disruption Offline Navigation**: When offline or in airplane mode, the app will never show the login screen or error banners. The full user role layout (Branch or Owner) will remain active and interactive, backed by IndexedDB (`Dexie`).
> - **Dual-Confirmation & Real-Time Sync Guard Check**: This implementation focuses on authentication session retention in `js/auth.js`, notification guards in `js/app.js`, and offline network handlers. It does NOT touch or refactor the real-time websocket engine (`js/realtime.js`) or core data sync pipes.

## Root Causes & Areas to Enforce
1. **Network Failure & Revalidation Traps in `js/auth.js`**: `_showFatalAuthError` and session timeout handlers could show the login screen if `hadOptimisticRestore` was false or network was unavailable.
2. **False Parameter in `_tryRestoreOfflineSession(null, false)`**: In step 4 of `initAuth()`, `shouldReRenderUI` was passed as `false`, preventing UI activation if optimistic restore failed.
3. **Explicit Offline Guard at `initAuth()` Entry**: If `!navigator.onLine`, the authentication lifecycle should immediately hydrate from verified offline storage (localStorage + Dexie) without waiting on Supabase network timeouts.
4. **Background Polling & Notification Network Silence**: `checkNotifications()` and periodic polling in `js/app.js` must abort silently when offline without throwing unhandled network fetch errors.
5. **Dexie & LocalStorage Dual-Store Mirroring**: Mirror verified user role session metadata into `localDb.users` and `localDb.subscription_snapshot` to guarantee session retention even if browser storage fluctuates.

---

## Proposed Changes

### 1. Offline Session Guard & Auth Lifecycle Enforcement
#### [MODIFY] [`js/auth.js`](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/auth.js)
- Add instant offline fast-path at the start of `initAuth()`:
  - If `!navigator.onLine`, immediately call `_tryOptimisticRestore()` or `_tryRestoreOfflineSession(null, true)`, unhide `#app`, hide `#loginScreen`, and return without waiting on cloud promises.
- In `_tryRestoreOfflineSession`:
  - Ensure UI is activated and proper role layout is mounted.
  - Check Dexie `localDb.users` as a secondary backup if `localStorage` has no active keys.
- In `revalidateSessionAndEntitlements` & `initAuth` catch blocks:
  - Never call `_showFatalAuthError` when offline or when a cached session exists.
  - Suppress network error toasts during offline state.

### 2. Network-Aware Notification & Polling Guard
#### [MODIFY] [`js/app.js`](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/app.js)
- In `checkNotifications()`:
  - Add `if (!navigator.onLine) return;` at the very beginning to prevent network request cascades when offline.

---

## Verification Plan

### Automated Build Check
- Run `npm run build` to verify clean compilation with 0 errors.

### Manual Verification
1. **Offline / Airplane Mode App Start**:
   - Disconnect network / toggle airplane mode and reload the application.
   - Verify that the app opens directly into the active user view (Branch or Owner) with full UI intact and zero login screen prompts.
2. **Offline Navigation & Local Data Usage**:
   - Navigate between tabs (Sales, Inventory, Expenses, Overview) while offline.
   - Verify all modules load and render data from IndexedDB (`Dexie`) without errors.
3. **Reconnection Seamlessness**:
   - Re-enable network; verify background revalidation synchronizes without UI flickering or forced sign-outs.
