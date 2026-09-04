# Implementation Plan - Fix Suppliers Table Column Query & enterprise_id Alignment

## Goal
Resolve HTTP 400 Bad Request on `suppliers` query caused by referencing non-existent `owner_id` column in PostgreSQL, aligning client queries to `enterprise_id` and providing database schema migration for cross-column compatibility.

---

## User Review & Database Changes

> [!NOTE]
> The `public.suppliers` table in Supabase PostgreSQL uses `enterprise_id` as the tenant foreign key column referencing `public.profiles(id)`.
> 
> **Resolution:**
> 1. Client query in `js/db.js` updated to filter directly by `enterprise_id.eq.${targetId}` without attempting invalid PostgREST OR clauses.
> 2. Standalone & single-run SQL migrations provided to ensure `owner_id` is created as an indexed column and synchronized with `enterprise_id` on PostgreSQL.

---

## Proposed Changes

### Storage & Data Access Layer
- [MODIFY] `js/db.js` (lines 3305-3310): Replaced invalid `.or('enterprise_id.eq...,owner_id.eq...')` with clean `.eq('enterprise_id', targetId)`.
- [MODIFY] `js/modals.js` (line 8347): Aligned supplier query to `enterprise_id`.
- [MODIFY] `js/admin/dashboard.js` (line 4511): Aligned supplier cascade delete to `enterprise_id`.

### Database Schema Migrations
- [NEW] `supabase/migrations/0001_ensure_suppliers_owner_id_column.sql`: Adds `owner_id` column to `public.suppliers` and synchronizes with `enterprise_id`.
- [NEW] `supabase/migrations/0001_single_run_ensure_suppliers_owner_id.sql`: Single run execution script for Supabase SQL Editor.

---

## Verification Plan

### Automated Tests
1. `npm run build`
2. `node scripts/lint_check.cjs`

### Manual Verification
1. Navigate to Central Inventory Restock modal or Suppliers & POs view.
2. Confirm `suppliers` fetch executes with HTTP 200 OK without 400 Bad Request error.
