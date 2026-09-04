# Universal Bento Design System & Layout Alignment Across Modules

## Goal Description
Harmonize all core page views and operational modules across Branch and Owner portals with the new LogiTrack-inspired Bento design language. This entails standardizing header control strips, top KPI summary rows with SVG micro-visuals, flat surface colors, crisp 1px borders (`var(--divider)`), zero box-shadows, and clean responsive card grouping across the application.

---

## Scope of Work

### 1. Global CSS Alignment (`css/index.css`)
- Reusable `.bento-card`, `.bento-header`, and `.bento-kpi` helper styles aligned with Apple-style flat surface tokens (`--surface: #FFFFFF` / `--surface: #1C1C1E`, `--divider: #C7C7CC` / `--divider: #3A3A3C`).
- Zero-shadow guarantee across all page containers, cards, tables, and toolbars.

### 2. Core Page Views & Modules Transformation

#### Branch Modules
- **Sales View (`js/branch/sales.js`)**: Bento header strip with quick POS trigger, top KPI sparklines (total sales, transactions, cash vs digital split), grouped filters and clean transaction cards.
- **Inventory View (`js/branch/inventory.js`)**: Bento header with product/service action, top KPI metrics (stock count, valuation, low stock warning), grouped search and category filters.
- **Expenses View (`js/branch/expenses.js`)**: Bento header with Add Expense trigger, top KPI cards with category breakdown, expense ledger with clean row badges.
- **Cash Drawer & Shifts (`js/branch/cash_drawer.js`, `js/branch/shift_summary.js`)**: Shift reconciliation bento grid, till float status meter, net cash flow card.
- **Customers & Invoices (`js/branch/customers.js`, `js/branch/invoices.js`, `js/branch/quotations.js`)**: Bento client cards, credit balances, document status badges.

#### Owner Modules
- **Central Inventory & Stock Movements (`js/owner/central_inventory.js`, `js/owner/stock_movements.js`)**: Central catalog bento headers, valuation summary cards, transfer launchpad.
- **Capital & Assets (`js/owner/capital.js`, `js/owner/assets.js`)**: Account balances with SVG micro-sparklines, capital allocation donut, fixed assets register.
- **Staff & Payroll (`js/owner/staff.js`, `js/owner/payroll.js`)**: Staff directory cards with role pills, payroll disbursement status meters.
- **Reports & Analytics (`js/owner/reports.js`, `js/owner/financial_reports.js`, `js/owner/analytics.js`)**: Financial statements with profit & loss rings and revenue sparklines.

---

## Verification
- `npm run build` validation for 0 errors.
- Version bump in `release_notes.json` and `js/updateChecker.js`.
- Update `Chat_History/chat_history.txt`.
