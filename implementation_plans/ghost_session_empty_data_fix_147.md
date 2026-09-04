# Fix Ghost Session & Empty Data on Stale Auth Token Plan (147)

## Problem Description
The user reported that all data occasionally disappears across mobile, incognito, and desktop tabs, leaving empty containers, 0 stats, and blank lists, and refreshing the page does not resolve it.

### Root Cause Analysis from Console Logs:
1. `auth.js:1486 [Auth] Persistent cached session active.` was logged.
2. `supabase.auth.getSession()` returned `session = null` because the JWT access token expired (e.g. after background sleep, 1h timeout, or browser wake).
3. `initAuth()` skipped token refresh and immediately returned upon restoring local cache (`_tryRestoreOfflineSession()`).
4. Because the Supabase client had no active session token (`auth.uid() = NULL`), all subsequent cloud database queries were executed as an **anonymous user**.
5. PostgreSQL Row Level Security (RLS) safely rejected anon requests and returned empty arrays `[]` for `central_inventory`, `branches`, `customers`, `sales`, `expenses`, `loans`, etc.
6. The app received `[]` and rendered empty containers and blank stats across all modules.

## Proposed Changes

### 1. `js/auth.js`
- When `session` is null on startup, proactively attempt `supabase.auth.refreshSession()` to restore a fresh access token using the stored refresh token.
- If `refreshSession()` succeeds, proceed to full session and profile revalidation with a verified active auth token.
- If `refreshSession()` fails and the role is `owner` or `sysadmin` while online, gracefully prompt the user to sign in fresh rather than entering a dead "ghost session" where all cloud queries return `[]`.
- If offline, ensure local state falls back strictly to IndexedDB cached data without being overwritten by empty cloud responses.

## Verification Plan
- Run `npm run build` to verify clean build.
- Test session recovery and refresh flows.
