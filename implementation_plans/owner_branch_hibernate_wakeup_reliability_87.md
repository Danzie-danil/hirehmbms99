# Hibernate Wake-Up Reliability for Owner & Branch — Implementation Plan

## Goal
Make Owner and Branch accounts wake reliably after long hibernation (hours), exactly like Sysadmin already does.

## Root Causes Found

### 1. `_executePendingLogin()` — Cache Written Too Late (Owner & Branch)
In `auth.js` lines 1221 (owner) and 1283 (branch), `_cacheVerifiedSession()` is only called **inside a background `.then()` callback** after `Promise.allSettled()`. If the device sleeps before that async callback completes, the session cache is either never written or incomplete.

**Sysadmin does NOT have this problem**: its `_cacheVerifiedSession()` is called synchronously in the main `try` block of `initAuth()`.

### 2. `handleAppResume()` — State Restore Is Conditional
In `lifecycle.js` lines 67–71, `_tryRestoreOfflineSession()` is only called when `state.role` or `state.currentUser` is already empty:
```js
if (!state.currentUser || !state.role || (!state.ownerId && !state.branchId)) {
    window._tryRestoreOfflineSession(null, false);
}
```
On iOS/Android, browsers can **partially** clear JS heap while preserving `state.role` but losing richer properties like `state.profile`, `state.branches`, or `state.branchProfile`. This leaves the app in a broken half-state. Sysadmin is immune because its state is trivially minimal (`ownerId='sysadmin'`, no profile/branches needed).

### 3. `revalidateSessionAndEntitlements()` — Gives Up on Expired Token
After long hibernation, the Supabase JWT access token may be expired. `getSession()` may return null. `revalidateSessionAndEntitlements()` immediately returns `false` without attempting a token refresh. For sysadmin views, this causes no rendering failure. For owner/branch views that depend on fresh profile/branch state, the re-render fails silently.

## Changes

### auth.js — Change 1: Immediate Cache Write for Owner in `_executePendingLogin()`
**Lines 1180–1182**: Add minimal `_cacheVerifiedSession` + localStorage role writes immediately after `state.role = 'owner'`, before `setupDashboard()`.

### auth.js — Change 2: Immediate Cache Write for Branch in `_executePendingLogin()`
**Lines 1260–1262**: Add minimal `_cacheVerifiedSession` + localStorage role writes immediately after `state.profile = { ... }`, before `setupDashboard()`.

### auth.js — Change 3: Retry Token Refresh in `revalidateSessionAndEntitlements()`
**Lines 1570–1573**: If `getSession()` returns no session, attempt `refreshSession()` before giving up.

### lifecycle.js — Change 4: Always Re-Hydrate from Cache on Wake
**Lines 67–71**: Remove the conditional guard — always call `_tryRestoreOfflineSession(null, false)` on every wake event so partial state is always repaired from persistent localStorage cache.

## Files Modified
- `js/auth.js` — Lines 1180, 1260, 1570
- `js/lifecycle.js` — Lines 67–71

## Verification
- Owner/Branch login → device sleep → wake → app should show correct role, sidebar, and last view
- Same for mobile (iOS Safari, Chrome Android) and desktop tab hibernation
- Sysadmin behavior must remain unchanged
