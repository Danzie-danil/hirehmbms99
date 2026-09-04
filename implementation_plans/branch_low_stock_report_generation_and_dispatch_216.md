# Implementation Plan: Branch Manager Low Stock Report Generation, Dispatch & Report Type Integration (216)

## Overview
Branch managers need the capability to generate, preview, download, and send low-stock reorder reports directly from the **Inventory Management** page (`js/branch/inventory.js`). Additionally, "Low Stock & Depletion Reorder Report" must be added as an official report type across the app's reporting architecture (`js/owner/report_pdf_engine.js` and `js/branch/reports.js`), detailing depleted items, safety thresholds, shortage deficits, and estimated replenishment capital.

---

## User Review Required

> [!IMPORTANT]
> - **Dispatch Channels**: The "Send Report" action provides 1-click **WhatsApp dispatch** (pre-formatting a clean, structured summary with item names, shortage deficits, and restock costs), native **Web Share API** (for sharing directly to any mobile app/email), and a **Copy Formatted Text** fallback with toast confirmation.
> - **Report PDF & CSV**: The PDF generation will include executive summary cards (Depleted Items, Out of Stock, Units to Reorder, Est. Capital Needed) and a detailed autoTable listing all depleted products.

---

## Proposed Changes

### 1. Low Stock Report Modal & Dispatch in Inventory Management (`js/branch/inventory.js` & `js/modals.js`)
- **Header Action Button**:
  - Add a dedicated `Low Stock Report` button with an alert icon and active item count badge (`15`) in the Inventory Management header action strip (beside `Stock Audit` and `Add Item`).
- **Stat Card Quick-Action**:
  - Add a direct `Generate Report` trigger inside the 4th stat card (`TOTAL LOW STOCK`).
- **Modal Component (`window.openLowStockReportModal()`)**:
  - Queries all physical inventory items for the active branch where `quantity <= (min_threshold || min_stock || 5)` and `item_type !== 'service'`.
  - Displays summary metrics: Total Low Stock Items, Complete Out of Stock Count, Total Units Deficit to Reorder, and Total Estimated Replenishment Cost.
  - Interactive itemized table showing SKU, Name, Category, Current Qty, Min Safety Level, Deficit to Order, Unit Cost, and Total Reorder Cost.
  - Action buttons:
    - `Download PDF Report`: Generates and downloads an A4 PDF report with corporate styling.
    - `Export CSV`: Exports a clean spreadsheet for procurement.
    - `Send via WhatsApp / Share`: Formats a clean message and opens WhatsApp / native share sheet / clipboard copy to instantly send to Business Owner or Suppliers.

---

### 2. Register `low_stock` Report Type in Reporting Engine (`js/owner/report_pdf_engine.js`)
- **Add to `AVAILABLE_REPORT_TYPES`**:
  ```javascript
  {
      id: 'low_stock',
      name: 'Low Stock & Depletion Reorder Report',
      category: 'inventory',
      badge: 'Stock Alert',
      icon: 'alert-triangle',
      description: 'Audit of depleted and low-stock items below minimum safety thresholds with shortage deficit and estimated replenishment costs.'
  }
  ```
- **Update `exportReportPdf()`**:
  - Add 4 KPI header cards: `DEPLETED ITEMS`, `OUT OF STOCK`, `UNITS TO REORDER`, `EST. REORDER CAPITAL`.
  - Add itemized table: `['SKU', 'Item Name', 'Category', 'Current Qty', 'Min Safety', 'Shortage Deficit', 'Unit Cost', 'Est. Restock Cost', 'Status']`.
- **Update `exportReportCsv()`**:
  - Add CSV formatting for `low_stock` export.

---

## Verification Plan

### Automated & Build Verification
1. `node scripts/lint_check.cjs` (ensuring 0 syntax/lint errors across all modified files).
2. `npm run build` (confirming successful bundle compilation).

### Manual Flow Verification
1. Open Branch **Inventory Management**:
   - Verify `Low Stock Report` button is visible in the top action strip with the red alert badge.
   - Verify the 4th stat card has the direct report launch action.
2. Click `Low Stock Report`:
   - Verify modal opens with low stock items list (e.g. "Digital Multimeter Heavy Duty", "greiaf", etc.).
   - Verify summary cards show total items, shortage units, and estimated restock valuation.
   - Test `Download PDF Report` (downloads generated PDF).
   - Test `Export CSV` (downloads CSV).
   - Test `Send via WhatsApp / Share` (copies text / opens share window).
3. Open **Branch Reports**:
   - Select `Low Stock & Depletion Report` from category dropdown.
   - Verify report table and KPIs render accurately.
