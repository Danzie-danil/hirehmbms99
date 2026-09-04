# BMSTZ Server-Side Security Migration

> **Principle:** The frontend requests an operation and displays its result. The backend determines whether the operation is permitted and how the authoritative result is calculated.

---

## Files Changed

| File | Role |
|---|---|
| `supabase/tenant_security_migration.sql` | Core migration — apply once in Supabase SQL editor |
| `js/db.js` | Thin client adapter — replaced 3 direct-DML methods with RPC calls |
| `js/offline_queue.js` | Offline sync — uses RPC + `client_tx_id` idempotency |
| `js/modals.js` | UI submission — injects `client_tx_id` per submission attempt |

---

## What the Migration Applies

### Database Invariants
- `branches.manager_id` — unique partial index prevents any manager from being assigned to more than one active branch
- `sales(branch_id, client_tx_id)` — unique constraint for offline idempotency
- `CHECK` constraints on `quantity`, `amount`, `cost_price`, `main_store_stock`
- Tenant-scoped SKU uniqueness on `central_inventory(owner_id, sku)`

### Helper Functions (all `SECURITY DEFINER`)

| Function | Purpose |
|---|---|
| `is_branch_manager(p_user_id)` | Returns true if user is assigned to any active branch |
| `get_current_tenant_id()` | Resolves owner ID for the calling user; fails closed on inconsistency |
| `user_has_branch_access(p_branch_id)` | True if owner or manager of that branch |
| `is_subscription_active(p_owner_id)` | Checks plan + trial_ends_at + status + is_suspended |
| `tenant_has_feature(p_owner_id, feature)` | Mirrors plan.js PLAN_FEATURES; active trial = full access |

### Trigger Functions

| Trigger | Table | Action |
|---|---|---|
| `check_branch_creation_limits` | `branches` BEFORE INSERT | Subscription check + concurrency-safe branch count |
| `check_branch_mutations` | `branches` BEFORE UPDATE | Blocks owner_id change; requires RPC for manager reassignment |
| `sync_branch_inventory_on_central_update` | `central_inventory` AFTER UPDATE | Syncs catalog metadata (name, sku, pricing) to branch inventory; NEVER touches quantity |
| `check_profile_mutations` | `profiles` BEFORE UPDATE | Clients cannot touch plan/trial_ends_at/status/is_suspended; branding requires Exclusive plan |
| `prevent_stock_movement_mutation` | `stock_movements` BEFORE UPDATE/DELETE | Enforces append-only audit ledger |
| `check_inventory_mutations` | `inventory` BEFORE INSERT/UPDATE/DELETE | Quantity changes blocked except from authorized RPC contexts |
| `check_central_inventory_mutations` | `central_inventory` BEFORE INSERT/UPDATE/DELETE | main_store_stock blocked except from authorized RPC contexts |

### Authoritative RPCs

| RPC | Authorization | Description |
|---|---|---|
| `create_sale(...)` | Branch owner or manager | Atomic sale: resolves price server-side, locks inventory row, deducts stock, writes movement |
| `dispatch_central_stock(...)` | Branch owner or assigned manager | Atomic dispatch: locks central row, validates cross-tenant, deducts + credits inventory |
| `create_central_item(...)` | Branch owner (Enterprise/Exclusive) | Creates catalog item with stock = 0 |
| `create_branch_item(...)` | Branch owner only | Creates branch inventory item with stock = 0 |
| `assign_branch_manager(...)` | Branch owner only | Reassigns manager with audit log |

### RLS Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `sales` | Branch access | RPC only | RPC only | RPC only |
| `inventory` | Branch access | RPC only | Branch access (trigger guards quantity) | RPC only |
| `stock_movements` | Tenant or manager | Trigger only | Blocked | Blocked |
| `central_inventory` | Tenant | RPC only | Tenant (trigger guards stock) | Blocked |
| `profiles` | Self + owner (for managers) | N/A | Self (trigger guards billing) | N/A |
| `branches` | Owner + manager + sysadmin | Owner | Owner | Owner |
| `sys_security_events` | SysAdmin only | Trigger only | Blocked | Blocked |
| `expenses/tasks/loans/customers/quotations/documents/suppliers/purchase_orders` | Branch/tenant access | Branch/tenant access | Branch/tenant access | Branch/tenant access |

