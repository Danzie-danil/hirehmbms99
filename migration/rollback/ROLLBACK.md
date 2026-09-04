# Production Rollback Protocol — Supabase Fallback

This document specifies the emergency rollback protocol if any critical failure or data integrity discrepancy is detected during or after Convex cutover.

## Immediate Rollback Trigger Conditions

A rollback is mandatory if:
1. Multi-tenant data leakage occurs (e.g. Owner A sees Owner B data).
2. Financial data totals (sales, expenses, balances, stock valuation) deviate between Convex and Supabase.
3. Offline POS sales duplication occurs due to idempotency failure.
4. Core POS checkout latency exceeds acceptable bounds (> 3000ms).
5. Unrecoverable authentication or session failures lock users out of their accounts.

## Rollback Procedure

```text
CONVEX DETECTED FAILURE
          │
          ▼
1. Disable Writes to Convex
   - Terminate active client write sessions
   - Switch application environment variable BACKEND_PROVIDER to 'supabase'
          │
          ▼
2. Verify Supabase Production State
   - Confirm Supabase database is read/write accessible
   - Check sync queues for any pending local transactions
          │
          ▼
3. Re-route Client Traffic
   - Revert frontend client build to production Supabase bundle
   - Deploy emergency hotfix via Vercel / PWA service worker update
          │
          ▼
4. Drain Any Delta Writes
   - If writes occurred on Convex during the cutover window, export them using:
     node migration/scripts/export_convex_deltas.cjs
   - Backfill deltas into Supabase with audit logging
          │
          ▼
5. Validation & Service Resumption
   - Confirm tenant dashboards, inventory, and POS functionality
   - Notify users of normal operational resumption
```
