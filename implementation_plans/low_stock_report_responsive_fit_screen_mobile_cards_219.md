# Implementation Plan: Low Stock Report Responsive Fit-To-Screen & Mobile Cards (219)

## Overview
Adapt the **Low Stock & Reorder Report** items list so that:
1. **On Desktop (`sm:block`)**: The table fits 100% to the screen width with **zero horizontal scroll (`scrollX: none`)**, combining Product & Category into an intelligent primary column and using fixed 100% proportional column budgeting.
2. **On Mobile (`sm:hidden`)**: Render cards styled identically to the branch inventory catalog mobile cards (`border-l-[4px] border-l-red-500/amber-500`, item name, category tag, on-hand vs safety min, deficit badge, unit cost, and restock capital valuation).

---

## User Review Required

> [!IMPORTANT]
> - Desktop view eliminates horizontal overflow completely, fitting all details (Product, SKU, Category, On-Hand, Safety Min, Deficit, Cost/Unit, Est. Reorder Cost, Status) within the viewport.
> - Mobile view transitions into compact vertical cards matching the rest of the branch inventory mobile interface.
> - The live search filter dynamically filters both desktop table rows and mobile cards seamlessly via the `.low-stock-row` selector.

---

## Proposed Changes

### `js/branch/inventory.js`
- In `window.openLowStockReportView()`:
  - **Desktop Container (`hidden sm:block`)**:
    - Remove `overflow-x-auto` and replace with a self-contained `table-fixed w-full` layout.
    - Proportional 100% column allocation:
      - `Product & Category` (~32%): Item name on top line, SKU & category badge on secondary line.
      - `On-Hand` (~10%): Text-center, bold red/amber count.
      - `Safety Min` (~10%): Text-center threshold.
      - `Deficit` (~12%): Text-center, bold red shortage (`+300`).
      - `Cost / Unit` (~12%): Text-right, formatted unit buying price.
      - `Est. Restock Cost` (~14%): Text-right, bold emerald total reorder valuation.
      - `Status` (~10%): Text-center, compact status pill (`Out of Stock` / `Low Stock`).
    - Footer totals row strictly aligned to the Deficit and Est. Restock Cost columns.
  - **Mobile Container (`block sm:hidden space-y-2.5`)**:
    - Renders responsive cards matching branch inventory mobile cards:
      - Left status accent border (`border-l-red-500` for 0 stock, `border-l-amber-500` for low stock).
      - Header: Item name, SKU code, category badge, and status pill.
      - Middle: On-hand quantity, safety min, and high-visibility deficit pill.
      - Footer: Unit cost and total reorder capital valuation.
    - Each card carries class `low-stock-row` and `data-search` attribute for instant live search filtering.

---

## Verification Plan

### Automated & Build Verification
1. Run `node scripts/lint_check.cjs` (must pass with 0 errors).
2. Run `npm run build` (production bundle must compile with 0 errors).

### Manual Verification
1. **Desktop View (>= 640px)**:
   - Open Low Stock Report.
   - Confirm table fills 100% screen width with NO horizontal scrollbar and all columns fully visible.
2. **Mobile View (< 640px)**:
   - Resize to mobile viewport.
   - Confirm table is hidden and replaced by clean vertical inventory cards.
   - Test search filter: verify cards filter in real-time as user types.
