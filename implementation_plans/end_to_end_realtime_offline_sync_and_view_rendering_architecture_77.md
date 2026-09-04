# End-to-End Realtime Sync, Offline Storage Alignment, and Cache-First View Rendering Architecture

This plan resolves blank screens, long initialization delays, unreliable IndexedDB/Cloud sync, missing cross-device realtime updates, and view rendering timeouts across `#sysadmin`, `#owner`, and `#branch` portals.

## User Review Required

> [!IMPORTANT]
> **Key Architecture Decisions**:
> 1. **Cache-First View Navigation (Stale-While-Revalidate)**: Page switches will render local IndexedDB cached data **instantly (<50ms)** instead of clearing `#main-content` to display a white loading screen. Cloud fetching will happen asynchronously in the background.
> 2. **Unified Transactional Sync Pipeline**: Merges `localStorage` queues into a single Dexie IndexedDB sync queue (`localDb.sync_queue`), ensuring mutations on any device persist locally and auto-push to Supabase instantly when online.
> 3. **Live Cross-Device Realtime Patching**: Realtime Postgres payload listeners will write incoming cloud changes directly into IndexedDB local cache and update active views seamlessly without forcing manual browser reloads.

---

## Proposed Changes

### Core Storage & Sync Architecture (`#global`)

#### [MODIFY] [syncManager.js](file:///d:/v2%20BMS%20OFFICIAL/js/data/syncManager.js)
- Extend `syncManager.processPendingQueue()` to handle all entity types (`sales`, `staff`, `expenses`, `inventory`, `payroll`, `customers`, `loans`, `requests`, `notes`, `suppliers`, `central_inventory`) stored in `localDb.sync_queue`.
- Implement instant post-save trigger: Whenever any form saves data online or offline, invoke `syncManager.processPendingQueue()` immediately rather than relying solely on a 2-minute interval.

#### [MODIFY] [offline_queue.js](file:///d:/v2%20BMS%20OFFICIAL/js/offline_queue.js)
- Unify `getOfflineQueue()` and `getOfflineOpsQueue()` to write directly to `localDb.sync_queue` in Dexie IndexedDB.
- Maintain fallback compatibility while delegating sync processing to the Dexie transaction pipeline for ACID compliance.

#### [MODIFY] [db.js](file:///d:/v2%20BMS%20OFFICIAL/js/db.js)
- Update `dbSales`, `dbExpenses`, `dbInventory`, `dbStaff`, `dbPayroll`, `dbCustomers`, `dbLoans`, `dbRequests`, `dbNotes`, `dbSuppliers`, and `dbCentralInventory`:
  - On `add` / `update` / `delete`: Write to local IndexedDB table **first** (`localDb[table].put(...)`), queue in `localDb.sync_queue`, and trigger immediate background cloud flush.
  - On `fetch`: Provide instant Dexie cache read (`localDb[table].toArray()`), then update cache asynchronously from Supabase.

---

### Realtime Cross-Device Synchronization (`#global`)

#### [MODIFY] [realtime.js](file:///d:/v2%20BMS%20OFFICIAL/js/realtime.js)
- Extend `handleChange(table, payload)`:
  - On `INSERT` / `UPDATE`: Execute `localDb[table].put(payload.new)` to update local IndexedDB cache instantly.
  - On `DELETE`: Execute `localDb[table].delete(payload.old.id)`.
  - Trigger smooth active view patch without destroying DOM or interrupting active user input.
- Add Realtime Channel Health Check & Reconnection Handshake on `visibilitychange` and `online` events: Automatically re-subscribe if Supabase Realtime channel status drops to `CLOSED` or `TIMED_OUT`.

---

### Cache-First Navigation & View Rendering (`#global`, `#owner`, `#branch`, `#sysadmin`)

#### [MODIFY] [app.js](file:///d:/v2%20BMS%20OFFICIAL/js/app.js)
- Refactor `switchView(viewId, context)`:
  - **Eliminate Full White Screen Lock**: Instead of wiping `#main-content` with a white loading spinner, attempt to render cached view shell and IndexedDB data immediately.
  - Show a non-intrusive top-right loader or subtle progress bar during background cloud revalidation.
  - If network query stalls or times out, keep cached view visible with a subtle status toast ("Displaying local cache; reconnecting to cloud..."), preventing blank screens or navigation watchdog errors.

#### [MODIFY] [networkStatus.js](file:///d:/v2%20BMS%20OFFICIAL/js/data/networkStatus.js)
- Enhance network status listener to trigger instant sync manager queue processing and Realtime channel reconnect on connection restore.

---

## Verification Plan

### Automated Build Verification
- Execute `npm run build` to confirm 0 compilation errors and update Service Worker cache bundle.

### Manual Verification
1. **Instant View Switching**: Switch rapidly between Owner/Branch modules (`Staff`, `Sales`, `Inventory`, `Payroll`, `Expenses`) to verify zero white screens or hanging loading spinners.
2. **Offline-to-Online Instant Sync**: Disconnect network, create sales/staff/expenses, reconnect network, and verify instant automatic background flush to Supabase without manual reloads.
3. **Cross-Device Realtime Update**: Open app on two separate browser sessions/devices under the same tenant account; modify data on Device A and verify Device B updates live on screen without page refresh.
