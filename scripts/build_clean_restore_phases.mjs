/**
 * RESTORE PIPELINE RE-BUILDER v3
 * Strictly clean migration-boundary splitting so NO function is ever cut in half.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT = path.join(__dirname, '..', 'supabase-full-snapshot-2026-08-22-135600');
const OUT = path.join(__dirname, '..', 'sql');

// Clean out existing phase files
fs.readdirSync(OUT).filter(f => f.startsWith('phase_')).forEach(f => {
  fs.unlinkSync(path.join(OUT, f));
});

const HEADER = (phase, title) => `-- ══════════════════════════════════════════════════════════════════════════════
-- BMS PROJECT — MASTER RESTORE
-- PHASE ${String(phase).padStart(2, '0')}: ${title}
-- Run phases IN ORDER: 01 → 02 → 03 → ... → 18
-- ══════════════════════════════════════════════════════════════════════════════

SET statement_timeout = '0';
SET lock_timeout = '0';
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

`;

function writePhaseFile(num, title, sqlContent) {
  const fname = `phase_${String(num).padStart(2, '0')}_${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.sql`;
  let full = HEADER(num, title);
  if (num >= 9) {
    full += "SET session_replication_role = 'replica';\n\n";
  }
  full += sqlContent.trim() + '\n';
  if (num >= 9) {
    full += "\nSET session_replication_role = 'origin';\n";
  }
  fs.writeFileSync(path.join(OUT, fname), full, 'utf8');
  const kb = (full.length / 1024).toFixed(0);
  console.log(`✅ Phase ${String(num).padStart(2, ' ')}: [${kb.padStart(5)} KB] ${fname}`);
  return fname;
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 01: EXTENSIONS
// ─────────────────────────────────────────────────────────────────────────────
const extSQL = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA extensions;
`;
writePhaseFile(1, 'Extensions', extSQL);

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 02: ALL TABLE DEFINITIONS (CREATE TABLE IF NOT EXISTS)
// ─────────────────────────────────────────────────────────────────────────────
const catalog = path.join(SNAPSHOT, '02-database', 'catalog');
const cols = JSON.parse(fs.readFileSync(path.join(catalog, 'columns.json'), 'utf8'));

const tableDDLs = [];
for (const c of cols) {
  let def = c.definition;
  // Strip inline REFERENCES to decouple table creation order
  def = def.replace(/REFERENCES\s+(?:public\.)?([a-zA-Z0-9_]+)\s*\([^)]+\)(?:\s+ON\s+DELETE\s+[A-Z\s]+)?(?:\s+ON\s+UPDATE\s+[A-Z\s]+)?/gi, '');
  tableDDLs.push(`CREATE TABLE IF NOT EXISTS public.${c.table} (\n    ${def}\n);`);
}

const coreTables = `
-- ─────────────────────────────────────────────────────────────────────────────
-- CORE APPLICATION TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    full_name TEXT,
    business_name TEXT,
    avatar_url TEXT DEFAULT '',
    logo_url TEXT DEFAULT '',
    mobile_number TEXT,
    address TEXT,
    street_address TEXT DEFAULT '',
    city TEXT DEFAULT 'Dar es Salaam',
    zip_code TEXT DEFAULT '14101',
    tax_id TEXT DEFAULT '',
    industry TEXT DEFAULT '',
    brand_color TEXT DEFAULT '',
    theme TEXT DEFAULT 'light',
    language TEXT DEFAULT 'en',
    preferred_language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    currency TEXT DEFAULT 'TZS',
    base_currency TEXT DEFAULT 'USD',
    plan TEXT DEFAULT 'free_trial',
    current_plan TEXT DEFAULT 'Free Tier',
    billing_cycle TEXT DEFAULT 'monthly',
    status TEXT DEFAULT 'active',
    is_suspended BOOLEAN DEFAULT false,
    has_seen_tour BOOLEAN DEFAULT false,
    opted_out_trial BOOLEAN DEFAULT false,
    newsletter_subscribed BOOLEAN DEFAULT true,
    two_factor BOOLEAN DEFAULT false,
    pin_expiry_days BIGINT DEFAULT 90,
    session_duration_hrs BIGINT DEFAULT 8,
    default_target BIGINT DEFAULT 10000,
    receipt_text TEXT DEFAULT 'Thank you for your business!',
    operating_hours TEXT,
    invoice_settings JSONB DEFAULT '{"brand_color":"#4f46e5","payment_terms":"Due upon receipt","notes":"Thank you for your business!","show_stamp":true}'::jsonb,
    notifications JSONB DEFAULT '{"daily_summary":true,"missed_targets":true,"security_alerts":true}'::jsonb,
    snippe_customer_id TEXT,
    snippe_subscription_id TEXT,
    trial_ends_at TIMESTAMPTZ,
    subscription_expires_at TIMESTAMPTZ,
    last_notif_check TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID,
    owner_email TEXT,
    name TEXT NOT NULL,
    branch_code TEXT,
    branch_reg_no TEXT,
    branch_tin TEXT,
    manager_id UUID,
    manager TEXT,
    manager_email TEXT,
    email TEXT,
    phone TEXT,
    pin TEXT,
    pin_updated_at TIMESTAMPTZ,
    location TEXT,
    address TEXT,
    avatar_url TEXT DEFAULT '',
    currency TEXT DEFAULT 'TZS',
    target BIGINT DEFAULT 0,
    tax_rate NUMERIC DEFAULT 0,
    theme TEXT DEFAULT 'light',
    status TEXT DEFAULT 'active',
    has_seen_branch_tour BOOLEAN DEFAULT false,
    low_stock_notifications BOOLEAN DEFAULT true,
    opening_time TEXT,
    closing_time TEXT,
    invoice_settings JSONB DEFAULT '{}'::jsonb,
    preferences JSONB DEFAULT '{}'::jsonb,
    last_notif_check TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID,
    central_item_id UUID,
    name TEXT NOT NULL,
    sku TEXT DEFAULT '',
    barcode TEXT,
    category TEXT DEFAULT 'General',
    quantity BIGINT DEFAULT 0,
    min_threshold BIGINT DEFAULT 5,
    cost_price NUMERIC DEFAULT 0,
    price NUMERIC DEFAULT 0,
    retail_price NUMERIC DEFAULT 0,
    wholesale_price NUMERIC DEFAULT 0,
    is_from_main_store BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID,
    product_id UUID,
    client_tx_id UUID,
    customer TEXT DEFAULT 'Walk-in Customer',
    items TEXT,
    quantity BIGINT DEFAULT 1,
    amount NUMERIC NOT NULL DEFAULT 0,
    cost_amount NUMERIC DEFAULT 0,
    gross_profit NUMERIC DEFAULT 0,
    payment TEXT DEFAULT 'cash',
    price_type TEXT DEFAULT 'retail',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cash_drawer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID,
    opening_balance NUMERIC DEFAULT 0,
    closing_balance NUMERIC DEFAULT 0,
    expected_balance NUMERIC DEFAULT 0,
    difference NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'open',
    opened_by UUID,
    closed_by UUID,
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS public.cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drawer_id UUID,
    branch_id UUID,
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    reason TEXT,
    performed_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID,
    branch_id UUID,
    staff_id UUID,
    staff_name TEXT NOT NULL,
    role TEXT DEFAULT 'Staff',
    period TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'paid',
    notes TEXT DEFAULT '',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sys_admins (
    email TEXT PRIMARY KEY,
    user_id UUID,
    mfa_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    added_by TEXT
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id TEXT,
    sender_name TEXT,
    sender_role TEXT DEFAULT 'owner',
    group_id TEXT,
    parent_id TEXT,
    branch_id TEXT,
    content TEXT NOT NULL,
    is_group BOOLEAN DEFAULT false,
    is_delivered BOOLEAN DEFAULT true,
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    reactions JSONB DEFAULT '[]'::jsonb,
    deleted_for JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    deadline TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID,
    branch_id UUID,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'general',
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    related_id TEXT,
    related_summary TEXT,
    admin_response TEXT,
    is_read_by_owner BOOLEAN DEFAULT false,
    is_read_by_branch BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notification_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id UUID,
    notif_key TEXT NOT NULL,
    reader_role TEXT DEFAULT 'branch',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID,
    from_branch_id TEXT,
    to_branch_id TEXT,
    item_name TEXT NOT NULL,
    quantity BIGINT NOT NULL DEFAULT 1,
    status TEXT DEFAULT 'pending',
    notes TEXT DEFAULT '',
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id UUID,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dashboard_dismissals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    card_id TEXT NOT NULL,
    dismissed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.saas_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID,
    event_type TEXT NOT NULL,
    previous_plan TEXT,
    new_plan TEXT,
    mrr_change BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- AUXILIARY & OPERATIONAL TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID,
    owner_id UUID,
    customer_id UUID,
    type TEXT DEFAULT 'invoice',
    doc_number TEXT,
    amount NUMERIC DEFAULT 0,
    subtotal NUMERIC DEFAULT 0,
    tax NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    paid_amount NUMERIC DEFAULT 0,
    balance_due NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'draft',
    payment_status TEXT DEFAULT 'unpaid',
    payment_method TEXT,
    due_date DATE,
    issue_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    terms TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID,
    owner_id UUID,
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    description TEXT,
    payment_method TEXT,
    receipt_url TEXT,
    expense_date DATE DEFAULT CURRENT_DATE,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID,
    owner_id UUID,
    supplier_id UUID,
    po_number TEXT,
    total_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    order_date DATE DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID,
    owner_id UUID,
    item_id UUID,
    supplier_id UUID,
    quantity BIGINT DEFAULT 1,
    unit_cost NUMERIC DEFAULT 0,
    total_cost NUMERIC DEFAULT 0,
    purchase_date DATE DEFAULT CURRENT_DATE,
    invoice_no TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID,
    owner_id UUID,
    borrower_name TEXT NOT NULL,
    principal_amount NUMERIC DEFAULT 0,
    interest_rate NUMERIC DEFAULT 0,
    total_payable NUMERIC DEFAULT 0,
    total_paid NUMERIC DEFAULT 0,
    balance NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'active',
    start_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID,
    owner_id UUID,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    credit_limit NUMERIC DEFAULT 0,
    current_balance NUMERIC DEFAULT 0,
    loyalty_points BIGINT DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID,
    owner_id UUID,
    customer_name TEXT,
    quote_number TEXT,
    total_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'draft',
    valid_until DATE,
    items JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID,
    owner_id UUID,
    staff_id UUID,
    date DATE DEFAULT CURRENT_DATE,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    status TEXT DEFAULT 'present',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID,
    owner_id UUID,
    customer_id UUID,
    document_id UUID,
    amount NUMERIC DEFAULT 0,
    payment_method TEXT,
    reference_no TEXT,
    payment_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID,
    owner_id UUID,
    customer_id UUID,
    points BIGINT DEFAULT 0,
    type TEXT DEFAULT 'earned',
    reason TEXT,
    sale_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID,
    owner_id UUID,
    sale_id UUID,
    product_id UUID,
    quantity BIGINT DEFAULT 1,
    refund_amount NUMERIC DEFAULT 0,
    reason TEXT,
    status TEXT DEFAULT 'approved',
    return_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID,
    owner_id UUID,
    staff_id UUID,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    opening_cash NUMERIC DEFAULT 0,
    closing_cash NUMERIC DEFAULT 0,
    total_sales NUMERIC DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID,
    owner_id UUID,
    title TEXT NOT NULL,
    target_amount NUMERIC DEFAULT 0,
    current_amount NUMERIC DEFAULT 0,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'in_progress',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID,
    owner_id UUID,
    title TEXT NOT NULL,
    discount_type TEXT DEFAULT 'percentage',
    discount_value NUMERIC DEFAULT 0,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.document_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID,
    item_name TEXT,
    quantity BIGINT DEFAULT 1,
    unit_price NUMERIC DEFAULT 0,
    total_price NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.po_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID,
    item_name TEXT,
    quantity BIGINT DEFAULT 1,
    unit_cost NUMERIC DEFAULT 0,
    total_cost NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID,
    item_name TEXT,
    quantity BIGINT DEFAULT 1,
    unit_price NUMERIC DEFAULT 0,
    total_price NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID,
    tag_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expense_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID,
    tag_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID,
    tag_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.loan_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID,
    tag_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.note_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID,
    tag_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sale_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID,
    tag_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID,
    tag_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    branch_id UUID,
    owner_id UUID,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID,
    user_id UUID,
    role TEXT DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pinned_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.starred_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.archived_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id TEXT,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID,
    owner_id UUID,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.announcement_dismissals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID,
    user_id UUID,
    branch_id UUID,
    dismissed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID,
    owner_id UUID,
    title TEXT,
    content TEXT,
    category TEXT DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency TEXT NOT NULL,
    to_currency TEXT NOT NULL,
    rate NUMERIC NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID,
    user_id UUID,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action TEXT NOT NULL,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    role_requested TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

`;

writePhaseFile(2, 'All_Tables_DDL', tableDDLs.join('\n\n') + '\n\n' + coreTables);

// ─────────────────────────────────────────────────────────────────────────────
// PHASES 03, 04, 05: CLEAN MIGRATION CHUNKS (Split ONLY at -- SOURCE:)
// ─────────────────────────────────────────────────────────────────────────────
const schemaFile = path.join(SNAPSHOT, '02-database', 'schema.sql');
const schemaLines = fs.readFileSync(schemaFile, 'utf8').split('\n');

const migrations = [];
let currentMig = { header: 'Initial', lines: [] };

for (let rawLine of schemaLines) {
  let line = rawLine;

  const isIndented = /^\s+/.test(rawLine);
  const trimmed = rawLine.trim();

  // If line is already a DO block or already has an EXCEPTION block, keep as is
  if (!trimmed.includes('EXCEPTION WHEN') && !trimmed.startsWith('DO $$')) {
    if (trimmed.match(/^(?:GRANT|REVOKE)\s+(?:ALL|EXECUTE)\s+(?:ON\s+FUNCTION)?\s+public\.[a-zA-Z0-9_]+\s*\([^)]*\)/i)) {
      const cleanStmt = trimmed.replace(/;\s*$/, '');
      line = isIndented ? `    BEGIN ${cleanStmt}; EXCEPTION WHEN OTHERS THEN NULL; END;` : `DO $$ BEGIN ${cleanStmt}; EXCEPTION WHEN OTHERS THEN NULL; END $$;`;
    } else if (trimmed.match(/^DROP\s+FUNCTION\s+IF\s+EXISTS\s+public\.[a-zA-Z0-9_]+\s*\([^)]*\)/i)) {
      const cleanStmt = trimmed.replace(/;\s*$/, '');
      line = isIndented ? `    BEGIN ${cleanStmt}; EXCEPTION WHEN OTHERS THEN NULL; END;` : `DO $$ BEGIN ${cleanStmt}; EXCEPTION WHEN OTHERS THEN NULL; END $$;`;
    } else if (trimmed.match(/^ALTER\s+PUBLICATION\s+[a-zA-Z0-9_]+\s+ADD\s+TABLE\s+public\.[a-zA-Z0-9_]+/i)) {
      const cleanStmt = trimmed.replace(/;\s*$/, '');
      line = isIndented ? `    BEGIN ${cleanStmt}; EXCEPTION WHEN OTHERS THEN NULL; END;` : `DO $$ BEGIN ${cleanStmt}; EXCEPTION WHEN OTHERS THEN NULL; END $$;`;
    } else if (trimmed.match(/^ALTER\s+TYPE\s+public\.[a-zA-Z0-9_]+\s+ADD\s+VALUE/i)) {
      const cleanStmt = trimmed.replace(/;\s*$/, '');
      line = isIndented ? `    BEGIN ${cleanStmt}; EXCEPTION WHEN OTHERS THEN NULL; END;` : `DO $$ BEGIN ${cleanStmt}; EXCEPTION WHEN OTHERS THEN NULL; END $$;`;
    } else if (trimmed.match(/^CREATE\s+TYPE\s+public\.[a-zA-Z0-9_]+\s+AS\s+ENUM/i)) {
      const cleanStmt = trimmed.replace(/;\s*$/, '');
      line = `DO $$ BEGIN ${cleanStmt}; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`;
    } else if (trimmed.match(/^CREATE\s+POLICY\s+/i)) {
      const m = trimmed.match(/^CREATE\s+POLICY\s+(?:IF\s+NOT\s+EXISTS\s+)?(".*?"|[a-zA-Z0-9_]+)\s+ON\s+(?:public\.)?([a-zA-Z0-9_]+)/i);
      if (m) {
        const polName = m[1];
        const tblName = m[2];
        line = `DROP POLICY IF EXISTS ${polName} ON public.${tblName};\n` + line;
      }
    } else if (trimmed.match(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+public\.is_branch_manager\s*\(\s*p_user_id\s+uuid\s*\)/i)) {
      line = line.replace(/is_branch_manager\s*\(\s*p_user_id\s+uuid\s*\)/i, 'is_branch_manager(p_user_id UUID DEFAULT auth.uid())');
    }
  }

  if (line.startsWith('-- SOURCE:')) {
    if (currentMig.lines.length > 0) migrations.push(currentMig);
    currentMig = { header: line, lines: [line] };
  } else {
    currentMig.lines.push(line);
  }
}
if (currentMig.lines.length > 0) migrations.push(currentMig);


const coreHelperStubs = `
-- ─────────────────────────────────────────────────────────────────────────────
-- CORE HELPER STUBS & COLUMN ENSURANCE
-- ─────────────────────────────────────────────────────────────────────────────

-- Ensure columns exist before helper function compilation
ALTER TABLE public.sys_admins ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.sys_admins ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS manager_id UUID;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free_trial';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS balance_due NUMERIC DEFAULT 0;

CREATE OR REPLACE FUNCTION public.is_sys_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.sys_admins
        WHERE user_id = auth.uid() OR email = (auth.jwt()->>'email')
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_sys_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    IF p_user_id IS NULL THEN RETURN FALSE; END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.sys_admins
        WHERE user_id = p_user_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_sysadmin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    IF p_user_id IS NULL THEN RETURN FALSE; END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.sys_admins
        WHERE user_id = p_user_id OR email = (auth.jwt()->>'email')
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_is_sysadmin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    IF p_user_id IS NULL THEN RETURN FALSE; END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.sys_admins
        WHERE user_id = p_user_id OR email = (auth.jwt()->>'email')
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_is_sysadmin(p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    IF p_user_id IS NULL OR p_user_id = '' THEN RETURN FALSE; END IF;
    IF p_user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN public.check_is_sysadmin(p_user_id::UUID);
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.sys_admins
        WHERE email = p_user_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_branch_manager(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    IF p_user_id IS NULL THEN RETURN FALSE; END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.branches
        WHERE manager_id = p_user_id AND status IS DISTINCT FROM 'deleted'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_branch_manager(p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    IF p_user_id IS NULL OR p_user_id = '' THEN RETURN FALSE; END IF;
    IF p_user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN public.is_branch_manager(p_user_id::UUID);
    END IF;
    RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    IF public.is_sys_admin() THEN RETURN NULL; END IF;
    SELECT owner_id INTO v_tenant_id FROM public.branches WHERE manager_id = auth.uid() AND status IS DISTINCT FROM 'deleted' LIMIT 1;
    IF v_tenant_id IS NOT NULL THEN RETURN v_tenant_id; END IF;
    RETURN auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.is_subscription_active(p_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_subscription_active(p_owner_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_branch_access(p_branch_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
    IF public.is_sys_admin() THEN RETURN TRUE; END IF;
    IF p_branch_id IS NULL THEN RETURN TRUE; END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.branches b
        WHERE b.id = p_branch_id AND (b.owner_id = auth.uid() OR b.manager_id = auth.uid())
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_branch_access(p_branch_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
    IF public.is_sys_admin() THEN RETURN TRUE; END IF;
    IF p_branch_id IS NULL OR p_branch_id = '' THEN RETURN TRUE; END IF;
    IF p_branch_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN public.user_has_branch_access(p_branch_id::UUID);
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.branches b
        WHERE (b.branch_code = p_branch_id OR b.name = p_branch_id)
          AND (b.owner_id = auth.uid() OR b.manager_id = auth.uid())
    );
END;
$$;

DO $$ BEGIN DROP FUNCTION IF EXISTS public.tenant_has_feature(uuid, text); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP FUNCTION IF EXISTS public.tenant_has_feature(text, text); EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.tenant_has_feature(p_owner_id UUID, p_feature TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_has_feature(p_owner_id TEXT, p_feature TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN TRUE;
END;
$$;

`;

// Filter out test and rollback migrations
const activeMigrations = migrations.filter(m => {
  const h = m.header.toLowerCase();
  return !h.includes('_undo.sql') && !h.includes('tests/') && !h.includes('security_tests.sql');
});

const schemaChunks = [];
let chunkAcc = [];
let sizeAcc = 0;

for (const m of activeMigrations) {
  const mSize = m.lines.join('\n').length;
  if (sizeAcc + mSize > 340 * 1024 && chunkAcc.length > 0) {
    schemaChunks.push(chunkAcc);
    chunkAcc = [m];
    sizeAcc = mSize;
  } else {
    chunkAcc.push(m);
    sizeAcc += mSize;
  }
}
if (chunkAcc.length > 0) schemaChunks.push(chunkAcc);

schemaChunks.forEach((c, idx) => {
  const phaseNum = 3 + idx;
  let chunkSQL = coreHelperStubs + c.map(m => m.lines.join('\n')).join('\n');

  // Prepend DROP POLICY IF EXISTS to all single-line and multi-line CREATE POLICY statements
  chunkSQL = chunkSQL.replace(/CREATE\s+POLICY\s+(?:IF\s+NOT\s+EXISTS\s+)?(".*?"|[a-zA-Z0-9_]+)\s*\n?\s*ON\s+(?:public\.)?([a-zA-Z0-9_]+)/gi, (match, polName, tblName) => {
    return `DROP POLICY IF EXISTS ${polName} ON public.${tblName};\n` + match;
  });

  const protectedHelpers = ['is_sys_admin', 'is_sysadmin', 'check_is_sysadmin', 'user_has_branch_access', 'is_branch_manager', 'get_current_tenant_id', 'is_subscription_active', 'tenant_has_feature'];

  // Prepend dynamic function drop to handle return type changes and parameter signature updates
  chunkSQL = chunkSQL.replace(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+public\.([a-zA-Z0-9_]+)/gi, (match, funcName) => {
    if (protectedHelpers.includes(funcName.toLowerCase())) {
      return match;
    }
    const dropStub = `DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT pg_get_function_identity_arguments(p.oid) as args FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = '${funcName}') LOOP BEGIN EXECUTE 'DROP FUNCTION IF EXISTS public.${funcName}(' || r.args || ')'; EXCEPTION WHEN OTHERS THEN NULL; END; END LOOP; END $$;\n`;
    return dropStub + match;
  });

  writePhaseFile(phaseNum, `Functions_and_RPCs_Part${idx + 1}`, chunkSQL);
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 06: TRIGGERS & GUARDS
// ─────────────────────────────────────────────────────────────────────────────
const triggersFile = path.join(SNAPSHOT, '02-database', 'triggers.sql');
const triggersContent = fs.existsSync(triggersFile) ? fs.readFileSync(triggersFile, 'utf8') : '';

const triggersExplicit = `
-- Triggers Setup
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_branch_limit') THEN
        CREATE TRIGGER trg_enforce_branch_limit
            BEFORE INSERT ON public.branches
            FOR EACH ROW EXECUTE FUNCTION public.fn_check_branch_creation_limit();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_protect_profile_subscription_fields') THEN
        CREATE TRIGGER trg_protect_profile_subscription_fields
            BEFORE UPDATE ON public.profiles
            FOR EACH ROW EXECUTE FUNCTION public.fn_protect_profile_subscription_fields();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'guard_stock_movements_integrity') THEN
        CREATE TRIGGER guard_stock_movements_integrity
            BEFORE UPDATE OR DELETE ON public.stock_movements
            FOR EACH ROW EXECUTE FUNCTION public.prevent_stock_movement_mutation();
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
`;
writePhaseFile(6, 'Triggers_and_Guards', triggersContent + '\n\n' + triggersExplicit);

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 07: RLS ENABLE + ALL POLICIES
// ─────────────────────────────────────────────────────────────────────────────
const rlsCatalogPath = path.join(catalog, 'rls.json');
const rlsRaw = JSON.parse(fs.readFileSync(rlsCatalogPath, 'utf8'));
const rlsPolicies = Array.isArray(rlsRaw) ? rlsRaw : (rlsRaw.policies || []);
const rlsTables = rlsRaw.rls_enabled_tables || [];

const rlsLines = [];
rlsLines.push('-- 0. Ensure critical policy columns exist');
rlsLines.push('ALTER TABLE public.sys_admins ADD COLUMN IF NOT EXISTS user_id UUID;');
rlsLines.push('ALTER TABLE public.sys_admins ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false;');
rlsLines.push('ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS manager_id UUID;');
rlsLines.push('ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT \'active\';');
rlsLines.push('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;');
rlsLines.push('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT \'free_trial\';');
rlsLines.push('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS owner_id UUID;');
rlsLines.push('ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS owner_id UUID;');
rlsLines.push('');

rlsLines.push('-- 1. Enable RLS on all tables');
for (const t of rlsTables) {
  rlsLines.push(`ALTER TABLE IF EXISTS public.${t} ENABLE ROW LEVEL SECURITY;`);
}
const coreRLSTables = ['profiles', 'branches', 'inventory', 'sales', 'cash_drawer', 'cash_transactions', 'payroll', 'messages', 'tasks', 'requests', 'suppliers', 'stock_transfers', 'dashboard_dismissals', 'saas_audit_logs', 'notification_reads'];
for (const t of coreRLSTables) {
  rlsLines.push(`ALTER TABLE IF EXISTS public.${t} ENABLE ROW LEVEL SECURITY;`);
}
rlsLines.push('');

rlsLines.push('-- 2. Create All RLS Policies (' + rlsPolicies.length + ' policies)');
const byTable = {};
for (const p of rlsPolicies) {
  const tbl = p.table || p.table_name || 'unknown';
  if (!byTable[tbl]) byTable[tbl] = [];
  byTable[tbl].push(p);
}

for (const [tbl, policies] of Object.entries(byTable)) {
  rlsLines.push(`-- Table: ${tbl}`);
  for (const p of policies) {
    const pname = p.name || p.policy_name || 'unnamed';
    const cmd = p.command || 'ALL';
    const roles = p.roles || 'public';
    const using = p.using || p.using_expr || null;
    const withCheck = p.with_check || p.check_expr || null;
    
    rlsLines.push(`DROP POLICY IF EXISTS ${JSON.stringify(pname)} ON public.${tbl};`);
    let sql = `CREATE POLICY ${JSON.stringify(pname)} ON public.${tbl}`;
    sql += `\n    FOR ${cmd}`;
    if (roles && roles !== 'public') sql += `\n    TO ${roles}`;
    if (using) sql += `\n    USING (${using})`;
    if (withCheck) sql += `\n    WITH CHECK (${withCheck})`;
    sql += ';';
    rlsLines.push(sql);
  }
  rlsLines.push('');
}

rlsLines.push(`
-- Core Table Baseline Policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
    CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_sys_admin());

    DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_sys_admin());

    DROP POLICY IF EXISTS "branches_owner_access" ON public.branches;
    CREATE POLICY "branches_owner_access" ON public.branches FOR ALL USING (auth.uid() = owner_id OR manager_id = auth.uid() OR public.is_sys_admin());

    DROP POLICY IF EXISTS "inventory_access" ON public.inventory;
    CREATE POLICY "inventory_access" ON public.inventory FOR ALL USING (
        EXISTS (SELECT 1 FROM public.branches b WHERE b.id = inventory.branch_id AND (b.owner_id = auth.uid() OR b.manager_id = auth.uid()))
        OR public.is_sys_admin()
    );

    DROP POLICY IF EXISTS "sales_access" ON public.sales;
    CREATE POLICY "sales_access" ON public.sales FOR ALL USING (
        EXISTS (SELECT 1 FROM public.branches b WHERE b.id = sales.branch_id AND (b.owner_id = auth.uid() OR b.manager_id = auth.uid()))
        OR public.is_sys_admin()
    );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
`);

writePhaseFile(7, 'RLS_Enable_and_Policies', rlsLines.join('\n'));

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 08: GRANTS, REALTIME, STORAGE
// ─────────────────────────────────────────────────────────────────────────────
const grantsSQL = `
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;

-- Storage Buckets Setup
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES 
    ('business_logos', 'business_logos', true, 5242880),
    ('receipt_attachments', 'receipt_attachments', false, 10485760),
    ('exports', 'exports', false, 52428800)
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit;

-- Storage Policies
DROP POLICY IF EXISTS "Public Business Logos" ON storage.objects;
CREATE POLICY "Public Business Logos" ON storage.objects FOR SELECT USING (bucket_id = 'business_logos');

DROP POLICY IF EXISTS "Authenticated Upload Logos" ON storage.objects;
CREATE POLICY "Authenticated Upload Logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'business_logos');

DROP POLICY IF EXISTS "Owner Receipts Access" ON storage.objects;
CREATE POLICY "Owner Receipts Access" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'receipt_attachments');
`;
writePhaseFile(8, 'Grants_Realtime_Storage', grantsSQL);

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 09: AUTH USERS
// ─────────────────────────────────────────────────────────────────────────────
const authUsersFile = path.join(SNAPSHOT, '03-auth', 'users', 'users.sql');
let authUsersContent = fs.existsSync(authUsersFile) ? fs.readFileSync(authUsersFile, 'utf8') : '';
authUsersContent = authUsersContent.replace(/ON\s+CONFLICT\s+\(id\)\s+DO\s+UPDATE\s+SET\s+role\s*=\s*EXCLUDED\.role;/gi, 'ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = EXCLUDED.updated_at;');
writePhaseFile(9, 'Auth_Users', authUsersContent);

// ─────────────────────────────────────────────────────────────────────────────
// DATA PHASES (10 to 18)
// ─────────────────────────────────────────────────────────────────────────────
const dataDir = path.join(SNAPSHOT, '11-live-data-export', 'privileged-dump', 'tables');

function readTableSQL(tableName) {
  const p = path.join(dataDir, tableName + '.sql');
  if (!fs.existsSync(p)) return '';
  let content = fs.readFileSync(p, 'utf8').trim();

  // Fix JSON array to PostgreSQL array for sys_feature_flags
  if (tableName === 'sys_feature_flags') {
    content = content
      .replace(/'\[\]'::jsonb/g, "'{}'::uuid[]")
      .replace(/'\[\"exclusive\"\]'::jsonb/g, "'{\"exclusive\"}'::text[]")
      .replace(/'\[\"enterprise\",\"exclusive\"\]'::jsonb/g, "'{\"enterprise\",\"exclusive\"}'::text[]");
  }

  // Fix JSON array to PostgreSQL array for agent_knowledge
  if (tableName === 'agent_knowledge') {
    content = content.replace(/'\[(.*?)\]'::jsonb/g, (match, inner) => {
      try {
        const items = JSON.parse('[' + inner + ']');
        return "ARRAY[" + items.map(s => "'" + s.replace(/'/g, "''") + "'").join(', ') + "]::text[]";
      } catch (e) {
        return "'{}'::text[]";
      }
    });
  }

  // Ensure dashboard_dismissals columns exist and relax legacy constraints
  if (tableName === 'dashboard_dismissals') {
    content = `
ALTER TABLE public.dashboard_dismissals ADD COLUMN IF NOT EXISTS notice_key TEXT;
ALTER TABLE public.dashboard_dismissals ADD COLUMN IF NOT EXISTS reader_id UUID;
ALTER TABLE public.dashboard_dismissals ADD COLUMN IF NOT EXISTS reader_role TEXT;
ALTER TABLE public.dashboard_dismissals ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
DO $$ BEGIN ALTER TABLE public.dashboard_dismissals ALTER COLUMN card_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
${content}
`.trim();
  }

  return `
DO $$ BEGIN ALTER TABLE public.${tableName} DISABLE TRIGGER ALL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
${content}
DO $$ BEGIN ALTER TABLE public.${tableName} ENABLE TRIGGER ALL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
`.trim();
}

// Phase 10: Config, Plans, Settings, Admins, Profiles, Branches, Staff, Capital
const p10Tables = [
  'sys_pricing_plans', 'plan_features', 'sys_settings', 'sys_admins',
  'sys_feature_flags', 'sys_alert_rules', 'sys_ai_prompts', 'agent_knowledge',
  'profiles', 'branches', 'staff', 'capital_accounts', 'capital_transactions'
];
writePhaseFile(10, 'Data_Config_and_Users', p10Tables.map(t => `-- Table: ${t}\n` + readTableSQL(t)).join('\n\n'));

// Phase 11: Central Inventory Data (~464 KB)
writePhaseFile(11, 'Data_Central_Inventory', readTableSQL('central_inventory'));

// Phase 12 & 13: Branch Inventory Data (split into Part A and Part B)
const rawInvLines = (fs.existsSync(path.join(dataDir, 'inventory.sql')) ? fs.readFileSync(path.join(dataDir, 'inventory.sql'), 'utf8') : '').trim().split('\n');
const invMid = Math.floor(rawInvLines.length / 2);
const partA = `DO $$ BEGIN ALTER TABLE public.inventory DISABLE TRIGGER ALL; EXCEPTION WHEN OTHERS THEN NULL; END $$;\n` + rawInvLines.slice(0, invMid).join('\n') + `\nDO $$ BEGIN ALTER TABLE public.inventory ENABLE TRIGGER ALL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`;
const partB = `DO $$ BEGIN ALTER TABLE public.inventory DISABLE TRIGGER ALL; EXCEPTION WHEN OTHERS THEN NULL; END $$;\n` + rawInvLines.slice(invMid).join('\n') + `\nDO $$ BEGIN ALTER TABLE public.inventory ENABLE TRIGGER ALL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`;
writePhaseFile(12, 'Data_Branch_Inventory_PartA', partA);
writePhaseFile(13, 'Data_Branch_Inventory_PartB', partB);

// Phase 14: Stock Movements, Sales, Cash, Payroll, Suppliers, Transfers
const p14Tables = [
  'stock_movements', 'stock_transfers', 'suppliers', 'sales',
  'cash_drawer', 'cash_transactions', 'payroll'
];
writePhaseFile(14, 'Data_Stock_Sales_and_Cash', p14Tables.map(t => `-- Table: ${t}\n` + readTableSQL(t)).join('\n\n'));

// Phase 15: Communications & Push
const p15Tables = [
  'notifications', 'notification_recipients', 'notification_reads',
  'messages', 'tasks', 'requests', 'sys_broadcasts', 'sys_email_broadcasts',
  'sys_email_drafts', 'sys_push_subscriptions', 'sys_push_notifications',
  'sys_push_templates', 'sys_push_drafts'
];
writePhaseFile(15, 'Data_Notifications_and_Push', p15Tables.map(t => `-- Table: ${t}\n` + readTableSQL(t)).join('\n\n'));

// Phase 16: Security Events (~388 KB)
writePhaseFile(16, 'Data_Security_Events', readTableSQL('sys_security_events'));

// Phase 17: Audit Logs & AI Chat Messages (~139 KB)
const p17Tables = ['sys_audit_logs', 'sys_ai_chat_messages'];
writePhaseFile(17, 'Data_Audit_and_AI_Chat', p17Tables.map(t => `-- Table: ${t}\n` + readTableSQL(t)).join('\n\n'));

// Phase 18: Remaining System Tables & Post-Restore (~90 KB)
const p18Tables = [
  'sys_surveys', 'sys_survey_responses', 'sys_scheduled_toasts', 'sys_page_views',
  'sys_background_jobs', 'sys_plan_entitlements', 'sys_support_sessions',
  'sys_rate_limits', 'saas_audit_logs', 'support_requests', 'dashboard_dismissals'
];
const postRestoreSQL = `
-- Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Seed current app_version
INSERT INTO public.sys_settings (key, value, updated_at)
VALUES ('app_version', '2.6.4', NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
`;
writePhaseFile(18, 'Data_Remaining_and_Post_Restore', p18Tables.map(t => `-- Table: ${t}\n` + readTableSQL(t)).join('\n\n') + '\n\n' + postRestoreSQL);

console.log('\n══════════════════════════════════════════════════════════════════');
console.log('  ✅ ALL 18 PHASES GENERATED WITH CLEAN MIGRATION BOUNDARIES');
console.log('══════════════════════════════════════════════════════════════════');
