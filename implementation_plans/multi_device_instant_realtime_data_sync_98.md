# Multi-Device Instant Real-Time Data Synchronization Architecture

## Overview
Implement end-to-end multi-device and cross-portal instant real-time synchronization. When a branch registers a sale, expense, stock movement, or request, the owner's dashboard and KPI stats cards update instantly in real time on all connected devices (phones, tablets, laptops) without requiring a manual page refresh. Similarly, any action taken by the owner on Device A propagates instantly to Device B and all relevant branch terminals.

---

## User Review Required
> [!IMPORTANT]
> - Real-time synchronization operates across two complementary layers:
>   1. **Supabase Postgres Changes (`postgres_changes`)**: Server-authoritative stream capturing all database inserts, updates, and deletes across all tables.
>   2. **Client-Side Cross-Device Broadcast (`data_mutation`)**: Sub-100ms low-latency WebSocket broadcast providing immediate UI hydration and local IndexedDB updating before database replication round-trips.
> - No hardcoded credentials or authorization tokens will be exposed; all channel subscriptions and filters strictly obey tenant ownership (`owner_id`) and branch assignments (`branch_id`).

---

## Proposed Changes

### 1. Realtime Engine & Subscription Registry

#### [MODIFY] [js/realtime.js](file:///d:/v2%20BMS%20OFFICIAL/js/realtime.js)
- **Expand `SUBSCRIPTIONS` & `OWNER_TABLE_VIEWS` Table Registry**:
  - Add missing entity mappings for Owner modules: `capital_accounts`, `capital_transactions`, `business_assets`, `business_loans`, `business_goals`, `shifts`, `promotions`, `stock_movements`, `product_returns`, and `stock_transfers`.
  - Add missing entity mappings for Branch modules: `cash_drawer_sessions`, `stock_transfers`, `returns`, and `attendance`.
- **Implement Cross-Device Mutation Broadcaster (`broadcastDataMutation`)**:
  - Emit lightweight mutation envelopes `{ table, eventType, record, ownerId, branchId, timestamp }` whenever an insert/update/delete operation is executed locally.
- **Dynamic View Dispatcher & IndexedDB Live Cache Auto-Patch**:
  - When a `postgres_changes` or `data_mutation` event arrives, immediately upsert the record in `window.localDb[table]`.
  - Trigger active view re-rendering with debounced UI revalidation (`renderOwnerOverview`, `renderBranchDashboard`, `renderSalesModule`, `renderInventoryModule`, `renderOwnerCapitalModule`, etc.).
  - On Owner Overview, trigger non-destructive live metric recalculation so Sales Today, Revenue, Activities Feed, and Branch Progress bars animate and update live.

---

### 2. Dashboard Repository Realtime Ingestion

#### [MODIFY] [js/data/repositories/dashboardRepository.js](file:///d:/v2%20BMS%20OFFICIAL/js/data/repositories/dashboardRepository.js)
- **Live Incremental Stat Patching**:
  - Add helper `patchOwnerDashboardWithLiveRecord(table, eventType, record)` to incrementally adjust the in-memory snapshot and notify listeners without waiting for full server queries.
  - When a new `sales` record arrives from a branch:
    - Increment today's sales and gross profit in real time.
    - Append to recent sales list.
    - Save updated snapshot to IndexedDB.
    - Broadcast update to overview listeners (`onDashboardUpdated`).

---

### 3. Core Database Operations & Mutation Hooking

#### [MODIFY] [js/db.js](file:///d:/v2%20BMS%20OFFICIAL/js/db.js)
- Ensure all mutations (`dbSales.add`, `dbExpenses.add`, `dbInventory.update`, `dbCentralInventory.add`, `dbCapital.addAccount`, `dbTasks.add`, `dbRequests.add`, `dbBranches.add`, etc.) invoke `window.broadcastDataMutation(table, action, data)` upon success.

---

### 4. Lifecycle & Hibernate Reconnection

#### [MODIFY] [js/lifecycle.js](file:///d:/v2%20BMS%20OFFICIAL/js/lifecycle.js) & [js/auth.js](file:///d:/v2%20BMS%20OFFICIAL/js/auth.js)
- Enhance tab resume / screen unlock handlers (`visibilitychange`, `pageshow`, `online`) to verify WebSocket channel health and auto-resubscribe if connection dropped during long device sleep.

---

## Verification Plan

### Automated Verification
- Run `npm run build` to ensure bundle compilation succeeds with zero syntax or bundling errors.

### Manual Multi-Device Verification
1. **Branch Sale -> Owner Overview Live Update**:
   - Open Branch Cashier on Device A (or Browser Tab 1) and Owner Overview on Device B (or Browser Tab 2).
   - Record a new sale of `50,000 TZS` in Branch Cashier.
   - Observe Owner Overview on Device B: Total Sales Today increases by `50,000 TZS`, Branch Progress bar advances, and Activity Feed updates live without refreshing the page.
2. **Owner Modification -> Device B Sync**:
   - On Device A (Owner), update a product price or register a capital deposit.
   - On Device B (Owner) and Device C (Branch), observe that inventory price and capital balance update immediately.
3. **Device Sleep & Wake Reconnection**:
   - Lock/sleep Device B for 30 seconds, unlock, and verify that all intervening sales and activities sync cleanly.
