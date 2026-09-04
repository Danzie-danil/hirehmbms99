# Implementation Plan: Branch Approval Enforcement & Stock Transfer RPC Fix_01

## Problem Description
1. **Stock Transfer Error (`column "unit" does not exist`)**:
   - When attempting to transfer stock between branches, `transfer_branch_to_branch_stock` RPC fails with HTTP 400 because it references a non-existent `unit` column in its SQL definition.
2. **Branch Approval Workflow Bypass**:
   - When a branch is configured with restricted permissions (e.g. `sales_add`, `expenses_add`, `customers_add` requiring approval), submitting the modal form ignores the restriction and directly records the transaction, bypassing the Owner Approval Queue (`requests` table), sidebar badges, notifications, and overview widgets.
   - When the owner approves a request in `Requests & Approvals`, only `inventory_add` and `inventory_update` were wired up to commit to the database; sales and expenses were unhandled.

---

## Proposed Changes

### 1. Database Migration: `0001_fix_transfer_branch_to_branch_stock.sql`
- Recreate `transfer_branch_to_branch_stock` RPC with column-safe PL/pgSQL that does NOT assume `unit` exists.
- Safely update source branch inventory (deducting qty), increment or insert destination branch inventory copying core columns (`name, sku, category, price, cost_price, retail_price, wholesale_price, min_threshold, item_type`), and log into `stock_transfers`.

### 2. Modal Submission Handlers (`js/modals.js`)
- In `window.handleAddSale`: Check `window.branchCanDo && branchCanDo('sales_add')`. If false, submit payload to `dbRequests.add(...)` with `type: 'sales_add'`, notify user, and route cleanly.
- In `window.handleAddExpense`: Check `window.branchCanDo && branchCanDo('expenses_add')`. If false, submit payload to `dbRequests.add(...)` with `type: 'expenses_add'`.
- In `window.handleAddCustomer`: Check `window.branchCanDo && branchCanDo('customers_add')`. If false, submit payload to `dbRequests.add(...)` with `type: 'customers_add'`.

### 3. Owner Requests Module (`js/owner/requests.js`)
- Enhance `handleRequestAction(id, status)`: When approved, commit `sales_add`, `expenses_add`, and `customers_add` into their respective tables (`dbSales.add`, `dbExpenses.add`, `dbCustomers.add`).
- Add rich card views for `sales_add` and `expenses_add` in `renderRequestsList()` displaying amount, customer/category, payment type, and items breakdown.

---

## Verification Plan
1. **Automated & Build Check**:
   - Run `npm run build` to ensure 0 bundling/compilation errors.
2. **Manual User Verification**:
   - User executes SQL migration script in Supabase SQL editor.
   - User tests inter-branch stock transfer.
   - User tests branch sale/expense submission under restricted permissions and verifies that it lands in the Owner Approval Queue, increments the badge, and applies on owner approval.
