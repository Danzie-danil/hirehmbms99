# Implementation Plan - Dashboard Real-Time Activity Feed & Restock / Low Stock Alerts

## 1. Goal
Fix the Activity Feed and Restock Feed on the Owner Overview Dashboard and Branch Dashboard so they:
1. Automatically populate from recent sales, expenses, and task activities across all branches (including offline cached data).
2. Live-stream and pulse newly incoming real-time sales, expenses, and task mutations into the Activity Feed.
3. Combine formal restock requisition requests with automatically detected low-stock branch inventory items in the "Branch Restock Requests" feed with direct dispatch shortcuts.
4. Enable real-time updates on the Branch Dashboard for live sales, inventory alerts, and tasks.

## 2. Proposed Changes
### `js/owner/overview.js`
- In `_populateOverviewDOM`:
  - Synthesize activity feed entries from `payload.activities`, `todaySalesList`, and `expenses` if `activities` is empty or sparse.
  - In Section 6 ("Branch Restock Requests"): Aggregate both formal pending requests (`requests` table) AND branch items where stock is at or below minimum threshold (`quantity <= (min_threshold || 5)`).
  - Update badge to display `${count} Restock / Low Stock` or `All Fulfilled`.
  - Add dispatch / restock quick-action trigger.
  - In `window.renderActivities`: Enhance date matching and visual formatting for today's activities.

### `js/branch/dashboard.js`
- Ensure low stock detection checks `quantity <= (min_threshold || 5)`.
- Update live sales stream and inventory alerts on live patch updates.

### `js/data/repositories/dashboardRepository.js`
- In `patchOwnerDashboardWithLiveRecord`:
  - When `sales` or `expenses` are inserted via real-time WebSocket, dynamically prepend a new activity object to `payload.activities`.
  - Also patch `inventory` mutations to recalculate low-stock alerts.
- In `patchBranchDashboardWithLiveRecord`:
  - Ensure real-time `sales`, `expenses`, and `inventory` updates trigger live DOM re-render.

## 3. Verification Plan
- Run `npm run build` to verify clean compilation with 0 lint/syntax errors.
- Verify that recorded sales populate the Activity Feed immediately.
- Verify that low-stock items appear in the Branch Restock card.
