# System Administrator Full-Module Server-Side Computation & Security Plan

Audit all System Administrator modules to ensure business logic, analytical KPI computations, subscription changes, and audit operations execute server-side inside PostgreSQL via RPC functions with strict `is_sys_admin()` validation, keeping the frontend client strictly as a thin dispatcher.

## User Review Required
> [!IMPORTANT]
> The security hardening migration script is ready at [supabase/0001_harden_sysadmin_server_side_security.sql](file:///d:/v2%20BMS%20OFFICIAL/supabase/0001_harden_sysadmin_server_side_security.sql). Please run this script in your Supabase SQL Editor.

## Proposed Changes

### Database Layer (`supabase/`)
#### [NEW] [0001_harden_sysadmin_server_side_security.sql](file:///d:/v2%20BMS%20OFFICIAL/supabase/0001_harden_sysadmin_server_side_security.sql)
- **`is_sys_admin()` Security Guard**: Hardens role inspection across all admin tables and functions.
- **`get_admin_dashboard_summary()`**: Computes total businesses, active branches, paid user counts, MRR, and recent audit logs server-side.
- **`get_tenant_360_data(p_tenant_id UUID)`**: Aggregates tenant metadata, subscription details, and branch networks directly inside PostgreSQL.
- **`update_tenant_subscription(p_tenant_id UUID, p_plan TEXT, p_trial_days INT)`**: Atomic server-side plan mutation with audit logging.
- **`get_admin_communications_summary()`**: Pre-computes newsletter subscribers and campaign metrics.
- **`log_sys_admin_action()`**: Enforces authenticated append-only audit trail logging.

### Frontend Layer (`js/admin/`)
#### [MODIFY] [dashboard.js](file:///d:/v2%20BMS%20OFFICIAL/js/admin/dashboard.js)
- Wire `openTenant360Modal()` to `supabase.rpc('get_tenant_360_data')`.
- Wire `saveSubscriptionPlan()` to `supabase.rpc('update_tenant_subscription')`.
- Connect `logAdminAction()` to `supabase.rpc('log_sys_admin_action')`.
- Connect `renderDashboard()` to `supabase.rpc('get_admin_dashboard_summary')`.

#### [MODIFY] [communications.js](file:///d:/v2%20BMS%20OFFICIAL/js/admin/communications.js)
- Connect subscriber and broadcast metrics to `supabase.rpc('get_admin_communications_summary')`.

## Verification Plan
1. **Compilation Check**: Run `npm run build` to ensure 0 bundling/lint errors.
2. **Fallback Validation**: Verify graceful fallbacks if network or migrations are pending.
