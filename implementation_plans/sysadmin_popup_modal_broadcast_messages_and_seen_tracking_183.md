# Implementation Plan: Sysadmin Popup Modal Broadcast Messages & Seen Tracking Safeguard

## Overview
Empower the **System Administrator** (`#sysadmin`) to compose and broadcast **Interactive Popup Modal Messages** targeted to users across the platform (all users, business owners only, or branch staff only). 
Implement a **Zero-Repeat Seen Safeguard** ensuring that when a user closes, dismisses, reads, or clicks the action button on a modal message, it is permanently marked as seen for that user (`user_seen_modal_messages` + local storage cache) and **NEVER pops up again** on subsequent logins or app sessions.

---

## User Requirements & Core Safeguards:
1. **Modal Broadcast Creation in Sysadmin Portal:**
   - Sysadmins can compose modal messages with Title, Body (Markdown/Rich format), Message Type (`announcement`, `info`, `warning`, `feature`, `urgent`, `system_update`), Target Audience (`all`, `owners`, `branches`), CTA button text, and CTA link.
   - Real-time modal preview in the sysadmin composer before broadcasting.
   - Management table to view active modals, recipient reach stats, toggle active/inactive status, and delete messages.
2. **Permanent Seen Safeguard (Zero Repeats):**
   - Each modal message has a unique `id` (UUID).
   - When a targeted user encounters the modal, clicking **Close (X)**, **"Read" / "Got It"**, **Cancel**, **CTA Action**, or **Backdrop Click** immediately registers the message ID as seen for that user.
   - The seen state is written simultaneously to **IndexedDB/localStorage** (instant client safeguard) and synced to Supabase (`user_seen_modal_messages` table).
   - Once marked as seen, the modal message is permanently suppressed and will never display to that user again.
3. **Database Schema & SQL Migration:**
   - Provide standard SQL file in `supabase/sql_migrations/0001_create_admin_modal_messages_and_seen_tracking.sql` and corresponding single-run SQL file.
   - Define tables `admin_modal_messages` and `user_seen_modal_messages` with unique constraints and RLS policies.
4. **Offline-First Schema & Local Database Mirroring:**
   - Add stores to Dexie (`js/data/db.js`) and database helpers in `js/db.js`.
5. **Admin Release Notes Rule:**
   - User-facing release notes will state general system fixes and stability enhancements without exposing admin-specific terms.

---

## Proposed File Changes

### 1. Database Migrations (SQL)
- **[NEW]** [`supabase/sql_migrations/0001_create_admin_modal_messages_and_seen_tracking.sql`](file:///d:/V2BmstzOfficial/supabase/sql_migrations/0001_create_admin_modal_messages_and_seen_tracking.sql):
  - Table `admin_modal_messages` (id, title, body, type, target_audience, target_user_id, cta_text, cta_url, is_active, created_by, created_at, updated_at).
  - Table `user_seen_modal_messages` (id, user_id, modal_message_id, seen_at, action_taken, `UNIQUE(user_id, modal_message_id)`).
  - RPC `mark_modal_message_seen(p_modal_id uuid, p_action text)`.
  - RPC `fetch_active_unseen_modal_messages()`.
  - Row Level Security (RLS) policies for sysadmins and authenticated tenant users.
- **[NEW]** [`supabase/sql_migrations/0001_single_run_create_admin_modal_messages_and_seen_tracking.sql`](file:///d:/V2BmstzOfficial/supabase/sql_migrations/0001_single_run_create_admin_modal_messages_and_seen_tracking.sql).

### 2. Local Database & Repositories
- **[MODIFY]** [`js/data/db.js`](file:///d:/V2BmstzOfficial/js/data/db.js):
  - Add schema store definitions for `admin_modal_messages` and `user_seen_modal_messages` to Dexie.
- **[MODIFY]** [`js/db.js`](file:///d:/V2BmstzOfficial/js/db.js):
  - Add repository `dbModalMessages` with methods:
    - `fetchActiveForUser(role, userId)`
    - `fetchUnseen(role, userId)`
    - `markAsSeen(modalId, userId, action)`
    - `createModalMessage(payload)` (Sysadmin only)
    - `deleteModalMessage(id)` (Sysadmin only)
    - `toggleActive(id, isActive)` (Sysadmin only)

### 3. Client Modal Message Manager
- **[NEW]** [`js/ui/modalMessageManager.js`](file:///d:/V2BmstzOfficial/js/ui/modalMessageManager.js):
  - Auto-checks unseen active modal messages upon user login / hydration.
  - Displays high-aesthetic popup modal with custom theme styling based on message type.
  - Implements the complete Seen Guard: records seen status locally and remotely upon dismissal and closes cleanly.

### 4. Sysadmin Communications Suite
- **[MODIFY]** [`js/admin/communications.js`](file:///d:/V2BmstzOfficial/js/admin/communications.js):
  - Integrate "Popup Modal Broadcasts" section/tab in the Communications Hub.
  - Form controls for Modal Message creation with live visual mockup preview.
  - Active Modal Messages management table with reach stats, status toggles, and deletion.

### 5. App Lifecycle & Integration
- **[MODIFY]** [`js/app.js`](file:///d:/V2BmstzOfficial/js/app.js) & [`js/lifecycle.js`](file:///d:/V2BmstzOfficial/js/lifecycle.js):
  - Invoke `window.checkAndShowModalMessages()` on application session start.

---

## Verification Plan
1. **Lint Check:** Run `node scripts/lint_check.cjs` to confirm 0 errors.
2. **Production Build:** Run `npm run build` to verify clean bundle compilation.
3. **Modal Popup & Seen Guard Verification:**
   - Create test modal message targeted at Owners / All users.
   - Verify modal pops up for the targeted user with proper styling.
   - Dismiss modal (click Close, Read, or Cancel).
   - Reload page / switch views and confirm the modal NEVER appears again.
   - Check `user_seen_modal_messages` and local storage record.
4. **App Version & Chat History:** Bump version, update `release_notes.json` with user-friendly text, and update `Chat_History/chat_history.txt`.
