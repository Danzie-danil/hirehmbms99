# Implementation Plan: Caching and Entitlements Sync Resolution

Resolve PWA / browser caching, optimistic session revalidation, and dynamic module loading so that subscription upgrades (e.g. Enterprise to Exclusive) and dashboard modules (Tasks & Objectives, Stats cards) update promptly and reliably across all devices.

## User Review Required

> [!IMPORTANT]
> - **Reactive Entitlements Sync**: When background auth revalidation completes, any detected change between the local cached session (e.g. previous plan/features) and the fresh server session (e.g. newly upgraded plan) will immediately re-sync state, update the sidebar badge & feature gates, and refresh the active view seamlessly without requiring a hard cache clear.
> - **Resilient Module Loading & Chunk Retry**: If dynamic ESM chunk loading fails (e.g. after a new build deployment when asset hashes change), the system automatically evicts stale loader caches and re-fetches the latest module chunk instead of leaving the user with an infinite spinner.
> - **Database / Cache Fallback for Tasks & Overview**: Refactor `renderTasksManagement` and `getOwnerDashboardData` to always guarantee robust fallback rendering with Dexie IndexedDB and prompt error recovery.

## Proposed Changes

### 1. `js/auth.js` — Reactive Entitlements & Session Revalidation
- Update `_cacheVerifiedSession` to explicitly persist `state.entitlements` alongside `profile`, `branches`, etc.
- In `_tryOptimisticRestore()`, properly hydrate `state.entitlements` from the stored session cache.
- In `initAuth()` background revalidation:
  - Compare server-verified `profile.plan`, `profile.subscription_status`, and `entitlements.plan_id` against the optimistically restored values.
  - If a change is detected (e.g. user was upgraded from `enterprise` to `exclusive`):
    - Update `state.profile` and `state.entitlements`.
    - Persist fresh session in `localStorage`.
    - Trigger `applyDashboardRole(state.role)`.
    - Trigger `window.updateSubscriptionBadge?.()`.
    - Non-destructively refresh the current active view (`switchView(state.activeView, state.activeViewContext)`) so stats, plan titles, and unlocked features display immediately.

### 2. `js/app.js` — Dynamic Import Chunk Recovery & Module Resilience
- In `ensureViewModule(role, viewId)`:
  - If module loader promise throws (e.g. ChunkLoadError / hash mismatch), remove the rejected promise from `loadedViewModules` map so subsequent attempts can re-fetch.
  - Add retry mechanism for dynamic chunk fetching.
- In `renderOwnerView(view, extraData)`:
  - Ensure all module view functions (e.g., `renderTasksManagement`, `renderOwnerOverview`) are properly awaited and guarded with error catchers.

### 3. `js/owner/tasks.js` — Tasks & Objectives Robust Query & Caching
- Replace raw, un-cached Supabase query with `dbTasks.fetchByOwner(ownerId)` which incorporates Dexie IndexedDB local caching, offline fallback, and consistent relation mapping.
- Make `renderTasksManagement()` return a Promise and catch all errors cleanly, ensuring loaders never get stuck.

### 4. `js/data/repositories/dashboardRepository.js` & `js/owner/overview.js` — Overview Stats Cards Reliability
- In `getOwnerDashboardData()`, if local snapshot is null, guarantee that the sync query updates the DOM immediately upon completion even if the listener was registered after sync started.
- Prevent `_syncLocks` from deadlocking when a snapshot is empty.

### 5. `public/sw.js` & `js/updateChecker.js` — Service Worker Cache Invalidation
- Enhance static JS/CSS fetch strategy in `public/sw.js` to ensure stale chunk references don't block new module loads.
- Ensure version bump and cache purging work cleanly.

## Verification Plan

### Automated Tests
- Run `npm run build` to verify PWA build compilation and bundling without lint/syntax errors.

### Manual Verification
- Test session restore and simulate plan upgrade / revalidation.
- Verify Tasks & Objectives view loads smoothly.
- Verify Owner Overview stats cards populate reliably.
