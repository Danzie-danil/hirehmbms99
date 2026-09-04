# Branch Permission Lockdown, Module Cleanup & Central Dispatch Precision (#branch, #owner, #global)

## Overview
This plan implements a comprehensive permission lockdown and module refinement across the Branch and Owner portals based on client feedback:
1. **Branch Stock & Item Editing Lockdown**: Branches cannot edit stock items, names, SKUs, categories, prices, or counts directly, nor delete or import items. Branches only view and use catalog items in POS sales and submit restock requests.
2. **Branch Staff Management Lockdown & Attendance Dropdown**: Branches cannot add or delete staff records (only Business Owners can register and assign staff). When marking attendance in the Branch portal, the staff input will load as a selectable dropdown of the owner's staff assigned to that branch.
3. **Branch Module Removals**: Completely remove `stock_transfers` (Stock Transfers), `loyalty` (Customer Loyalty & Rewards), and `loans` (Loans & Credit) from the Branch portal sidebar, command palette, and router.
4. **Owner Stock Dispatch Precision & Double-Dispatch Protection**: Root cause investigation showed that single-item dispatch lacked double-click / in-flight request debouncing and submit button locking, which allowed rapid consecutive RPC executions dispatching 2 units instead of 1. Added strict in-flight request locks, button disabling, and explicit integer count validation (`Math.max(1, Math.floor(qty))`).

---

## Proposed Changes

### 1. Branch Inventory Lockdown (`js/branch/inventory.js`, `js/modals.js`, `js/utils.js`)

#### [MODIFY] [inventory.js](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/branch/inventory.js)
- Remove top header "Add Item" button (`openModal('addInventoryItem')`).
- Remove "Delete Selected" button (`btnBulkDeleteInventory`) and bulk deletion logic.
- Disable direct CSV import (`importInventoryCSV`) and restock bulk CSV import (`importRestockCSV`).
- In `openBranchProductDetailsView`:
  - Remove "Edit Product" button from the bottom navigation footer.
  - Remove "Direct In" restock button and "Delete Product" button from Quick Item Controls.
  - Retain authorized read and request actions: Barcode & Label Studio (Download PNG, Print Label), Velocity logs, Tags modal, "Request Restock", and "Request Attention".

#### [MODIFY] [modals.js](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/modals.js)
- In `inventoryDetails` modal: When viewed by a branch account (`state.role === 'branch'`), hide "Edit Product", "Restock Stock", and "Delete Product". Display "Request Restock", "Tags", and "Request Attention".
- In `handleEditInventoryItem`: Add role guard blocking any update from `state.role === 'branch'`.
- In `handleAddInventoryItem` & `handleRestockStock`: Disallow direct mutation when called from a branch, ensuring any branch addition routes as an approval request to the owner.

#### [MODIFY] [utils.js](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/utils.js)
- In `confirmDelete`: Guard the `'inventory'` deletion case to reject branch deletions.
- In `branchCanDo`: Disallow `inventory_add` and `inventory_update` from bypassing owner catalog controls.

---

### 2. Branch Staff Restriction & Attendance Dropdown (`js/branch/staff.js`, `js/branch/attendance.js`)

#### [MODIFY] [staff.js](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/branch/staff.js)
- Remove "Add Staff" button from the branch staff view header.
- Remove bulk delete and delete staff action capabilities for branch accounts.
- Ensure branch view only displays staff records added/assigned by the owner for that branch.

#### [MODIFY] [attendance.js](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/branch/attendance.js)
- In `openAttendanceModal`:
  - Fetch active staff members registered for this branch (`dbStaff.fetchAll(state.branchId)`).
  - Replace the free-text `input id="attStaff"` with a searchable `renderPremiumSelect` dropdown containing the names of registered staff members.
  - If no staff records exist, display a helpful message: "No staff registered (contact business owner)".

---

### 3. Module Removals from Branch (`app/index.html`, `js/app.js`, `js/ui/globalNavigator.js`)

#### [MODIFY] [index.html](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/app/index.html)
- Inside `#branchNav`, remove the navigation buttons for:
  - `switchView('loans', this)` (Loans & Income)
  - `switchView('loyalty', this)` (Customer Loyalty)
  - `switchView('stock_transfers', this)` (Stock Transfers)

#### [MODIFY] [app.js](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/app.js)
- In `renderBranchView`, remove or redirect `loans`, `loyalty`, and `stock_transfers` cases so any direct switch defaults to `dashboard`.

#### [MODIFY] [globalNavigator.js](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/ui/globalNavigator.js)
- Remove `loyalty` and any direct transfer links from the Branch Command Palette entries.

---

### 4. Owner Stock Dispatch Precision & Anti-Double-Dispatch Guard (`js/owner/central_inventory.js`)

#### [MODIFY] [central_inventory.js](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/owner/central_inventory.js)
- **Root Cause Identified**: `submitDispatchStock` and `executeBatchDispatch` had no in-flight guard, debouncing, or immediate submit-button disabling. Rapid double-clicks triggered concurrent `dispatch_central_stock` RPCs, deducting and dispatching 2 units instead of 1.
- **Fix**:
  - Add in-flight locking state `window._isDispatchingStock` to prevent overlapping executions.
  - Disable submit buttons immediately upon submission and apply loading state.
  - Sanitize and enforce exact integer quantity: `const qty = Math.max(1, Math.floor(window.fmt.parseNumber(document.getElementById('dispatchQty').value || 0)));`.

---

## Verification Plan

### Automated Verification
- Run `npm run build` to verify clean compilation with 0 syntax or bundle errors.

### Manual Verification
1. **Branch Stock**: Open Branch Inventory; verify no "Add Item", no "Delete Selected", no "Edit Product", and no "Direct In" buttons. Verify POS billing continues to work smoothly.
2. **Branch Staff & Attendance**: Open Branch Staff; verify no "Add Staff" button. Open "Mark Attendance" modal; verify staff name is a selectable dropdown of branch staff.
3. **Branch Navigation**: Verify `#branchNav` does not show Stock Transfers, Loyalty, or Loans.
4. **Owner Dispatch**: Test single item dispatch and batch dispatch; confirm that selecting 1 unit dispatches exactly 1 unit without duplicate calls.
