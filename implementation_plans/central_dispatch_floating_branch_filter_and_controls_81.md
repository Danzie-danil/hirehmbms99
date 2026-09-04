# Implementation Plan - Central Dispatch Floating Branch Filter & Controls

Unify Search, Target Branch Filter, and Auto-Fill Low Stock into a single floating sticky control bar directly beneath the top navigation for both mobile and desktop viewports, removing the redundant card container.

## User Review Required
> [!NOTE]
> - Target Branch selector is detached from the card and placed alongside Search and Auto-Fill Low Stock in the `sticky top-0 z-30` floating bar.
> - On desktop: Renders as a single unified horizontal strip (`Search | Target Branch | Auto-Fill`).
> - On mobile: Renders as a clean, compact stack of rounded-full pill controls.
> - The bulky enclosing card wrapper is completely eliminated for a clean, modern interface.

## Proposed Changes

### Central Inventory Dispatch Hub (`js/owner/central_inventory.js`)
- Unify the floating sticky bar (`sticky top-0 z-30 py-2 justify-center flex`) with:
  1. Search items input (`#dispatchSearchInput`)
  2. Target Branch premium select (`dispatchTargetBranchSelect`)
  3. Auto-Fill Low Stock button (`autoFillLowStockDispatch`)
- Remove the old redundant `<div class="bg-white ... Controls & Branch Selector Bar">` card.

### Version Bump & Release Notes (`release_notes.json`, `public/release_notes.json`, `js/updateChecker.js`, `public/sw.js`)
- Bump version to `3.5.5`.
- Auto-sync release notes and compile via `npm run build`.

## Verification Plan
### Automated Verification
- `npm run build` with 0 errors.
### Manual Verification
- Test desktop and mobile layout to verify the unified floating sticky header floats cleanly below the top nav during scroll.
