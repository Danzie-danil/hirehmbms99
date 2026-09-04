# BMS-TZ — IndexedDB + Supabase Synchronization Reliability Implementation Plan

**Implementation Plan ID:** `indexeddb_supabase_sync_reliability_audit_and_fix_112`  
**Date:** 2026-08-24  
**Target Goal:** Resolve chronic synchronization stoppage, stale IndexedDB data after idle/sleep/refresh, resilient Realtime lifecycle recovery, robust app-resume reconciliation, incremental cloud sync with checkpoints, deletion handling, and multi-device/multi-branch consistency while preserving offline-first capabilities.

---

## 1. Problem Summary & Root Causes Identified

### A. Realtime WebSocket Lifecycle Failure & Abandonment
1. **Unrecovered Channel Errors/Timeouts:** In `js/realtime.js`, `_channel.subscribe(status => ...)` catches `CHANNEL_ERROR`, `TIMED_OUT`, and `CLOSED` but only logs warnings to the console without initiating a reconnection loop, teardown, or resubscription.
2. **Channel Reconnection Throttling Lock:** `if (_channel && presenceKey === _lastPresenceKey && !forceReconnect) return;` prevents re-initialization if `_channel` object exists in memory even when its internal Phoenix socket is in an error or closed state.
3. **Expired Realtime Auth Tokens:** When Supabase auto-refreshes JWTs (tokens expire hourly), the existing Realtime WebSocket is not updated with `supabase.realtime.setAuth(newToken)`, causing Supabase to reject or close incoming event delivery silently.

### B. Lack of Cloud-to-Local Incremental Reconciliation Engine
1. **Outgoing-Only Sync Queue:** `js/data/syncManager.js` previously only iterated over `localDb.sync_queue` for offline `CREATE_SALE` mutations. It had no mechanism to pull cloud changes down to IndexedDB.
2. **Missed Event Gap:** If an event occurred while the WebSocket was disconnected, sleeping, or backgrounded, it was permanently lost from the client unless a full manual fetch occurred.
3. **Absence of Sync Checkpoints:** No `lastSuccessfulSyncAt` cursors or incremental querying (`updated_at > cursor`) existed.

### C. Stale Cache Persistence & Refresh Failure
1. **Race Condition & Premature Timeout Fallback:** In `js/data/repositories/dashboardRepository.js`, a 4-second timeout during initial load on cold/sleeping sockets fell back to IndexedDB local items and re-saved them as the latest snapshot in `dashboard_snapshots`.
2. **Deletion Blindness in LocalDB:** Hard deletes or soft deletes in Supabase were never purged from IndexedDB if the client was offline or missed the realtime broadcast, leaving phantom records in local storage.

---

## 2. Proposed Architecture & Solution Design

```
             ┌──────────────────────────────────────────────┐
             │            SUPABASE CLOUD                    │
             │   (Authoritative Single Source of Truth)     │
             └──────┬────────────────────────────────┬──────┘
                    │                                │
            Realtime WebSocket               Incremental Sync
         (Sub-second live push)            (Delta queries via cursors)
                    │                                │
                    │   ┌────────────────────────┐   │
                    └──►│   SyncManager Engine   │◄──┘
                        │ - Health Monitor       │
                        │ - Reconnection Backoff │
                        │ - Checkpoint Tracker   │
                        │ - Deletion Purger      │
                        │ - Mutation Processor   │
                        └───────────┬────────────┘
                                    │
                                    ▼
                        ┌────────────────────────┐
                        │   Dexie IndexedDB      │
                        │ (Local Replica / Cache)│
                        └───────────┬────────────┘
                                    │
                                    ▼
                        ┌────────────────────────┐
                        │   React / UI State     │
                        │ (Instant Render + Live)│
                        └────────────────────────┘
```

---

## 3. Detailed Component Work Breakdown

