# Branch Sales Report: Total Expenses, Items Remained & Mini Stock Analysis

Add Total Expenses verification, dynamic chronological "Items Remained" column in the Sales & Invoices table, and a dedicated "Mini Stock Analysis" table for items sold during the selected period in Branch Sales Reports and PDF exports.

## Proposed Changes

### Report Data Engine & Aggregation Layer
#### [MODIFY] [`js/owner/report_pdf_engine.js`](file:///d:/V2BmstzOfficial/js/owner/report_pdf_engine.js)
1. **Chronological Stock Tracking & Remaining Count Calculation**:
   - In `fetchReportData()`, trace product stock levels chronologically across all sales of each product.
   - For each sale item, calculate the exact remaining stock units immediately after that sale (`itemsRemained`), accounting for current physical inventory quantity and subsequent sale decrements.
   - Attach `_itemsRemained` formatted string to each sale record (e.g. `49 units`, `48 units`, or `[Item A: 49, Item B: 18]` for multi-item sales, `—` for services).
2. **Mini Stock Analysis Aggregation**:
   - Compute `miniStockAnalysis` for all products sold during the period:
     - `name`: Product Name
     - `sku`: Product SKU code
     - `soldCount`: Total units sold in the selected period
     - `soldStockValue`: Total sales value / revenue collected for the sold units
     - `currentCount`: Current on-hand inventory count
     - `currentStockValue`: Current on-hand stock monetary valuation (`currentCount * price`)
   - Compute summary totals for all four numeric columns (`totalSoldCount`, `totalSoldStockValue`, `totalCurrentCount`, `totalCurrentStockValue`).
3. **PDF Sales Report AutoTable Updates**:
   - Update the Sales Audit Log table to include the `Items Remained` column next to `Items / Products Sold`:
     - Columns: `Date / Time`, `Customer / Entity`, `Items / Products Sold`, `Items Remained`, `Qty`, `Unit Price`, `Total Sales Price`.
   - Add the **Mini Stock Analysis** table in the PDF export for sales reports with full `foot` total summary row.

---

### Branch Reports UI & HTML Preview
#### [MODIFY] [`js/branch/reports.js`](file:///d:/V2BmstzOfficial/js/branch/reports.js)
1. **Sales Transactions Audit Table**:
   - Add the `Items Remained` column header and styled cell badge (e.g. `<span class="px-2 py-0.5 rounded-md font-black bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">49 left</span>`).
   - Align table footers to match the 7-column layout.
2. **Mini Stock Analysis Table**:
   - Render a dedicated responsive card with the Mini Stock Analysis table:
     - Columns: `Product / Item Name`, `Sold Item Count`, `Sold Stock Value`, `Current Item Count`, `Current Stock Value`.
     - Bold footer row (`<tfoot>`) displaying grand totals for all columns.
3. **Hero KPIs**:
   - Maintain clear display of `Gross Revenue`, `Cost of Goods (COGS)`, `Total Expenses`, and `Net Operating Margin`.

---

### Owner Financial Reports Alignment
#### [MODIFY] [`js/owner/financial_reports.js`](file:///d:/V2BmstzOfficial/js/owner/financial_reports.js)
- Sync the Mini Stock Analysis table and sales table structures when viewing sales reports.

## Verification Plan

### Automated Verification
- Run `npm run build` to verify build compilation, syntax correctness, and bundle generation.
- Check and fix any lint errors.

### Manual Verification
- Test branch sales report preview with various date range presets (Today, This Week, This Month, Custom).
- Verify the "Items Remained" column reflects the decreasing stock count chronologically.
- Verify the Mini Stock Analysis table displays accurate sold volume, sold monetary value, live current stock, and current stock valuation with correct grand totals.
- Verify PDF generation contains both tables with correct columns, widths, and totals.
