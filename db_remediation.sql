-- ═══════════════════════════════════════════════════════════════════════════
-- BMSTZ Database Security Remediation — Consolidated Script (Steps 2 - 6)
-- Run as postgres / superuser in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── STEP 2: Revoke anon execution from all sensitive RPCs ────────────────────
REVOKE EXECUTE ON FUNCTION public.create_sale(uuid, text, text, numeric, text, uuid, integer, text, uuid) FROM anon;
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

-- ── STEP 3: Drop legacy permissive RLS policies ──────────────────────────────
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

-- ── STEP 4: Revoke anon table-level grants ───────────────────────────────────
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

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.sys_banners FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.sys_pricing_plans FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.announcements FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.sys_feature_flags FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.sys_scheduled_toasts FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.sys_popups FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.sys_toasts FROM anon;

-- ── STEP 5: Harden profit stats & sales summary functions ─────────────────────
CREATE OR REPLACE FUNCTION public.get_branch_profit_stats(p_branch_id uuid)
RETURNS TABLE(gross_profit numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
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

-- ── STEP 6: Replace hardcoded admin email policies ───────────────────────────
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

NOTIFY pgrst, 'reload schema';