### Component 1: Realtime Engine Lifecycle & Resilient Auto-Recovery (`js/realtime.js`)
- **Lifecycle Status State Machine:** Handle `SUBSCRIBED`, `CLOSED`, `CHANNEL_ERROR`, `TIMED_OUT` with exponential backoff (1s, 2s, 4s, 8s, max 16s with jitter).
- **Auth State Integration:** Listen to `supabase.auth.onAuthStateChange` to refresh Realtime token (`supabaseClient.realtime.setAuth(session.access_token)`) and reconnect if session refreshes.
- **Teardown & Deduplication Guard:** Guarantee clean channel removal before recreation.
- **Trigger Reconciliation on Connect:** When `SUBSCRIBED` status is confirmed, trigger `syncManager.reconcile()` to fetch any mutations that occurred during the disconnected window.

### Component 2: Multi-Entity Incremental Sync Engine (`js/data/syncManager.js`)
- **Entity Sync Runners:** Support incremental synchronization for `sales`, `expenses`, `inventory`, `central_inventory`, `tasks`, `requests`, `branches`, `customers`, `staff`, `stock_movements`.
- **Sync Checkpoints:** Read and update `last_synced_at` in `localDb.sync_metadata`.
- **Query Strategy:** Query `table` where `updated_at > checkpoint` (or `created_at > checkpoint`).
- **Deletion Handling:** Implement tombstone / delta deletion checks to purge records deleted in cloud from IndexedDB.
- **Optimized Batching:** Use `bulkPut` and `bulkDelete` in Dexie IndexedDB.
- **Live UI Notification:** Dispatch `onDashboardUpdated` or data mutation broadcast when records are reconciled.

### Component 3: Safe Cache & Dashboard Repository (`js/data/repositories/dashboardRepository.js` & `js/data/db.js`)
- **Differentiate Data States:** Distinguish between Cached (< 15ms initial render), Syncing, Synced, and Offline fallback.
- **Prevent Timeout Overwrite:** Ensure timeout fallbacks do not mark stale data as successfully synced snapshots.
- **Non-blocking Background Revalidation:** Return cached data immediately, execute background cloud query, patch IndexedDB, and seamlessly update the UI.

### Component 4: App Resume & Wakeup Handshake (`js/lifecycle.js` & `js/inactivityManager.js`)
- **Multi-Event Triggering:** Hook into `visibilitychange` (`hidden` -> `visible`), `focus`, `online`, `pageshow`, and inactivity recovery.
- **Resilient Resume Pipeline:**
  1. Re-hydrate memory state from verified local storage.
  2. Refresh Supabase auth session.
  3. Verify / reconnect Realtime channel.
  4. Run `syncManager.reconcile()` for delta changes.
  5. Re-render active view if data updated.

### Component 5: Observability & Diagnostics (`js/utils/syncLogger.js`)
- **Centralized Diagnostic Logger:** Provide structured, actionable logs for `[SYNC]`, `[REALTIME]`, `[AUTH]`, and `[LOCALDB]`.
- **Production Guard:** Control log verbosity via `window._SYNC_DEBUG` or development mode flag.

---

## 4. Verification & Testing Plan

1. **Test A (Idle Application):** Open app, idle for 10+ minutes, create sale on second device/browser, verify real-time appearance on original device.
2. **Test B (Browser Refresh):** Refresh browser, verify instant cached render followed immediately by fresh cloud reconciliation without requiring cache clearing.
3. **Test C (Network Drop & Reconnect):** Disconnect network, create cloud changes, restore network, verify automatic reconciliation and Realtime reconnection.
4. **Test D (Tab Suspension / Sleep / Wake):** Sleep laptop/tab, modify data, wake up, verify immediate catch-up sync.
5. **Test E (Multi-Branch Owner Reflection):** Branch A and Branch B record sales, Owner dashboard updates automatically in real time and retains fresh data across refreshes.
6. **Test F (Offline Capabilities):** Verify POS and offline data creation continue working seamlessly when offline.
7. **Clean Build:** Run `npm run build` and ensure 0 compilation errors.
