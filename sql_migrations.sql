-- ═══════════════════════════════════════════════════════════════════════════
-- BMSTZ DATABASE MIGRATIONS - System Admin Full Access & Schema Updates
-- Idempotent, safe migration script runnable under any Supabase SQL session
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add Custom Branding & Profile Columns for System Admin & Tour Persistence
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS opted_out_trial BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_seen_tour BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_seen_branch_tour BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;

-- 2. Ensure sys_pricing_plans table has correct max_branches limits
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sys_pricing_plans') THEN
    UPDATE public.sys_pricing_plans SET max_branches = 3 WHERE LOWER(plan_name) = 'starter';
    UPDATE public.sys_pricing_plans SET max_branches = 10 WHERE LOWER(plan_name) = 'enterprise';
    UPDATE public.sys_pricing_plans SET max_branches = 9999 WHERE LOWER(plan_name) = 'exclusive';
  END IF;
END $$;

-- 3. Enable RLS & Configure Full Access Policies for System Admin
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow System Admin & authenticated users full access on profiles
DROP POLICY IF EXISTS "Sysadmin full access on profiles" ON public.profiles;
CREATE POLICY "Sysadmin full access on profiles"
ON public.profiles
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- 4. Create or update branch manager helper functions
CREATE OR REPLACE FUNCTION public.create_branch_manager(mgr_email text, mgr_password text, mgr_meta jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO new_user_id FROM auth.users WHERE email = mgr_email;
  
  IF new_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET 
      encrypted_password = extensions.crypt(mgr_password, extensions.gen_salt('bf')),
      raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || mgr_meta,
      updated_at = now()
    WHERE id = new_user_id;
  ELSE
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      mgr_email,
      extensions.crypt(mgr_password, extensions.gen_salt('bf')),
      now(),
      mgr_meta,
      '{}'::jsonb,
      'authenticated',
      'authenticated',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  END IF;

  -- Ensure identity exists in auth.identities to prevent "Database error querying schema" on login
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = new_user_id AND provider = 'email') THEN
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      new_user_id,
      new_user_id,
      jsonb_build_object('sub', new_user_id::text, 'email', mgr_email),
      'email',
      new_user_id::text,
      now(),
      now(),
      now()
    );
  ELSE
    UPDATE auth.identities
    SET 
      identity_data = jsonb_build_object('sub', new_user_id::text, 'email', mgr_email),
      updated_at = now()
    WHERE user_id = new_user_id AND provider = 'email';
  END IF;
  
  RETURN new_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_branch_manager_password(mgr_id uuid, new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET 
    encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
    updated_at = now()
  WHERE id = mgr_id;
END;
$$;

-- 5. Fix any existing users with NULL token values which crash GoTrue/Supabase Auth
UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, '')
WHERE 
  confirmation_token IS NULL OR 
  recovery_token IS NULL OR 
  email_change_token_new IS NULL OR 
  email_change IS NULL;

-- 6. Insert missing identities for existing users in auth.users
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT 
  id,
  id,
  jsonb_build_object('sub', id::text, 'email', email),
  'email',
  id::text,
  COALESCE(last_sign_in_at, now()),
  created_at,
  updated_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM auth.identities i 
  WHERE i.user_id = u.id AND i.provider = 'email'
);

-- 7. Add has_seen_branch_tour column to branches table if not exists
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS has_seen_branch_tour BOOLEAN DEFAULT FALSE;

-- 8. Standardize sys_pricing_plans max_branches (NULL = unlimited)
CREATE TABLE IF NOT EXISTS public.sys_pricing_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_name TEXT NOT NULL UNIQUE,
    price NUMERIC DEFAULT 0,
    max_branches INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sys_pricing_plans ALTER COLUMN max_branches DROP NOT NULL;
ALTER TABLE public.sys_pricing_plans ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TZS';
ALTER TABLE public.sys_pricing_plans ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;
ALTER TABLE public.sys_pricing_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

INSERT INTO public.sys_pricing_plans (plan_name, price, max_branches)
VALUES 
    ('free_trial', 0, 3),
    ('starter', 5000, 3),
    ('enterprise', 15000, 10),
    ('exclusive', 35000, NULL)
ON CONFLICT (plan_name) DO UPDATE SET 
    max_branches = EXCLUDED.max_branches,
    updated_at = now();

