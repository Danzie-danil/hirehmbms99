# Phase 0: Discovery & Audit — BMSTz Supabase to Convex Migration

This plan outlines **Phase 0: Discovery & Audit** for migrating the **BMSTz Multi-Tenant Business Management & POS System** from **Supabase/PostgreSQL** to **Convex**, strictly following the instructions in `migration_to_convex.md`.

## User Review Required

> [!IMPORTANT]
> **Zero Code Destruction & No Production Disruption:**
> In accordance with Section 100 of `migration_to_convex.md`, Phase 0 is purely exploratory, analytical, and documentary. No production data or application runtime code will be deleted, altered, or disrupted. Supabase remains the authoritative production backend throughout this phase.

> [!NOTE]
> **Branch Verified:**
> The dedicated branch `BmstzConvex` has been created locally and pushed to GitHub (`origin/BmstzConvex`). All work will reside on this branch.

## Objectives & Deliverables of Phase 0

1. **Scaffold the Migration Workspace Directory Structure:**
   - `migration/`
     - `README.md`
     - `audit/`
     - `schema/`
     - `export/`
     - `transform/`
     - `import/`
     - `validation/`
     - `rollback/`
     - `reports/`
     - `scripts/`

2. **Conduct Complete Codebase & Architecture Inventory:**
   - **Architecture:** Document the hybrid React 19 + Vanilla JS modular architecture, service workers (`public/sw.js`), native Capacitor (`android/`), and desktop Tauri (`src-tauri/`) builds.
   - **Supabase Dependencies:** Catalog every import (`@supabase/supabase-js`), query (`.from()`, `.select()`, `.insert()`, `.update()`, `.delete()`), RPC (`.rpc()`), realtime channel (`.channel()`, `.on()`), storage operation, and auth method.
   - **Tables Inventory:** Catalog all 52+ database tables actively queried or synchronized across owner, branch, sysadmin, POS, and financial modules.
   - **RPCs:** Document all RPC functions (`create_sale`, `transfer_branch_to_branch_stock`, `sys_create_step_up_challenge`, `sys_verify_step_up`, `check_rate_limit`, etc.) with their PostgreSQL signatures and client invocations.
   - **Realtime CDC Subscriptions:** Catalog all tables listened to in `js/realtime.js` and `api/push/send-update-notification.js`.
   - **Storage Buckets:** Catalog `business_logos`, `receipt_attachments`, and `exports`.
   - **Auth & Roles Model:** Document `auth.users`, `profiles`, `sys_admins`, `sys_step_up_sessions`, PIN verification, and session lifecycle.
   - **Local Dexie Mirroring:** Document all 52 stores in `js/data/db.js`, sync engines in `js/data/syncManager.js`, and offline mutation queue in `js/offline_queue.js`.
   - **Security Rules & Tenant Isolation:** Detail existing RLS patterns (`is_sys_admin()`, `user_has_branch_access()`, `is_branch_manager()`, `get_current_tenant_id()`).
   - **Dashboard & Financial KPIs:** Inventory all financial calculation methods (gross profit, daily sales, stock valuation, balances) to ensure zero numerical deviation.

3. **Produce `migration/AUDIT_REPORT.md`:**
   - Produce a 16-point exhaustive audit document as required by Section 100 of `migration_to_convex.md`.
   - Stop and present findings to the user for explicit review before proceeding to Phase 1 (Convex Schema & Backend Implementation).

## Proposed Changes

### Migration Workspace

#### [NEW] `migration/README.md`
Documentation of the migration pipeline, directory structure, and instructions.

#### [NEW] `migration/AUDIT_REPORT.md`
Comprehensive audit covering all 16 points defined in `migration_to_convex.md` section 100.

### Audit Artifacts in `migration/audit/`

#### [NEW] `migration/audit/supabase_queries_inventory.json`
Machine-readable inventory of all `.from()`, `.rpc()`, `.storage`, and `.auth` calls across the codebase.

#### [NEW] `migration/audit/tables_inventory.json`
Catalog of all tables, columns, indexes, and relationships discovered in SQL migrations and frontend models.

### Documentation & History

#### [NEW] `implementation_plans/convex_migration_phase_0_discovery_and_audit_237.md`
Numbered implementation plan per repository standards.

#### [MODIFY] `Chat_History/chat_history.txt`
Record summary of actions, branch creation, and audit implementation.

## Verification Plan

### Automated Checks
- Validate that all migration scripts and markdown files are syntactically valid.
- Run `node scripts/lint_check.cjs` to confirm no lint regressions in existing codebase.
- Run `npm run build` to ensure the production build continues to compile cleanly.

### Manual Review
- Present `migration/AUDIT_REPORT.md` to user.
- Await user approval before touching any Convex backend files or migration scripts.