---

## SysAdmin Privileges

System Administrators are identified authoritatively by `is_sys_admin()`.

- Bypasses all tenant isolation RLS policies and trigger guards
- Can modify `profiles.plan`, `profiles.status`, `profiles.is_suspended`, `profiles.trial_ends_at` directly via SQL
- Can run `emergency_lockout_account()` and `unlock_account()` RPCs
- Can correct inventory quantities directly (trigger allows when `is_sys_admin()`)
- Audit logged: subscription changes, branch creation, custom pricing, dispatches

---

## How Trusted RPC Contexts Work

Client-facing triggers use a transaction-local flag to distinguish trusted server-side execution from untrusted client DML:

```sql
PERFORM set_config('app.authorized_operation', 'create_sale', true);
```

This is set at the start of each RPC and cleared when the transaction ends. It cannot be forged via a client HTTP request (PostgREST does not expose `set_config`).

Trigger functions read it as:
```sql
v_op := current_setting('app.authorized_operation', true);
```

The `true` argument means the function returns NULL (not an error) if the setting is not present — this is intentional so direct SysAdmin SQL sessions without the setting still succeed.

---

## Applying the Migration

1. Open Supabase SQL Editor
2. Run `supabase/tenant_security_migration.sql` as `postgres`
3. Verify with `NOTIFY pgrst, 'reload schema';` at the end (already included)
4. Test the adversarial scenarios below

---

## Adversarial Test Checklist

After applying the migration, verify the following scenarios all return errors or fail as expected:

| # | Test | Expected Result |
|---|---|---|
| 1 | POST direct INSERT to `sales` as authenticated manager | 403 / RLS violation |
| 2 | POST direct INSERT to `sales` as owner (no RLS INSERT policy) | 403 / RLS violation |
| 3 | Call `create_sale` with wrong branch_id (different tenant) | Unauthorized: You do not have access |
| 4 | Call `create_sale` with `price_type=wholesale` on Starter plan | Feature locked error |
| 5 | Call `create_sale` with expired subscription | Subscription expired error |
| 6 | Call `create_sale` twice with same `client_tx_id` | Second call returns `is_duplicate: true`, no new DB row |
| 7 | Call `create_sale` with `qty > available stock` | Insufficient stock error |
| 8 | Call `dispatch_central_stock` with a branch from a different owner | Cross-tenant violation error |
| 9 | Manager tries to dispatch to a different branch (not their own) | Unauthorized: Managers can only dispatch to their assigned branch |
| 10 | Direct UPDATE to `inventory.quantity` via PostgREST | Trigger raises Audit violation |
| 11 | Direct UPDATE to `central_inventory.main_store_stock` via PostgREST | Trigger raises Audit violation |
| 12 | Direct DELETE on `stock_movements` | Trigger raises Audit violation |
| 13 | UPDATE `profiles.plan` via PostgREST as owner | Trigger raises Security violation |
| 14 | UPDATE `profiles.brand_color` on Starter plan via PostgREST | Trigger raises Feature locked |
| 15 | Try to INSERT a branch with a different `owner_id` | Trigger raises Unauthorized |
| 16 | Try to INSERT more branches than plan allows | Trigger raises Branch limit reached |
| 17 | Manager tries to reassign branch manager via direct UPDATE | Trigger raises Security violation: Use assign_branch_manager RPC |
| 18 | Unauthenticated access to any RLS-protected table | 401 / no rows returned |
| 19 | SysAdmin updates `profiles.plan` directly | Succeeds + audit event written to `sys_security_events` |
