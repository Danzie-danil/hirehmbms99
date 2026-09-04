# Implementation Plan: BMSTZ Web App — Offline-First Data & Fetching Reliability Architecture (Plan 29)

Refactor the existing Vite + JavaScript/React + Supabase web application to establish a rock-solid, offline-first, cache-backed data access architecture. The UI will render immediately from local storage/IndexedDB, eliminate infinite loading states, handle network degradation gracefully, and preserve Supabase as the server-authoritative source of truth without introducing native packaging frameworks (Tauri/Capacitor/Electron).

## User Review Required

> [!IMPORTANT]
> **No Business Logic Relocation**: Supabase RPCs, database triggers, subscription plan validations, and PostgreSQL security definer rules remain the authoritative source of truth. The client architecture introduces local caching, stale-while-revalidate hydration, and background synchronization around the existing endpoints.
> 
> **Zero Native Packaging in this Phase**: Tauri, Capacitor, Electron, or React Native will NOT be introduced. All work is standard web-standard browser technology (IndexedDB via Dexie, Service Worker, Web Workers / Async Sync Managers).

## Architecture Blueprint

```text
┌─────────────────────────────────────────────────────────────┐
│                    UI Layer (React / DOM)                   │
│   (Owner Overview, Branch Dashboard, POS, Inventory, etc.)  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            Domain Repositories (Data Access Layer)          │
│   (dashboardRepo, salesRepo, inventoryRepo, customerRepo)   │
└──────────────┬───────────────────────────────┬──────────────┘
               │ (1. Read Immediate Cache)     │ (2. Sync / Mutate)
               ▼                               ▼
┌──────────────────────────────┐ ┌─────────────────────────────┐
│     Local Persistent DB      │ │        Sync Manager         │
│      (Dexie / IndexedDB)     │ │   & Mutation Queue Engine   │
│  - dashboard_snapshots       │ │  - sync_queue (idempotent)  │
│  - sales, inventory, items   │ │  - sync_metadata            │
│  - customers, expenses       │ │  - retry & backoff locks    │
│  - subscription_snapshots    │ └──────────────┬──────────────┘
└──────────────────────────────┘                │ (Background Push/Pull)
                                                ▼
                                 ┌─────────────────────────────┐
                                 │      Network Service        │
                                 │ (Health Ping & Status Hub)  │
                                 └──────────────┬──────────────┘
                                                │ (Authoritative)
                                                ▼
                                 ┌─────────────────────────────┐
                                 │     Supabase Backend        │
                                 │ (Postgres, RPCs, Auth, RLS) │
                                 └─────────────────────────────┘
```

---

## Proposed Changes

### Phase 1 — Dependencies & Local Persistent Storage Engine
Install `dexie` as the mature, schema-versioned IndexedDB abstraction.

#### [NEW] [data/db.js](file:///d:/v2%20BMS%20OFFICIAL/js/data/db.js)
- Initialize Dexie instance `const localDb = new Dexie('BMSTZ_LocalDB')`.
- Define versioned stores:
  - `dashboard_snapshots`: `key, role, target_id, data, updated_at`
  - `sales`: `id, branch_id, client_tx_id, customer_id, total, created_at, sync_status`
  - `inventory`: `id, branch_id, name, sku, quantity, min_threshold, unit_price, cost_price, updated_at`
  - `customers`: `id, branch_id, name, phone, balance, updated_at`
  - `expenses`: `id, branch_id, category, amount, created_at, sync_status`
  - `purchases`: `id, owner_id, supplier_id, total, created_at`
  - `sync_queue`: `++id, operation_id, operation_type, entity_type, entity_id, payload, created_at, attempt_count, status, last_error`
  - `sync_metadata`: `entity, last_synced_at, sync_status, last_error`
  - `subscription_snapshot`: `user_id, plan, features, status, expires_at, verified_at`

---

### Phase 2 — Network State Service & Global Status Hub

#### [NEW] [data/networkStatus.js](file:///d:/v2%20BMS%20OFFICIAL/js/data/networkStatus.js)
- Centralized network monitoring service emitting reactive states: `online`, `offline`, `connecting`, `syncing`, `sync_error`.
- Performs active lightweight Supabase health probes (not solely relying on `navigator.onLine`).
- Exposes subscribe listeners and lightweight unobtrusive status badges in the top nav / header (e.g. `⚡ Offline (Cached)`, `🔄 Syncing...`, `✅ Up to date`).

---

### Phase 3 — Repository / Data Access Layer

