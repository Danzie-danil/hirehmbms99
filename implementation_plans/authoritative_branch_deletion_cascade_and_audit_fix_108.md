# Implementation Plan - Authoritative Branch Deletion Cascade & Audit Guard Alignment

Resolve the "permission denied for table branches" and "Audit violation: Direct inventory deletion is blocked" errors by creating an authoritative PostgreSQL RPC (`public.delete_branch_cascade`) and aligning client-side branch deletion in `js/db.js` and `js/owner/branches.js`.

## User Review Required
> [!IMPORTANT]
> The database migration script `sql/0006_authoritative_branch_deletion_cascade.sql` (and combined `sql/0006_all_branch_deletion_cascade_combined.sql`) must be executed manually in the Supabase SQL Editor.

## Proposed Changes

### Database Migration (`sql/0006_authoritative_branch_deletion_cascade.sql` & `sql/0006_all_branch_deletion_cascade_combined.sql`)
1. Create `public.delete_branch_cascade(p_branch_id uuid)` with `SECURITY DEFINER`:
   - Verifies caller authentication (`auth.uid()`) and ownership (`branches.owner_id = auth.uid()` or `public.is_sys_admin()`).
   - Sets transaction-local context `app.authorized_operation = 'admin_delete_inventory'` so audit triggers recognize the authorized cascade.
   - Unlinks manager/staff profiles (`UPDATE public.profiles SET branch_id = NULL WHERE branch_id = p_branch_id`).
   - Safely cleans up all branch-scoped data (`stock_movements`, `inventory`, `sales_items`, `sales`, `expenses`, `tasks`, `attendance`, `shifts`, `cash_drawers`, `stock_requests`, `branch_quotations`, `invoices`).
   - Deletes the branch record from `public.branches`.
   - Returns structured JSON `{ success: true, branch_id: p_branch_id, branch_name: v_branch_name }`.
2. Update `prevent_stock_movement_mutation()` and `check_inventory_mutations()` to recognize `admin_delete_inventory`, `delete_branch`, and `branch_cascade_delete` operations.
3. Ensure RLS policies and table grants on `branches` permit deletion for authenticated business owners and sysadmins.

### Client Database Layer (`js/db.js`)
- Update `dbBranches.delete(branchId)` to call `_db.rpc('delete_branch_cascade', { p_branch_id: branchId })` with direct table delete fallback.

### Branch Management UI (`js/owner/branches.js`)
- Update `deleteBranchRow(id, name)` to include robust loader handling, modal dismissal, error toast feedback, and state cleanup.

### Version Alignment & Release Notes (`release_notes.json`, `public/release_notes.json`, `js/updateChecker.js`)
- Bump version to `3.8.4` with user-friendly release notes.

## Verification Plan
### Automated & Build Verification
- Execute `npm run build` to verify clean build without lint errors.
### Manual Verification
- Run SQL migration script in Supabase SQL editor.
- Verify deleting a branch through the UI succeeds smoothly without triggering audit violations or RLS permission errors.
