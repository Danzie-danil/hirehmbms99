# Implementation Plan - Automated Scheduled & Activity-Driven Push Notification Engine

> [!IMPORTANT]
> **Plan ID**: `automated_scheduled_and_activity_push_notifications_64`
> **Objective**: Implement automated scheduled push notifications (Morning, Afternoon, Evening) and event-driven background notifications (Low Stock Alerts, Task Assignments, App Version Updates) delivered to devices even when the app is completely closed.

---

## 1. User Voice Directive (Exact Transcript)
> *"Okay there is a thing I want for us to implement right now and improve. We implemented push notifications, but I think we have not effectively implemented the scheduled push notifications. I need us to configure that well. I need us to have automatic push notifications to the user like in the morning, in the afternoon, and evening, and automatic push notifications based on user activity. Let's say if they have low stock, they can receive that automatic push notification even when they haven't opened the app. Let's say the owner assigns a new task for the day, the branches can receive a push notification for that. Let's say there is an update, I mean an update for the app, the users can receive a push notification. Yes, so I want you to give me a proper implementation plan for this. And also this voice that I'm currently speaking to you, can you transcribe it and ensure to log it as my request in our history.txt file."*

---

## 2. Notification Streams & Triggers Architecture

```
                                    ┌──────────────────────────────────────────────────────────┐
                                    │               PUSH NOTIFICATION ENGINE                   │
                                    └────────────────────────────┬─────────────────────────────┘
                                                                 │
                  ┌──────────────────────────────────────────────┴──────────────────────────────────────────────┐
                  │                                                                                             │
                  ▼                                                                                             ▼
    ┌───────────────────────────┐                                                                 ┌───────────────────────────┐
    │  1. SCHEDULED CRON STREAM │                                                                 │ 2. EVENT-DRIVEN ACTIVITY  │
    └─────────────┬─────────────┘                                                                 └─────────────┬─────────────┘
                  │                                                                                             │
        ┌─────────┼─────────┐                                                   ┌───────────────────────────────┼───────────────────────────────┐
        ▼         ▼         ▼                                                   ▼                               ▼                               ▼
     Morning  Afternoon  Evening                                            Low Stock Alert              New Task Assigned               App Version Update
    (07:30)   (13:30)    (20:30)                                         (Realtime Stock Check)       (Owner -> Branch Staff)       (Auto-Push on Release)
```

---

## 3. Detailed Specifications by Notification Stream

### A. Scheduled Cron Push Notifications (3x Daily)
Configured via Vercel Cron (`vercel.json`) and routed through `/api/crons/scheduled-notifications`:

1. **Morning Briefing (07:30 EAT / 04:30 UTC)**:
   - **Target**: Business Owners & Branch Managers.
   - **Content**: Summary of active branch status, pending tasks due today, opening stock readiness.
   - *Example*: *"Good morning! ☀️ You have 3 tasks due today across 2 branches. All systems ready for trade."*

2. **Midday Performance Pulse (13:30 EAT / 10:30 UTC)**:
   - **Target**: Business Owners & Branch Managers.
   - **Content**: Midday sales volume, top-performing product, and active shift cash totals.
   - *Example*: *"Midday Check-in 📊 Total sales reached TSh 450,000 across branches. Top seller: Product X."*

3. **Evening Settlement & Daily Closing (20:30 EAT / 17:30 UTC)**:
   - **Target**: Business Owners.
   - **Content**: Full day revenue closure, pending restock orders, shift reconciliation status.
   - *Example*: *"Evening Summary 🌙 Today's revenue: TSh 1,280,000 across 4 shifts. All drawers reconciled."*

---

### B. Event-Driven Activity Push Notifications (Background & Offline Delivery)

