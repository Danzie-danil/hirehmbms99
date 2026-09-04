# Implementation Plan: Low Stock & Reorder Report Page View Conversion (218)

## Overview
Convert the **Low Stock & Reorder Report** from a floating popup modal into a full dedicated **page view** inside `#mainContent` (mirroring the architecture of Product Details `openBranchProductDetailsView`). This provides branch managers with maximum screen real estate, seamless scrolling, and persistent subview navigation with back-to-inventory state recovery.

---

## User Review Required

> [!IMPORTANT]
> - The report will occupy the full `#mainContent` canvas with a sticky header, 4-bento KPI cards, live search bar, full-width data table, and sticky bottom action bar.
> - Clicking `Back` or `Back to Inventory` cleanly returns to the Inventory Management grid without page reloads.
> - Session storage will track `low_stock_report` subview so tab switches and refreshes smoothly restore the report.

---

## Proposed Changes

### 1. Update Subview Router & Session Management (`js/branch/inventory.js`)
- In `renderInventoryModule()` subview check (around line 210):
  - Add detection for `savedSubView.subview === 'low_stock_report'` to automatically restore `window.openLowStockReportView()`.
- Create `window.closeLowStockReportView()`:
  - Clears `bms_branch_active_subview` from `sessionStorage`.
  - Restores `#mainContent` classes (`remove('!p-0', 'overflow-hidden')`, `add('overflow-y-auto')`).
  - Calls `renderInventoryModule()` to restore the inventory catalog.

### 2. Implement Dedicated Page View (`js/branch/inventory.js`)
- Refactor `window.openLowStockReportView()` (and alias `window.openLowStockReportModal = window.openLowStockReportView` for backwards compatibility with existing triggers):
  - Fetches branch inventory and calculates depleted items, out-of-stock items, safety deficits, and estimated replenishment capital.
  - Mounts into `#mainContent` with full height layout (`w-full h-full bg-white dark:bg-gray-900 overflow-hidden flex flex-col`):
    - **Header (`.modal-top-nav`)**: Back button, warning alert icon, title with item count badge, branch name & date, quick actions (`Download PDF`, `Export CSV`, `Dispatch & Share`).
    - **Main Content (`.modal-main-content`)**:
      - 4-Bento KPI metric cards (`Depleted SKUs`, `Out of Stock`, `Deficit to Restock`, `Est. Restock Capital`).
      - Live search bar and `Copy Text` button.
      - Full-width table inside `.overflow-x-auto` with hardware-accelerated scrolling.
    - **Bottom Footer (`.modal-bottom-nav`)**: Branch context summary, `Close / Back` button, and primary `Send to Owner` action.

---

## Verification Plan

### Automated & Build Verification
1. `node scripts/lint_check.cjs` (0 syntax/lint errors).
2. `npm run build` (successful compilation).

### Manual Verification
1. From Branch Inventory Management, click `Low Stock Report` button (or the `Report` link in Stat Card 4).
2. Verify it transitions smoothly into a full-page view inside the main content area (no floating modal overlay).
3. Verify the 4 KPI cards, live search, and full table render with all depleted items.
4. Test clicking `Back` or `Close`: verify it cleanly restores the Inventory Management catalog.
5. Test PDF download, CSV export, and WhatsApp dispatch from the page view.
