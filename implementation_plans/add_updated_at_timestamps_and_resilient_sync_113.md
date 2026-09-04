# BMS-TZ — Resilient Schema Sync & Timestamp Column Fallback Implementation Plan

**Implementation Plan ID:** `add_updated_at_timestamps_and_resilient_sync_113`  
**Date:** 2026-08-24  
**Target Goal:** Resolve `column does not exist` query errors in `syncManager.js`, implement resilient timestamp fallback for table synchronization, and provide optional SQL migration script for `updated_at` column triggers.

---

## 1. Problem Diagnosis & Findings

- When `syncManager.js` attempted to incrementally query `inventory`, `central_inventory`, `tasks`, `branches`, `customers`, and `loans` using `column.updated_at`, PostgREST returned error `42703 (column does not exist)`.
- These tables have `created_at` (or no timestamp in older schemas), not `updated_at`.
- The synchronization engine must use verified columns (`created_at` for transactional records, and scoped query for catalog tables) with an automatic column-error fallback to guarantee 0 query errors across all schemas.

---

## 2. Technical Solutions

1. **Resilient Sync Engine ([`js/data/syncManager.js`](file:///d:/v2%20BMS%20OFFICIAL/js/data/syncManager.js)):**
   - Configure `timestampCol: 'created_at'` for transactional tables (`sales`, `expenses`, `tasks`, `requests`, `customers`, `loans`, `stock_movements`, `staff`, `branches`, `capital_accounts`, `business_assets`).
   - For catalog tables (`inventory`, `central_inventory`), query scoped rows (`branch_id` / `owner_id`) without restrictive timestamp predicates.
   - Implement automatic query retry without timestamp filters if PostgREST returns a `42703` (column does not exist) error.

2. **SQL Migration Files:**
   - `supabase/0001_add_updated_at_timestamps_and_triggers.sql`
   - `supabase/0001_single_run_add_updated_at_timestamps.sql`
   - Adds `updated_at timestamptz DEFAULT now()` and `BEFORE UPDATE` trigger function `set_updated_at_timestamp` across public operational tables.

3. **Release Notes & Version Bump:**
   - Update `release_notes.json` and `public/release_notes.json` with user-friendly release notes ("Minor stability fixes and performance improvements").
   - Compile cleanly with `npm run build` (0 errors).
