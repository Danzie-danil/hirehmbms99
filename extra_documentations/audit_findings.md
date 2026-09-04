# BMSTZ Live Security Audit — Analysis Report

> Completed: 2026-08-13
> Status: **Phase 0 complete — findings documented, remediation SQL ready**

---

## Executive Summary

| Finding | Severity | Count |
|---------|----------|-------|
| `anon` role has full table privileges on all 80+ tables including `sales`, `inventory`, `sys_admins` | 🔴 CRITICAL | 1 system-wide |
| `anon` role can call `create_sale`, `create_branch_manager`, `dispatch_central_stock`, `emergency_lockout_account`, `get_all_user_accounts` | 🔴 CRITICAL | 17 RPCs |
| `create_branch_manager` has NO ownership check — any authenticated user can create managers | 🔴 CRITICAL | 1 function |
| Old-generation "Public Access" + "Strict" policy pairs on 10+ financial tables | 🟠 HIGH | 10 tables |
| `customer_payments` and `notifications` have RLS ON but zero policies (all access blocked) | 🟡 MEDIUM | 2 tables |
| `get_branch_profit_stats` and `get_branch_sales_summary` have no `search_path` set | 🟡 MEDIUM | 2 functions |
| `inventory_purchases` UPDATE has no WITH CHECK | 🟡 MEDIUM | 1 table |
| Several tables have "anon full access" policies as standalone | 🟡 MEDIUM | ~15 tables |
| Hardcoded email in admin policies (`danielidrissa12admin@gmail.com`) | 🟡 MEDIUM | 5 policies |
| `is_subscription_active()` returns hardcoded `TRUE` | ℹ️ NOTE | 1 function |

---

## CRITICAL Finding 1 — `anon` Has Full Privileges on Every Table in the Schema

**From Part 7a:** The `anon` role has `DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE` on every single table including:
- `sales`, `inventory`, `stock_movements`, `central_inventory`
- `sys_admins`, `sys_security_events`, `sys_audit_logs`
- `branches`, `profiles`, `expenses`, `loans`

**Root cause:** Supabase's default `GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated` was run, likely during project creation. The migration's `REVOKE` only targeted specific RPCs, not tables.

**Why this is not immediately catastrophic:** RLS is ON for all 80+ tables with policies enforced. The table-level grant alone does not bypass RLS. An unauthenticated `anon` user attempting to INSERT into `sales` will be blocked by the RLS policy, not the grant.

**Why it is still a CRITICAL finding:** 
1. It violates the principle of least privilege — `anon` should have zero access to financial tables at the grant level.
2. Any future mistake in RLS policy configuration (a bug, a dropped policy, a typo) immediately becomes exploitable.
3. Tables like `payroll`, `cash_drawer`, `staff` have "anon full access" policies — meaning an unauthenticated user CAN currently read/write these if they hit the right endpoint.

