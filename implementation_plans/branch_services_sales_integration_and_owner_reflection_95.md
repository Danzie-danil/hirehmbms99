# Implementation Plan: Branch Sales Services Integration & Owner Reflection

## Goal
Integrate Service Offerings into Branch Sales (POS, Add Sale Modal, Quick Checkout), adapt Branch Operations (Shift Summaries, Receipts, Customer Returns/Reversals), and reflect the hybrid Product vs Service model across the Business Owner's Account (Analytics, Profit & Loss, Revenue Breakdown, and Performance Reports).

---

## Analysis of Missing & Critical Areas in the Product-Service Model

1. **Branch Point-of-Sale (POS) & Add Sale Modal (`js/modals.js`, `js/branch/sales.js`)**:
   - **Catalog Distinction**: Cashiers and staff need to easily distinguish between tangible products and intangible services in the POS product dropdown.
   - **Zero-Stock Constraint Bypass**: Physical goods have quantity constraints (`qty <= available_stock`). Services have unlimited availability and must never be blocked by "Out of Stock" validations.
   - **Price Type Adaptability**: Services must support Standard Service Fee (Retail) and Partner/Corporate Rate (Wholesale) as configured by the owner in Central Inventory & Services.

2. **Branch Sales Register & History (`js/branch/sales.js`)**:
   - **Visual Badging**: Sales list items need an explicit `[SERVICE]` pill badge (styled in purple) alongside `[RTL]` / `[JML]` (Wholesale) to distinguish service transactions at a glance.
   - **Filtering**: Ability to filter recent transactions by *All Transactions*, *Physical Products*, and *Service Offerings*.

3. **Branch Shift Summary & Day-End Closing (`js/branch/shift_summary.js`)**:
   - **Revenue Mix Breakdown**: Shift reports sent to the owner must distinguish between *Physical Goods Revenue* (and units sold) and *Service Offerings Revenue* (and service count).

4. **Customer Returns & Reversals (`js/branch/returns.js`)**:
   - **Non-Restockable Policy for Services**: When a customer is refunded for an unsatisfactory or cancelled service, `restock` must automatically be set to `false` (cannot restock labor), ensuring inventory counts are not erroneously inflated.

5. **Sales Receipts & Invoices (`generateReceipt` in `js/branch/sales.js`)**:
   - Receipts and invoices should clearly present services rendered without inappropriate stock unit phrasing.

6. **Business Owner Reflection (Analytics, Reports & Financials)**:
   - **Owner Dashboard & Overview (`js/owner/overview.js`)**: Real-time sales metrics split between Product Sales and Service Revenue.
   - **Owner Analytics (`js/owner/analytics.js`)**: Revenue composition (Products vs Services), top performing products, and top requested services.
   - **Financial Reports & P&L (`js/owner/financial_reports.js`)**: 
     - **COGS (Cost of Goods Sold)**: Applied strictly to physical goods.
     - **Direct Service Expenses**: Applied to billable services.
     - **Gross Margin & Net Profit**: Accurately calculated for both product sales and service lines.

---

## User Review Required
> [!IMPORTANT]
> - Branch staff will see both physical items and service offerings in the POS dropdown with clear icon indicators (`📦` for products, `🛠️` for services).
> - For service offerings, available quantity will show as `Unlimited`, and cashiers can input any requested session/labor quantity.
> - Customer returns for service offerings will automatically lock the "Restock" option to `false`.

---

## Proposed Changes

### Branch POS & Sales Module
#### [MODIFY] [js/modals.js](file:///d:/v2%20BMS%20OFFICIAL/js/modals.js)
- Update `addSale` modal template:
  - Populate dropdown options with explicit icons, item types (`data-type="service"` or `data-type="product"`), and unlimited indicator for services.
  - Update `onSaleProductChange` to detect if the selected item is a service:
    - If service: Display "Unlimited Availability", hide stock warnings, and populate standard/partner rates.
    - If product: Maintain standard stock level checks and low-stock warnings.
- Update `handleAddSale`:
  - Preserve item type metadata (`item_type: 'service' | 'product'`) in sale payload for reporting and trigger handling.

#### [MODIFY] [js/branch/sales.js](file:///d:/v2%20BMS%20OFFICIAL/js/branch/sales.js)
- Update `renderSalesModule`:
  - Add `[SERVICE]` pill badge to service transactions in recent sales history.
  - Add search and category filter support for Products vs Services.
- Update `generateReceipt`:
  - Enhance printed/downloaded receipt layout to cleanly format service offerings.

---

### Branch Shift Closure & Summary
#### [MODIFY] [js/branch/shift_summary.js](file:///d:/v2%20BMS%20OFFICIAL/js/branch/shift_summary.js)
- Add Revenue Breakdown section to Shift Summary:
  - *Product Sales Revenue* (Units & total TSh).
  - *Service Offerings Revenue* (Count & total TSh).
  - Include service revenue breakdown in `submitShiftSummary()` payload sent to the business owner.

---

### Branch Customer Returns
#### [MODIFY] [js/branch/returns.js](file:///d:/v2%20BMS%20OFFICIAL/js/branch/returns.js)
- When a service offering is selected in `openReturnModal`:
  - Automatically uncheck and disable the "Restock into inventory" checkbox.
  - Display helper badge: *"Services are non-physical and cannot be restocked"*.

---

### Owner Analytics & Reports Reflection
#### [MODIFY] [js/owner/overview.js](file:///d:/v2%20BMS%20OFFICIAL/js/owner/overview.js)
- Add hybrid revenue split metric to Owner Overview (Physical Sales vs Service Revenue).

#### [MODIFY] [js/owner/analytics.js](file:///d:/v2%20BMS%20OFFICIAL/js/owner/analytics.js)
- Integrate Product vs Service revenue chart and separate Top 5 Best-Selling Products and Top 5 Most Requested Services.

#### [MODIFY] [js/owner/financial_reports.js](file:///d:/v2%20BMS%20OFFICIAL/js/owner/financial_reports.js)
- Ensure Cost of Goods Sold (COGS) isolates physical inventory, while Direct Service Expenses are accounted for under Service Delivery Costs.

---

## Verification Plan

### Automated Build Verification
- Run `npm run build` to verify syntax, bundle compilation, and TypeScript/ESLint checks.

### Manual Verification
1. **Branch POS Sale**:
   - Open Branch portal -> Sales Register -> New Sale.
   - Select a Service Offering (e.g. Consultation or Repair) -> verify it shows "Unlimited Availability" and standard fee.
   - Record the sale -> verify the transaction records with `[SERVICE]` badge and does not decrement any physical inventory stock.
   - Record a physical product sale -> verify physical stock decrements as normal.
2. **Branch Shift Summary**:
   - Open Shift Summary -> verify the revenue breakdown displays Product Revenue vs Service Revenue.
3. **Customer Returns**:
   - Open Returns -> Create Return for a service -> verify "Restock" is disabled.
4. **Owner Reports & Analytics**:
   - Log into Owner Account -> verify Overview and Analytics show the revenue breakdown between Products and Services.
