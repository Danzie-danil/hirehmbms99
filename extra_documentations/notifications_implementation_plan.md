# Implementation Plan - Comprehensive Notification Engine & Event System Upgrade

Upgrade the BMSTz Notification System into an intelligent, multi-channel, real-time notification engine. This plan addresses current gaps, expands notification triggers across all business operations, and introduces a modern Notification Center with categorized filtering, audio settings, and actionable event cards.

---

## Technical Audit & Identified Gaps

### Current Architecture Limitations
1. **Synthetic & Scatter-Query Generation**: Notifications are dynamically synthesized at runtime by querying 9 separate tables (`access_requests`, `requests`, `task_comments`, `stock_transfers`, `product_returns`, `tasks`, `inventory`, `shifts`, `announcements`).
2. **Missing Key Operational Events**:
   - Zero-stock (out-of-stock) critical alerts.
   - High-value sales and high-expense threshold warnings.
   - Shift summary submissions from branch managers.
   - Quotation acceptances and PO delivery updates.
   - Subscription / trial expiration warnings.
3. **UI Deficiencies**:
   - No category tabs (`All`, `Unread`, `Approvals`, `Inventory`, `Tasks`) in the notification drawer.
   - No sound/mute toggle for notification audio alerts.
   - Unformatted/cramped notification cards on mobile.

---

## User Review Required

> [!IMPORTANT]
> **Proposed Notification Triggers Coverage**:
> The upgraded engine will monitor and alert users across **14 distinct event types**:
> 1. **Access & PIN Resets** (`Urgent`) - Branch manager PIN reset requests.
> 2. **Operational Approvals** (`High`) - Stock request & custom discount approvals.
> 3. **Approval Responses** (`High`) - Owner response to branch requests.
> 4. **Low Stock Warnings** (`High`) - Items falling below minimum threshold.
> 5. **Out of Stock Alerts** (`Urgent`) - Items reaching 0 quantity.
> 6. **Task Assignments** (`Normal`) - New tasks assigned to branch staff.
> 7. **Task Overdue Warnings** (`High`) - Tasks exceeding deadline.
> 8. **Task Comment Replies** (`Normal`) - Messages exchanged on tasks.
> 9. **Stock Transfer Requests & Status** (`Normal`) - Inter-branch stock transfers.
> 10. **Product Return Filings & Status** (`Normal`) - Customer return processing.
> 11. **Shift Summary Submissions** (`Normal`) - Manager end-of-shift reporting.
> 12. **High-Value Sales** (`Info`) - Large sales exceeding owner threshold.
> 13. **Announcements & Broadcasts** (`Normal`) - Enterprise broadcast notices.
> 14. **System Maintenance & Plan Expiry** (`High`) - Subscription/plan warnings.

---

## Proposed Technical Changes

### Core System Modules

---

#### [MODIFY] [js/notifications.js](file:///d:/v2%20BMS%20OFFICIAL/js/notifications.js)
- Enhance `buildNotifItem` to support urgency styling (`urgent`, `high`, `normal`, `info`), category tags, and action buttons.
- Add sound effect preference management (`state.notifSoundMuted`).
- Optimize swipe-to-read touch gestures for mobile devices.

#### [MODIFY] [js/app.js](file:///d:/v2%20BMS%20OFFICIAL/js/app.js)
- Upgrade `checkNotifications()` and `showNotifications()` to aggregate all 14 notification event types.
- Add category filter tabs (`All`, `Unread`, `Approvals`, `Inventory`, `Tasks`) inside `#notifContent`.
- Add notification mute/unmute audio toggle in the Notification Panel header.
- Implement rich, actionable event cards with direct navigation triggers (`switchView(...)`).

#### [MODIFY] [js/realtime.js](file:///d:/v2%20BMS%20OFFICIAL/js/realtime.js)
- Expand Supabase Postgres Realtime event listeners for instant `< 100ms` notification delivery on shift summaries, sales, and task comments.

---

## Verification Plan

### Automated Tests
- Build verification via `npm run build`.

### Manual Verification
- Test notification drawer opening and category tab filtering (`All`, `Unread`, `Approvals`, `Inventory`, `Tasks`).
- Test marking individual notifications as read and "Mark All Read".
- Test audio notification sound and mute toggle.
- Verify mobile touch swipe-to-read gesture.
