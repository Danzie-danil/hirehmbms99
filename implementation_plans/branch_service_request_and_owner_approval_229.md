# Implementation Plan: Branch Service Request & Owner Approval Architecture (#branch, #owner, #inventory)

## Executive Summary
Currently, the branch "Add / Request Item" modal (`addInventoryItem` in `js/modals.js`) is tailored predominantly for physical stock items. Although an "Item Type" toggle exists, selecting **Service / Offering** still displays stock-oriented fields (SKU, wholesale price, retail price split, etc.), and when submitted for approval, generates an inappropriate message:
`"Requesting to add 0 units of [Name].Supplier: null. Total Cost Basis: TSh 0"`

This plan establishes a clear separation between **Physical Products** and **Services** across the Branch Request modal, the Request submission payload, the Owner Approval processing, and the Branch Request Edit workflow.

---

## User Review Required
> [!IMPORTANT]
> - **Product workflows remain 100% untouched**: Physical products will retain SKU, Category, Supplier, Quantity, Unit Cost, Wholesale Price (JML), Retail Price (RTL), and Min Alert Threshold.
> - **Service workflows will strictly streamline**: Services will present only **Service Name**, **Service Cost** (Direct expense/consumables), and **Service Price** (Charged to customer), along with Category defaulting to "Services".
> - **No Inventory Purchases on Service Approval**: When an owner approves a service request, the service is registered in branch inventory with `item_type: 'service'`, but `dbInventoryPurchases.add()` is bypassed because services do not constitute physical inventory re-stocking or supplier shipments.

---

## Key Architecture & Proposed Changes

### 1. Branch Add / Request Modal (`js/modals.js`)
- **Form UI Adaptation**:
  - Update `addInventoryItem` modal template to structure pricing into distinct views:
    - When `Physical Product` is selected: Show Supplier, Quantity, Unit Cost, Wholesale (JML), Retail (RTL), Min Alert Threshold, and SKU.
    - When `Service / Offering` is selected: Hide SKU container (`#itemSkuContainer`), hide Supplier container (`#itemSupplierContainer`), hide Quantity container (`#itemQtyContainer`), hide Min Threshold container (`#itemMinThresholdContainer`), hide Wholesale / Retail explanation card (`#itemWholesaleRetailHelp`).
    - Expand Service Price input to full width with clear label: `Service Price (Charged to Customer)`.
    - Label cost input as `Service Cost (Direct expense / consumables, optional)`.
  - Header & Action Button dynamic labeling:
    - For Service: Change modal title to `"Add New Service"` / `"Request New Service"`, and submit button to `"Add Service"` / `"Submit Service Request"`.
    - For Product: Change modal title to `"Add New Stock"` / `"Request New Stock"`, and submit button to `"Add to Inventory"` / `"Submit for Approval"`.
- **Dynamic Toggle Handler (`window.toggleBranchAddInvType`)**:
  - Enhance toggling logic to hide/show SKU, adjust category grid layout, toggle wholesale price container vs unified service price container, and update header/button texts seamlessly without flickering.
- **Request Generation & Submission (`window.handleAddInventoryItem`)**:
  - If `itemType === 'service'`:
    - Generate auto-SKU behind the scenes (`SVC-...`) for system and POS indexing.
    - Format Subject: `New Service Request: ${itemData.name}`.
    - Format Message: `Requesting to add service: ${itemData.name}. Service Price: ${fmt.currency(itemData.price)}. Service Cost: ${fmt.currency(itemData.cost_price || 0)}.`
    - Set `metadata`:
      `{ name, item_type: 'service', price, retail_price: price, wholesale_price: price, cost_price, quantity: 0, min_threshold: 0, sku, category: category || 'Services', supplier: null, is_isolated: false, isolation_status: 'unregistered' }`
  - If `itemType === 'product'`:
    - Preserve exact existing payload, message, and subject unchanged.

### 2. Owner Requests Processing & Display (`js/owner/requests.js`)
- **Request Card Presentation**:
  - Detect service requests (`req.metadata?.item_type === 'service'` or subject `New Service Request:`).
  - Render with service badge & icon (`wrench` / `briefcase` in indigo/blue theme instead of package icon).
  - Display metrics grid for Service:
    - **Service Price**: `fmt.currency(req.metadata.price || req.metadata.retail_price)`
    - **Service Cost**: `fmt.currency(req.metadata.cost_price || 0)`
    - **Category**: `req.metadata.category || 'Services'`
  - Exclude all stock units, 0 count, and null supplier references.
- **Approval Execution (`handleRequestAction`)**:
  - When approving `inventory_add` with `req.metadata.item_type === 'service'`:
    - Call `dbInventory.add(req.branch_id, { ... })` with `item_type: 'service'`.
    - **Skip `dbInventoryPurchases.add()`** (no physical stock purchase created).
    - Dispatch activity: `window.addActivity('service', 'Approved service: ' + name, branchName, price)`.

### 3. Branch Request View & Editing (`js/branch/requests.js` & `js/modals.js`)
- **Edit Modal (`editInventoryAddRequest`)**:
  - Check if `meta.item_type === 'service'`:
    - Display dedicated service edit layout: Service Name, Service Cost, Service Price, Category.
    - Hide SKU, Supplier, Quantity, and Min Alert Threshold.
  - In `handleEditInventoryAddRequest`:
    - If `meta.item_type === 'service'`, save updated subject as `New Service Request: ${name} (Updated)` and message as `Requesting to add service: ${name}. Service Price: ${fmt.currency(price)}. Service Cost: ${fmt.currency(cost_price)}.`.

---

## Verification Plan
1. **Branch UI Verification**:
   - Open Branch "Add Inventory Item" modal.
   - Verify that toggling between "Physical Product" and "Service / Offering" dynamically shows/hides SKU, Supplier, Qty, Wholesale/Retail, and Min Threshold.
   - Verify that for Service, only Service Name, Service Cost, Service Price, and Category are displayed.
2. **Submission Verification**:
   - Submit a Service Request as Branch.
   - Verify request created in Branch Requests list displays `New Service Request: [Name]` and clean message without "0 units" or "Supplier: null".
3. **Owner Approval Verification**:
   - Open Owner Requests list.
   - Verify the request displays service icon, price, and cost with no stock units or supplier.
   - Approve the service request and verify:
     - Service is added to branch inventory with `item_type: 'service'`.
     - No bogus record is inserted into `inventory_purchases`.
4. **Product Verification**:
   - Submit a Physical Product request.
   - Verify that product requests continue to function identically with SKU, Supplier, Quantity, Wholesale/Retail prices, and purchase logging upon approval.
5. **Code Quality & Build**:
   - Run `node scripts/lint_check.cjs` to confirm 0 lint errors.
   - Run `npm run build` to verify production bundle build.
