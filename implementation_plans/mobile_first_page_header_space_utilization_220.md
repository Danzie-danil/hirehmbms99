# Implementation Plan: Universal Mobile Page Header Space Utilization & Alignment (220)

## Overview
Unify and optimize the top header strip across all primary page views and modules (Branch Inventory, Sales, Expenses, Customers, Cash Drawer, Dashboard, Owner Central Inventory, Staff, Capital, Overview). 

Currently on mobile viewports, headers use `flex-row justify-between` with buttons inside `flex-col items-end`, causing buttons to stack vertically into a cramped right column that suffocates the page title on the left and leaves wide gaps of empty space unutilized.

This plan transitions all module headers to the clean, responsive layout established in the Low Stock Report:
- **Mobile (`< 640px`)**: Header naturally stacks into two well-proportioned rows:
  - **Row 1**: Icon, page title, and subtitle/date take 100% width with maximum legibility.
  - **Row 2**: Action buttons span the full width (`w-full flex items-center gap-2`), with `flex-1 sm:flex-initial` providing equal, ergonomic touch targets and zero wasted space.
- **Desktop (`>= 640px`)**: Seamlessly flows into a single unified row (`sm:flex-row sm:items-center sm:justify-between`) with title on the left and inline buttons on the right.

---

## User Review Required

> [!IMPORTANT]
> - Replaces the cramped vertical button column (`flex-col items-end`) on mobile with a full-width, ergonomic action strip (`w-full flex items-center gap-2`).
> - Ensures consistent branding, padding (`p-3.5 sm:p-5`), border radius (`rounded-2xl`), and typography across all module headers.
> - Preserves all existing IDs, tooltips, click handlers, and badge counters.

---

## Proposed Changes

### 1. Branch Module Headers
- **`js/branch/inventory.js` (Inventory & Services)**:
  - Header container: `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`.
  - Title section: full-width on mobile with package icon and date.
  - Button group: `w-full sm:w-auto flex items-center gap-2` containing `Low Stock Report`, `Stock Audit`, and `Add Item` with `flex-1 sm:flex-initial`.
- **`js/branch/sales.js` (Sales & Invoicing)**:
  - Header container: `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`.
  - Button group: `w-full sm:w-auto flex items-center gap-2` for quick sales actions.
- **`js/branch/expenses.js` (Expense Management)**:
  - Header container: `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`.
  - Button group: `w-full sm:w-auto flex items-center gap-2` for adding expenses and category management.
- **`js/branch/customers.js` (Customer Directory)**:
  - Both top header strips updated to `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`.
- **`js/branch/cash_drawer.js` (Cash Drawer & Float)**:
  - Top header strip updated with full-width mobile action buttons.
- **`js/branch/dashboard.js` (Branch Dashboard)**:
  - Dashboard top bar updated to responsive stacked layout on mobile.

### 2. Owner Module Headers
- **`js/owner/central_inventory.js` (Central Inventory)**:
  - Standardized header strip with full-width mobile actions.
- **`js/owner/staff.js` (Staff & HR Management)**:
  - Standardized header strip with responsive mobile buttons.
- **`js/owner/capital.js` (Capital & Investment Management)**:
  - Standardized header strip with responsive mobile buttons.
- **`js/owner/overview.js` (Executive Business Overview)**:
  - Standardized header strip with responsive mobile actions.

---

## Verification Plan

### Automated & Build Verification
1. `node scripts/lint_check.cjs` (0 syntax/lint errors across all modified files).
2. `npm run build` (production build compiled successfully).

### Manual Verification
1. Open Branch Inventory on mobile view (< 640px):
   - Title and date occupy Row 1 cleanly with zero text truncation.
   - Low Stock Report, Stock Audit, and Add Item buttons span cleanly across Row 2 with balanced touch targets.
2. Open on desktop (>= 640px):
   - Header smoothly aligns into a single horizontal row with title on the left and buttons on the right.
3. Test across Sales, Expenses, Customers, Cash Drawer, and Central Inventory to verify universal consistency.
