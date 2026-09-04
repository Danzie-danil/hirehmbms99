# Implementation Plan - Central Dispatch Search & Branch Floating Bar

Dedicate the sticky floating bar directly beneath the top navigation exclusively to the Search Bar and Target Branch Selector side-by-side on both mobile and desktop, and move Auto-Fill Low Stock to the top header action buttons.

## User Review Required
> [!NOTE]
> - The sticky floating header includes ONLY the Search input and the Target Branch dropdown side-by-side.
> - The Auto-Fill Low Stock button is placed in the top header action row alongside CSV Template and Upload CSV.

## Proposed Changes

### Central Inventory Dispatch Hub (`js/owner/central_inventory.js`)
- Update the floating sticky bar (`sticky top-0 z-30 py-2 justify-center flex`) to contain exclusively:
  1. Search input (`#dispatchSearchInput`)
  2. Target Branch dropdown (`dispatchTargetBranchSelect`)
- Position the Auto-Fill Low Stock button into the top header actions row alongside the CSV import/export buttons.

### Version Bump & Release Notes (`release_notes.json`, `public/release_notes.json`, `js/updateChecker.js`, `public/sw.js`)
- Bump version to `3.5.7`.
- Auto-sync release notes and compile via `npm run build`.

## Verification Plan
### Automated Verification
- `npm run build` to verify 0 errors.
### Manual Verification
- Verify the floating bar below top nav contains exclusively Search and Target Branch on both mobile and desktop.
