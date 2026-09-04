# Account Deletion, Active Subscription Handling & 30-Day Reactivation Window — Implementation Plan (89)

## 1. Overview & Business Requirements
When a Business Owner requests to delete their account:
1. **No Instant Hard-Loss**: Instead of immediate destructive deletion, the system places the account into a **30-Day Grace Period** (`deletion_requested` / `pending_deletion`).
2. **Active Subscription Handling**: If the user has an active paid subscription, recurring billing auto-cancellation is flagged, and the user is notified that the paid period will run out gracefully without further charges.
3. **Self-Service Reactivation**: If the owner signs in during the 30-day window, they see a dedicated reactivation prompt where they can cancel deletion with a single click and restore full access immediately.
4. **Permanent Purge**: Once the 30 days elapse without reactivation, a background/server procedure permanently purges or archives tenant data safely.

---

## 2. Server-Side Data Schema & Supabase RPCs
*(SQL provided as migration script for manual execution per workspace rules)*

### A. Database Columns on `public.profiles`
- `status`: `'active' | 'suspended' | 'deletion_requested' | 'deleted'`
- `deletion_scheduled_for`: `TIMESTAMPTZ` (set to `NOW() + INTERVAL '30 days'` on request)
- `deletion_reason`: `TEXT` (optional user-provided feedback)

### B. Supabase RPC Functions
1. `public.request_account_deletion(p_reason TEXT)`
   - Requires caller authentication (`auth.uid()`).
   - Sets `profiles.status = 'deletion_requested'`, `deletion_scheduled_for = NOW() + INTERVAL '30 days'`.
   - Flags sub-branches as temporarily disabled.
   - Logs an audit event in `sys_audit_logs`.
   - Returns scheduled deletion date and remaining days.

2. `public.cancel_account_deletion()`
   - Requires caller authentication (`auth.uid()`).
   - Resets `profiles.status = 'active'`, `deletion_scheduled_for = NULL`, `deletion_reason = NULL`.
   - Re-enables sub-branches.
   - Returns success status.

3. `public.purge_expired_deletion_accounts()`
   - Runs on schedule (or invoked by sysadmin maintenance watchdog).
   - Deletes/archives tenant records where `status = 'deletion_requested' AND deletion_scheduled_for <= NOW()`.

---

## 3. Frontend User Experience & Workflows

### A. Deletion Request in Settings (Danger Zone)
- Located in **Settings -> Security & Billing** under a clean "Danger Zone" card.
- Opens a confirmation modal:
  - Explains the **30-day recovery period**.
  - Outlines what happens to active staff/cashier access.
  - Outlines active subscription behavior (no further charges, access preserved until grace period ends).
  - Requires entering the owner's password or typing "DELETE".
- Upon confirmation: calls `request_account_deletion()`, displays confirmation toast, and signs the user out cleanly.

### B. Grace Period Login & Instant Reactivation
- In [`js/auth.js`](file:///d:/v2%20BMS%20OFFICIAL/js/auth.js), during login or optimistic restore:
  - If `profile.status === 'deletion_requested'` and `deletion_scheduled_for > NOW()`:
    - Renders a dedicated **Reactivation Modal / Banner**:
      > **Account Scheduled for Deletion**
      > Your account and all associated branch data are scheduled for permanent deletion on **[Formatted Date]** (*[X] days remaining*).
      > [ Cancel Deletion & Reactivate Account ] [ Sign Out ]
    - Clicking **"Reactivate Account"** calls `cancel_account_deletion()`, restores `state.profile.status = 'active'`, and smoothly enters the normal dashboard without data loss.

---

## 4. Files to Create / Modify
- **SQL Migration**: `sql_migrations/0002_account_deletion_grace_period_and_reactivation.sql`
- **Frontend Settings**: `js/owner/settings.js` (Danger zone deletion trigger)
- **Modal Engine**: `js/modals.js` (Account deletion confirmation & reactivation dialogs)
- **Auth Flow**: `js/auth.js` (Grace period detection & self-service reactivation interceptor)
- **Release Notes & Version Bump**: Sync to v3.6.7

---

## 5. Verification Plan
1. Request deletion as Owner -> verify 30-day scheduled timestamp and sign out.
2. Sign in as Owner during grace period -> verify Reactivation Modal renders with days countdown.
3. Click "Reactivate Account" -> verify account status resets to active and app loads normally.
4. Verify sub-branches cannot transact while deletion is pending.
