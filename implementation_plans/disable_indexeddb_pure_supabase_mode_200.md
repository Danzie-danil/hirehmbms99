# Implementation Plan - Temporarily Disable IndexedDB (Pure Supabase Mode)

## Goal
Temporarily bypass/disable IndexedDB operations across the application so that all data reading, caching, and mutation flows rely solely on Supabase directly over the network, without destroying or deleting the existing Dexie/IndexedDB schema structure.

---

## User Review & Real-Time Sync Guard Alert

> [!CAUTION]
> **Strict Real-Time & Data Sync Protection Guard (Confirmation 1 of 2):**
> Disabling IndexedDB modifies the data layer and data synchronization pipelines (`js/data/db.js`, `js/db.js`, `js/data/syncManager.js`).
> 
> **Key Behavioral Changes When Disabled:**
> 1. **No Offline Storage / Fallback:** If internet connectivity drops, the app will not have local cached copies of sales, inventory, customers, or reports.
> 2. **Network Latency Dependency:** Page hydration and search queries will fetch directly from Supabase, removing the sub-15ms local cache response time.
> 3. **Sync Manager & Realtime Cache Bypass:** Real-time events will update in-memory state or trigger network refetches rather than writing to IndexedDB.
> 4. **Safe & Reversible:** The IndexedDB database schemas, version migrations (v1–v5), and queue structure in `js/data/db.js` remain completely intact; a single boolean flag / bypass guard will toggle IndexedDB on or off.

---

## Proposed Changes

### Data & Storage Layer

#### [MODIFY] [db.js](file:///d:/V2BmstzOfficial/js/data/db.js)
- Introduce a safe bypass flag: `export const INDEXEDDB_ENABLED = false;` (or dynamic `window.INDEXEDDB_ENABLED = false;`).
- Guard `cacheLocalItems`, `getLocalItems`, `bulkDeleteLocalItems`, `saveEntitlementsToIndexedDB`, and `getEntitlementsFromIndexedDB` so that when disabled:
  - `getLocalItems()` immediately returns `[]` (forcing callers to fetch directly from Supabase).
  - `cacheLocalItems()` becomes a safe no-op.
  - Snapshot saves and draft saves become safe no-ops without throwing exceptions.

#### [MODIFY] [syncManager.js](file:///d:/V2BmstzOfficial/js/data/syncManager.js)
- Guard sync loops and delta mergers so that when `INDEXEDDB_ENABLED` is false, heavy sync operations do not attempt to write to or scrub IndexedDB tables.

#### [MODIFY] [db.js](file:///d:/V2BmstzOfficial/js/db.js)
- Ensure all repository queries and zero-wipe fallback guards fall through cleanly to live Supabase queries without hanging on IndexedDB transactions.

---

## Verification Plan

### Automated Verification
1. Run build verification:
   ```powershell
   npm run build
   ```
2. Verify linting and build output integrity.

### Manual Verification
1. Open Application in browser and observe DevTools Network & Storage tabs.
2. Verify that no reads or writes touch `BMSTZ_LocalDB` in IndexedDB.
3. Verify that all dashboard KPIs, inventory lists, sales records, and financial reports fetch directly from Supabase.
4. Verify creating sales/expenses/items submits directly to Supabase and reflects immediately.
