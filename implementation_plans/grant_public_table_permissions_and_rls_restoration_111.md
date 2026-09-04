# Implementation Plan - Grant Public Table Permissions and RLS Restoration (111)

## Problem Analysis
Console logs show PostgreSQL error `42501 (insufficient_privilege)`:
```
[DB] fetchStockMovements: permission denied for table stock_movements
[DB] fetchRequestsAll: permission denied for table requests
[DB] fetchCentralInventory: permission denied for table branches
[DB] fetchRecentSales: permission denied for table sales
```

### Root Cause
1. **Schema & Table-Level Grants Missing**: In PostgreSQL / PostgREST, client requests arrive with either role `anon` or `authenticated`. Before Row-Level Security (RLS) policies are even evaluated, PostgreSQL checks table-level permissions (`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ... TO authenticated, anon`).
2. When security remediation scripts revoked broad privileges or altered tables without restoring table-level grants to `authenticated` and `anon`, PostgREST returns `permission denied for table <table_name>`.
3. Additionally, RLS policies on `stock_movements`, `requests`, `branches`, `sales`, and operational tables need to ensure that `authenticated` users (and where needed `anon`) can perform authorized SELECT/INSERT/UPDATE operations according to multi-tenant rules.

## Proposed Resolution

1. **Create Migration SQL File**:
   - `supabase/0001_grant_public_table_permissions_and_rls_restoration.sql`
   - `supabase/0001_single_run_grant_public_table_permissions.sql`

2. **SQL Script Content**:
   - Grant `USAGE` on schema `public` to `postgres`, `anon`, `authenticated`, `service_role`.
   - Grant `ALL` on all operational public tables to `authenticated` and `anon`.
   - Grant `USAGE, SELECT` on all sequences in schema `public` to `authenticated`, `anon`.
   - Ensure `ENABLE ROW LEVEL SECURITY` remains active on all tables so data isolation is strictly enforced by RLS policies.
   - Re-verify/re-create RLS SELECT and mutation policies on `stock_movements`, `requests`, `branches`, `sales`, `inventory`, `central_inventory`, `expenses`, `customers`, etc. to ensure owners, branch managers, and sysadmins have full authorized access.

## Verification Plan
1. Provide the SQL files in `supabase/` folder for the user to run in their Supabase SQL Editor.
2. Verify `npm run build` passes with 0 errors.
3. Update `Chat_History/chat_history.txt` with full details.
