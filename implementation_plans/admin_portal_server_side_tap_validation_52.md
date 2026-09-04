# Implementation Plan - Admin Portal Server-Side Tap Validation (52)

## Overview
Move the administrative portal activation threshold validation from client-side logic to Supabase database RPC. The frontend tracks user interactions without hardcoding or mentioning any tap count number, and submits verification requests to the `validate_admin_portal_access` function in Supabase. The threshold is set to 21 on the server side via `sys_settings`.

## User Review Required
> [!IMPORTANT]
> The database migration script `0001_validate_admin_portal_tap_threshold.sql` (or single-run `0001_single_run_admin_portal_tap_threshold.sql`) must be executed in Supabase SQL Editor by the administrator to configure the 21-tap threshold and deploy the `validate_admin_portal_access` RPC.

## Proposed Changes

### [supabase/0001_validate_admin_portal_tap_threshold.sql](file:///d:/v2%20BMS%20OFFICIAL/supabase/0001_validate_admin_portal_tap_threshold.sql)
- Insert `admin_portal_tap_threshold = '21'` into `public.sys_settings`.
- Create `public.validate_admin_portal_access(p_taps INT, p_code TEXT)` SECURITY DEFINER RPC.
- Maintain `validate_admin_portal_passcode` compatibility wrapper.
- Grant execute permissions to `anon`, `authenticated`, and `service_role`.

### [js/auth.js](file:///d:/v2%20BMS%20OFFICIAL/js/auth.js)
- Refactor `setupAdminPasscodeListener()` logo tap handler to eliminate all client-side tap numbers/constants.
- Query `supabase.rpc('validate_admin_portal_access', { p_taps, p_code })` dynamically for prompt and unlock determination.

### Version Management
- Bump app version to `2.9.91` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
- Comply with user-facing release notes rule for admin features (no technical/admin terms mentioned).

## Verification Plan
- Run `npm run build` to verify clean compilation with 0 errors.
