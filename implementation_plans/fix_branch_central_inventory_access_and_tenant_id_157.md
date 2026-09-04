# Implementation Plan - Fix Branch Central Inventory Access and Tenant Resolution (#branch)

## Problem Description
In the `#branch` role, loading reports and views that fetch central inventory (`dbCentralInventory.fetchAll`) fails with:
1. `GET .../rest/v1/central_inventory?select=*,suppliers(name)&owner_id=... 404 (Not Found)`
2. `[DB] fetchCentralInventory: function max(uuid) does not exist`
3. `[dbCentralInventory] fetchAll error, falling back to localDb: function max(uuid) does not exist`

## Root Cause Analysis
1. **PostgreSQL Function `public.get_current_tenant_id()`**:
   Inside `tenant_security_migration.sql`, line 134:
   ```sql
   SELECT COUNT(*), MAX(owner_id) INTO v_branch_count, v_tenant_id FROM public.branches WHERE manager_id = auth.uid() ...
   ```
   PostgreSQL has no built-in `MAX(uuid)` aggregate function for UUID columns. When any authenticated branch user executes an RLS-guarded query calling `get_current_tenant_id()`, PostgreSQL aborts with `function max(uuid) does not exist`.
2. **Staff / Cashier Scope in `get_current_tenant_id()`**:
   Non-manager branch staff (cashiers) were not mapped to their branch's `owner_id` in `get_current_tenant_id()`.
3. **Foreign Key Embedding Fallback**:
   In `js/db.js`, `dbCentralInventory.fetchAll` should use resilient fallback (`.select('*')` if `.select('*, suppliers(name)')` encounters a schema relation restriction).

## Proposed Solution
1. **SQL Migration `0020_fix_get_current_tenant_id_and_central_inventory_access.sql`**:
   - Redefine `public.get_current_tenant_id()` using standard array aggregation `(ARRAY_AGG(owner_id))[1]` without `MAX(uuid)`.
   - Add branch staff mapping in `get_current_tenant_id()`.
   - Ensure RLS policies on `central_inventory` and `suppliers` grant SELECT access to branch managers and staff.
   - Provide `0020_single_run_fix_get_current_tenant_id_and_central_inventory_access.sql` for single-click execution.
2. **Client-Side Resilience in `js/db.js` and `js/owner/report_pdf_engine.js`**:
   - Resolve owner ID from `window.state?.ownerId || window.state?.branchProfile?.owner_id`.
   - Provide query fallback in `dbCentralInventory.fetchAll`.
3. **Sync & Verification**:
   - Bump version to `v3.9.109`.
   - Run `npm run build` and check for 0 lint/build errors.
   - Update `Chat_History/chat_history.txt`.
