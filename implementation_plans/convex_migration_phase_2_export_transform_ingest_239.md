# Phase 2: Read-Only Data Export, Transformation & Convex Ingestion

This plan specifies **Phase 2: Data Export, Transformation & Idempotent Ingestion** for the BMSTz Supabase to Convex migration.

## User Review Required

> [!CAUTION]
> **Strict Read-Only Supabase Guarantee:**
> In accordance with user directives, **no edits, modifications, updates, deletes, or writes** will be made to the production Supabase database. All operations against Supabase are strictly read-only (`.select('*')`) queries.

> [!NOTE]
> **Convex Target:**
> Deployment: `https://lovely-rhinoceros-87.convex.cloud`  
> Target Project: `lovely-rhinoceros-87`

## Proposed Changes

### 1. Read-Only Data Extraction (`migration/export/`)

#### [NEW] `migration/export/export_all_tables_readonly.cjs`
Batched, paginated (500 rows/page) read-only export script that queries all active tables from Supabase and outputs partitioned JSON files in `migration/export/data/<tableName>.json`.

### 2. Data Normalization & Transformation (`migration/transform/`)

#### [NEW] `migration/transform/transform_data.cjs`
Converts raw PostgreSQL rows to Convex schema types:
- Maps `snake_case` column names to `camelCase` Convex fields.
- Preserves `legacyId: row.id` on every document.
- Aligns legacy sales aliases (`customer` / `customer_name`, `payment` / `payment_method`, `gross_profit` / `profit`).
- Generates `migration/transform/data/<tableName>.json` and builds a local `id_map.json`.

### 3. Convex Ingestion Pipeline (`migration/import/` & `convex/migrations/`)

#### [NEW] `convex/migrations/ingest.ts`
Internal Convex mutations for safe, idempotent batch insertion:
- `batchInsert`: Inserts up to 250 records per call.
- Checks if a record with `legacyId` already exists to prevent duplicate insertion upon re-runs.
- Populates `migrationIdMap` with `(entityType, oldSupabaseId, newConvexId)`.

#### [NEW] `migration/import/run_convex_import.cjs`
Orchestrator script that feeds transformed JSON batches into Convex in strict dependency order:
1. Profiles & SysAdmins
2. Pricing Plans
3. Branches & Staff
4. Central Inventory, Inventory & Services
5. Customers, Accounts & Loans
6. Expenses, Payroll & POS Sales
7. Stock Movements & Stock Transfers
8. Messages, Tasks & System Settings

### 4. Progress Tracking & History

#### [NEW] `implementation_plans/convex_migration_phase_2_export_transform_ingest_239.md`
Sequentially numbered implementation plan per workspace rules.

#### [MODIFY] `Chat_History/chat_history.txt`
Update chat history summary with Phase 2 progress.

## Verification Plan

### Automated Checks
- Verify that every exported file contains valid JSON.
- Run `node scripts/lint_check.cjs` (must remain at 0 issues).
- Run `npm run build` to confirm web distribution integrity.
- Execute row-count comparison between exported JSON records and Convex tables.