-- 9. Authoritative Plan Features Mapping Table
CREATE TABLE IF NOT EXISTS public.plan_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_name TEXT NOT NULL,
    feature_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_plan_feature UNIQUE (plan_name, feature_key)
);

ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plan_features_public_read ON public.plan_features;
CREATE POLICY plan_features_public_read ON public.plan_features
    FOR SELECT TO authenticated, anon
    USING (true);

INSERT INTO public.plan_features (plan_name, feature_key)
VALUES
    ('enterprise', 'dual_pricing'),
    ('enterprise', 'till_reconciliation'),
    ('enterprise', 'restock_velocity'),
    ('enterprise', 'central_inventory'),
    ('enterprise', 'central_dispatch'),
    ('enterprise', 'stock_take_audit'),
    ('enterprise', 'barcode_scanner'),
    ('enterprise', 'whatsapp_receipts'),
    ('enterprise', 'whatsapp_invoicing'),
    ('enterprise', 'custom_invoicing'),
    ('enterprise', 'csv_import_export'),
    ('exclusive', 'dual_pricing'),
    ('exclusive', 'till_reconciliation'),
    ('exclusive', 'restock_velocity'),
    ('exclusive', 'central_inventory'),
    ('exclusive', 'central_dispatch'),
    ('exclusive', 'stock_take_audit'),
    ('exclusive', 'barcode_scanner'),
    ('exclusive', 'whatsapp_receipts'),
    ('exclusive', 'whatsapp_invoicing'),
    ('exclusive', 'custom_invoicing'),
    ('exclusive', 'csv_import_export'),
    ('exclusive', 'ai_assistant'),
    ('exclusive', 'custom_branding'),
    ('exclusive', 'advanced_analytics'),
    ('exclusive', 'unlimited_branches'),
    ('exclusive', 'custom_report'),
    ('exclusive', 'modal_ai_assistant')
ON CONFLICT (plan_name, feature_key) DO NOTHING;

-- 10. Branch Limit Database Enforcement Trigger
CREATE OR REPLACE FUNCTION public.fn_check_branch_creation_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_owner_id UUID;
    v_plan TEXT;
    v_trial_ends TIMESTAMPTZ;
    v_max_branches INTEGER;
    v_current_count INTEGER;
    v_is_sysadmin BOOLEAN := false;
    v_user_email TEXT;
BEGIN
    v_owner_id := NEW.owner_id;

    SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
    IF v_user_email IS NOT NULL AND EXISTS (SELECT 1 FROM public.sys_admins WHERE email = v_user_email) THEN
        RETURN NEW;
    END IF;

    SELECT 
        COALESCE(plan, 'free_trial'),
        trial_ends_at
    INTO v_plan, v_trial_ends
    FROM public.profiles
    WHERE id = v_owner_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Owner profile not found. Cannot create branch.';
    END IF;

    IF v_plan = 'free_trial' THEN
        IF v_trial_ends IS NOT NULL AND v_trial_ends < NOW() THEN
            RAISE EXCEPTION 'Your free trial has expired. Please upgrade your subscription to create additional branches.';
        END IF;
    END IF;

    SELECT max_branches INTO v_max_branches
    FROM public.sys_pricing_plans
    WHERE LOWER(plan_name) = LOWER(v_plan);

    IF v_max_branches IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT COUNT(*) INTO v_current_count
    FROM public.branches
    WHERE owner_id = v_owner_id
      AND COALESCE(to_jsonb(branches)->>'status', 'active') IS DISTINCT FROM 'deleted';

    IF v_current_count >= v_max_branches THEN
        RAISE EXCEPTION 'Branch creation limit reached (Maximum allowed: %). Upgrade your plan to add more branches.', v_max_branches;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_branch_limit ON public.branches;
CREATE TRIGGER trg_enforce_branch_limit
    BEFORE INSERT ON public.branches
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_check_branch_creation_limit();

