# Fix Profile Refresh Method & Sys Banners RPC Engine Plan

Resolve the `dbProfile.get is not a function` TypeError during token refresh and resolve the `sys_banners` 400 error by adding resilient server-side RPC functions and schema migration.

## Root Cause Analysis
1. **`TypeError: dbProfile.get is not a function`**: In `js/auth.js` line 531, token refresh handler invoked `dbProfile.get(session.user.id)`. However, `dbProfile` in `js/db.js` only defined `fetch(ownerId)`.
2. **`sys_banners` 400 Bad Request & Banner Creation Failure**:
   - The remote `sys_banners` table was missing interactive CTA columns (`cta_enabled`, `cta_label`, `cta_action`, `cta_target`) or was evaluating an outdated RLS policy.
   - Direct frontend table mutation bypassed server-side RPC encapsulation.

## Scope of Changes

### 1. Database & Security (`supabase/0001_fix_sys_banners_schema_and_rpcs.sql`)
- Ensure all CTA columns exist on `public.sys_banners`.
- Reset and re-create clean RLS policies for `public.sys_banners` (`SELECT: true`, `INSERT/UPDATE/DELETE: is_sys_admin()`).
- Create `SECURITY DEFINER` RPC functions:
  - `public.create_sys_banner(p_message, p_type, p_cta_enabled, p_cta_label, p_cta_action, p_cta_target)`
  - `public.delete_sys_banner(p_banner_id)`
  - `public.get_active_sys_banners()`
- Ensure `sys_banners` is in `supabase_realtime` publication with `REPLICA IDENTITY FULL`.

### 2. Frontend DB & Auth Core
- **[js/db.js](file:///d:/v2%20BMS%20OFFICIAL/js/db.js)**: Add `get` method to `dbProfile` as an alias to `fetch`.
- **[js/auth.js](file:///d:/v2%20BMS%20OFFICIAL/js/auth.js)**: Add defensive checks for profile fetching during token refresh.
- **[js/admin/dashboard.js](file:///d:/v2%20BMS%20OFFICIAL/js/admin/dashboard.js)**: Refactor `publishSystemBanner` and `deleteSystemBanner` to use `create_sys_banner` / `delete_sys_banner` RPCs with backward-compatible direct table fallback.
- **[js/ui/dashboardView.js](file:///d:/v2%20BMS%20OFFICIAL/js/ui/dashboardView.js)**: Refactor banner fetching to use RPC with fallback.

## Verification
- Verify `npm run build` produces 0 errors.
- Confirm token refresh listener executes cleanly without throwing.