**Remediation — run in Supabase SQL Editor:**
```sql
-- Revoke all table-level grants from anon on financial/sensitive tables
-- anon should only access specifically designated public tables

REVOKE ALL ON TABLE public.sales             FROM anon;
REVOKE ALL ON TABLE public.inventory         FROM anon;
REVOKE ALL ON TABLE public.stock_movements   FROM anon;
REVOKE ALL ON TABLE public.central_inventory FROM anon;
REVOKE ALL ON TABLE public.expenses          FROM anon;
REVOKE ALL ON TABLE public.loans             FROM anon;
REVOKE ALL ON TABLE public.purchase_orders   FROM anon;
REVOKE ALL ON TABLE public.po_items          FROM anon;
REVOKE ALL ON TABLE public.inventory_purchases FROM anon;
REVOKE ALL ON TABLE public.customers         FROM anon;
REVOKE ALL ON TABLE public.branches          FROM anon;
REVOKE ALL ON TABLE public.profiles          FROM anon;
REVOKE ALL ON TABLE public.sys_admins        FROM anon;
REVOKE ALL ON TABLE public.sys_security_events FROM anon;
REVOKE ALL ON TABLE public.sys_audit_logs    FROM anon;
REVOKE ALL ON TABLE public.sys_settings      FROM anon;
REVOKE ALL ON TABLE public.sys_admins        FROM anon;
REVOKE ALL ON TABLE public.sys_step_up_sessions FROM anon;
REVOKE ALL ON TABLE public.sys_rate_limits   FROM anon;
REVOKE ALL ON TABLE public.saas_audit_logs   FROM anon;
REVOKE ALL ON TABLE public.payroll           FROM anon;
REVOKE ALL ON TABLE public.staff             FROM anon;
REVOKE ALL ON TABLE public.cash_drawer       FROM anon;
REVOKE ALL ON TABLE public.cash_transactions FROM anon;
REVOKE ALL ON TABLE public.stock_transfers   FROM anon;
REVOKE ALL ON TABLE public.product_returns   FROM anon;
REVOKE ALL ON TABLE public.suppliers         FROM anon;
REVOKE ALL ON TABLE public.quotations        FROM anon;
REVOKE ALL ON TABLE public.quotation_items   FROM anon;
REVOKE ALL ON TABLE public.documents         FROM anon;
REVOKE ALL ON TABLE public.document_items    FROM anon;
REVOKE ALL ON TABLE public.tasks             FROM anon;
REVOKE ALL ON TABLE public.notes             FROM anon;
REVOKE ALL ON TABLE public.goals             FROM anon;
REVOKE ALL ON TABLE public.attendance        FROM anon;
REVOKE ALL ON TABLE public.shifts            FROM anon;
REVOKE ALL ON TABLE public.loyalty_transactions FROM anon;
REVOKE ALL ON TABLE public.customer_payments FROM anon;
REVOKE ALL ON TABLE public.requests          FROM anon;

-- Tables where anon READ is legitimately needed (public-facing features)
-- Keep SELECT only, revoke write operations
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES
    ON TABLE public.sys_settings FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES
    ON TABLE public.sys_banners FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES
    ON TABLE public.sys_pricing_plans FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES
    ON TABLE public.announcements FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES
    ON TABLE public.sys_feature_flags FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES
    ON TABLE public.sys_scheduled_toasts FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES
    ON TABLE public.sys_popups FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES
    ON TABLE public.sys_toasts FROM anon;

-- Public write-allowed tables (support tickets, page views, access requests, etc.)
-- Leave these alone as their RLS policies already gate what can be written
```

---

## CRITICAL Finding 2 — `anon` Can Execute Every Sensitive RPC

**From Part 7b:** The `anon` role can call:

| RPC | Risk |
|-----|------|
| `create_sale` | Unauthenticated sale creation (blocked by internal `auth.uid()` check, but grants are wrong) |
| `create_branch_manager` | **See Critical Finding 3 — no ownership check inside** |
| `dispatch_central_stock` | Stock manipulation attempt surface |
| `create_central_item` | Catalog injection attempt surface |
| `create_branch_item` | Same |
| `emergency_lockout_account` | Lockout attempt surface (blocked by `is_sys_admin()` inside) |
| `emergency_lockout_tenant` | Same |
| `get_all_user_accounts` | Full tenant data exposure attempt (blocked by `is_sys_admin()` inside) |
| `get_platform_revenue_analytics` | Revenue data exposure attempt |
| `get_tenant_health_metrics` | Same |
| `export_tenant_compliance_data` | Full tenant data export attempt |

**Important nuance:** Most of these are blocked by internal `is_sys_admin()` guards. But the grant itself is wrong — an unauthenticated user (no session, no JWT) can make an HTTP request to the PostgREST RPC endpoint. The function will run to the `auth.uid() IS NULL → RETURN FALSE` check. This is unnecessary attack surface.

