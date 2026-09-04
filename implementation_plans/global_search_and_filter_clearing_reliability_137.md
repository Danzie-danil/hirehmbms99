# Global Search & Filter Clearing & Reloading Reliability Plan

## Problem Statement
When users search or filter items across various modules in the application (such as Central Inventory, Stock Movements, Branch Inventory, Tasks, Suppliers, Dropdowns, etc.), clearing the search query or resetting the filter sometimes causes lists not to reload back or to fail due to missing references / destructive in-memory mutations. We need to audit and apply unified, non-destructive search and filter reset logic across all modules.

## Proposed Audit & Fixes

### 1. `js/branch/inventory.js` (Branch Inventory Search)
- Fix the ReferenceError in `window.handleInventorySearchInput`: replace undefined `refreshInventoryModuleData()` with `renderInventoryModule()`.
- Ensure clearing search (`""`) restores all items smoothly with pagination reset to page 1.

### 2. `js/owner/stock_movements.js` (Stock Movements Search & Filter)
- In `window.filterStockMovementsTable`, ensure master dataset `window._cachedStockMovements` is safely fetched asynchronously from `dbStockMovements.fetchAll(ownerId)` if in-memory cache is empty.
- Ensure clearing search input (`""`) or resetting branch/type filter to `'all'` properly re-evaluates all records against the full dataset.

### 3. `js/owner/tasks.js` (Owner Tasks Filter)
- Export and attach `window.setOwnerTasksStatusFilter` globally.
- Fix `renderPremiumSelect` property `onChange: 'window.setOwnerTasksStatusFilter(this.value)'`.
- Ensure resetting status filter to `'all'` or clearing search input restores all active tasks.

### 4. `js/modals.js` (Modal Search & Premium Dropdown Filtering)
- In `window.filterPremiumDropdown(id, query)`, ensure query is normalized `(query || '').toLowerCase().trim()` and `!q` always displays all options.
- In `window.filterStockTakeList(query)` and `window.filterSaleCustomers(query)`, ensure empty search strings instantly reveal all list items without residue hidden classes.

### 5. `js/utils.js` (Shared `filterList` Utility)
- Ensure `filterList(listId, query)` safely handles null/empty/undefined query strings, trimming whitespace, and ensuring every item with `data-search` has `style.display = ''` restored.

## Verification Plan
1. Test clearing search inputs across Branch Inventory, Owner Stock Movements, Tasks, and Modals.
2. Verify selecting "All Status" / clearing filter restores entire dataset without page reloads.
3. Run `npm run build` and ensure 0 compile/build errors.
4. Auto-sync version in `release_notes.json`, `public/release_notes.json`, `js/updateChecker.js`, and log in `Chat_History/chat_history.txt`.
