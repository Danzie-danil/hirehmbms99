# Implementation Plan: Service Cost & Price Unification (169)

## 1. Overview & Goal
Refactor Service pricing across the entire BMSTz platform (Central Inventory, Branch Inventory, POS single-item sales, and batch cart checkout) to eliminate wholesale/retail dual pricing for services.
A **Service** must strictly have:
- **Service Cost (Required)**: Direct operational cost to the business to execute the service (e.g. paper, ink, electricity, supplies).
- **Service Price (Required)**: Selling price / fee charged to the customer.

## 2. Proposed Changes

### A. Central Inventory Modal (`js/owner/central_inventory.js`)
- **Add Service Modal (`openCentralItemModal` & `toggleCentralItemType`)**:
  - Make `ciCostPrice` required with label: `"Service Direct Cost / Expenses (Paper, ink, electricity, etc.) *"`.
  - Make `ciRetailPrice` required with label: `"Service Price (Amount Charged to Customer) *"`.
  - Hide wholesale price container (`ciWholesaleContainer`) and disable/exempt `ciWholesalePrice` requirement when `item_type === 'service'`.
- **Edit Service Modal (`openEditCentralItemModal` & `updateCentralItem`)**:
  - Hide wholesale price container when editing a service.
  - Require Service Cost and Service Price.
  - Automatically set `wholesale_price = retail_price` in payloads for backwards database compatibility.

### B. Branch Inventory & Product Details (`js/branch/inventory.js`)
- **List / Card Views**:
  - For services, display `Service Cost: TZS ...` and `Service Price: TZS ...` badges instead of Wholesale/Retail (`JML`/`RTL`).
- **Product Details View (`openBranchProductDetailsView`)**:
  - For services, show `Service Price (Customer Charge)` and `Service Direct Cost (Expenses)` with net margin percentage. Hide the wholesale metric card.

### C. Sales & POS Checkout (`js/branch/sales.js` & `js/modals.js`)
- **Single-Item Sale Mode (`onSaleProductChange` in `sales.js`)**:
  - When a service is selected, hide the Wholesale price button (`ptWholesale`). Show `Service Price` and optional `Custom Price`.
- **Multi-Item Cart Mode (`renderSaleCartTable` in `modals.js`)**:
  - For service cart line items, hide the Retail/Wholesale segmented pill buttons and display a dedicated `Service Fee: TZS ...` pill.

## 3. Verification Plan
1. Open Add Stock Item modal, toggle to "Service / Offering" — verify Wholesale price and stock fields are hidden, and Service Cost and Service Price are displayed and required.
2. Save a service and edit it — verify only Cost and Price appear.
3. Check branch inventory list and product details for a service — verify clear "Service Cost" and "Service Price" labels without wholesale references.
4. Test Single-Item POS and Multi-Item Cart POS with a service — verify clean single-price UX.
5. Run `npm run build` and ensure 0 errors.
