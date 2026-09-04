# Implementation Plan: Complete Local Schema Mirroring & Instant Concurrent Sync (222)

## Problem & Background
The user requested:
1. Ensure the local IndexedDB schema matches the Supabase database schema in its entirety (every table and all necessary indices).
2. When the user opens the app, immediately local storage (IndexedDB) and Supabase must communicate and update each other at the same time—no waiting, no delay.
3. IndexedDB is favored first when offline, but when online, IndexedDB and Supabase work together concurrently (simultaneous bidirectional sync and non-blocking caching).

## Current Gaps Identified
1. **Schema Mirroring in `js/data/db.js`**:
   - `localDb` version 9 currently defines 39 stores, but lacks several active Supabase tables: `invoices`, `cash_drawer_sessions`, `chat_groups`, `group_members`, `pinned_messages`, `task_comments`, `capital_transactions`, `sale_tags`, `access_requests`, and `profiles`.
   - Adding `localDb.version(10)` with full 52-store coverage ensures complete 100% schema alignment with Supabase.
2. **Syncable Entities in `js/data/syncManager.js`**:
   - `SYNCABLE_ENTITIES` only covers 13 tables. Expanding this list to cover suppliers, quotations, purchase orders, shifts, attendance, payroll, stock transfers, product returns, categories, business loans, goals, and promotions ensures all business data syncs bidirectionally between cloud and local storage.
3. **Immediate Boot-Time Bidirectional Communication**:
   - `syncManager.init()` currently only binds event listeners and starts a 60s interval timer; it does not execute sync on app open.
   - We will trigger immediate concurrent execution of `processPendingQueue()`, `reconcile(false, 'app_init')`, and `syncAllOfflineData()` the exact moment the app opens, and whenever an authenticated session is restored.
4. **Concurrent Stale-While-Revalidate Querying**:
   - In `_resilientFetch` (`js/db.js`), local IndexedDB data and Supabase cloud queries will work simultaneously: local data provides instant zero-latency rendering while the cloud query updates local storage and refreshes data in the background.

## Proposed Changes

### 1. `js/data/db.js`
- Define `localDb.version(10).stores({ ... })` containing all 52 tables with primary keys and foreign key/search indices matching Supabase.

### 2. `js/data/syncManager.js`
- Expand `SYNCABLE_ENTITIES` to include all business entities for both owners and branches.
- In `syncManager.init()`, immediately dispatch bidirectional synchronization (`processPendingQueue()` + `reconcile(false, 'app_init')` + `syncAllOfflineData()`) without delay.
- Attach an immediate sync trigger on session restoration.

### 3. `js/db.js`
- Ensure all repository queries (`dbInvoices`, `dbCashDrawer`, `dbSuppliers`, etc.) have full local IndexedDB caching and fallback handlers matching the updated stores.

## Verification Plan
1. `node scripts/lint_check.cjs` (0 syntax/lint errors).
2. `npm run build` (clean compilation).
3. Verify version increment to `v3.9.239`.
