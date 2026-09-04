# Implementation Plan: Offline-First DB Write Operations & Sleep Wake Recovery

**Plan Name**: `offline_db_fallback_and_wake_sync_01.md`  
**Date**: 2026-08-29  
**Scope**: `#global`, `#owner`, `#branch`

---

## 1. Problem Statement & User Request
When the app is offline, suffering network latency/timeouts, or waking from sleep/inactivity:
1. **Sleep-Wake Frozen Sockets**: Stale HTTP/WebSocket connections after tab sleep trigger 7-second timeouts before falling back to local database.
2. **Missing Offline Mutation Support**: Write operations (`add customer`, `add sale`, `add expense`, `add supplier`, `add inventory item`, `add loan/liability`, `add central inventory`, `add stock transfer`, `add return`) currently depend on direct cloud execution in `js/db.js`. If offline or if the request times out, they throw errors instead of saving locally to IndexedDB and queueing for background synchronization.

---

## 2. Proposed Architecture & Solutions

### A. Comprehensive Offline-First Write Fallback (`js/db.js` & `js/data/syncManager.js`)
For every critical creation, update, and deletion operation across Owner and Branch modules:
1. **Optimistic Local Persistence**:
   - If offline, or if the cloud query times out / throws network error:
     - Generate a client UUID (`crypto.randomUUID()` or standard UUID).
     - Store the record directly in IndexedDB (`localDb.<table_name>`) with `sync_status: 'PENDING'`.
     - Queue an operation payload in `localDb.sync_queue` (e.g. `CREATE_EXPENSE`, `CREATE_CUSTOMER`, `CREATE_INVENTORY`, `CREATE_SUPPLIER`, `CREATE_LOAN`, `CREATE_CENTRAL_ITEM`, `CREATE_TRANSFER`, `CREATE_RETURN`).
     - Return the created entity immediately so UI modals close smoothly, toast notifications succeed, and tables/lists update immediately.
2. **Background Sync & Cloud Replay (`syncManager.js`)**:
   - Process `sync_queue` automatically whenever `online` event fires or during periodic sync.
   - Execute cloud upsert/RPC and update local record `id` and `sync_status: 'SYNCED'`.

### B. Fast Sleep-Wake Recovery & Connection Re-establishment (`js/lifecycle.js` & `js/auth.js`)
1. On tab wake (`visibilitychange === 'visible'` or window `resume` after >10 minutes):
   - Fast-refresh the Supabase auth token using `refreshSession()` without blocking UI.
   - Use stale-while-revalidate: immediate local data return while cloud sync reconciles quietly in background.
   - Reset any stalled connection states to prevent 7s hanging queries.

---

## 3. Operations Covered for Offline Support

| Domain | Entity / Operation | Fallback Table | Queue Action |
| :--- | :--- | :--- | :--- |
| **Sales** | POS checkout / Sale creation | `localDb.sales` | `CREATE_SALE` |
| **Expenses** | Record Branch & Owner Expenses | `localDb.expenses` | `CREATE_EXPENSE` |
| **Customers** | Add / Update Customer & Loyalty | `localDb.customers` | `CREATE_CUSTOMER` |
| **Inventory** | Branch Stock item creation & restock | `localDb.inventory` | `CREATE_INVENTORY` |
| **Central Catalog**| Main store product / service creation | `localDb.central_inventory` | `CREATE_CENTRAL_ITEM` |
| **Suppliers** | Vendor / Supplier creation | `localDb.suppliers` | `CREATE_SUPPLIER` |
| **Loans** | Branch & Business loan creation / repayment | `localDb.loans` / `business_loans` | `CREATE_LOAN` |
| **Transfers & Returns** | Branch stock transfers & customer returns | `localDb.stock_transfers` / `returns` | `CREATE_TRANSFER` / `CREATE_RETURN` |

---

## 4. Double-Confirmation Notice
Per workspace rules in `.agents/AGENTS.md`:
Modifications to real-time engine and data sync pipelines (`js/db.js`, `js/data/db.js`, `js/data/syncManager.js`, `js/lifecycle.js`) require double confirmation before altering sync/data architecture.
