# Central Inventory Global Stock Calculation Fix Plan (146)

## Problem Description
The Central Inventory table displays `STOCK (HQ / GLOBAL)`, where HQ is the main warehouse stock and Global is the aggregate physical stock distributed across all operational branches.
Previously, `dbCentralInventory.fetchAll` only queried `central_inventory` without joining or aggregating branch `inventory` items. As a result, `i.inventory` was undefined, causing `i.globalQty` to always evaluate to `0` (e.g. `350 / 0`) even after units were dispatched and assigned to branches.

## Proposed Changes

### 1. `js/owner/central_inventory.js`
- Create `window.populateCentralItemsWithBranchInventory(items, ownerId)`:
  - Fetches all branches owned by the owner (`state.branches` / `supabase.from('branches')`).
  - Fetches all branch inventory items from the `inventory` table across those branch IDs.
  - Matches branch items to central catalog items by `central_item_id`, `sku`, or `name`.
  - Calculates accurate `i.globalQty` and `i.branchCount` for each central item.
- Call `window.populateCentralItemsWithBranchInventory` in:
  - `renderOwnerInventoryModule`
  - `filterCentralInventoryList`
  - `filterModalCentralInventory`

## Verification Plan
- Verify with `npm run build` (0 lint/build errors).
- Test that Global stock reflects all branch quantities assigned to central catalog items.
