# Cross-Device Entitlements & Module Loading Resilience Plan

Resolve cross-device subscription plan synchronization (e.g. Enterprise to Exclusive 12-month upgrade), background resume token expiration, module loading freeze ("failed to load due to network connection"), and dynamic chunk recovery.

## User Review Required

> [!IMPORTANT]
> - **Cross-Device Entitlements Auto-Sync**: When you upgrade your plan (or payment completes via webhook) on one device, other devices will instantly receive and reflect the change via Realtime sync, and background app resume will automatically refresh cloud entitlements and profile state without requiring manual cache clearing or logging out.
> - **Self-Healing Module Loading**: Modules will no longer get permanently stuck on "Couldn't load due to network connection". Failed dynamic module imports will automatically purge rejected loader promises, refresh expired Supabase JWT sessions on wake, and retry cleanly.
> - **Automatic Chunk & Version Healing**: If a new version is deployed while an app tab was dormant in the background, stale script chunk errors will automatically self-heal and pull fresh assets seamlessly.

## Proposed Changes

### 1. `js/auth.js` — Comprehensive Entitlements Caching & Background Revalidation
- Explicitly persist `state.entitlements` in `_cacheVerifiedSession` for `owner`, `branch`, and `sysadmin` roles.
- In `_tryRestoreOfflineSession` and `_tryOptimisticRestore`, restore `state.entitlements` accurately.
- Export `revalidateSessionAndEntitlements(force = false)` to authoritatively query Supabase for profile, entitlements, and branches, updating `state.profile`, `state.entitlements`, and `_cacheVerifiedSession`.
- If `initAuth()` encounters a session fetch timeout on cold start/resume, schedule a background revalidation after network stabilization.

### 2. `js/lifecycle.js` — Proactive Token Refresh & View Recovery on Resume
- In `handleAppResume(reason)`:
  - Call `supabase.auth.getSession()` to ensure the Supabase JWT token is active and not expired from long background sleep.
  - Call `revalidateSessionAndEntitlements()` to pull any updated cloud plan (e.g. Exclusive 12-month upgrade) or profile settings.
  - If the active view is showing an error or offline placeholder, automatically re-render and recover the active module once connectivity and session are verified.

### 3. `js/realtime.js` — Realtime Profile & Subscription Change Propagation
- Extend the `profiles` table Realtime listener: when an `UPDATE` event arrives for `state.ownerId` (or branch's owner), update `state.profile`, fetch latest `get_user_effective_entitlements`, update cached session, and trigger `updateSubscriptionBadge()`.

### 4. `js/app.js` — Resilient Dynamic View Module Loader
- In `ensureViewModule(role, viewId)`:
  - If `loader()` fails, immediately `.catch()` and `loadedViewModules.delete(key)` so subsequent clicks or retries can re-attempt cleanly rather than returning a permanently rejected promise.
  - Add single-retry recovery for dynamic ESM imports.
- In `switchView()`:
  - Handle watchdog timeouts gracefully; if device is online, attempt token refresh and single retry before falling back to offline placeholder.

### 5. `index.html` & `app/index.html` — Dynamic Chunk Error Recovery
- Update chunk healing handlers in `<head>` to use timestamp-based debouncing (15s cooldown) rather than permanent single-shot `sessionStorage` locking.

### 6. App Version Bump & Build Compilation
- Bump version to `2.9.13` in `release_notes.json` and `js/updateChecker.js`.
- Run `npm run build` to compile `public/sw.js` and generate fresh production bundle.

## Verification Plan

### Automated Tests
- Run `npm run build` to verify clean Vite compilation of all modules with 0 errors.

### Manual Verification
- Test background resume simulation and entitlements revalidation.
- Verify `ensureViewModule` removes failed promises on simulated network hiccup.
- Confirm subscription badge and plan features reflect `Exclusive` status.