1. **Automatic Low Stock & Reorder Alerts**:
   - **Trigger**: Runs during inventory deductions (sales, transfers, damages) and via periodic sentinel cron.
   - **Condition**: Available stock drops below `min_threshold` or reaches 0.
   - **Recipients**: Business Owner and the specific Branch Manager.
   - **Content**: *"⚠️ Low Stock Alert: [Product Name] has only [X] units remaining at [Branch Name]. Tap to restock."*

2. **New Task Assignment Notifications**:
   - **Trigger**: `INSERT` into `public.tasks` table when an Owner assigns a task to a branch or staff member.
   - **Condition**: Status is `pending`.
   - **Recipients**: Target Branch Manager and assigned staff device tokens.
   - **Content**: *"📋 New Task Assigned: [Task Title] - Due by [Deadline]. Tap to view details."*

3. **App Update & New Features Announcement**:
   - **Trigger**: Sysadmin or deployment version sync (`public.sys_settings.app_version`).
   - **Condition**: New `APP_VERSION` detected.
   - **Recipients**: All registered device tokens (`owners`, `branch managers`, `cashiers`).
   - **Content**: *"🚀 System Update Available (v3.0.x): New features & performance enhancements. Tap to refresh."*

---

## 4. Implementation Steps & Technical Changes

### Phase 1: Database & Backend Webhook Infrastructure
1. **Target Table Subscriptions**: Ensure `public.sys_push_subscriptions` records `owner_id`, `branch_id`, `role`, and `user_id` alongside `endpoint`, `p256dh`, and `auth` keys.
2. **Server-Side Push Dispatcher Helper** (`api/push/send-push-helper.js`):
   - Modular utility for dispatching Web Push payloads to target users, roles, or branch tokens with auto-pruning of expired `410 Gone` subscriptions.
3. **Database Stored Procedures**:
   - `get_owner_daily_summary(p_owner_id, p_time_of_day)`
   - `get_low_stock_items_for_notification()`

### Phase 2: Cron Scheduling (`vercel.json` & `/api/crons/`)
1. Update `vercel.json` with 3x daily schedule:
   ```json
   {
     "crons": [
       { "path": "/api/crons/scheduled-notifications?slot=morning", "schedule": "30 4 * * *" },
       { "path": "/api/crons/scheduled-notifications?slot=afternoon", "schedule": "30 10 * * *" },
       { "path": "/api/crons/scheduled-notifications?slot=evening", "schedule": "30 17 * * *" },
       { "path": "/api/crons/low-stock-alert", "schedule": "0 */4 * * *" }
     ]
   }
   ```
2. Update `/api/crons/scheduled-notifications.js` to dispatch actual Web Push notifications via `web-push` to all registered owner and manager devices based on the dynamic `slot` parameter.

### Phase 3: Event-Driven Hooks
1. **Task Assignment Hook**:
   - In `js/owner/tasks.js` or backend API, when a task is created, trigger `/api/push/task-alert` with `{ taskId, branchId, title, deadline }`.
2. **Low Stock Detection**:
   - Enhance `api/crons/low-stock-alert.js` to send targeted push messages for low/out-of-stock items.
3. **App Update Broadcaster**:
   - Hook into `scripts/push_update_notification.cjs` and `/api/push/send-update-notification.js` to broadcast instantly when a release occurs.

### Phase 4: Service Worker & Client Handling
1. In `public/sw.js`, handle incoming push payloads:
   - Display rich notifications with action buttons (e.g. *"View Task"*, *"Restock Now"*, *"Update"*).
   - Route notification clicks directly to the relevant view (`#view=tasks`, `#view=inventory`, `#view=overview`).

---

## 5. Verification & Testing Plan

### Automated & Manual Verification:
- **Test Endpoint**: Call `/api/crons/scheduled-notifications?slot=morning` with test auth token and verify push receipt on registered device.
- **Task Dispatch Test**: Create a task from Owner account and confirm instant push notification arrives on Branch terminal.
- **Low Stock Test**: Adjust inventory below threshold and verify background alert delivery.
- **Build Verification**: Run `npm run build` with 0 errors.
