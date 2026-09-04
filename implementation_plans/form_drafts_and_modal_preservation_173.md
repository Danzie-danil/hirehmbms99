# Implementation Plan: Form Draft Auto-Save to IndexedDB & Full State/Modal Preservation on Refresh (173)

## 1. Problem & Context
The user requested:
1. **Preserve Current Page, Navigation, Modal, and Context on Every Refresh**: Ensure that after every refresh (or inactivity resume), the user stays exactly on their active view and if a modal (e.g. Add Sale, Add Stock, Add Expense, Add Customer, Central Item modal) was open, it is automatically restored without kicking the user out.
2. **Draft Auto-Save to IndexedDB (Dexie)**: Auto-save form field inputs (Add Sale, Add Stock, Add Service, Add Expense, Add Customer, etc.) to a local IndexedDB table (`localDb.form_drafts`) as the user types. If the app refreshes while the user is filling out a form, their entered fields will not be wiped out. Drafts are stored purely in local IndexedDB (not cloud). When the form is submitted or explicitly canceled, the draft is cleanly cleared.
3. **Extend Inactivity Threshold**: Update the inactivity timer threshold from 5 minutes to **10 minutes** (`INACTIVITY_LIMIT_MS = 10 * 60 * 1000`).

---

## 2. Proposed Changes

### A. IndexedDB Schema Upgrade (`js/data/db.js`)
- Add schema version 7 to `BMSTZ_LocalDB`:
  ```javascript
  localDb.version(7).stores({
      ...allVersion6Stores,
      form_drafts: 'form_id, user_id, updated_at'
  });
  ```
- Export local draft management helpers:
  - `saveFormDraft(formId, fieldData)`
  - `getFormDraft(formId)`
  - `clearFormDraft(formId)`

### B. Global Form Draft Auto-Saver & Field Hydration (`js/utils.js`)
- Attach automatic input listeners inside `openModal` and modal form containers:
  - Whenever an `input` or `change` event occurs within a modal form, debounce (300ms) and persist the current field key-values into `localDb.form_drafts`.
  - On `openModal`, check `localDb.form_drafts.get(modalType)` and restore the saved input values into the DOM elements (inputs, select pickers, textareas, radio buttons).
  - Clear the draft when `handle*` submission succeeds or when `closeModal()` / Cancel is executed.

### C. Active Modal & Navigation State Preservation (`js/utils.js` & `js/app.js`)
- Expand `sessionStorage.setItem('bms_active_modal', ...)` to track **all** modal types (not just `*Details`), along with `activeView` and context.
- During `restoreActiveDetailsModal` / app boot in `js/app.js` and `js/ui/dashboardView.js`, check and seamlessly reopen the active modal with its restored draft inputs.

### D. Inactivity Threshold Extension (`js/inactivityManager.js`)
- Update `INACTIVITY_LIMIT_MS = 10 * 60 * 1000` (10 minutes).

---

## 3. Verification Plan
1. Open "Add Sale" or "Add Expense", fill in customer, items, and amount.
2. Trigger refresh (or inactivity resume) and verify:
   - The user remains on the exact same view.
   - The modal reopens automatically.
   - All entered form fields are restored from IndexedDB without data loss.
3. Submit the form and verify the draft is cleanly cleared from `localDb.form_drafts`.
4. Run `npm run build` and ensure 0 errors.
