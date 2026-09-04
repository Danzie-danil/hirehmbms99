# Admin Real-Time Operations Zero-Refresh Synchronization Plan

## Problem Summary
Real-time operations performed by the Administrator (toggling maintenance mode, publishing/deleting system banners, broadcasting instant toasts, toggling modal AI assistant, survey status updates, and disabled modules) do not reflect immediately on client screens and currently require users to manually refresh the page.

### Root Causes Identified:
1. **Branch Profile Exclusion in Realtime Guard**: In `js/realtime.js`, `if (state.role !== 'sysadmin' && !window.state?.profile) return;` causes all branch users (`state.branchProfile`, where `state.profile` is null) to fail initialization and never join the realtime WebSocket channel.
2. **Missing Admin Realtime Broadcast Layer**: When an admin toggles a setting or publishes a banner/toast, the admin client only executes a PostgreSQL INSERT/UPDATE query. It does not dispatch a Supabase Realtime Broadcast message over the active WebSocket channel (`bms-live`).
3. **Database CDC & Publication Gaps**: Supabase `postgres_changes` relies on tables being in `supabase_realtime` publication with `REPLICA IDENTITY FULL` and permissive `SELECT` RLS policies. Any CDC lag or RLS restriction prevents real-time table events from reaching non-admin clients.
4. **Admin Dashboard Realtime Initialization**: When Sysadmin enters the admin panel, `initRealtimeSync` was not invoked, preventing the admin from maintaining an active presence and channel connection for instant multi-client broadcasts.

---

## Proposed Changes

### 1. Real-Time Engine Enhancement ([js/realtime.js](file:///d:/v2%20BMS%20OFFICIAL/js/realtime.js))
- **Fix Client Role Initialization**: Update connection guard to support `state.profile`, `state.branchProfile`, and `state.role === 'sysadmin'`.
- **Implement Dual-Layer Realtime**:
  - **Layer 1 (Instant WebSocket Broadcast)**: Listen for `sys_settings_update`, `sys_banners_update`, `sys_toast_broadcast`, `sys_survey_broadcast`, and `sys_version_broadcast` on `bms-live` channel for sub-millisecond execution.
  - **Layer 2 (Postgres CDC Stream)**: Listen with unified `postgres_changes` (`event: '*'`) on `sys_settings`, `sys_banners`, `sys_scheduled_toasts`, `sys_surveys`, and `sys_push_notifications`.
  - **Layer 3 (Resilient Polling Fallback)**: Enhance `_pollSystemSettings` to poll `sys_settings`, `sys_banners`, and active surveys every 6s as a failsafe against network disconnects.
- **Expose `window.broadcastSystemEvent(event, payload)`**: Centralized helper allowing any admin action to broadcast instantly across all connected clients.

### 2. Admin Operations Integration ([js/admin/dashboard.js](file:///d:/v2%20BMS%20OFFICIAL/js/admin/dashboard.js), [js/admin/surveys.js](file:///d:/v2%20BMS%20OFFICIAL/js/admin/surveys.js), [js/admin/communications.js](file:///d:/v2%20BMS%20OFFICIAL/js/admin/communications.js))
- In `saveSetting()`: Broadcast `sys_settings_update` with `{ key, value }` immediately upon DB update.
- In `publishSystemBanner()` / `deleteSystemBanner()`: Broadcast `sys_banners_update` with banner payload/id.
- In `sendInstantToast()` / `scheduleToast()`: Broadcast `sys_toast_broadcast` with message and type.
- In `toggleModalAiControl()` / `toggleMaintenanceControl()`: Broadcast corresponding setting updates.
- In `triggerCodebaseReleaseBroadcast()`: Broadcast `sys_version_broadcast`.
- In `surveys.js` (`publishSurvey`, `closeSurvey`, `deleteSurvey`): Broadcast `sys_survey_broadcast`.
- Ensure `window.initRealtimeSync()` is called when rendering admin views.

### 3. UI Reaction & Client Handlers ([js/ui/dashboardView.js](file:///d:/v2%20BMS%20OFFICIAL/js/ui/dashboardView.js), [js/ui/surveyModal.js](file:///d:/v2%20BMS%20OFFICIAL/js/ui/surveyModal.js), [js/aiAssistant.js](file:///d:/v2%20BMS%20OFFICIAL/js/aiAssistant.js))
- Ensure `showActiveSystemBanners()` updates DOM dynamically when banner broadcasts/changes arrive.
- Ensure `surveyModal.js` listens to survey broadcasts and opens/closes survey dialogs smoothly.
- Ensure `aiAssistant.js` reacts instantly to AI modal toggle broadcasts.

### 4. Database Publication & RLS SQL Migration ([supabase/0001_ensure_admin_realtime_publications_and_rls.sql](file:///d:/v2%20BMS%20OFFICIAL/supabase/0001_ensure_admin_realtime_publications_and_rls.sql))
- Add `sys_settings`, `sys_banners`, `sys_scheduled_toasts`, `sys_surveys`, `sys_push_notifications` to `supabase_realtime` publication.
- Ensure `REPLICA IDENTITY FULL` on all admin operational tables.
- Verify non-blocking `SELECT` RLS policies for `authenticated` and `anon`.

---

## Verification Plan

### Automated Build & Lint Verification
- Run `npm run build` to verify clean compilation of JavaScript and Service Worker bundle.
- Verify zero syntax or module errors.

### Manual Verification Flow
1. **Maintenance Mode**: Toggle maintenance mode in Admin -> verify owner and branch views immediately display the maintenance screen without refreshing. Toggle off -> verify app immediately restores.
2. **System Banners**: Create/toggle/delete a banner in Admin -> verify banner ticker appears/disappears on client screens in realtime.
3. **Instant Toasts**: Push an instant broadcast toast in Admin -> verify toast pops up on client screen within 1 second.
4. **Surveys & Modals**: Activate a survey in Admin -> verify survey modal displays on target clients without page reload.
