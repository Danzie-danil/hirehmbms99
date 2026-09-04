# Implementation Plan - Central Inventory Search & Filter Center Alignment

Center align the search bar and stock filter dropdown above the Central Inventory table for visual symmetry.

## Problem Description
Following the reduction of the search and filter bar's width, the controls were left-aligned by default. The user requested center alignment for a balanced, premium aesthetic.

## Proposed Changes

### `js/owner/central_inventory.js`
- Added `flex justify-center` to the outer sticky header wrapper.
- Added `mx-auto w-full justify-center` to the inner `max-w-lg` flex container holding the search input and status filter dropdown.

## Verification Plan
- Run `npm run build` to verify clean compilation with 0 errors.
- Confirm horizontal centering of search and filter controls across viewports.
