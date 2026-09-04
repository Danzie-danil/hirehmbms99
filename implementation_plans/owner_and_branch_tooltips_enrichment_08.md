# Business Owner & Branch Views Tooltips Enrichment Plan

Enrich all interactive elements, metric cards, quick actions, export buttons, POS controls, and status badges across the **Business Owner** and **Branch Manager** views with descriptive, modern tooltips using the newly integrated BMS Ultra-Premium Tooltip Engine.

## User Request Transcript
> "Okay, that is good. Now, I want you to inspect over the the Business Owner view and the Branch view. I want you to go through all the modules and do your level best to put tooltips for most of the activities on on those views so that it's much easier at least for the users to have a grasp of what to do. Yeah."

## Scope of Changes

### 1. Business Owner Modules (`js/owner/`)
- **[overview.js](file:///d:/v2%20BMS%20OFFICIAL/js/owner/overview.js)**:
  - KPI metric cards (Sales Today, Gross Profit, Branch Inventory Cost, Expected Sales, Potential Profit).
  - Branch location filter and live indicators.
  - Quick Action tiles (Central Stock, Stock Ledger, Analytics, Branches, Security, Messages).
  - Branch performance bars and restock reminder triggers.
- **[central_inventory.js](file:///d:/v2%20BMS%20OFFICIAL/js/owner/central_inventory.js)**:
  - Add New Item, Bulk Import, Export CSV/Excel, Reorder Alerts, Stock Movement, Barcode Scanner triggers.
  - Table action buttons (Edit, Transfer, Restock, Delete).
- **[branches.js](file:///d:/v2%20BMS%20OFFICIAL/js/owner/branches.js)**:
  - Add Branch button, View Details, Assign Manager, Target Goal indicators, Branch Active/Suspended switch.
- **[financial_reports.js](file:///d:/v2%20BMS%20OFFICIAL/js/owner/financial_reports.js)** & **[analytics.js](file:///d:/v2%20BMS%20OFFICIAL/js/owner/analytics.js)**:
  - Date Range pickers, Profit Margin filters, Chart toggles, PDF/Print report export buttons.
- **[staff.js](file:///d:/v2%20BMS%20OFFICIAL/js/owner/staff.js)** & **[payroll.js](file:///d:/v2%20BMS%20OFFICIAL/js/owner/payroll.js)**:
  - Add Staff, Role permission badges, Salary calculations, Mark Paid, Payslip generator.
- **[stock_movements.js](file:///d:/v2%20BMS%20OFFICIAL/js/owner/stock_movements.js)**:
  - Movement type filter badges (Transfer, Restock, Adjustment, Sale), Date filtering, CSV Export.

### 2. Branch Manager Modules (`js/branch/`)
- **[dashboard.js](file:///d:/v2%20BMS%20OFFICIAL/js/branch/dashboard.js)**:
  - Launch POS terminal button, Daily Target progress, Open/Close Register controls, Low Stock alerts.
- **[sales.js](file:///d:/v2%20BMS%20OFFICIAL/js/branch/sales.js)**:
  - POS Quick Add, Barcode Search, Quantity adjusters (+/-), Discount trigger, Payment methods (Cash, Card, M-Pesa / Mobile Money, Credit), Print Receipt, Hold Cart.
- **[inventory.js](file:///d:/v2%20BMS%20OFFICIAL/js/branch/inventory.js)**:
  - Stock Adjustment (+/-), Request Transfer from HQ/Central, Low Stock filter, Reorder thresholds.
- **[expenses.js](file:///d:/v2%20BMS%20OFFICIAL/js/branch/expenses.js)**:
  - Record Expense, Category selector, Receipt attachment icon, Daily Expense total.
- **[customers.js](file:///d:/v2%20BMS%20OFFICIAL/js/branch/customers.js)**:
  - Add Customer, Credit balance alert, Transaction history, Send statement.

### 3. Global Navigation & Sidebar (`js/ui/dashboardView.js`)
- Sidebar quick links (Overview, Inventory, POS, Analytics, Settings, Notifications, Dark Mode, Branch Switcher).

## Verification Plan
1. Run `npm run build` to confirm zero lint/bundling regressions.
2. Confirm hover tooltips display instantly with glassmorphic cards and smart positioning.
