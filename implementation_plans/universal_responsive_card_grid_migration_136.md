# Universal Responsive Card Grid Migration Plan

Convert remaining dense data tables across the application (Central Dispatch Hub, Main Store Central Inventory for Products & Services, and Sysadmin Management tables) into the unified, modern responsive card grid design (`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3`), with a 3-row height limit and internal smooth scrolling (`max-h-[385px] overflow-y-auto scroller-custom`).

## User Review Required

- All target modules will transition from wide horizontal-scroll HTML tables into sleek 2-to-3 column responsive card grids.
- Height will be capped at approximately 3 visible rows (`max-h-[385px]`) with smooth internal scrolling, preventing full-page expansion.
- All interactive controls (e.g. dispatch quantity adjusters `- 0 +`, bulk checkboxes, action buttons, status pills) will be seamlessly integrated within each card.

## Proposed Changes

### 1. Central Dispatch Hub (`js/owner/central_inventory.js`)
- Replace the desktop `table` and separate mobile card markup with a single, unified responsive card grid (`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3`).
- Integrate:
  - Header: Item name, SKU, Category, Low Stock indicator.
  - Metrics: Main Store Stock, Target Branch Stock, Retail / Wholesale Price.
  - Interactive controls: `- [qty] +` stepper, `Max` button, and item actions.
- Container constrained to `max-h-[385px] overflow-y-auto scroller-custom pr-1`.

### 2. Main Store Central Inventory — Products & Services (`js/owner/central_inventory.js`)
- Replace the desktop HTML `table` with responsive card grids for both **Products** and **Services** tabs:
  - **Products Card**: Bulk select checkbox, Item name, SKU, Supplier, Stock in HQ, Assigned branches count, Global quantity, Retail price, Wholesale price, and Action buttons (Dispatch, Edit, Delete).
  - **Services Card**: Bulk select checkbox, Service name, Category, Base Price, Assigned branches list, and Action buttons (Edit, Delete).
- Container constrained to `max-h-[385px] overflow-y-auto scroller-custom pr-1`.

### 3. System Admin Tables (`js/admin/dashboard.js`, `js/admin/communications.js`)
- Refactor the dense account/tenant overview tables and banner broadcast tables into clean, structured card grids following the universal design.

## Verification Plan

### Automated Build Verification
- Run `npm run build` to ensure clean module bundling and 0 TypeScript/Vite syntax errors.

### Manual Verification
1. Navigate to **Central Inventory** → verify Products & Services card grids render across desktop, tablet, and mobile.
2. Open **Central Dispatch Hub** → test quantity increment/decrement, `Max` button, and batch dispatch.
3. Verify the container caps at 3 rows and scrolls smoothly internally without expanding the page.
