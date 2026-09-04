# Implementation Plan: Central Inventory Dedicated Restock Interface (#owner)

## Overview & Goal
Add a dedicated, comprehensive **Restock Interface** in **Central Inventory** (`#owner` portal). This allows business owners to easily restock existing products into the Main Store / Central Warehouse, specify restock quantity, unit purchase costs, supplier details, invoice/delivery references, and optionally deduct payments from capital accounts.

---

## User Review Required

> [!IMPORTANT]
> **Key Design Decisions for Owner Review:**
> 1. **Access Points:**
>    - **Top Action Bar:** Add a dedicated **`+ Restock Stock`** button next to *"Central Dispatch"* and *"Purchase & Add Stock"*.
>    - **Table Row Action:** Add a dedicated **`Restock`** button on each product row (between *Dispatch* and *Edit*).
>    - **Mobile Card Action:** Add a quick **`Restock`** button in the mobile cards bottom actions.
> 2. **Financial & Accounting Integration:**
>    - **Buying Cost:** Pre-fills with the item's current cost price; owner can update it if current shipment cost changed.
>    - **Supplier:** Searchable dropdown populated from registered suppliers (`dbSuppliers`), with a quick "+ New Supplier" shortcut.
>    - **Payment Source (Optional):** Owner can optionally select a Capital/Cash Account (`dbCapital`) to automatically log the purchase expense in the company's financial records.
>    - **Audit Trail:** Automatically records a verified movement entry in `stock_movements` (type: `'purchase'` / `'restock'`).

---

## Proposed Changes

### Component 1: Central Inventory UI & Restock Modal (`js/owner/central_inventory.js`)

#### [MODIFY] [js/owner/central_inventory.js](file:///d:/v2%20BMS%20OFFICIAL/js/owner/central_inventory.js)
1. **Header Action Bar ([lines 442-458](file:///d:/v2%20BMS%20OFFICIAL/js/owner/central_inventory.js#L442-L458)):**
   - Add a dedicated **`+ Restock Stock`** button:
     ```html
     <button onclick="window.openCentralRestockModal()" data-tooltip="Replenish stock for existing catalog products" data-tooltip-title="Restock Inventory" data-tooltip-variant="indigo" class="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all cursor-pointer shadow-xs">
         <i data-lucide="package-plus" class="w-3.5 h-3.5"></i>
         <span>Restock Stock</span>
     </button>
     ```
2. **Table Rows & Mobile Cards ([lines 1309-1320](file:///d:/v2%20BMS%20OFFICIAL/js/owner/central_inventory.js#L1309-L1320), [lines 1464-1476](file:///d:/v2%20BMS%20OFFICIAL/js/owner/central_inventory.js#L1464-L1476)):**
   - In desktop table row actions: Add a direct `Restock` button (`onclick="window.openCentralRestockModal('${i.id}')"`).
   - In mobile product cards: Add a direct `Restock` pill button.
3. **Dedicated Restock Modal Component (`window.openCentralRestockModal(preselectedItemId)`):**
   - **Product Selector:** If opened from top bar, displays a searchable product selector (autocomplete/select). If opened from a row, locks onto that product with its current HQ stock, SKU, and category preview.
   - **Current Stock & Restock Quantity:**
     - Displays `Current Main Store Stock: X units`
     - Input for `Quantity to Add (+ units)` with live calculation showing `New Stock = Current + Added`.
   - **Cost & Financial Breakdown:**
     - Input for `Unit Purchase Cost (Buying Price)` (pre-filled with current `cost_price`).
     - Live **Total Restock Valuation Card**: `Total Investment = Quantity × Unit Cost`.
     - Checkbox: *"Update Catalog Cost Price for future margin calculations"* (checked by default).
     - Optional Checkbox: *"Adjust Retail / Wholesale selling prices now"* (expands price fields if selected).
   - **Supplier Details:**
     - Dropdown loaded from `dbSuppliers.fetchAll()`.
     - Invoice / Bill / Reference Number input (e.g. `INV-2026-089`).
   - **Payment & Capital Deduction (Optional):**
     - Dropdown to choose payment method: *"Unpaid / Accounts Payable"*, *"Paid from Cash Account"*, *"Paid from Bank"*, etc.
   - **Notes / Shipment Details:**
     - Optional text area for delivery notes, batch numbers, or shipment comments.
4. **Form Submission & Handlers (`window.saveCentralRestock(event)`):**
   - Validates inputs, shows loading spinner, calls `dbCentralInventory.restock()`.
   - Updates local cache and broadcasts real-time mutation.
   - Refreshes stats, inventory tables, and displays success toast with new stock level.

---

### Component 2: Database Operations & Audit Trail (`js/db.js`)

#### [MODIFY] [js/db.js](file:///d:/v2%20BMS%20OFFICIAL/js/db.js)
1. **`dbCentralInventory.restock(payload)`:**
   - Fetch current `main_store_stock` and increment by `restock_qty`.
   - Update `cost_price`, `supplier_id`, and last restock timestamp in `central_inventory`.
   - Insert an entry into `stock_movements`:
     ```javascript
     {
         owner_id: payload.owner_id,
         central_item_id: payload.item_id,
         movement_type: 'restock',
         quantity: payload.quantity,
         unit_cost: payload.unit_cost,
         total_cost: payload.quantity * payload.unit_cost,
         supplier_id: payload.supplier_id || null,
         reference_number: payload.reference_no || null,
         notes: payload.notes || 'Restocked into Central Inventory'
     }
     ```
   - If a capital account is specified, insert an expense record into `expenses` linked to the capital account for accurate financial accounting.

---

### Component 3: Localization (`js/i18n.js`)

#### [MODIFY] [js/i18n.js](file:///d:/v2%20BMS%20OFFICIAL/js/i18n.js)
- Add English and Swahili translations for:
  - `restock_stock`: `"Restock Stock"` / `"Ongeza Bidhaa Stoo"`
  - `restock_modal_title`: `"Restock Central Inventory"` / `"Ongeza Mzigo Stoo Kuu"`
  - `quantity_to_add`: `"Quantity to Add"` / `"Idadi ya Kuongeza"`
  - `unit_purchase_cost`: `"Unit Purchase Cost"` / `"Gharama ya Kununulia (Moja)"`
  - `total_restock_cost`: `"Total Restock Investment"` / `"Jumla ya Gharama"`
  - `supplier_select`: `"Supplier / Vendor"` / `"Msambazaji"`
  - `payment_source`: `"Payment / Capital Source"` / `"Njia ya Malipo / Akaunti"`
  - `invoice_ref`: `"Invoice / Reference No"` / `"Namba ya Ankara / Risiti"`

---

## Verification Plan

### Automated Build Verification
- Execute `npm run build` to verify clean compilation with Vite (0 errors).

### Manual Verification Flow
1. Navigate to **Main Store Central Inventory** (`#owner`).
2. Verify that **`+ Restock Stock`** is visible in the top action bar, and **`Restock`** buttons appear on each table row and mobile card.
3. Click **`Restock`** on a test product:
   - Verify modal opens with pre-filled product details, current stock, and last cost.
   - Enter `+50` units and change unit cost; verify live Total Investment updates in real time.
   - Select a Supplier and optional Invoice Ref.
   - Click **`Confirm Restock`**.
4. Verify:
   - HQ Stock level immediately increments by 50 units.
   - Valuation stat cards update immediately.
   - Stock movement ledger reflects the restock audit trail.
