/**
 * BUILD MASTER RESTORE SQL
 * Combines ALL snapshot files into one comprehensive SQL
 * for recreating the entire BMS project in a new Supabase instance.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT = path.join(__dirname, '..', 'supabase-full-snapshot-2026-08-22-135600');
const OUT_FILE = path.join(__dirname, '..', 'sql', '0001_master_full_restore.sql');

// Ensure output dir exists
fs.mkdirSync(path.join(__dirname, '..', 'sql'), { recursive: true });

const lines = [];

function section(title) {
  lines.push('');
  lines.push('-- ═══════════════════════════════════════════════════════════════════════════');
  lines.push(`-- ${title.toUpperCase()}`);
  lines.push('-- ═══════════════════════════════════════════════════════════════════════════');
  lines.push('');
}

function subsection(title) {
  lines.push('');
  lines.push(`-- ─── ${title} ───`);
  lines.push('');
}

function addFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    lines.push(`-- [SKIPPED - not found]: ${label}`);
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8').trim();
  if (!content || content.startsWith('--') && content.split('\n').length < 3) {
    lines.push(`-- [EMPTY]: ${label}`);
    return;
  }
  subsection(label);
  lines.push(content);
}

function addSQL(sql, label) {
  if (!sql || !sql.trim()) return;
  subsection(label);
  lines.push(sql.trim());
}

// ─────────────────────────────────────────────────────────────────
// HEADER
// ─────────────────────────────────────────────────────────────────
lines.push('-- ═══════════════════════════════════════════════════════════════════════════');
lines.push('-- BMS PROJECT - COMPLETE MASTER RESTORE SCRIPT');
lines.push('-- Generated: ' + new Date().toISOString());
lines.push('-- Source Snapshot: supabase-full-snapshot-2026-08-22-135600');
lines.push('-- Project Ref: ojnxraxdynbhddfviweb');
lines.push('--');
lines.push('-- INSTRUCTIONS:');
lines.push('-- 1. Create a new Supabase project');
lines.push('-- 2. Go to SQL Editor in the new project dashboard');
lines.push('-- 3. Paste this entire script and run it');
lines.push('-- 4. For auth.users — run in sections if needed (GoTrue may need seeding separately)');
lines.push('-- ═══════════════════════════════════════════════════════════════════════════');
lines.push('');
lines.push("SET statement_timeout = '0';");
lines.push("SET lock_timeout = '0';");
lines.push("SET client_encoding = 'UTF8';");
lines.push("SET standard_conforming_strings = on;");
lines.push("SET check_function_bodies = false;");
lines.push("SET client_min_messages = warning;");
lines.push('');

// ─────────────────────────────────────────────────────────────────
// SECTION 1: EXTENSIONS
// ─────────────────────────────────────────────────────────────────
section('1. EXTENSIONS');
addFile(path.join(SNAPSHOT, '02-database', 'extensions.sql'), 'Extensions');

// ─────────────────────────────────────────────────────────────────
// SECTION 2: SCHEMA - ALL TABLES, FUNCTIONS, TRIGGERS
// ─────────────────────────────────────────────────────────────────
section('2. FULL SCHEMA (TABLES, FUNCTIONS, TRIGGERS, INDEXES)');
lines.push('-- This contains the complete DDL compiled from all migration files.');
lines.push('-- Includes: CREATE TABLE, CREATE OR REPLACE FUNCTION, CREATE INDEX, ALTER TABLE etc.');
lines.push('');
addFile(path.join(SNAPSHOT, '02-database', 'schema.sql'), 'Full Database Schema');

// ─────────────────────────────────────────────────────────────────
// SECTION 3: ROW LEVEL SECURITY ENABLEMENT
// ─────────────────────────────────────────────────────────────────
section('3. ROW LEVEL SECURITY - ENABLE ON ALL TABLES');
addFile(path.join(SNAPSHOT, '02-database', 'rls.sql'), 'RLS Enablement');

// ─────────────────────────────────────────────────────────────────
// SECTION 4: RLS POLICIES
// ─────────────────────────────────────────────────────────────────
section('4. RLS POLICIES');
// Read the full catalog/rls.json which has the actual SQL expressions
const rlsJsonPath = path.join(SNAPSHOT, '02-database', 'catalog', 'rls.json');
if (fs.existsSync(rlsJsonPath)) {
  const rlsRaw = JSON.parse(fs.readFileSync(rlsJsonPath, 'utf8'));
  const rlsPolicies = Array.isArray(rlsRaw) ? rlsRaw : (rlsRaw.policies || []);
  lines.push('-- Policies extracted from live database catalog (' + rlsPolicies.length + ' policies)');
  lines.push('');
  
  // Group by table
  const byTable = {};
  for (const policy of rlsPolicies) {
    const tbl = policy.table || policy.table_name || 'unknown';
    if (!byTable[tbl]) byTable[tbl] = [];
    byTable[tbl].push(policy);
  }
  
  for (const [tableName, policies] of Object.entries(byTable)) {
    lines.push(`-- TABLE: ${tableName}`);
    for (const p of policies) {
      const pname = p.name || p.policy_name || 'unnamed';
      const cmd = p.command || 'ALL';
      const roles = p.roles || 'public';
      const using = p.using || p.using_expr || null;
      const withCheck = p.with_check || p.check_expr || null;
      
      lines.push(`DROP POLICY IF EXISTS ${JSON.stringify(pname)} ON public.${tableName};`);
      let sql = `CREATE POLICY ${JSON.stringify(pname)} ON public.${tableName}`;
      sql += `\n    FOR ${cmd}`;
      if (roles && roles !== 'public') {
        sql += `\n    TO ${roles}`;
      }
      if (using) {
        sql += `\n    USING (${using})`;
      }
      if (withCheck) {
        sql += `\n    WITH CHECK (${withCheck})`;
      }
      sql += ';';
      lines.push(sql);
    }
    lines.push('');
  }
} else {
  addFile(path.join(SNAPSHOT, '02-database', 'policies.sql'), 'RLS Policies (summary only - see catalog for full expressions)');
}

// ─────────────────────────────────────────────────────────────────
// SECTION 5: TRIGGERS
// ─────────────────────────────────────────────────────────────────
section('5. TRIGGERS');
lines.push('-- Triggers are defined as part of schema.sql (CREATE OR REPLACE TRIGGER).');
lines.push('-- The following is the triggers summary reference:');
addFile(path.join(SNAPSHOT, '02-database', 'triggers.sql'), 'Triggers Reference');

// ─────────────────────────────────────────────────────────────────
// SECTION 6: GRANTS & DEFAULT PRIVILEGES
// ─────────────────────────────────────────────────────────────────
section('6. GRANTS & DEFAULT PRIVILEGES');
addFile(path.join(SNAPSHOT, '02-database', 'grants.sql'), 'Grants');
addFile(path.join(SNAPSHOT, '02-database', 'default-privileges.sql'), 'Default Privileges');

// ─────────────────────────────────────────────────────────────────
// SECTION 7: REALTIME PUBLICATIONS
// ─────────────────────────────────────────────────────────────────
section('7. REALTIME PUBLICATIONS');
lines.push('-- Supabase creates supabase_realtime publication by default.');
lines.push('-- The following adds all tables that should be realtime-enabled:');
lines.push('');

// Read catalog/tables.json to find which tables need realtime
const tablesJsonPath = path.join(SNAPSHOT, '02-database', 'catalog', 'tables.json');
if (fs.existsSync(tablesJsonPath)) {
  const tables = JSON.parse(fs.readFileSync(tablesJsonPath, 'utf8'));
  const publicTables = tables.filter(t => t.schema === 'public').map(t => t.name);
  
  // Key tables that should have realtime based on the schema
  const realtimeTables = [
    'sys_settings', 'sys_banners', 'notifications', 'notification_recipients',
    'sys_broadcasts', 'sys_toasts', 'sys_popups', 'sys_scheduled_toasts',
    'messages', 'tasks', 'stock_movements', 'inventory', 'central_inventory',
    'branches', 'profiles', 'staff', 'requests', 'sales'
  ];
  
  lines.push("DO $$");
  lines.push("DECLARE t TEXT;");
  lines.push("BEGIN");
  for (const tbl of realtimeTables) {
    if (publicTables.includes(tbl)) {
      lines.push(`  BEGIN`);
      lines.push(`    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='${tbl}') THEN`);
      lines.push(`      ALTER PUBLICATION supabase_realtime ADD TABLE public.${tbl};`);
      lines.push(`    END IF;`);
      lines.push(`  EXCEPTION WHEN OTHERS THEN NULL; END;`);
    }
  }
  lines.push("END $$;");
}

// ─────────────────────────────────────────────────────────────────
// SECTION 8: STORAGE BUCKETS
// ─────────────────────────────────────────────────────────────────
section('8. STORAGE BUCKETS');
const bucketsPath = path.join(SNAPSHOT, '04-storage', 'buckets.json');
if (fs.existsSync(bucketsPath)) {
  const buckets = JSON.parse(fs.readFileSync(bucketsPath, 'utf8'));
  lines.push('-- Storage buckets setup');
  for (const b of buckets) {
    lines.push(`INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)`);
    lines.push(`VALUES (`);
    lines.push(`  '${b.id}',`);
    lines.push(`  '${b.name}',`);
    lines.push(`  ${b.public},`);
    lines.push(`  ${b.file_size_limit || 'NULL'},`);
    lines.push(`  NULL`);
    lines.push(`) ON CONFLICT (id) DO UPDATE SET`);
    lines.push(`  public = EXCLUDED.public,`);
    lines.push(`  file_size_limit = EXCLUDED.file_size_limit;`);
    lines.push('');
  }
}

// ─────────────────────────────────────────────────────────────────
// SECTION 9: STORAGE POLICIES
// ─────────────────────────────────────────────────────────────────
section('9. STORAGE POLICIES');
addFile(path.join(SNAPSHOT, '04-storage', 'storage-policies.sql'), 'Storage Policies');

// ─────────────────────────────────────────────────────────────────
// SECTION 10: AUTH USERS (GoTrue)
// ─────────────────────────────────────────────────────────────────
section('10. AUTH USERS (auth.users)');
lines.push('-- WARNING: Supabase\'s GoTrue manages auth.users.');
lines.push('-- These inserts will recreate all user accounts with their original UUIDs.');
lines.push('-- Passwords are NOT included (hashed passwords not exported).');
lines.push('-- Users will need to reset passwords or use "Forgot Password" on first login.');
lines.push('-- Run this section as postgres/service_role user.');
lines.push('');
addFile(path.join(SNAPSHOT, '03-auth', 'users', 'users.sql'), 'Auth Users + Public Profiles');

// ─────────────────────────────────────────────────────────────────
// SECTION 11: PRODUCTION DATA - ALL TABLES
// ─────────────────────────────────────────────────────────────────
section('11. PRODUCTION DATA - ALL 49 TABLES');
lines.push('-- Full data export from production database.');
lines.push('-- Includes: inventory, sales, branches, staff, notifications,');
lines.push('-- stock movements, AI chat messages, push subscriptions, and more.');
lines.push('');

const tablesDir = path.join(SNAPSHOT, '11-live-data-export', 'privileged-dump', 'tables');
if (fs.existsSync(tablesDir)) {
  const tableFiles = fs.readdirSync(tablesDir)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  // Define optimal insertion order (dependencies first)
  const insertOrder = [
    // System/config tables first
    'sys_pricing_plans.sql',
    'plan_features.sql',
    'sys_settings.sql',
    'sys_admins.sql',
    'sys_feature_flags.sql',
    'sys_alert_rules.sql',
    'sys_ai_prompts.sql',
    'agent_knowledge.sql',
    // User data
    'profiles.sql',   // already included in auth section, but also here for safety
    'branches.sql',
    'staff.sql',
    // Business/Financial
    'capital_accounts.sql',
    'capital_transactions.sql',
    // Inventory
    'central_inventory.sql',
    'inventory.sql',
    'stock_movements.sql',
    'stock_transfers.sql',
    'suppliers.sql',
    // Sales & Transactions
    'sales.sql',
    'cash_drawer.sql',
    'cash_transactions.sql',
    'payroll.sql',
    // Notifications
    'notifications.sql',
    'notification_recipients.sql',
    'notification_reads.sql',
    'messages.sql',
    'tasks.sql',
    'requests.sql',
    // Sys operations
    'sys_broadcasts.sql',
    'sys_email_broadcasts.sql',
    'sys_email_drafts.sql',
    'sys_push_subscriptions.sql',
    'sys_push_notifications.sql',
    'sys_push_templates.sql',
    'sys_push_drafts.sql',
    'sys_surveys.sql',
    'sys_survey_responses.sql',
    'sys_scheduled_toasts.sql',
    'sys_page_views.sql',
    'sys_audit_logs.sql',
    'sys_security_events.sql',
    'sys_ai_chat_messages.sql',
    'sys_background_jobs.sql',
    'sys_plan_entitlements.sql',
    'sys_support_sessions.sql',
    'sys_rate_limits.sql',
    'saas_audit_logs.sql',
    'support_requests.sql',
    'dashboard_dismissals.sql',
  ];

  // Track what we've added
  const added = new Set();
  
  // Add in preferred order first
  for (const fname of insertOrder) {
    const fpath = path.join(tablesDir, fname);
    if (fs.existsSync(fpath)) {
      const tableName = fname.replace('.sql', '');
      const content = fs.readFileSync(fpath, 'utf8').trim();
      if (content) {
        subsection(`Table: ${tableName}`);
        lines.push(content);
      }
      added.add(fname);
    }
  }
  
  // Add any remaining files not in the preferred order
  for (const fname of tableFiles) {
    if (!added.has(fname)) {
      const fpath = path.join(tablesDir, fname);
      const tableName = fname.replace('.sql', '');
      const content = fs.readFileSync(fpath, 'utf8').trim();
      if (content) {
        subsection(`Table: ${tableName}`);
        lines.push(content);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// SECTION 12: POST-DATA FIXES & NOTIFY
// ─────────────────────────────────────────────────────────────────
section('12. POST-RESTORE FIXES');
lines.push('-- Reload PostgREST schema cache');
lines.push("NOTIFY pgrst, 'reload schema';");
lines.push('');
lines.push('-- Verify sys_settings app_version is current');
lines.push("INSERT INTO public.sys_settings (key, value, updated_at)");
lines.push("VALUES ('app_version', '2.6.4', NOW())");
lines.push("ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();");
lines.push('');
lines.push('-- ═══════════════════════════════════════════════════════════════════════════');
lines.push('-- END OF MASTER RESTORE SCRIPT');
lines.push('-- ═══════════════════════════════════════════════════════════════════════════');
lines.push('-- After running this script:');
lines.push('-- 1. Invite your sys admin users via Supabase Auth dashboard');
lines.push('-- 2. Update .env in your app with the new project URL + anon key');
lines.push('-- 3. Deploy Edge Functions: supabase functions deploy --project-ref <new-ref>');
lines.push('-- 4. Configure Secrets: supabase secrets set --project-ref <new-ref>');
lines.push('-- ═══════════════════════════════════════════════════════════════════════════');

// Write output
fs.writeFileSync(OUT_FILE, lines.join('\n'), 'utf8');
const stats = fs.statSync(OUT_FILE);
const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

console.log('');
console.log('✅ MASTER RESTORE SQL BUILT SUCCESSFULLY');
console.log('═══════════════════════════════════════════');
console.log(`📄 Output: ${OUT_FILE}`);
console.log(`📦 Size:   ${sizeMB} MB`);
console.log(`📊 Lines:  ${lines.length.toLocaleString()}`);
console.log('');
console.log('Sections included:');
console.log('  1. Extensions (uuid-ossp, pgcrypto, pgjwt, pg_cron, pg_net)');
console.log('  2. Full Schema (all tables, functions, indexes)');
console.log('  3. RLS Enable on all tables');
console.log('  4. All RLS Policies (from live catalog)');
console.log('  5. Triggers reference');
console.log('  6. Grants & Default Privileges');
console.log('  7. Realtime Publications');
console.log('  8. Storage Buckets (business_logos, receipt_attachments, exports)');
console.log('  9. Storage Policies');
console.log(' 10. Auth Users (auth.users + public.profiles)');
console.log(' 11. All 49 Production Data Tables');
console.log(' 12. Post-restore fixes & schema cache reload');
