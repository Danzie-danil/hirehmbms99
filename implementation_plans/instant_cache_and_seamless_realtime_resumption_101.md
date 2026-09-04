# Implementation Plan: Instant Cache Rendering & Seamless Real-Time Resumption (101)

## Goal Description
Eliminate tab wake-up stalls, skeleton lockups, and navigation freezing after long periods of user inactivity by enforcing an **Instant Cache-First UI (< 20ms)** architecture coupled with **Seamless Real-Time Background Synchronization**, ensuring users are never left with empty screens or non-responsive buttons while receiving live cloud updates in real time.

---

## Technical Architecture & Core Pillars

### 1. Instant Cache-First UI Rendering (< 20ms)
- When opening or switching to any view (Dashboard Overview, Branches, Inventory, Sales, Expenses, etc.) or resuming after inactivity:
  - Immediately retrieve local IndexedDB snapshots / offline cache.
  - Render the complete UI, stats, tables, and metrics instantly (< 20ms) so there is zero layout shift, no blank screens, and no perpetual skeleton loaders.

### 2. Live Background Cloud Refresh & Instant UI Patching
- Simultaneously launch an asynchronous background query to fetch the latest cloud data.
- When new/fresh records arrive from the cloud:
  - Update the IndexedDB local cache in real time.
  - Update the DOM elements smoothly in-place without unmounting active inputs, modals, or scroll positions.

### 3. Immediate Dormant Socket & Token Rehydration ([lifecycle.js](file:///d:/v2%20BMS%20OFFICIAL/js/lifecycle.js) & [inactivityManager.js](file:///d:/v2%20BMS%20OFFICIAL/js/inactivityManager.js))
- Upon user return (tab focus, visibility change, or interaction after 10+ minutes):
  - Fast-track `supabase.auth.getSession()` to refresh the auth token before firing network queries.
  - Tear down stale/frozen TCP sockets and re-establish the Supabase Realtime channel (`initRealtimeSync(true)`).

### 4. Fast Navigation Watchdog ([app.js](file:///d:/v2%20BMS%20OFFICIAL/js/app.js))
- Reduce the navigation timeout watchdog from 16 seconds to **3 seconds**.
- If a mobile or desktop network interface is waking up from sleep, navigation immediately proceeds with cached state instead of hanging the UI.

### 5. Strict Real-Time & Live Broadcast Protection
- Preserve all Supabase Postgres changes, `patchOwnerDashboardWithLiveRecord`, `patchBranchDashboardWithLiveRecord`, and `window.broadcastDataMutation` across Owner, Branch, and Sysadmin portals.

---

## Proposed Changes

### [MODIFY] [js/owner/overview.js](file:///d:/v2%20BMS%20OFFICIAL/js/owner/overview.js)
- Ensure `renderOwnerOverview` immediately populates existing DOM from cached snapshots before background sync completes, preventing skeletons from persisting when cached data is present.

### [MODIFY] [js/app.js](file:///d:/v2%20BMS%20OFFICIAL/js/app.js)
- Optimize the `switchView` watchdog timeout from 16s to 3s for instantaneous fallback to cached views.

### [MODIFY] [js/lifecycle.js](file:///d:/v2%20BMS%20OFFICIAL/js/lifecycle.js)
- Ensure `handleAppResume` revalidates auth tokens and refreshes view in-place without triggering skeleton shells.

---

## Verification Plan

### Automated Verification
- Run `npm run build` to verify clean production compilation (0 errors).

### Manual Verification
- Test returning to tab after inactivity; verify dashboard immediately renders from cache and live sync updates metrics without UI freezing or blank states.
