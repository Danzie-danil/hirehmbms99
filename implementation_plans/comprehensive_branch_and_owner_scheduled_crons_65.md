# Implementation Plan - Comprehensive Branch & Owner Scheduled Push Notification Crons

> [!IMPORTANT]
> **Plan ID**: `comprehensive_branch_and_owner_scheduled_crons_65`
> **Objective**: Expand the scheduled push notification engine with comprehensive, role-specific daily business routines for both **Branch Staff / Cashiers** and **Business Owners** based on BMSTz core operations.

---

## 1. User Voice Directive (Exact Transcript)
> *"Yeah, before we do that, let's add a bit a few more cron jobs. One for branch, let us add the following cron jobs:
> - A cron job for a reminder to close the daily till, and one in the morning for opening.
> - A reminder to submit the, you know, daily work.
> - A reminder to review daily tasks set by the owner, if any.
> - And for the owner, a reminder to check the summary, I think we've already done that.
> - A reminder to... Okay, I'm running out of words. Can you like come up with a few based on our app structure?"*

---

## 2. Notification Schedule Matrix by Role

### A. Branch Staff & Cashiers (Operational Cadence)

| Schedule (EAT / UTC) | Slot Identifier | Notification Title & Message | Target App View |
| :--- | :--- | :--- | :--- |
| **07:00 EAT** (04:00 UTC) | `branch_shift_open` | **Shift & Till Opening ☀️**: "Good morning! Time to open your morning shift and verify opening cash drawer balance." | `/app/#view=cash_drawer` |
| **08:00 EAT** (05:00 UTC) | `branch_tasks_check` | **Daily Tasks Check 📋**: "Review today's assigned tasks and performance targets set by management." | `/app/#view=tasks` |
| **14:00 EAT** (11:00 UTC) | `branch_midday_restock` | **Stock Check & Restock 📦**: "Midday check: Inspect fast-moving inventory and submit branch restock requests if running low." | `/app/#view=requests` |
| **20:00 EAT** (17:00 UTC) | `branch_shift_close` | **Shift Closing & Till Reconciliation 🔔**: "Time to count cash drawer, reconcile sales, and close your daily shift." | `/app/#view=cash_drawer` |
| **21:00 EAT** (18:00 UTC) | `branch_daily_report` | **Daily Work Handover 📝**: "Confirm that daily sales, recorded expenses, and shift summaries have been submitted." | `/app/#view=shift_summary` |

---

### B. Business Owners (Executive Management Cadence)

| Schedule (EAT / UTC) | Slot Identifier | Notification Title & Message | Target App View |
| :--- | :--- | :--- | :--- |
| **07:30 EAT** (04:30 UTC) | `owner_morning` | **Morning Operations Briefing ☀️**: "Opening readiness: Check branch opening status, staff attendance, and pending approvals." | `/app/#view=overview` |
| **09:00 EAT** (06:00 UTC) | `owner_credit_followup` | **Credit & Debtor Follow-up 💰**: "Review overdue customer credit balances and scheduled loan collections for today." | `/app/#view=customers` |
| **13:30 EAT** (10:30 UTC) | `owner_midday` | **Midday Business Pulse 📊**: "Track live gross sales, branch revenue rankings, and cashier transactions." | `/app/#view=sales` |
| **15:00 EAT** (12:00 UTC) | `owner_transfers_check` | **Restock & Transfers Review 🚚**: "Pending approvals: Review branch stock requests and central warehouse dispatches." | `/app/#view=requests` |
| **20:30 EAT** (17:30 UTC) | `owner_evening` | **Daily Revenue & Settlement 🌙**: "Review today's consolidated revenue, gross profit, and reconciled shift drawers." | `/app/#view=financial_reports` |

---

### C. System Sentinel Crons (Autonomous Background Evaluators)

| Schedule | Identifier | Purpose | Target |
| :--- | :--- | :--- | :--- |
| **Every 4 Hours** (`0 */4 * * *`) | `low_stock_sentinel` | Evaluates all catalogs against `min_threshold` and alerts owners/branches when items need reordering. | `/app/#view=central_inventory` |
| **22:30 EAT** (`30 19 * * *`) | `unclosed_shift_sentinel` | Detects shifts left unclosed after operating hours and alerts branch staff to reconcile. | `/app/#view=cash_drawer` |

---

## 3. Implementation Blueprint

### 1. [`api/crons/scheduled-notifications.js`](file:///d:/v2%20BMS%20OFFICIAL/api/crons/scheduled-notifications.js)
- Build a modular slot router that maps slot identifiers (`branch_shift_open`, `branch_tasks_check`, `owner_morning`, `owner_credit_followup`, `owner_midday`, `branch_midday_restock`, `owner_transfers_check`, `branch_shift_close`, `owner_evening`, `branch_daily_report`, `unclosed_shift_sentinel`) to targeted WebPush payloads and roles (`role = 'owner'` vs `role = 'branch'`).
- Build an automatic UTC hour detector so that generic cron triggers execute all appropriate notifications for that hour.

### 2. [`vercel.json`](file:///d:/v2%20BMS%20OFFICIAL/vercel.json)
- Add primary cron trigger paths for morning, midday, evening, and low stock sentinels.

---

## 4. Verification & Testing Plan
- Test each slot directly via browser URLs (`/api/crons/scheduled-notifications?slot=branch_shift_open`, `/api/crons/scheduled-notifications?slot=branch_shift_close`, etc.).
- Verify targeted delivery (Owner devices receive owner alerts, Branch devices receive branch shift alerts).
- Run `npm run build` to ensure 0 module errors.
