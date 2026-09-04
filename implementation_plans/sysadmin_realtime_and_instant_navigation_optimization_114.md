# Implementation Plan - Sysadmin Realtime Broadcasts & Instant Navigation Optimization (114)

## Problem Analysis
1. **Sysadmin Realtime Broadcasts Not Reaching Clients Live:**
   - In `js/realtime.js`, global system events (`sys_banners_update`, `sys_settings_update`, `sys_toast_broadcast`, `sys_survey_broadcast`, `sys_version_broadcast`, `sys_push_broadcast`) were broadcast only over `_channel` (which for Sysadmin is scoped to `bms-sysadmin`).
   - Clients (Owners and Branches) were listening on `_globalChannel` (`bms-global`).
   - As a result, when a Sysadmin disabled/deleted/created a banner, changed maintenance mode, or published a toast, other users never received the real-time event until page refresh.
2. **Slow Sysadmin Tab Switching (3–5s latency):**
   - Every time a Sysadmin switches tabs, `renderSysadminView` blocked on `await loadAdminData()`.
   - `loadAdminData()` ran 6 serial, sequential network round-trips (`sys_settings`, `profiles`, `sys_banners`, `branches`, `sys_email_drafts`, `sys_pricing_plans`) without memory caching or query parallelization.

## Proposed Changes
1. **Global Channel Realtime Broadcast & CDC Routing (`js/realtime.js`):**
   - In `window.broadcastSystemEvent`, detect global system events and broadcast them over `_globalChannel` (`bms-global`) so all connected users receive them immediately.
   - Attach `postgres_changes` listeners on `_globalChannel` for `sys_settings`, `sys_banners`, `sys_scheduled_toasts`, `sys_surveys`, and `pricing_plans`.
   - Keep owner and branch operational tenant channels untouched and isolated.
2. **Instant Sysadmin Navigation & Non-Blocking Background Refresh (`js/admin/dashboard.js`):**
   - Implement in-memory TTL caching (25s) and `Promise.allSettled` query parallelization in `loadAdminData()`.
   - In `renderSysadminView()`, render cached/in-memory data instantly (< 15ms) without blocking on network queries. Refresh data concurrently in the background and update active views seamlessly.
3. **App Version & Build Verification:**
   - Bump version to `3.9.9`.
   - Run `npm run build` and ensure 0 errors.