#### [NEW] [data/repositories/dashboardRepository.js](file:///d:/v2%20BMS%20OFFICIAL/js/data/repositories/dashboardRepository.js)
- `getDashboard(role, targetId, options)`:
  1. Instantly queries `localDb.dashboard_snapshots.get(snapshotKey)`.
  2. If found, returns cached data immediately with `{ isFromCache: true, cachedAt, data }`.
  3. Initiates non-blocking background synchronization with Supabase.
- `syncDashboard(role, targetId)`:
  1. Acquires sync lock.
  2. Executes consolidated query / RPC with bounded watchdog timeout (4.5s).
  3. Writes authoritative payload to `dashboard_snapshots` and updates `sync_metadata`.
  4. Triggers reactive listener to seamlessly re-render UI if data changed.

#### [NEW] [data/repositories/salesRepository.js](file:///d:/v2%20BMS%20OFFICIAL/js/data/repositories/salesRepository.js)
- Implements `getSales()`, `getSale()`, `createSale()` with idempotency key generation (`client_tx_id = crypto.randomUUID()`).
- In offline mode, saves locally with `sync_status: 'LOCAL_PENDING'` and enqueues to `sync_queue`.

#### [NEW] [data/repositories/inventoryRepository.js](file:///d:/v2%20BMS%20OFFICIAL/js/data/repositories/inventoryRepository.js)
- Implements cache-first inventory lookups and low-stock indicators.

---

### Phase 4 — Sync Manager & Background Engine

#### [NEW] [data/syncManager.js](file:///d:/v2%20BMS%20OFFICIAL/js/data/syncManager.js)
- Coordinates all background pull and push sync operations:
  - `syncAll()`: Iterates pending entities (`dashboard`, `sales`, `inventory`, `customers`, `expenses`).
  - `processMutationQueue()`: Dequeues pending operations from `sync_queue`, calls Supabase with `client_tx_id`, records server confirmations, and handles conflict / retry backoff.
- Listens to window focus, network reconnection, periodic cron tick, and user manual refresh triggers.
- Prevents concurrent duplicate sync jobs using mutex locks.

---

### Phase 5 — Dashboard Offline-First Hydration Refactor

#### [MODIFY] [owner/overview.js](file:///d:/v2%20BMS%20OFFICIAL/js/owner/overview.js)
- Refactor `renderOwnerOverview()`:
  - Request cached snapshot from `dashboardRepository.getDashboard('owner', activeBranchFilter)`.
  - If cached snapshot exists, render full KPI cards, business summary, and branch performance **instantly (< 25ms)**.
  - Display subtle background syncing indicator without replacing UI with skeleton spinners.
  - On background refresh completion or failure, update UI seamlessly. If offline, keep cached data visible and display `Last updated X minutes ago`.
  - Guaranteed completion path with watchdog: never freeze in loading state.

#### [MODIFY] [branch/dashboard.js](file:///d:/v2%20BMS%20OFFICIAL/js/branch/dashboard.js)
- Refactor `renderBranchDashboard()`:
  - Request cached snapshot from `dashboardRepository.getDashboard('branch', state.branchId)`.
  - Render Today's Sales, Transactions, Expenses, Open Tasks, and Target Progress instantly from local DB.
  - Background refresh updates local snapshot and dispatches live update.

---

### Phase 6 — Integration & Version Bump

#### [MODIFY] [app.js](file:///d:/v2%20BMS%20OFFICIAL/js/app.js)
- Initialize `networkStatus.init()` and `syncManager.init()` during app bootstrap.
- Mount top header network sync indicator widget.

#### [MODIFY] [release_notes.json](file:///d:/v2%20BMS%20OFFICIAL/release_notes.json) & [updateChecker.js](file:///d:/v2%20BMS%20OFFICIAL/js/updateChecker.js)
- Bump version to `2.8.3` and align release notes.

---

## Verification Plan

### Automated Build & Test
- Run `npm install dexie` and verify clean package lock.
- Run `npm run build` to verify Vite bundle compilation and zero lint/type errors.

### Manual Failure Scenario Verification
1. **Instant Render (Online & Offline)**:
   - Load Owner Overview and Branch Dashboard, verify immediate rendering (< 30ms) from IndexedDB.
2. **Network Disconnect during Fetch**:
   - Disconnect network or throttle to Offline in DevTools; verify the dashboard does NOT hang on spinners and clearly displays offline cached data.
3. **Background Reconnection Sync**:
   - Re-enable network; verify Sync Manager executes background sync and silently updates local snapshots.
4. **Guaranteed Watchdog Completion**:
   - Verify that slow requests never leave components indefinitely stuck in `.animate-pulse` skeleton state.
