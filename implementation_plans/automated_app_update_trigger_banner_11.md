# Automated Codebase Update Trigger & CTA Banner Engine Plan

Architect and implement an automated, database-triggered release announcement system. Whenever a new codebase release or deployment occurs, a PostgreSQL trigger automatically generates an interactive "Updates Available" CTA banner in `public.sys_banners`, streaming live to all connected devices via Supabase Realtime without any hardcoding in frontend code.

## Server-Side Architecture (Supabase PostgreSQL)
1. **Release Management Table `public.sys_app_releases`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `version TEXT NOT NULL`
   - `release_title TEXT DEFAULT 'Updates Available'`
   - `release_notes TEXT`
   - `cta_label TEXT DEFAULT 'Update Now'`
   - `created_by UUID REFERENCES auth.users(id)`
   - `created_at TIMESTAMPTZ DEFAULT NOW()`
2. **PostgreSQL Trigger `trg_on_app_release_broadcast_banner`**:
   - Fires `AFTER INSERT ON public.sys_app_releases`.
   - Automatically archives previous release banners and creates a new interactive CTA banner (`cta_action = 'refresh'`, `cta_label = 'Update Now'`).
   - Logs an audit entry in `public.sys_audit_logs`.
3. **Server-Side RPC `public.publish_codebase_update_release(...)`**:
   - `SECURITY DEFINER` RPC validated with `public.is_sys_admin()`.
   - Inserts into `public.sys_app_releases`, automatically activating the trigger.

## Client-Side Integration
1. **[js/ui/dashboardView.js](file:///d:/v2%20BMS%20OFFICIAL/js/ui/dashboardView.js)**:
   - When clicking "Update Now", dispatches `{ type: 'SKIP_WAITING' }` to waiting service worker workers, records the CTA click in `sys_banner_interactions` so the banner disappears for that user, and refreshes the application.
2. **[js/admin/dashboard.js](file:///d:/v2%20BMS%20OFFICIAL/js/admin/dashboard.js)**:
   - Provide "Broadcast Codebase Release" action trigger in Platform Controls allowing Sysadmins to broadcast instant app updates with custom versions and release notes.

## Verification
- Verify `npm run build` completes with 0 errors.
- Confirm trigger execution and realtime streaming propagation.
