# Implementation Plan - Fix Central Inventory Table Permissions

> [!IMPORTANT]
> **Plan ID**: `fix_central_inventory_permissions_68`
> **Objective**: Resolve PostgREST/PostgreSQL error `[DB] fetchCentralInventory: permission denied for table central_inventory` by granting explicit table privileges and updating Row-Level Security (RLS) policies.

---

## 1. Problem Description
When fetching central inventory from the client, Supabase returned:
```
[DB] fetchCentralInventory: permission denied for table central_inventory
```
This is PostgreSQL error code `42501` (insufficient privilege) caused by missing table `GRANT` permissions for the `authenticated` and `anon` database roles on `public.central_inventory` and related joined tables (`public.suppliers`), combined with RLS policies that need to allow both Business Owners and Branch staff to read catalog items.

---

## 2. Changes & SQL Migrations Provided
- **SQL Migration**: [`supabase/0001_fix_central_inventory_table_permissions_and_rls.sql`](file:///d:/v2%20BMS%20OFFICIAL/supabase/0001_fix_central_inventory_table_permissions_and_rls.sql)
- **Single-Run SQL**: [`supabase/0001_single_run_fix_central_inventory_permissions.sql`](file:///d:/v2%20BMS%20OFFICIAL/supabase/0001_single_run_fix_central_inventory_permissions.sql)

### Actions performed in the migration:
1. `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.central_inventory TO authenticated;`
2. `GRANT SELECT ON TABLE public.central_inventory TO anon;`
3. Granted table permissions on `public.suppliers` for joined supplier name resolution.
4. Updated `central_inventory_select` and `suppliers_select` RLS policies to allow Sysadmins, Owners, Branch Managers, and Branch Staff to read items belonging to their business.

---

## 3. Verification & Safety
- Codebase build verified (`npm run build`).
- Migration scripts generated and placed in `supabase/` directory according to workspace rules.
