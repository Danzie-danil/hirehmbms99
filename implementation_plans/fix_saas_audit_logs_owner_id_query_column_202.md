# Implementation Plan - Fix SaaS Audit Logs Column Query & owner_id Alignment

## Goal
Resolve HTTP 400 Bad Request on `saas_audit_logs` query caused by filtering on non-existent `actor_id` column in PostgreSQL, aligning queries to `owner_id` and providing database schema migration for table structure and RLS policies.

---

## User Review & Database Changes

> [!NOTE]
> The `public.saas_audit_logs` table in Supabase PostgreSQL uses `owner_id` as the tenant owner foreign key column referencing `public.profiles(id)`.
> 
> **Resolution:**
> 1. Client query in `js/db.js` (`dbSecurity.fetchSecurityLogs`) updated to filter by `owner_id.eq.${ownerId}`.
> 2. Standalone & single-run SQL migrations provided to ensure `saas_audit_logs` schema, indices, and RLS policies exist on PostgreSQL.

---

## Proposed Changes

### Storage & Data Access Layer
- [MODIFY] `js/db.js` (lines 4330-4338): Replaced `.eq('actor_id', ownerId)` with `.eq('owner_id', ownerId)` and added null guard for `ownerId`.

### Database Schema Migrations
- [NEW] `supabase/migrations/0001_ensure_saas_audit_logs_columns.sql`: Table DDL, RLS policies, and composite index for `public.saas_audit_logs`.
- [NEW] `supabase/migrations/0001_single_run_ensure_saas_audit_logs.sql`: Single run execution script for Supabase SQL Editor.

---

## Verification Plan

### Automated Tests
1. `npm run build`
2. `node scripts/lint_check.cjs`

### Manual Verification
1. Navigate to Settings -> Security tab.
2. Verify access logs load cleanly without 400 Bad Request console error.
