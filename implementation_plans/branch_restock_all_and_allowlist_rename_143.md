# Branch Restock All & Allowlist Rename Implementation Plan (143)

## Problem & Feature Description
1. **Batch Restock All:** In the Branch Details inventory modal (`#owner` / `#branch`), when a user configures restock quantities for more than one item, a prominent "Restock All" button should appear in the fixed bottom navigation next to the delete button, allowing them to apply replenishment for all staged items simultaneously.
2. **Rename to Allowlist:** Rename all references of "Branch Preferences & Allowlist" / "Branch Preferences" to simply "Allowlist" across the UI and i18n dictionaries.

## Proposed Changes
1. **i18n Dictionaries (`js/i18n.js`):**
   - Update `branch_prefs_save_first` to `"Allowlist (Save first)"`.
   - Add/update `branch_prefs_allowlist`, `allowlist`, and `branch_preferences` to `"Allowlist"`.

2. **Branch Details Modal & Bottom Navigation (`js/modals.js`):**
   - Update bottom nav button from "Branch Preferences & Allowlist" to "Allowlist".
   - Add `#branchDetailsRestockAllBtn` next to the delete button in the modal bottom navigation bar (hidden by default).
   - In `renderBranchDetailsTable()`, bind `oninput` and stepper updates to maintain `window._branchStagedRestocks`.
   - Implement `window.updateBranchRestockAllVisibility()`: reveals `#branchDetailsRestockAllBtn` with count when staged items `> 1`.
   - Implement `window.applyBranchDetailsRestockAll()`: executes batch quantity updates across Supabase, records ledger entries, updates KPI stat metrics, refreshes card table, and displays confirmation toast.
   - Update individual `applyBranchItemQuickRestock()` to clean up staged entries and update button visibility.
   - Rename header in `branchPreferences` modal case to "Allowlist".

3. **Build & Verification:**
   - Verify build with `npm run build`.
   - Update `Chat_History/chat_history.txt`.
