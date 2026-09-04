# Implementation Plan: Unified Enterprise Reporting Suite (Owner & Branch Modules)

## 1. Overview & Objectives
Build a clean, minimalist, enterprise-grade reporting system for both **Business Owners** (consolidated and multi-branch views) and **Branch Managers** (branch-specific operations, sales, stock flow, and staff performance).

### Clean & Minimalist Design Standard
- **No Aggressive Color Blocks**: Avoid heavy solid colored background blocks, saturated cards, or intense gradients.
- **Card & Table Styling**: Clean white/slate cards with crisp, subtle borders (`border-gray-200/80` / `dark:border-gray-700/60`), muted metadata labels, dark high-contrast values, and subtle badge indicators.
- **PDF Aesthetic**: Minimalist executive style with refined slate `#334155` typography, light gray table headers (`#F1F5F9`), subtle hairline borders (`#E2E8F0`), alternating clean rows (`#FFFFFF` and `#F8FAFC`), and precise column alignment.

---

## 2. Business Owner Reporting Suite (`js/owner/financial_reports.js` & `js/owner/report_pdf_engine.js`)

### A. Controls & Scopes
- **Branch Scope**: "🏢 All Branches (Consolidated)" or select individual branch.
- **Timeframe**: Today, This Week, This Month, This Quarter, This Year, or Custom Date Range.
- **6 Owner Report Categories**:
  1. **Executive Financial & P&L Report**: Revenue, COGS, OpEx, Gross Profit, Net Profit, Profit Margin %, Payment methods breakdown.
  2. **Branch Operations & Manager Scorecard**: Branch founding/opening date, operating age, Manager sales count, Average ticket, Profit contribution %, Task completion rate, multi-branch rankings.
  3. **Dedicated Stock Lifecycle & Flow Ledger**:
     - *Central Purchases*: Purchase date, item name, SKU, supplier name, cost price, batch quantity.
     - *Dispatches*: Chronological flow from Main Store -> Destination Branches with timestamps and dispatched quantities.
     - *Branch Sales & Consumption*: Units sold per branch.
     - *Stock Balances*: Current warehouse inventory vs individual branch stock holdings.
     - *Product Rankings*: Top 10 Best Sellers (by revenue & units) vs Slow-Moving / Dead Stock.
  4. **Sales, Invoicing & Returns Audit**: Transaction volume, Invoice statuses (Paid, Pending, Overdue), Returns and refund reasons.
  5. **Staff, Shifts & Productivity Audit**: Branch staff count, shifts worked, hours logged, cashier/manager revenue attribution.
  6. **Consolidated Master Business Dossier**: Multi-page master document unifying all 5 sections.

---

## 3. Branch Reporting Suite (`js/branch/reports.js`)

### A. Layout Improvements
- Overhaul the current dark heavy header card into a **clean, minimalist Branch Hero Header**:
  - Branch name, Branch founding date, Branch location, TIN, Business Reg, contact info.
  - Clean KPI cards: Today's Revenue, Monthly Revenue, Total Expenses, Net Profit, Target Progress bar.
- Category tabs/dropdown matching the new report types.

### B. Branch Report Categories
1. **Branch Financial & P&L Summary**: Daily/Monthly revenue, operational expenses by category, net profit, payment methods (Cash, Mobile, Card, Bank).
2. **Branch Stock & Dispatches Audit**: Current stock on hand, low stock alerts, stock received from central store dispatches, top 5 best sellers in this branch.
3. **Branch Sales, Invoices & Returns**: Cashier sales breakdown, quotation/invoice tracking, customer returns & refund log.
4. **Branch Staff & Shifts Audit**: Staff attendance, hours logged, shift summaries, and individual cashier sales totals.
5. **Branch Operations & Daily Reconciliation**: Daily cash summary, opening/closing cash balances, task statuses.
6. **Comprehensive Branch PDF & CSV Export**: Download beautifully styled branch reports with clean AutoTable formatting, hero header, and page numbering.

---

## 4. Shared PDF & Data Export Engine (`js/owner/report_pdf_engine.js`)

- **First-Glance Detailed Hero Banner**:
  - Company/Branch Legal Header (Name, Logo, TIN, Reg No, Address, Phone, Email).
  - Scope Pill (e.g. `Consolidated (All Branches)` or `Branch: Kariakoo Central`).
  - Key Dates Block (Branch opened date, Operating age, Report timeframe, Generated date & time, Audited by).
  - Clean bordered executive KPI summary metric boxes.
- **AutoTable Layout & Alignment**:
  - Text & Descriptions: Left-aligned
  - Dates, SKUs, Status Badges: Centered
  - Quantities, Currency amounts, Margins: Right-aligned
  - Minimalist light slate header `#F1F5F9` with dark slate text `#1E293B`.
  - Dynamic page numbering (`Page X of Y`), audit disclaimer, and signature block.
- **Excel/CSV Generator**: Structured `.csv` downloads for all report types.

---

## 5. File Structure Changes

| File | Action | Purpose |
|---|---|---|
| `js/owner/financial_reports.js` | **MODIFY** | Overhaul into the clean Owner Business Reports Hub with multi-branch filters, category tabs, and interactive preview tables |
| `js/branch/reports.js` | **MODIFY** | Overhaul Branch Reports layout into clean cards, add new branch-level report categories, and hook into the shared PDF engine |
| `js/owner/report_pdf_engine.js` | **NEW** | Standalone reporting & export engine for both Owner and Branch modules (jsPDF + AutoTable + CSV) |
| `js/owner/overview.js` / `js/app.js` | **MODIFY** | Route quick report shortcuts and navigation to the new reporting engines |
| `css/index.css` | **MODIFY** | Clean styling for report preview tables, metric pills, and `@media print` rules |

---

## 6. Verification Plan

### Automated Tests
- Syntax verification:
  ```powershell
  node -c "js/owner/financial_reports.js"; node -c "js/branch/reports.js"; node -c "js/owner/report_pdf_engine.js"
  ```

### Manual Functional Verification
1. **Owner Consolidated & Branch Views**: Test generating reports for "All Branches" and individual branches. Check founding date, manager metrics, stock traceability, and P&L calculations.
2. **Branch Module Reports**: Open Branch Reports view; test all 5 branch report categories, check layout cleanliness, daily target progress, and cash/expense breakdowns.
3. **Visual Quality & PDF Export**: Download PDFs from both Owner and Branch views; inspect hero banner, column alignments, lack of aggressive color blocks, and page numbering.
4. **Mobile Responsiveness**: Verify clean scaling across mobile and desktop viewports.
