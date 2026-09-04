# Branch Reports Enhancement: Daily Sales Timeframe, Manager Description & Itemized Sale Details (#branch)

Extend the Branch Reports module and PDF generation engine to empower branch managers to configure timeframes (defaulting to **Daily / Today**), enter executive manager remarks/descriptions for their daily or periodic sales reports, and generate itemized sales reports containing rich product details (items, quantities, unit prices, and total sales revenue) while eliminating redundant branch name, status, and payment method table columns.

---

## User Review Required

> [!IMPORTANT]
> - **Default Timeframe Change**: Branch reports will now default to **Today (Daily)** instead of the whole month, matching the daily workflow of branch managers.
> - **Manager Description**: A new expandable/editable text area **"Manager Notes & Report Remarks"** will be added to the Branch Reports header and download modal. When entered, this is included in the generated PDF under the summary section.
> - **Refined Table Columns for Branch Sales**: For branch-scoped sales reports, the redundant `Branch` and `Status` columns will be replaced with itemized details: `Date & Time / Receipt #`, `Customer`, `Items / Products Sold`, `Qty`, `Unit Price`, and `Total Selling Price`.

---

## Proposed Changes

### Component 1: Branch Reports Interface (`js/branch/reports.js`)

#### [MODIFY] [`js/branch/reports.js`](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20(2)/js/branch/reports.js)
- **Default Timeframe**:
  - Change default `_branchReportFrom` and `_branchReportTo` to today's date (`now.toISOString().slice(0, 10)`).
  - Update `branchReportTimeframePreset` to default to `today`.
- **Manager Description Field**:
  - Add an intuitive, collapsible/inline **Manager Notes & Sales Remarks** text area (`#branchReportManagerNotes`) right above the report content.
  - Store `_branchReportNotes` in memory and pass it to PDF/CSV export routines.
- **Enhanced In-App Sales Table Preview (`sales_invoices`)**:
  - Update `renderBranchCategoryPreviewHtml` for `sales_invoices` to render:
    1. `Date & Time / Receipt #`
    2. `Customer Name`
    3. `Items Sold` (parsed from `s.items` or `s.item_name` with unit breakdown)
    4. `Quantity`
    5. `Unit Price`
    6. `Total Selling Price` (highlighted bold)
- **Quick Action**:
  - Add a dedicated **"Download Daily Sales Report"** shortcut button that instantly runs the daily report export with today's timeframe pre-locked.

---

### Component 2: PDF & Export Generation Engine (`js/owner/report_pdf_engine.js`)

#### [MODIFY] [`js/owner/report_pdf_engine.js`](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/owner/report_pdf_engine.js)
- **Fix Timeframe Formatting in PDF Header**:
  - Ensure `data.startDate` and `data.endDate` always resolve safely to today's date if omitted, preventing `N/A to N/A`.
  - For single-day reports (`startDate === endDate`), format as `Report Date: 28 Aug 2026 (Daily Sales Report)`.
- **Branch Manager Remarks Section in PDF**:
  - If `params.managerNotes` or `data.managerNotes` is present, render a dedicated **"Branch Manager Notes & Operational Remarks"** block with quote styling and metadata.
- **Tailored Branch Sales Audit Table**:
  - When `data.scope === 'branch'` (or `isSingleBranch`), render the sales table with:
    - `Date & Receipt #` (e.g. `28 Aug 2026 · #RCP-104`)
    - `Customer Name`
    - `Items / Products Sold` (e.g. `A4 Counter Book (5x), Blue Pen (10x)`)
    - `Total Units`
    - `Unit Price / Avg Rate`
    - `Total Selling Price`
  - Suppress redundant `Branch`, `Payment Method`, and `Status` columns in the main table layout to make full use of page width for product descriptions.
- **CSV Export Updates**:
  - Update `exportReportCsv` for `sales_invoices` when scoped to a branch to output itemized item names, quantities, unit prices, and total selling revenue.

---

### Component 3: Download Reports Modal (`js/owner/financial_reports.js`)

#### [MODIFY] [`js/owner/financial_reports.js`](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/owner/financial_reports.js)
- Add Manager Remarks input box inside `openDownloadReportsModal` when opened from branch role.
- Pass `managerNotes`, `startDate`, and `endDate` into `downloadSpecificReport`.

---

## Verification Plan

### Automated Build Verification
- Run `npm run build` to verify clean Vite compilation, 0 bundle syntax errors, and Service Worker compilation.

### Functional Verification
1. **Timeframe Behavior**:
   - Open Branch Reports view -> confirm default timeframe shows "Today" with today's date in both `From` and `To` date pickers.
   - Switch timeframe to "This Week", "This Month", and "Custom Range" -> verify data refreshes correctly.
2. **Manager Description**:
   - Type remarks into the Manager Description input -> click "Download PDF" -> verify remarks appear in the generated PDF below the KPI cards.
3. **Sales Table & PDF Columns**:
   - Switch category to "Sales & Transactions Audit" / generate Sales PDF -> verify table displays `Date / Receipt #`, `Customer`, `Items Sold`, `Quantity`, `Unit Price`, and `Total Selling Price`.
   - Verify `Branch` and `Status` columns are eliminated for branch reports.
4. **Timeframe Display in PDF**:
   - Verify PDF top banner displays `Report Date: 28 Aug 2026` for daily reports and does not show `N/A to N/A`.