-- 11. Authoritative Entitlements Resolution RPCs
CREATE OR REPLACE FUNCTION public.get_user_effective_entitlements(p_user_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_target_id UUID := COALESCE(p_user_id, auth.uid());
    v_user_email TEXT;
    v_role TEXT := 'owner';
    v_owner_id UUID;
    v_plan TEXT := 'free_trial';
    v_trial_ends TIMESTAMPTZ;
    v_status TEXT := 'active';
    v_is_suspended BOOLEAN := false;
    v_is_trial BOOLEAN := false;
    v_is_trial_active BOOLEAN := false;
    v_is_trial_expired BOOLEAN := false;
    v_is_skipped_trial BOOLEAN := false;
    v_is_paid BOOLEAN := false;
    v_is_active BOOLEAN := true;
    v_max_branches INTEGER := 3;
    v_branch_count INTEGER := 0;
    v_features TEXT[] := ARRAY[]::TEXT[];
BEGIN
    IF v_target_id IS NULL THEN
        RETURN jsonb_build_object('is_active', false, 'error', 'unauthenticated');
    END IF;

    SELECT email INTO v_user_email FROM auth.users WHERE id = v_target_id;

    IF v_user_email IS NOT NULL AND EXISTS (SELECT 1 FROM public.sys_admins WHERE email = v_user_email) THEN
        SELECT ARRAY_AGG(DISTINCT feature_key) INTO v_features FROM public.plan_features;
        RETURN jsonb_build_object(
            'role', 'sysadmin',
            'plan_id', 'exclusive',
            'is_active', true,
            'is_paid', true,
            'is_trial', false,
            'is_trial_active', false,
            'is_trial_expired', false,
            'is_skipped_trial', false,
            'max_branches', null,
            'branch_count', 0,
            'features', COALESCE(v_features, ARRAY[]::TEXT[])
        );
    END IF;

    SELECT b.owner_id INTO v_owner_id
    FROM public.branches b
    WHERE b.manager_id = v_target_id
      AND COALESCE(to_jsonb(b)->>'status', 'active') IS DISTINCT FROM 'deleted'
    LIMIT 1;

    IF v_owner_id IS NOT NULL THEN
        v_role := 'branch';
    ELSE
        v_owner_id := v_target_id;
        v_role := 'owner';
    END IF;

    SELECT 
        COALESCE(plan, 'free_trial'),
        trial_ends_at,
        COALESCE(status, 'active'),
        COALESCE(is_suspended, false)
    INTO v_plan, v_trial_ends, v_status, v_is_suspended
    FROM public.profiles
    WHERE id = v_owner_id;

    IF NOT FOUND THEN
        v_plan := 'free_trial';
        v_trial_ends := NOW() + INTERVAL '14 days';
    END IF;

    v_is_trial := (v_plan = 'free_trial');
    v_is_skipped_trial := (v_is_trial AND v_trial_ends IS NOT NULL AND v_trial_ends < '2000-01-01T00:00:00Z'::TIMESTAMPTZ);
    v_is_trial_expired := (v_is_trial AND NOT v_is_skipped_trial AND v_trial_ends IS NOT NULL AND v_trial_ends <= NOW());
    v_is_trial_active := (v_is_trial AND NOT v_is_skipped_trial AND (v_trial_ends IS NULL OR v_trial_ends > NOW()));
    v_is_paid := NOT v_is_trial;
    v_is_active := (NOT v_is_suspended) AND (v_is_paid OR v_is_trial_active);

    SELECT max_branches INTO v_max_branches
    FROM public.sys_pricing_plans
    WHERE LOWER(plan_name) = LOWER(v_plan);

    SELECT COUNT(*) INTO v_branch_count
    FROM public.branches
    WHERE owner_id = v_owner_id
      AND COALESCE(to_jsonb(branches)->>'status', 'active') IS DISTINCT FROM 'deleted';

    IF v_is_trial_active THEN
        SELECT ARRAY_AGG(DISTINCT feature_key) INTO v_features FROM public.plan_features;
    ELSIF v_is_active THEN
        SELECT ARRAY_AGG(feature_key) INTO v_features 
        FROM public.plan_features 
        WHERE LOWER(plan_name) = LOWER(v_plan);
    ELSE
        v_features := ARRAY[]::TEXT[];
    END IF;

    RETURN jsonb_build_object(
        'role', v_role,
        'owner_id', v_owner_id,
        'plan_id', v_plan,
        'is_active', v_is_active,
        'is_trial', v_is_trial,
        'is_trial_active', v_is_trial_active,
        'is_trial_expired', v_is_trial_expired,
        'is_skipped_trial', v_is_skipped_trial,
        'is_paid', v_is_paid,
        'trial_ends_at', v_trial_ends,
        'max_branches', v_max_branches,
        'branch_count', v_branch_count,
        'features', COALESCE(v_features, ARRAY[]::TEXT[])
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_user_entitlement(p_feature_key TEXT, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_entitlements JSONB;
    v_features JSONB;
BEGIN
    v_entitlements := public.get_user_effective_entitlements(p_user_id);
    IF (v_entitlements->>'is_active')::BOOLEAN IS NOT TRUE THEN
        RETURN FALSE;
    END IF;

    v_features := v_entitlements->'features';
    RETURN v_features ? p_feature_key;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_effective_entitlements(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.check_user_entitlement(TEXT, UUID) TO authenticated, anon;

-- 12. Fix Branch-to-Branch Stock Transfer RPC (schema-safe)
CREATE OR REPLACE FUNCTION public.transfer_branch_to_branch_stock(
    p_from_branch_id uuid,
    p_to_branch_id uuid,
    p_central_item_id uuid,
    p_qty integer,
    p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_source_item RECORD;
    v_target_item RECORD;
    v_source_qty NUMERIC := 0;
    v_owner_id uuid;
BEGIN
    IF p_qty <= 0 THEN
        RAISE EXCEPTION 'Transfer quantity must be greater than 0.';
    END IF;

    IF p_from_branch_id = p_to_branch_id THEN
        RAISE EXCEPTION 'Source and destination branches cannot be the same.';
    END IF;

    SELECT * INTO v_source_item 
    FROM public.inventory 
    WHERE branch_id = p_from_branch_id 
      AND (central_item_id = p_central_item_id OR id = p_central_item_id)
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item not found in source branch inventory.';
    END IF;

    v_source_qty := COALESCE(v_source_item.quantity, 0);
    IF v_source_qty < p_qty THEN
        RAISE EXCEPTION 'Insufficient stock in source branch. Available: %, Requested: %', v_source_qty, p_qty;
    END IF;

    UPDATE public.inventory
    SET quantity = quantity - p_qty,
        updated_at = now()
    WHERE id = v_source_item.id;

    SELECT * INTO v_target_item
    FROM public.inventory
    WHERE branch_id = p_to_branch_id
      AND (central_item_id = COALESCE(v_source_item.central_item_id, p_central_item_id) 
           OR name = v_source_item.name)
    LIMIT 1;

    IF FOUND THEN
        UPDATE public.inventory
        SET quantity = quantity + p_qty,
            updated_at = now()
        WHERE id = v_target_item.id;
    ELSE
        INSERT INTO public.inventory (
            branch_id,
            central_item_id,
            name,
            sku,
            category,
            price,
            cost_price,
            retail_price,
            wholesale_price,
            min_threshold,
            item_type,
            quantity,
            created_at,
            updated_at
        ) VALUES (
            p_to_branch_id,
            COALESCE(v_source_item.central_item_id, p_central_item_id),
            v_source_item.name,
            v_source_item.sku,
            v_source_item.category,
            v_source_item.price,
            COALESCE(v_source_item.cost_price, 0),
            COALESCE(v_source_item.retail_price, v_source_item.price),
            COALESCE(v_source_item.wholesale_price, v_source_item.price),
            COALESCE(v_source_item.min_threshold, 5),
            COALESCE(v_source_item.item_type, 'product'),
            p_qty,
            now(),
            now()
        );
    END IF;

    SELECT owner_id INTO v_owner_id FROM public.branches WHERE id = p_from_branch_id;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stock_transfers') THEN
        INSERT INTO public.stock_transfers (
            owner_id,
            from_branch_id,
            to_branch_id,
            item_name,
            quantity,
            notes,
            status,
            created_at
        ) VALUES (
            v_owner_id,
            p_from_branch_id,
            p_to_branch_id,
            v_source_item.name,
            p_qty,
            p_notes,
            'completed',
            now()
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'item_name', v_source_item.name,
        'transferred_qty', p_qty,
        'from_branch_id', p_from_branch_id,
        'to_branch_id', p_to_branch_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_branch_to_branch_stock(uuid, uuid, uuid, integer, text) TO authenticated, anon;

-- 13. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';


