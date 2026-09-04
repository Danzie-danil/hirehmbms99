# Implementation Plan: Real-time Branch Allowlist Sync & Missing ID Resolution (#192)

## Problem Overview
1. **Real-time Allowlist Desynchronization:**
   - When an Owner toggles and saves Allowlist preferences for a Branch in `js/modals.js` (`handleSaveBranchPreferences`), the mutation is saved in Supabase but is not broadcasted across the active WebSocket channel or reflected live on open Branch and Owner UIs.
   - When a Branch is simultaneously online and viewing or opening action forms (Record Sale, Add Expense, Add Stock, Add Customer), their UI does not update dynamically between **"Direct Record"** and **"Request Approval"** until a full reload occurs.
   - If co-owners or multi-tab owners have the Allowlist modal open, the toggles do not reflect live cloud changes in real time.

2. **"Missing Column ID" / Branch ID Resolution Error:**
   - In some modules (such as staff assignment, shift scheduling, or modal triggers), branch objects pass `branch_id` instead of `id` (or nested structures).
   - In `openBranchPreferencesModal` and `handleSaveBranchPreferences`, if `branchData.id` is undefined while `branchData.branch_id` exists, it triggers an invalid reference warning or schema failure when trying to update/query by ID.

---

## Proposed Technical Solution

### 1. Robust Branch Reference Resolver (`js/modals.js`, `js/db.js`)
- Support flexible branch identification: `const branchId = branchData.id || branchData.branch_id || (typeof branchData === 'string' ? branchData : null);`
- In `dbBranches.updatePreferences`:
  - Execute safe update on `branches` table by `id`.
  - Mirror updated preferences to local Dexie IndexedDB cache (`upsertLocalItem('branches', ...)`).
  - Broadcast realtime mutation trigger via `window.broadcastDataMutation('branches', 'UPDATE', { id: branchId, preferences })`.

### 2. Real-time Allowlist Listener & Live UI Reactive Updater (`js/realtime.js`, `js/utils.js`, `js/modals.js`)
- In `js/realtime.js`:
  - When a `branches` UPDATE event occurs:
    - **For Branch user:** If `payload.new.id === state.branchId`, update `state.branchProfile.preferences = payload.new.preferences`, update local session cache, and call `window.updateActiveModalAllowlistUI?.()` to re-render open modal headers, badges, and submit button labels (e.g. dynamically flipping between "Record Expense" and "Request Expense Approval") without closing the user's active form!
    - **For Owner user:** Update `state.branches`. If the `branchPreferences` modal is open for `payload.new.id`, dynamically flip the toggle states, ARIA attributes, and badges in real-time.
