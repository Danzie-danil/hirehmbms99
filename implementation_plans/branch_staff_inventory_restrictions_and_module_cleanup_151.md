# Implementation Plan: Branch Staff & Inventory Restrictions and Unused Module Cleanup (#branch)

## Problem & Background Context
In the multi-tenant architecture, branches (cashiers/branch managers) are operational units focused on daily point-of-sale (POS), billing, and local store operations. Currently:
1. **Branch Staff Management**: Branches have access to "Add Staff", "Edit Staff", and delete staff records. Branches should not be able to create, edit, or delete staff members; they must only view the staff roster assigned to them by the business owner and record attendance.
2. **Branch Inventory & Stock Operations**: Branches should not be able to directly modify master catalog data (such as product name, SKU, retail/wholesale prices, cost price, or manual stock quantity overrides). Branches must operate in a strictly read-only catalog mode for daily POS sales, with the ability to submit **Restock Requests** or **Stock Addition Requests** to the Owner for approval.
3. **Branch Navigation & Module Streamlining**: Unused modules that have no relevance to branch operations need to be removed from the branch interface:
   - **Loans & Income Module** (`loans`)
   - **Customer Loyalty Module** (`loyalty`)
   - **Stock Transfers Module** (`stock_transfers`)
   - **Suppliers Module** (`suppliers`) — *Optional/configurable based on user review*.

---

## User Review Required

> [!IMPORTANT]
> **Suppliers Module Decision**: In your voice message, you noted: *"as well as the Suppliers module - or you can leave the Suppliers module."*
> **Recommendation**: We recommend removing `suppliers` from the branch navigation sidebar because supplier vendor management, purchasing terms, and purchase orders are headquarters/owner-level responsibilities. The branch can still view item supplier metadata when requesting restocks if needed.

> [!NOTE]
> **Staff Attendance & Roster**: Branches will retain full ability to view the assigned roster and record daily attendance (`Attendance` module & `Record Attendance` quick action), while removing all staff creation, salary editing, and staff deletion capabilities.

---

## Proposed Changes

### 1. Branch Staff Management (`#branch`)

#### [MODIFY] [js/branch/staff.js](file:///D:/v2%20BMS%20OFFICIAL%20-%20Copy%20(2)/js/branch/staff.js)
- Remove `+ Add Staff` buttons (`openModal('addStaff')`) and owner restricted button from the branch header.
- Remove `openEditModal('editStaff')` click trigger from staff cards so clicking does not open staff editing.
- Remove bulk delete checkbox and delete buttons (`btnBulkDeleteStaff`, `bulkDeleteSelectedStaff`).
- Retain the clean personnel roster display (Name, Role, Contact info, Status) and the **Record Attendance** quick action.

---

### 2. Branch Inventory & Product Catalog Protection (`#branch`)

#### [MODIFY] [js/branch/inventory.js](file:///D:/v2%20BMS%20OFFICIAL%20-%20Copy%20(2)/js/branch/inventory.js)
- **Product Details Screen (`openBranchProductDetailsView`)**:
  - Remove the `Edit Product` button (`openEditModal('editInventoryItem')`).
  - Remove direct stock alteration buttons (`openModal('restockStock')` / `Direct In`) and delete triggers (`confirmDelete('inventory')`).
  - Keep the prominent **`Request Restock`** (`openRestockRequestView`) button, **`Print Label`**, **`Download PNG`**, barcode visualizer, technical specifications, and recent sales transaction history.
- **Main Catalog View**:
  - Remove `btnBulkDeleteInventory` and bulk deletion actions.
  - Ensure the `Add Item` flow submits a stock addition request to the owner for approval by default.
  - Remove direct CSV stock overwrite if necessary, preserving restock request workflows.

#### [MODIFY] [js/modals.js](file:///D:/v2%20BMS%20OFFICIAL%20-%20Copy%20(2)/js/modals.js)
- In `branchPreferences` modal: Remove `staff_add` and `loans_add` from allowlist toggles so branches cannot be given staff creation or loan creation permissions.
- In `handleEditInventoryItem`: Guard to ensure only `owner` or `sysadmin` roles can execute master product updates.

---

### 3. Branch Sidebar Navigation & Module Removal (`#branch`)

#### [MODIFY] [app/index.html](file:///D:/v2%20BMS%20OFFICIAL%20-%20Copy%20(2)/app/index.html)
- Remove the following buttons from `#branchNav`:
  - `Loans & Income` (`switchView('loans',this)`)
  - `Customer Loyalty` (`switchView('loyalty',this)`)
  - `Stock Transfers` (`switchView('stock_transfers',this)`)
  - `Suppliers & POs` (`switchView('suppliers',this)`) *(Per recommendation)*

#### [MODIFY] [js/app.js](file:///D:/v2%20BMS%20OFFICIAL%20-%20Copy%20(2)/js/app.js)
- In `switchView()` branch role router: Redirect any legacy/stale URL navigations for `loans`, `loyalty`, `stock_transfers`, or `suppliers` to `dashboard` or authorized modules.
- Clean up any branch notification clicks pointing to removed branch routes.

#### [MODIFY] [js/ui/globalNavigator.js](file:///D:/v2%20BMS%20OFFICIAL%20-%20Copy%20(2)/js/ui/globalNavigator.js)
- Remove `loans`, `loyalty`, and `stock_transfers` items from the Branch Command Palette index.

---

## Verification Plan

### Automated Build Verification
```powershell
npm run build
```
- Verify 0 lint errors, 0 compilation warnings, and clean bundle generation.

### Manual / Browser Verification
1. **Branch Staff Verification**:
   - Log in as a Branch user.
   - Navigate to **Staff & HR**.
   - Verify no "+ Add Staff" or delete buttons exist.
   - Verify staff cards cannot be clicked to edit salaries or roles.
   - Verify "Record Attendance" works seamlessly.
2. **Branch Inventory Verification**:
   - Navigate to **Inventory**.
   - Click on any product to open the Product Details view.
   - Verify there is NO "Edit Product", "Direct In", or "Delete" button.
   - Verify "Request Restock" button is present and functional.
   - Verify POS sales and item checkout operate normally with the inventory items.
3. **Branch Navigation Verification**:
   - Verify sidebar does not contain Loans, Loyalty, Stock Transfers, or Suppliers.
   - Verify dashboard and other operational views render cleanly without broken links.
