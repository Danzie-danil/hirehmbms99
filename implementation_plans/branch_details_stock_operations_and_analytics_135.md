# Implementation Plan - Branch Details Stock, Operations & Analytics Hub (135)

Enrich the Business Owner's **Branch Details** modal/view to provide full operational visibility into each individual branch:
1. **See all stock assigned to that branch** (total items and physical unit counts).
2. **Stock value** (acquisition cost valuation & total expected retail value).
3. **How many sold** (all-time & periodic total units sold).
4. **Services offered so far** (catalog of active services and service revenues rendered).
5. **How many on low stock** (threshold alerts for stock replenishment).
6. **Daily operations** (today's sales, daily expenses, and gross/net profit).
7. **Responsive Stock & Operations Tables** with search, filter tabs, and wrap-to-fit screen layout for both mobile and widescreen desktop.

---

## User Review Required

> [!NOTE]
> All branch data (inventory, sales, expenses) will be loaded dynamically using the existing offline-first repositories (`getInventory(branchId)`, `dbSales.fetchAll(branchId)`, `dbExpenses.fetchAll(branchId)`).

> [!TIP]
> The view will include interactive sub-tabs (*All Stock*, *Low Stock*, *Services*, *Daily Operations*) with instant search so owners can inspect specific stock states without leaving the branch screen.

---

## Proposed Changes

### 1. Owner Branch Details View (`js/modals.js` & `js/owner/branches.js`)

#### [MODIFY] [js/modals.js](file:///d:/v2%20BMS%20OFFICIAL/js/modals.js)
- Expand `case 'branchDetails'` into a full-featured asynchronous hub:
  - Fetch assigned inventory items, sales records, and expenses for the specific `branch.id`.
  - Render an **Executive Bento Metric Strip**:
    - **Total Assigned Stock & Units** (with item count)
    - **Total Stock Value** (Inventory Cost & Expected Retail Value)
    - **Total Units Sold & Sales Volume**
    - **Services Catalog & Rendered Services**
    - **Low Stock Warning Badge & Count**
    - **Daily Operations Bento Card** (Today's Sales, Expenses, and Profit)
  - Render **Tabbed Data Explorer**:
    - Tab 1: **All Stock Items** (list of all assigned physical stock)
    - Tab 2: **Low Stock Alerts** (only items at or below reorder level)
    - Tab 3: **Services Offered** (all active services assigned to this branch)
    - Tab 4: **Today's Operations** (live list of sales transactions and expense disbursements for this branch)
  - Include an instant live search input (`search by name, SKU, or category`).
  - Implement dual layout:
    - **Mobile View**: Wrap-to-fit ergonomic cards with visual badges, quantity indicators, and pricing.
    - **Wide Screen View**: High-density responsive data table with columns: Product/Service Name, SKU, Current Stock, Status Badge, Buying Price, Selling Price, and Total Stock Value.

#### [MODIFY] [js/owner/branches.js](file:///d:/v2%20BMS%20OFFICIAL/js/owner/branches.js)
- Ensure helper functions and event handlers for branch stock filtering, searching, and tab switching are cleanly integrated and accessible globally.

### 2. Styling & Layout (`css/index.css`)

#### [MODIFY] [css/index.css](file:///d:/v2%20BMS%20OFFICIAL/css/index.css)
- Add responsive styles for the Branch Details modal table and wrap-to-fit cards:
  - Fluid scrolling container with `.scroller-custom`.
  - Mobile card-row density and clear separation between elements.
  - Dark mode and light mode color harmony matching the rest of the application.

### 3. Version Bump & System Alignment
- Bump application version to `3.9.31` across `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
- Run `npm run build` and fix all lint/compilation checks.
- Record entry in `Chat_History/chat_history.txt`.

---

## Verification Plan

### Automated Tests
- Execute `npm run build` to ensure 0 compilation errors and clean bundle output.

### Manual Verification
1. Login as Business Owner (`#owner`).
2. Navigate to **Branches** tab and click on any branch card.
3. Verify the **Branch Details** view loads:
   - Header with branch status, manager, target, and currency.
   - 6 KPI metric cards: Total Stock Assigned, Stock Value, How Many Sold, Services Offered, Low Stock Count, Daily Operations (Sales, Expenses, Profit).
   - Stock Table with wrap-to-fit layout on mobile and wide table on desktop.
   - Filter tabs (*All Stock*, *Low Stock*, *Services*, *Daily Operations*) and instant search bar.
4. Test on both mobile screen dimensions (375px - 430px) and wide desktop screen viewports (1280px+).