**Remediation:**
```sql
-- Revoke anon execution from all sensitive RPCs
REVOKE EXECUTE ON FUNCTION public.create_sale(uuid, text, text, numeric, text, uuid, integer, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_branch_manager(text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_branch_item(uuid, text, text, text, numeric, numeric, integer, numeric, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_central_item(text, text, text, numeric, numeric, integer, uuid, text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.dispatch_central_stock(uuid, uuid, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.assign_branch_manager(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.emergency_lockout_account(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.emergency_lockout_tenant(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.unlock_account(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.unlock_tenant(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_all_user_accounts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_platform_revenue_analytics() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_tenant_health_metrics() FROM anon;
REVOKE EXECUTE ON FUNCTION public.export_tenant_compliance_data(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_sys_broadcast(text, text, text, text, text, uuid, text, jsonb, timestamptz, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_admin_action(text, jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.toggle_sys_feature_flag(text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.confirm_step_up_reauth(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.verify_step_up_reauth(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_compiled_ai_system_prompt(uuid, text) FROM anon;

-- Note: trigger functions (check_inventory_mutations etc.) are called by the DB engine,
-- not by clients. The anon grant on these is harmless but should be cleaned up
-- as part of the next migration for hygiene.
```

---

## CRITICAL Finding 3 — `create_branch_manager` Has No Ownership Authorization Check

**From Part 5 body preview:**
```sql
CREATE OR REPLACE FUNCTION public.create_branch_manager(mgr_email text, mgr_password text, mgr_meta jsonb)
...
BEGIN
  -- Check if user already exists
  SELECT id INTO new_user_id FROM auth.users WHERE email = mgr_email;
  IF new_user_id IS NOT NULL THEN
    UPDATE auth.users SET encrypted_password = extensions.crypt(mgr_password, ...) ...
```

**There is no authorization check.** Any authenticated user can call this function and create (or overwrite the password of) a `auth.users` account. There is no check that the caller is an owner, or that the manager email belongs to their tenant.

This is the most dangerous function in the database. It writes directly to `auth.users`.

**Immediate mitigation — run now:**
```sql
-- Step 1: Revoke all access immediately until a hardened version replaces it
REVOKE EXECUTE ON FUNCTION public.create_branch_manager(text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_branch_manager(text, text, jsonb) FROM authenticated;

-- The function must be replaced with a hardened version that:
-- 1. Verifies the caller is a branch owner (auth.uid() in branches.owner_id)
-- 2. Verifies the branch being managed belongs to the caller
-- 3. Enforces subscription/plan limits
-- 4. Logs to sys_security_events
```

**The hardened replacement function spec is documented in the implementation plan under Phase 2.**

Note: There is a second overloaded `assign_branch_manager(uuid, uuid, text)` that DOES have a proper `user_has_branch_access()` check. This is the safer version. The dangerous version is `create_branch_manager(text, text, jsonb)` which writes passwords to `auth.users`.

---

## HIGH Finding 4 — Dual Policy Architecture (Old "Public Access" + New "Strict" Policies Coexist)

**From Part 2:** Many financial tables have TWO permissive policies operating simultaneously:

| Table | Old Policy | New Strict Policy |
|-------|-----------|-------------------|
| `sales` | "Public Access" — `true` for ALL | `sales_select` — `user_has_branch_access()` |
| `expenses` | "Public Access" — `true` for ALL | `expenses_select/insert/update/delete` |
| `loans` | "Public Access" — `true` for ALL | `loans_select/insert/update/delete` |
| `customers` | "Public Access" — `true` for ALL | `customers_select/insert/update/delete` |
| `tasks` | "Public Access" — `true` for ALL | `tasks_select/insert/update/delete` |
| `notes` | "Public Access" — `true` for ALL | `notes_select` |
| `inventory` | "Public Access" — `true` for ALL | `inventory_select/update` |
| `branches` | "Public Access" — `true` for ALL | `branches_select/insert/update/delete` |
| `purchase_orders` | "anon full access" — `true` for ALL | `po_select/insert/update/delete` |

**How RLS evaluates this:** With `PERMISSIVE` policies, PostgreSQL uses `OR` logic. If ANY permissive policy passes, the row is accessible. The "Public Access `true`" policy passes for everyone — making the strict policies **completely irrelevant**. Any user can see any tenant's data on these tables.

