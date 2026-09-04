# Fix Auth Login Parse Error, Subscription Persistence, Profile Details Sync & Sysadmin Plan Controls

## Overview
This implementation addresses four critical issues reported by the user:
1. **Login Toast Error (`Unexpected token '<',  "`):** Fixes raw server response handling and JSON parse fails (HTML 404/500 returns, missing RPC errors, un-awaited session hydration).
2. **Subscription Reverting to Free Trial on App Update / Login:** Eliminates blind profile overwrites in `js/auth.js` that reset subscribers to `free_trial` whenever profile fetch has network latency.
3. **Personal Profile Details, Phone Number & Avatar/Logo Sync:** Fixes profile hydration so user names, phones, avatars, and logos are properly fetched, cached, and displayed without defaulting to email handles or wiping existing values.
4. **Sysadmin Manual Subscription Management (Duplicates, Monthly vs Annual, & Persistence):** Deduplicates the pricing plans dropdown, adds Billing Cycle (Monthly / Annual) selectors with quick expiry shortcuts (+1M, +3M, +6M, +1Y, +2Y), and introduces an authoritative PostgreSQL RPC `sysadmin_update_subscription` to reliably persist plans and expiration dates without getting blocked by database triggers.

---

## User Review Required
> [!IMPORTANT]
> - All protected files (`js/realtime.js`, `js/data/repositories/dashboardRepository.js`, `window.broadcastDataMutation`, `js/db.js`, `js/data/db.js`, `js/data/syncManager.js`, `js/lifecycle.js`) are strictly preserved and untouched.
> - The SQL migration scripts will be written to `supabase/sql_migrations/` for manual execution in Supabase SQL Editor.
> - App version will be synced and bumped, with `npm run build` executed upon completion.

---

## Proposed Changes

### 1. Database & SQL Migrations
#### [NEW] [0019_fix_subscription_persistence_and_profile_sync.sql](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/supabase/sql_migrations/0019_fix_subscription_persistence_and_profile_sync.sql)
#### [NEW] [0019_single_run_fix_subscription_persistence_and_profile_sync.sql](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/supabase/sql_migrations/0019_single_run_fix_subscription_persistence_and_profile_sync.sql)
- Defines `public.sysadmin_update_subscription(p_profile_id UUID, p_plan TEXT, p_billing_cycle TEXT, p_expires_at TIMESTAMPTZ)` with `SECURITY DEFINER` and `GRANT EXECUTE TO authenticated, service_role`.
- Updates `get_user_effective_entitlements` RPC to accurately evaluate `subscription_expires_at`, `billing_cycle`, and `trial_ends_at`.
- Ensures `validate_user_login_role` is cleanly deployed with idempotent exception handling.
- Ensures RLS permissions on `public.profiles` and `public.sys_pricing_plans` allow proper reads and updates.

---

### 2. Authentication & Session Hydration
#### [MODIFY] [js/auth.js](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/auth.js)
- **Await Supabase Session:** In `_executePendingLogin`, ensure `await supabase.auth.setSession(...)` is completed before firing dependent database queries (`dbBranches`, `dbProfile`, entitlements).
- **Graceful Error Handling:** Protect against non-JSON / HTML responses in `_executePendingLogin`, REST calls, and `validate_user_login_role` RPC checks without throwing toast `Unexpected token '<', "`.
- **Prevent Subscription Overwrite:** In `initAuth()` and `_executePendingLogin()`, stop overwriting existing database rows with `plan: 'free_trial'` when `dbProfile.fetch()` returns null due to temporary latency. Use local session cache and server entitlements to preserve verified plans.
- **Profile & Avatar Persistence:** Ensure `state.profile`, `avatar_url`, `logo_url`, `full_name`, and `mobile_number` are safely cached and restored across app updates and restarts.

---

### 3. Sysadmin User Maintenance & Subscription Modal
#### [MODIFY] [js/admin/dashboard.js](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/admin/dashboard.js)
- **Deduplicate Pricing Plans:** Deduplicate `adminPricingPlans` array in `editUserSubscription` by plan name (`starter`, `enterprise`, `exclusive`).
- **Billing Cycle Selector:** Add a dedicated **Billing Cycle** selector (`Monthly` / `Annual`) to the modal.
- **Quick Duration Helpers:** Provide quick preset buttons for expiration dates (`+7 Days Trial`, `+1 Month`, `+3 Months`, `+6 Months`, `+1 Year`, `+2 Years`).
- **Save Handler Update:** Update `saveUserSubscription` to call `supabase.rpc('sysadmin_update_subscription', ...)` (with direct table update fallback) with both `subscription_expires_at` and `billing_cycle` properly populated.

---

### 4. Plan Evaluation & Settings Profile Display
#### [MODIFY] [js/plan.js](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/plan.js)
- Ensure `getPlan()` respects `subscription_expires_at` for active paid subscriptions, accurately reflects `billing_cycle` (`monthly` vs `annual`), and prevents premature downgrade to `free_trial`.

#### [MODIFY] [js/owner/settings.js](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/owner/settings.js)
- Guard against saving empty strings for non-active tabs during auto-save.
- Ensure personal admin information (`full_name`, `mobile_number`, `avatar_url`) and business information (`business_name`, `logo_url`, `brand_color`) load reliably without falling back to email handle defaults.

#### [MODIFY] [js/updateChecker.js](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/updateChecker.js)
- Guard `fetch('/release_notes.json')` against HTML content-type or non-JSON payloads to prevent unexpected token syntax errors during background update checks.

---

## Verification Plan

### Automated Build & Lint Check
- Run `npm run build` to ensure 0 TypeScript / Vite compilation errors.

### Manual & Logical Verification
1. **Login Flow:** Verify that logging in as Owner, Branch Manager, or Sysadmin completes without any `Unexpected token '<'` toast errors.
2. **Subscription Retention:** Verify that after refreshing or updating the app, an account with an active subscription (e.g. Enterprise / Exclusive) remains on its paid tier and is NOT reverted to `free_trial`.
3. **Profile Details & Avatar:** Verify that personal full name, mobile number, avatar, and business logo load accurately in Settings and the top navigation/sidebar.
4. **Sysadmin Subscription Modal:** Open Sysadmin -> User Maintenance -> Edit Subscription. Verify that pricing plans are not duplicated, the Monthly/Annual toggle is present and functional, and saving persists the selected plan and expiration date.
