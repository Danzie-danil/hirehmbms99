# Restrict Branch Stock & Item Editing Permissions (#branch, #global)

## Overview
Branch accounts currently have access to editing inventory items (names, SKUs, categories, retail/wholesale prices, cost basis, min threshold), directly altering stock quantities (Direct Restock / Direct In / CSV Import), and deleting catalog items. 

In the BMS multi-tenant architecture, product catalog items and master stock quantities are owned and governed by the Business Owner (Central HQ / Central Inventory). Branches must only view, search, select, and use stock/service items for POS billing, transactions, barcode scanning/label printing, and submitting restock/replenishment requests to the owner.

## Proposed Changes

### 1. Branch Inventory Module (`js/branch/inventory.js`)
- **Remove Direct Item Addition**: Remove the top header "Add Item" button (`openModal('addInventoryItem')`) from the Branch view.
- **Remove Bulk Deletion**: Remove the "Delete Selected" button (`btnBulkDeleteInventory`) and disable direct bulk deletion for branch accounts.
- **Remove Direct CSV Modifiers**: Disable direct stock CSV import (`importInventoryCSV`) and direct restock CSV batch modification (`importRestockCSV`) on the branch portal.
- **Update Branch Product Details Full-Page View (`openBranchProductDetailsView`)**:
  - Remove the "Edit Product" button from the bottom navigation footer.
  - Remove the "Direct In" restock button and "Delete Product" button from the Quick Item Controls card.
  - Retain authorized read & request actions:
    - POS Barcode & Label Studio (Download PNG, Print Label)
    - Sales Velocity & Transaction Movement Logs
    - Submit Restock Replenishment Request to Owner (`openRestockRequestView`)
    - Request Owner Attention (`openRequestModal`)
    - Organizational Tags (`openInventoryTagModal`)

### 2. Modals & Action Handlers (`js/modals.js`)
- **Inventory Details Modal (`inventoryDetails`)**:
  - Update action button grid: When viewed by a branch account (`state.role === 'branch'`), hide "Edit Product", "Restock Stock", and "Delete Product". Display "Request Restock", "Tags", and "Request Attention".
- **Edit Inventory Item Handler (`handleEditInventoryItem`)**:
  - Guard handler against branch invocation: If `state.role === 'branch'`, show toast "Branches are not authorized to edit stock items. Stock is managed by the business owner." and abort.
- **Restock & Add Handlers (`handleRestockStock`, `handleAddInventoryItem`)**:
  - Disallow direct database mutations (`dbInventory.add`, `dbInventory.updateQty`) from branch accounts, enforcing approval request workflows (`dbRequests.add`) to the Owner.

### 3. Utility Deletion & Permission Guards (`js/utils.js`)
- **`confirmDelete`**: Guard the `'inventory'` deletion case so branch users cannot delete inventory records.
- **`branchCanDo`**: Ensure `inventory_add` and `inventory_update` do not permit direct bypass of owner catalog controls.

---

## Verification Plan

### Automated Verification
- Run `npm run build` to ensure 0 bundling/compilation/syntax errors.

### Manual / Visual Verification
1. Inspect Branch Inventory page to verify:
   - Header shows "Stock Audit" without "Add Item" button.
   - Selection bar does not show "Delete Selected".
   - Product details view contains "Request Restock", "Print Label", "Download PNG", and "Request Attention", but no "Edit Product", "Direct In", or "Delete Product".
2. Verify that POS Billing (`sales.js`) continues to seamlessly search, load, and bill catalog items and services.
3. Verify that Restock Requests submit cleanly to the Owner's Requests inbox.
