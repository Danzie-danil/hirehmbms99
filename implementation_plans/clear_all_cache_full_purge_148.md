# Comprehensive Clear All Cache (Including Sessions & IndexedDB) Plan (148)

## Problem & Requirement
The user requested:
"let us configure the clear cache button in the settings for all users, to clear all cache including login sessions. basically all."

Previously, `clearAllCache()` in `js/utils.js` preserved authentication tokens (`sb-`, `bms_session_`, `bms_last_role`) to avoid logging out users.
Now, the action must perform a **complete nuclear purge**:
1. Purge all `localStorage` (clearing all saved tokens, sessions, roles, cached profiles, and app states).
2. Purge all `sessionStorage`.
3. Purge and delete all `IndexedDB` databases (`BMSTZ_LocalDB`, `bms_offline_queue`, Dexie databases, etc.).
4. Purge all browser CacheStorage (`caches.delete`).
5. Unregister and post `CLEAR_CACHE` to all registered Service Workers.
6. Trigger backend `supabase.auth.signOut()`.
7. Wipe all in-memory caches and `window.state` objects.
8. Redirect cleanly to the root entry `/app` with cache-busting reset flags to show the clean login screen.

## Proposed Changes

### 1. `js/utils.js`
- Overhaul `clearAllCache()` to purge localStorage, sessionStorage, IndexedDB, CacheStorage, Service Workers, Supabase sessions, and memory states.

### 2. Version Bump & Verification
- Auto-sync version in `release_notes.json`, `public/release_notes.json`, `js/updateChecker.js`, compile `public/sw.js` via `npm run build`.

## Verification Plan
- Build project cleanly with `npm run build` (0 errors).
- Verify that clicking "Erase Cache" across Settings (Owner, Branch, SysAdmin) executes a full purge and cleanly loads the fresh login screen.
