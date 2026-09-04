# True Native Offline Architecture Plan

This plan addresses the critical offline hang issues and implements a fully native offline authentication flow, allowing users to log in securely even when completely disconnected from the internet.

## Deep Analysis of the Issues

1. **Endless Module Loading Offline:**
   - **Cause:** When a modal (like "Add Stock" or "Tasks") opens, it calls data-fetching methods in `js/db.js` (e.g., `dbSuppliers.fetchAll()`). These methods execute `await supabase.from(...).select(...)`.
   - **Why it hangs:** In native wrappers like Tauri and Capacitor, the underlying HTTP engine does not always instantly fail a network request when Wi-Fi is disconnected. It instead waits for a standard 30-90 second timeout. The app hangs waiting for this timeout before hitting the `catch` block that triggers the `localDb` fallback.
   - **Solution:** We will inject a strict `!navigator.onLine` interceptor into `js/db.js`. If the device is offline, it will completely bypass the Supabase network call and instantly fetch from `localDb`.

2. **Offline Login Failure (Logged Out State):**
   - **Cause:** `js/auth.js` attempts a raw `fetch` to Supabase's REST API for password grant authentication. If offline, this `fetch` throws a network error, and the app immediately fails with "Unable to reach the server."
   - **Solution:** We will implement a secure **Local Credential Hash Cache**. 
     - When a user logs in *online*, the app will hash their password using the secure Web Crypto API (SHA-256) and store it alongside a snapshot of their session metadata in a new Dexie table: `localDb.offline_auth`.
     - When a user logs in *offline*, the app will gracefully fall back to checking the local hash. If the entered password matches the hash, the app will manually re-hydrate the session state and grant access to the dashboard.

## Proposed Changes

### 1. `js/data/db.js` (Schema Update)
- Add a new table to the Dexie schema (Version 5): `offline_auth: 'email, hash, role, cached_session, updated_at'`.
- Ensure this table is securely synced to the native filesystem via the existing `nativeStorage` engine.

### 2. `js/db.js` (Fast-Fail Offline Network Interceptor)
- Modify the core data-fetching functions (`fetchAll`, `fetchOne`, etc.) across all modules to instantly check `navigator.onLine`.
- If `!navigator.onLine`, immediately throw a simulated `new Error('OFFLINE_BYPASS')` so that the `catch` block executes instantaneously, pulling data from `localDb` without freezing the UI.

### 3. `js/auth.js` (Offline Authentication Engine)
- **Online Capture:** Update `_executePendingLogin` so that when a login succeeds online, it hashes the plain-text password (`crypto.subtle.digest`) and saves it to `localDb.offline_auth` along with the user's `email`, `role`, and the hydrated `tokenData`.
- **Offline Fallback:** Catch the `fetch` network error in `_executePendingLogin`. Instead of failing immediately, hash the provided password and query `localDb.offline_auth`. 
- If a match is found, reconstruct the application state (`state.role`, `state.profile`, etc.) exactly as `initApp()` would, and unlock the UI.

## Verification Plan
1. **Module Speed:** Turn off internet. Open "Add Stock". Verify the modal opens instantaneously via `localDb` instead of hanging.
2. **Offline Auth:** Turn on internet, log in normally (to cache the hash). Sign out. Turn off internet. Log in again. Verify the app grants access and boots into the dashboard entirely offline.
