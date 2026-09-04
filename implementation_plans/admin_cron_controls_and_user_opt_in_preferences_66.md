# Implementation Plan - Admin Cron Job Master Toggles & User Granular Notification Preferences

> [!IMPORTANT]
> **Plan ID**: `admin_cron_controls_and_user_opt_in_preferences_66`
> **Objective**: 
> 1. Provide Sysadmins with granular master controls to enable/disable specific automated cron jobs globally with live test execution triggers.
> 2. Provide Business Owners and Branch Staff with category-specific opt-in / opt-out toggles in their Settings, reconciling preferences in real-time with Supabase so only permitted notifications are dispatched.

---

## 1. User Voice Directive (Exact Transcript)
> *"Okay, let us add the ability for the admin to enable and disable specific each cron job that we have set up. And also, let's add the ability for the users to opt out certain notifications. Add that for Owner notifications, they should have this in their Settings, as well as Branch, they should have this in their Settings, to opt in or out of notifications that they don't want. And each moment they update that settings, it should be, you know, reconciled with Supabase so that it can be verified whether to trigger the notification for that individual or not."*

---

## 2. System Architecture & Flow

```
                               ┌────────────────────────────────────────────────────────┐
                               │           SYSADMIN MASTER CRON CONTROLS                │
                               │ (Admin Portal -> Communications -> Scheduled Crons)    │
                               └──────────────────────────┬─────────────────────────────┘
                                                          │ Saves to public.sys_settings ('cron_job_settings')
                                                          ▼
                               ┌────────────────────────────────────────────────────────┐
                               │             SERVERLESS CRON DISPATCHER                 │
                               │      (/api/crons/scheduled-notifications & low-stock)  │
                               └──────────────────────────┬─────────────────────────────┘
                                                          │
                               ┌──────────────────────────┴──────────────────────────┐
                               │                                                     │
                               ▼                                                     ▼
                  [Check 1: Is Cron Globally Enabled?]                  [Check 2: Has User Opted In?]
                  - If disabled in sys_settings: Exit early            - Filter sys_push_subscriptions by
                                                                         sub.preferences[slot] !== false
                                                                                     │
                                                                                     ▼
                                                                     [Dispatch WebPush to Target Device]
```

---

## 3. Detailed Component Plan

### A. Database Layer (`public.sys_push_subscriptions` & `public.sys_settings`)
1. Add `preferences JSONB DEFAULT '{}'::jsonb` column to `public.sys_push_subscriptions`.
2. Seed initial default master settings in `public.sys_settings` under `cron_job_settings`.
3. Add RPC helper `update_device_notification_preferences(p_endpoint, p_preferences)` and `update_admin_cron_settings(p_settings)`.

### B. Admin Portal Interface (`js/admin/communications.js`)
1. Add a dedicated **"Scheduled Crons"** tab inside Admin Communications & Marketing.
2. Render card items for all 11+ cron streams:
   - **Branch Routines**: `branch_shift_open`, `branch_tasks_check`, `branch_midday_restock`, `branch_shift_close`, `branch_daily_report`, `unclosed_shift_check`.
   - **Owner Routines**: `owner_morning`, `owner_credit_followup`, `owner_midday`, `owner_transfers_check`, `owner_evening`.
   - **System Sentinels**: `low_stock_sentinel`.
3. Provide an instant toggle switch for each cron to enable/disable it globally.
4. Provide a **"Test Trigger"** button next to each cron for instant manual execution and feedback.

### C. User Settings Interface (`js/permissions.js`, `js/owner/settings.js`, `js/branch/settings.js`)
1. Expand `renderPushNotificationSettingsCard()` with an interactive **"Notification Category Preferences"** panel.
2. For **Owners**:
   - ☀️ Morning Business Briefing (Opening readiness, attendance)
   - 📊 Midday Gross Sales Pulse (Live revenue & transactions)
   - 🚚 Restock & Transfer Approvals (Branch requests & dispatches)
   - 💰 Credit & Loan Follow-up (Debtor balances)
   - 🌙 Evening Settlement Summary (Closing revenue & reconciled drawers)
   - ⚠️ Low Stock & Out-of-Stock Alerts (Inventory thresholds)
3. For **Branches**:
   - ☀️ Shift & Till Opening Reminder (Morning till count)
   - 📋 Daily Task & Objective Alerts (Manager task assignments)
   - 📦 Midday Stock Pulse (Restock requests)
   - 🔔 Shift Closing & Till Reconciliation (End of day till count)
   - 📝 Daily Work Handover Reminder (Expense & summary submission)
   - ⚠️ Low Stock Alerts (Branch inventory levels)
4. Whenever any switch is toggled, store in `localStorage` and immediately synchronize with Supabase `sys_push_subscriptions.preferences`.

### D. Serverless Dispatcher Enforcement (`api/crons/scheduled-notifications.js` & `api/crons/low-stock-alert.js`)
1. Before executing any slot, check master flag:
   ```javascript
   const masterSettings = await getAdminCronSettings(supabaseUrl, serviceKey);
   if (masterSettings[slot] === false) {
       return res.status(200).json({ success: true, slot, skipped: 'Disabled by admin' });
   }
   ```
2. When filtering subscribers:
   ```javascript
   const eligibleSubs = subscriptions.filter(sub => {
       const userPrefs = sub.preferences || {};
       return userPrefs[slot] !== false; // enabled by default unless explicitly opted out
   });
   ```

---

## 4. Verification & Testing Plan
- Test Sysadmin disabling `owner_midday` -> verify cron returns `skipped: 'Disabled by admin'`.
- Test User toggling OFF `branch_shift_open` -> trigger slot test URL -> confirm user device is omitted from delivered list.
- Run `npm run build` to verify 0 build errors.