**However:** The `anon` role's "Public Access" policy only applies when `anon` has a table grant AND an RLS policy allows it. For `authenticated` users, the "Strict X access" also uses `{public}` role, meaning `auth.uid()` is available. But `true` as a USING clause with `{public}` role means any authenticated (or anon) request passes.

**Remediation — drop the old permissive policies:**
```sql
-- Drop all legacy "Public Access" and "anon full access" policies on financial tables
DROP POLICY IF EXISTS "Public Access" ON public.sales;
DROP POLICY IF EXISTS "Strict sales access" ON public.sales;

DROP POLICY IF EXISTS "Public Access" ON public.expenses;
DROP POLICY IF EXISTS "Strict expenses access" ON public.expenses;

DROP POLICY IF EXISTS "Public Access" ON public.loans;
DROP POLICY IF EXISTS "Strict loans access" ON public.loans;

DROP POLICY IF EXISTS "Public Access" ON public.customers;
DROP POLICY IF EXISTS "Strict customers access" ON public.customers;

DROP POLICY IF EXISTS "Public Access" ON public.inventory;
DROP POLICY IF EXISTS "Strict inventory access" ON public.inventory;

DROP POLICY IF EXISTS "Public Access" ON public.tasks;
DROP POLICY IF EXISTS "Strict tasks access" ON public.tasks;

DROP POLICY IF EXISTS "Public Access" ON public.branches;
DROP POLICY IF EXISTS "Strict branches access" ON public.branches;

DROP POLICY IF EXISTS "anon full access" ON public.purchase_orders;

-- The authenticated-role specific policies (e.g. sales_select, po_select) are correct.
-- They use user_has_branch_access() which properly scopes to tenant.
-- Dropping the permissive ones is sufficient.

-- Also drop these on non-financial tables that should not be public:
DROP POLICY IF EXISTS "anon full access" ON public.payroll;
DROP POLICY IF EXISTS "anon full access" ON public.staff;
DROP POLICY IF EXISTS "anon full access" ON public.cash_drawer;
DROP POLICY IF EXISTS "anon full access" ON public.cash_transactions;
DROP POLICY IF EXISTS "anon full access" ON public.attendance;
DROP POLICY IF EXISTS "anon full access" ON public.shifts;
DROP POLICY IF EXISTS "anon full access" ON public.goals;
DROP POLICY IF EXISTS "anon full access" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "anon full access" ON public.product_returns;
DROP POLICY IF EXISTS "anon full access" ON public.stock_transfers;
DROP POLICY IF EXISTS "Enable all for research archive" ON public.archived_conversations;
DROP POLICY IF EXISTS "Enable all for research chat" ON public.chat_groups;
DROP POLICY IF EXISTS "Enable all for research members" ON public.group_members;
DROP POLICY IF EXISTS "Enable all for research" ON public.messages;
DROP POLICY IF EXISTS "Enable all for research pins" ON public.pinned_messages;
DROP POLICY IF EXISTS "Enable all for research star" ON public.starred_messages;
DROP POLICY IF EXISTS "Enable all for research" ON public.requests;
DROP POLICY IF EXISTS "anon full access" ON public.document_items;
DROP POLICY IF EXISTS "anon full access" ON public.documents;
DROP POLICY IF EXISTS "anon full access" ON public.po_items;
DROP POLICY IF EXISTS "anon full access" ON public.quotation_items;
DROP POLICY IF EXISTS "anon full access" ON public.promotions;
DROP POLICY IF EXISTS "anon full access expenses" ON public.expense_tags;
DROP POLICY IF EXISTS "anon full access loans" ON public.loan_tags;
DROP POLICY IF EXISTS "anon full access tasks" ON public.task_tags;
DROP POLICY IF EXISTS "anon full access notes" ON public.note_tags;
DROP POLICY IF EXISTS "anon full access inventory" ON public.inventory_tags;
DROP POLICY IF EXISTS "anon full access customers" ON public.customer_tags;
DROP POLICY IF EXISTS "anon full access" ON public.sale_tags;
DROP POLICY IF EXISTS "Anon full access for profiles" ON public.profiles;
-- Note: keep "Users can view own profile" SELECT policy on profiles as it uses auth.uid() = id

-- Then create minimal-access policies for tables that need anon write access for real features:
-- (task_comments, support_requests, access_requests — these already have appropriate policies)
```

