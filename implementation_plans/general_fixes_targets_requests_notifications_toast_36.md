# Implementation Plan: Branch Targets, Requests Visibility, Realtime Notification Toasts & Enhanced Toast Engine

Address the four reported general issues across branch operations, notifications, and UX:
1. **Branch Targets Visibility**: Fix target lookup in `js/branch/dashboard.js` and sync branch targets dynamically via `dashboardRepository.js`.
2. **Branch Requests Visibility & Default Filter**: Set default requests filter to `'all'` in `js/branch/requests.js` and ensure instant re-rendering upon request submission.
3. **Seamless Realtime Notifications & Toast Popups**: Implement live Supabase realtime alerts for both owner and branch incoming notifications (requests, comments, announcements, approvals, tasks) with instant `showToast` alerts and badge updates.
4. **Enhanced Toast Notification UI**: Upgrade `showToast` in `js/utils.js` and `css/index.css` to show full notification text, dynamic display duration based on message length, vertical scroll container for long messages, and an interactive dismiss button (`×`).

## Proposed Changes

### 1. Branch Dashboard & Target Sync
#### [MODIFY] [dashboard.js](file:///d:/v2%20BMS%20OFFICIAL/js/branch/dashboard.js)
- Update branch profile resolution: `const branch = state.branchProfile || (state.branches && state.branches.find(b => b.id === state.branchId)) || { name: 'My Branch', manager: '', target: 0 };`.
- Ensure `_populateBranchDashboardDOM` uses the active target from `state.branchProfile` or snapshot payload.

#### [MODIFY] [dashboardRepository.js](file:///d:/v2%20BMS%20OFFICIAL/js/data/repositories/dashboardRepository.js)
- In `_syncBranchDashboard`, include query for latest `branches` record for `branchId` to capture real-time target adjustments made by the owner and merge into `state.branchProfile` and `payload.branch`.

---

### 2. Branch Requests List & Default Filter
#### [MODIFY] [requests.js](file:///d:/v2%20BMS%20OFFICIAL/js/branch/requests.js)
- Change default selected value in `renderPremiumSelect` from `'pending'` to `'all'`.
- In `renderBranchRequestsList`, ensure `filter` defaults to `'all'` if not specified.
- Ensure proper empty state messaging and clean list rendering.

#### [MODIFY] [modals.js](file:///d:/v2%20BMS%20OFFICIAL/js/modals.js)
- In `handleRequestAttention`, `handleRestockStock`, and request action handlers, ensure `window.renderBranchRequestsList?.()` or `window.renderBranchRequestsModule?.()` is invoked immediately after submission when viewing requests.

---

### 3. Realtime Notification Integration & Live Toasts
#### [MODIFY] [realtime.js](file:///d:/v2%20BMS%20OFFICIAL/js/realtime.js)
- Add realtime toast dispatch on relevant table changes:
  - When a new `request` or `access_request` arrives for `owner`, trigger `showToast('New request from branch: ' + subject, 'info')`.
  - When a `request` status changes (approved/rejected) or `admin_response` is added for `branch`, trigger `showToast('Request update: ' + subject + ' - ' + status, 'info')`.
  - When a new `task` is assigned or new `announcement` is posted to `branch`, trigger `showToast('New Announcement: ' + title, 'info')`.
  - Call `window.checkNotifications?.(false)` to update notification badges and live counters.

#### [MODIFY] [app.js](file:///d:/v2%20BMS%20OFFICIAL/js/app.js)
- Enhance `checkNotifications` to handle notification state smoothly without suppressing alerts on genuine new items.

---

### 4. Enhanced Toast Notification Engine
#### [MODIFY] [utils.js](file:///d:/v2%20BMS%20OFFICIAL/js/utils.js)
- Upgrade `showToast(message, type = 'info', customDuration = null)`:
  - Remove CSS text truncation (`truncate`).
  - Calculate dynamic duration based on message length: `const duration = customDuration || Math.max(4500, Math.min(14000, String(message).length * 65));`.
  - Wrap message in a scrollable, max-height container (`max-h-40 overflow-y-auto pr-1`).
  - Include an interactive close/dismiss button (`<button type="button" onclick="this.closest('.toast').remove()" ...><i data-lucide="x"></i></button>`).
  - Ensure icon sizing and alignment look crisp on all screens.

#### [MODIFY] [index.css](file:///d:/v2%20BMS%20OFFICIAL/css/index.css)
- Refine `.toast` styling to support rounded-2xl modern card design, proper scrollbar aesthetics for long notifications, and responsive max-width on mobile and desktop.

---

## Verification Plan

### Automated Verification
- Run `npm run build` to verify Vite bundle compiles with 0 errors.

### Manual Verification
1. **Branch Targets**: Log into branch dashboard and verify target progress bar displays owner-assigned target revenue.
2. **Branch Requests**: Open My Requests in branch view, confirm default filter is "All Requests" and sent requests appear immediately.
3. **Realtime Notifications**: Trigger an action (or request) and verify instant toast popup appears for the recipient and notification count increments.
4. **Enhanced Toast UI**: Trigger long messages / notifications; verify toast shows full text, scrolls if very long, stays visible appropriately long, and can be immediately dismissed by clicking the close (`×`) button.
