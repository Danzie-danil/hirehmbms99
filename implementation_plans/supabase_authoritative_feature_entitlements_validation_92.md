# Supabase Authoritative Feature Entitlements Validation

## Overview
Refactored the permission and feature validation architecture so that Supabase PostgreSQL is the sole authoritative source of truth for all plan permissions, feature entitlements, active subscription state, and AI Analytics gating. The frontend performs zero local authorization computation and solely queries Supabase RPC `get_user_effective_entitlements()`.

## Architecture & Data Flow

1. **Supabase PostgreSQL Schema & RPC**:
   - `public.plan_features`: Stores authoritative tier-to-feature mapping.
     - `starter`: `basic_pos`, `sales_records`, `daily_summary`, `multi_user_pin`
     - `enterprise`: `dual_pricing`, `till_reconciliation`, `restock_velocity`, `central_inventory`, `central_dispatch`, `stock_take_audit`, `barcode_scanner`, `whatsapp_receipts`, `whatsapp_invoicing`, `custom_invoicing`, `csv_import_export`
     - `exclusive`: ALL above plus `ai_assistant`, `modal_ai_assistant`, `ai_analytics`, `advanced_analytics`, `custom_branding`, `unlimited_branches`, `custom_report`
   - `public.get_user_effective_entitlements(p_user_id)`: Server-side Security Definer RPC that computes `is_active`, `is_paid`, `is_trial`, `max_branches`, `branch_count`, and `features` array.
   - `public.check_user_entitlement(p_feature_key, p_user_id)`: Server-side boolean check.

2. **Frontend Consumption**:
   - During user login, app launch, and Sysadmin inspection sessions, the frontend invokes `supabase.rpc('get_user_effective_entitlements', { p_user_id })`.
   - The verified response is stored in `state.entitlements`.
   - `getPlan()` and `hasFeature(feature)` strictly query `state.entitlements.features.includes(feature)`.

## SQL Migration Files Provided:
- [0003_server_authoritative_entitlements_and_ai_analytics_gating.sql](file:///d:/v2%20BMS%20OFFICIAL/sql/0003_server_authoritative_entitlements_and_ai_analytics_gating.sql)
- [0003_all_entitlements_migrations_combined.sql](file:///d:/v2%20BMS%20OFFICIAL/sql/0003_all_entitlements_migrations_combined.sql)

## Verification
- Verified build: `npm run build` completed with 0 errors.
- Verified inspection mode isolation: Impersonation fetches the tenant's server entitlements via RPC, ensuring Sysadmin privileges never bypass the tenant's true subscription limits.