---

## MEDIUM Finding 5 — `customer_payments` and `notifications` Inaccessible (RLS ON, 0 Policies)

Both tables have RLS enabled but no policies whatsoever — meaning all access is denied to everyone.

```sql
-- Determine if these are actually used by the application:
SELECT COUNT(*) FROM public.customer_payments;
SELECT COUNT(*) FROM public.notifications;

-- If they are used, add appropriate policies.
-- customer_payments — likely scoped by branch:
CREATE POLICY customer_payments_select ON public.customer_payments
    FOR SELECT TO authenticated
    USING (public.user_has_branch_access(branch_id));

CREATE POLICY customer_payments_insert ON public.customer_payments
    FOR INSERT TO authenticated
    WITH CHECK (public.user_has_branch_access(branch_id));

-- notifications — likely scoped by recipient:
-- (inspect schema first to confirm column names)
```

---

## MEDIUM Finding 6 — `get_branch_profit_stats` and `get_branch_sales_summary` Missing `search_path`

**From Part 5:** Both functions show `⚠️ NOT set` for `search_path_status`. These are SECURITY DEFINER functions without a pinned `search_path`, making them vulnerable to schema search-path injection if a malicious schema is created.

Additionally, `get_branch_profit_stats` takes a `p_branch_id uuid` as a parameter but does NOT check that the caller has access to that branch. Any authenticated user can get profit stats for any branch by supplying its ID.

```sql
-- Hardened replacement:
CREATE OR REPLACE FUNCTION public.get_branch_profit_stats(p_branch_id uuid)
RETURNS TABLE(gross_profit numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- Authorization: caller must have branch access
    IF NOT public.user_has_branch_access(p_branch_id) THEN
        RAISE EXCEPTION 'Unauthorized: You do not have access to this branch.';
    END IF;

    RETURN QUERY
    SELECT COALESCE(SUM(
        (s.amount / GREATEST(s.quantity, 1) - COALESCE(i.cost_price, 0)) * s.quantity
    ), 0) AS gross_profit
    FROM public.sales s
    LEFT JOIN public.inventory i ON s.product_id = i.id
    WHERE s.branch_id = p_branch_id;
END;
$$;

-- Same for get_branch_sales_summary:
CREATE OR REPLACE FUNCTION public.get_branch_sales_summary(
    p_branch_id uuid,
    p_today_start timestamptz
)
RETURNS TABLE(today_total numeric, transaction_count bigint, avg_sale numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    IF NOT public.user_has_branch_access(p_branch_id) THEN
        RAISE EXCEPTION 'Unauthorized: You do not have access to this branch.';
    END IF;

    RETURN QUERY
    SELECT
        COALESCE(SUM(amount), 0),
        COUNT(id),
        CASE WHEN COUNT(id) > 0 THEN COALESCE(SUM(amount) / COUNT(id), 0) ELSE 0 END
    FROM public.sales
    WHERE branch_id = p_branch_id AND created_at >= p_today_start;
END;
$$;
```

---

## MEDIUM Finding 7 — Hardcoded Admin Email in 5 Policies

Policies using `auth.jwt()->>'email' = 'danielidrissa12admin@gmail.com'` exist on:
- `support_requests`, `sys_audit_logs`, `sys_email_broadcasts`, `sys_pricing_plans`, `sys_tickets`, `sys_page_views`, `sys_scheduled_toasts`

**Risk:** If this email account is ever compromised, deleted, or changed, these policies either stop working or grant access to an attacker. Additionally, the `is_sys_admin()` function already exists for this purpose.

**Remediation:** Replace hardcoded email checks with `is_sys_admin()`.

