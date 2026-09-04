# Implementation Plan - Session-Preserving Cache Purge & Hot Replacement (115)

## Problem Analysis
1. **Destructive Cache Purge Wiping User Sessions:**
   - In `js/utils.js`, `clearAllCache()` previously ran a blanket `localStorage.clear()` keeping only generic tokens `'sb-auth-token'` and `'supabase.auth.token'`.
   - The application stores user authentication tokens under `bmstz-auth-token`, along with session credentials `bms_last_role`, `bms_last_active_user`, `bms_session_*`, `lastOwnerView`, `lastBranchView`, and device fingerprints.
   - Consequently, when users clicked "Clear Cache" in settings or performed manual resets, their authentication credentials and active workspaces were wiped, forcing an unwanted logout.
2. **Service Worker Unregistering on App Update:**
   - In `js/utils.js`, `updateApp()` unregistered service workers (`registration.unregister()`), destroying PWA background functionality and offline fallback capabilities until a full manual restart.
   - Cache storage needed an in-place swap that purges obsolete asset caches, flushes pending offline sync queues, and upgrades the Service Worker without dropping user sessions.

## Proposed Changes
1. **Preserved Credential & Session State Whitelist (`js/utils.js`):**
   - Whitelist all authentication tokens (`bmstz-auth-token`, `sb-`, `supabase.auth.token`), active user roles (`bms_last_role`, `bms_last_active_role`), user identifiers (`bms_last_active_user`), active session timestamps (`bms_session_start`, `bms_session_*`), device IDs (`bms_device_uuid_*`), theme settings (`bms_theme`, `theme`), and active sub-views (`lastOwnerView`, `lastBranchView`, `lastSysadminView`).
   - Restore these critical keys immediately when local storage is cleared.
2. **Seamless Cache Purge & Service Worker Upgrade (`js/utils.js`, `js/updateChecker.js`):**
   - Drain pending offline sync queues first via `syncManager.processPendingQueue()` if online.
   - Delete obsolete cache entries via `caches.keys()` and `caches.delete()`.
   - Upgrade the active Service Worker via `reg.update()` and `postMessage({ type: 'SKIP_WAITING' })` without unregistering the worker.
   - Reset in-memory cached singletons (`_cachedCentralItems`, `_cachedBranchInventory`, `currentAllStaff`, etc.).
   - Perform an in-place cache-busting reload (`?_v=${Date.now()}`) to fetch fresh chunks without breaking the user session.
3. **App Version & Build Verification:**
   - Bump app version to `3.9.10`.
   - Verify `npm run build` compiles with 0 errors.
