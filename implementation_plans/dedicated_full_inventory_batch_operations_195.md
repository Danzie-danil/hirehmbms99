# Implementation Plan: Dedicated Full Inventory List for Batch Operations (#195)

## Overview
Currently, the Main Store Inventory lists items with 20 items per page. While pagination ensures fast rendering, managing bulk items (such as selecting and deleting dozens or hundreds of items at once across multiple pages) is inconvenient. 

This update introduces a **Dedicated Full Inventory Batch Manager** alongside the standard paginated view, allowing users to view the entire catalogue without page splitting and perform fast batch actions (Bulk Delete, Select All, Invert Selection, Select by Category, and Batch Restock/Dispatch).

---

## Key Features & User Experience:

### 1. Dedicated View / Subview Switcher
- In the top action bar of Central Inventory, add a dedicated **"Batch Manager"** (`data-lucide="layers"` or `"check-check"`) action button alongside "Restock Stock", "Purchase & Add Stock", and "Central Dispatch".
- Add a view toggle mode:
  - **Standard View (Paginated):** 20 items per page for day-to-day browsing and single-item operations.
  - **Batch Operations Mode (Full Catalogue):** Loads the complete inventory list in a dense, high-performance table with sticky action controls.

### 2. Full Inventory Batch Operations Interface
- **Global Selection Header:**
  - One-click **Select All (N items)** across the entire catalogue.
  - **Deselect All** and **Invert Selection**.
  - **Select by Category** quick-pill filters.
  - **Shift + Click Range Selection** to select blocks of rows in one click.
- **Sticky Batch Action Floating Bar:**
  - `Delete Selected (X items)` with safety count badge and confirmation modal.
  - `Restock Selected` / `Dispatch Selected`.
  - Live count indicator and total value calculation for selected items.
- **Dense High-Density Table / List:**
  - Checkbox column with visual selection highlighting.
  - Product name, SKU, Category badge, HQ Stock, Global Stock, Buying Cost, and Selling Price.
  - Search bar with instant real-time filtering without resetting selections.

### 3. Paginated View Cross-Page Selection Banner
- When checking "Select All" on the standard paginated table header, display an informative banner:
  - *"All 20 items on this page are selected. [Select all 70 items in Main Store Inventory]"*

---

## Proposed Changes:

### [`js/owner/central_inventory.js`](file:///d:/V2BmstzOfficial/js/owner/central_inventory.js)
1. **Add Batch Mode Toggle & Subview Handler (`openCentralBatchManagerView`):**
   - Render the dedicated Full Inventory Batch Manager view with full list rendering, range selection, category filter pills, and floating action dock.
2. **Implement Shift+Click Range Checkbox Selection:**
   - Allow clicking one checkbox and holding Shift to select all checkboxes in between.
3. **Add "Select All in Catalogue" Cross-Page Selection:**
   - Enhance `toggleSelectAllCentralItems` to support selecting both current page and entire filtered catalogue.
4. **Enhance Batch Deletion Execution:**
   - Leverage `dbCentralInventory.bulkDelete` with realtime broadcast mutation and local Dexie cache vanish animations.