```sql
-- Example: sys_audit_logs
DROP POLICY IF EXISTS "Allow admin access to audit logs" ON public.sys_audit_logs;
-- The sys_audit_logs_select policy already uses is_sys_admin() — no replacement needed

DROP POLICY IF EXISTS "Allow admin full access to broadcasts" ON public.sys_email_broadcasts;
CREATE POLICY sys_email_broadcasts_sysadmin ON public.sys_email_broadcasts
    FOR ALL TO authenticated
    USING (public.is_sys_admin())
    WITH CHECK (public.is_sys_admin());

DROP POLICY IF EXISTS "System admins can manage support requests" ON public.support_requests;
CREATE POLICY support_requests_admin ON public.support_requests
    FOR ALL TO authenticated
    USING (public.is_sys_admin());

DROP POLICY IF EXISTS "Allow admin write access to pricing plans" ON public.sys_pricing_plans;
CREATE POLICY sys_pricing_plans_admin_write ON public.sys_pricing_plans
    FOR ALL TO authenticated
    USING (public.is_sys_admin())
    WITH CHECK (public.is_sys_admin());
-- (repeat for other hardcoded-email policies)
```

---

## NOTE — `is_subscription_active()` Always Returns TRUE

```sql
CREATE OR REPLACE FUNCTION public.is_subscription_active(p_owner_id uuid)
...
BEGIN
    RETURN TRUE;
END;
```

This is a stub. Subscription enforcement is not live. Every `tenant_has_feature()` and every subscription check in RPCs passes unconditionally. This is presumably intentional during development but must be noted before go-live.

---

## NOTE — Duplicate Function Versions (Two Overloads)

Several functions have two versions with different signatures (both granted to anon/authenticated). The `pg_temp` search-path versions appear to be a newer generation. The `pg_catalog` versions appear to be the migration-hardened ones.

Examples:
- `create_sale` — 2 versions
- `dispatch_central_stock` — 2 versions  
- `create_branch_item` — 2 versions
- `create_central_item` — 2 versions
- `assign_branch_manager` — 2 versions

The `pg_temp` overloads have weaker search_path handling (`pg_temp` is the user's temp schema — less secure than `pg_catalog`). When the application calls these RPCs without specifying argument types, PostgREST may call either version. The older versions should be identified and dropped.

---

## Complete Remediation Execution Order

> [!CAUTION]
> Run each block in this exact order. Test after each block. Do not apply all at once.

### Step 1 — Emergency: Revoke `create_branch_manager` access (Do this NOW)
```sql
REVOKE EXECUTE ON FUNCTION public.create_branch_manager(text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_branch_manager(text, text, jsonb) FROM authenticated;
```

### Step 2 — Revoke anon RPC execution (Critical Finding 2)
*(SQL provided in Critical Finding 2 section above)*

### Step 3 — Drop legacy permissive RLS policies (High Finding 4)
*(SQL provided in High Finding 4 section above)*

### Step 4 — Revoke anon table grants (Critical Finding 1)
*(SQL provided in Critical Finding 1 section above)*

### Step 5 — Fix `get_branch_profit_stats` and `get_branch_sales_summary` (Medium Finding 6)
*(SQL provided in Medium Finding 6 section above)*

### Step 6 — Fix hardcoded email policies (Medium Finding 7)
*(SQL provided in Medium Finding 7 section above)*

### Step 7 — Add policies for `customer_payments` and `notifications` (Medium Finding 5)
*(After confirming table schema)*

---

## What is NOT a Problem (Originally Flagged, Now Cleared)

| Concern | Status |
|---------|--------|
| RLS missing on tables | ✅ Clear — all 80+ tables have RLS ON |
| Part 4 (financial columns without RLS) | ✅ Clear — returned no rows |
| WITH CHECK on UPDATE policies (core financial tables) | ✅ Clear — all have WITH CHECK |
| Trigger guards in production | ✅ Clear — all 7 confirmed active |
| `is_sys_admin()` search_path | ✅ Set correctly |
| `create_sale` architecture | ✅ Correct — idempotent, tenant-scoped |
| `dispatch_central_stock` cross-tenant check | ✅ Present and correct |
| `sys_admins` INSERT/UPDATE/DELETE | ✅ Blocked by `false` policies |
