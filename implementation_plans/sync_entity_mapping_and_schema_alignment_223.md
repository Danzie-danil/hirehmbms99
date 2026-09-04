# Implementation Plan: Sync Entity Mapping & Schema Alignment (223)

## Problem Description
During startup cloud-to-local synchronization (`reconcile`), two tables produced 404 schema cache errors in Supabase:
1. `invoices`: Could not find the table 'public.invoices' in the schema cache (404).
2. `cash_drawer_sessions`: Could not find the table 'public.cash_drawer_sessions' in the schema cache (404).

Investigation with live Supabase query inspection confirmed:
- In Supabase, the actual table for cash drawer sessions is named `cash_drawer` (status: `EXISTS!`).
- The `invoices` table does not currently exist in the cloud schema.

## Proposed Changes
1. **Update `js/data/syncManager.js`**:
   - Replace `cash_drawer_sessions` with `cash_drawer` in `SYNCABLE_ENTITIES`.
   - Remove `invoices` from `SYNCABLE_ENTITIES` (to avoid 404 noise and failed reconciliation status).
   - In `buildQuery`: update tenant filtering to map `cash_drawer` to `branch_id`.

2. **Update `js/data/db.js`**:
   - In IndexedDB version schema (`v10`), update `cash_drawer_sessions` to `cash_drawer`.

3. **Verify**:
   - Run `node scripts/lint_check.cjs`.
   - Run `npm run build`.
   - Ensure reconciliation completes with `Errors: false`.
