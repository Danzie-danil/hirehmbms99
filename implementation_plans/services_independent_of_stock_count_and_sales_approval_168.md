# Implementation Plan: Services Independent of Stock Count & Seamless Sale Approvals (168)

## 1. Overview & Goal
In BMSTz, **Services** (e.g. consultations, labor, repairs, installations) represent intangible offerings with unlimited availability. Unlike physical products, services:
- Must **never** be constrained or blocked by a 0 stock count.
- Must **never** trigger "Out of Stock" warnings or "Insufficient Stock" errors during POS checkout, single-item sales, or batch cart sales.
- Must **never** block an Owner from approving a branch sale request because of stock levels.
- Must **never** decrement inventory quantities or pollute physical stock movement ledgers.
- Must be excluded from low-stock alerts and physical inventory valuation totals.

## 2. Proposed Changes

### A. Database Migration (`supabase/migrations/0001_services_unbound_from_stock_count.sql`)
- Update `create_sale(...)` RPC:
  - Check `IF (v_inv.item_type IS DISTINCT FROM 'service') THEN` before validating `quantity >= p_qty` and before decrementing `inventory.quantity`.
  - When a service item is sold (`item_type = 'service'`), allow the sale to proceed without requiring stock > 0 and without decrementing stock count.

### B. Branch Sales & POS Validation (`js/modals.js` & `js/branch/sales.js`)
- Ensure single-item sale mode and multi-item cart mode explicitly tag `item_type: 'service'` when a service is selected.
- Confirm that 0-stock validation checks in `addSaleCartItem`, `handleAddSale`, and `updateSaleCartItemQty` skip services completely.
- In `handleAddSale`, pass `item_type: 'service'` in the sale request metadata so that owner approval requests preserve the service designation.

### C. Owner Request Approval (`js/owner/requests.js`)
- In `handleRequestAction`, when approving `sales_add` requests for services, verify that sales execute seamlessly without stock restrictions.
- Enrich the owner request card UI to display a clear `🛠️ Service Offering` badge for service sale requests.

### D. Inventory & Dashboard Metrics (`js/db.js` & `js/branch/inventory.js`)
- In `dbInventory.fetchLowStockCount` and `fetchAll({ lowStockOnly: true })`: filter out items with `item_type === 'service'` so 0-quantity services do not trigger false low-stock alarms.
- In `dbInventory.fetchTotalValue`: exclude services from physical stock valuation.

## 3. Verification Plan
1. Test single-item sale for a service with 0 stock count — verify it records immediately without errors.
2. Test batch cart sale containing both physical products and services.
3. Test branch submission of a service sale for owner approval, followed by owner approval.
4. Verify low-stock alert count and low-stock filter do not include services.
5. Run `npm run build` and verify 0 bundle errors.
