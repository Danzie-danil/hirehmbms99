# Implementation Plan - Central Inventory Search & Filter Width Optimization

Reduce the overall width of the Central Inventory search bar and status filter dropdown for a more compact and elegant layout.

## Problem Description
Previously, the search input was configured with `flex-1` without a maximum width constraint, causing it to stretch across the full width of wide screens (spanning over 1000px). The user requested reducing the width of this control cluster.

## Proposed Changes

### `js/owner/central_inventory.js`
- Added `max-w-lg` container constraint on the search and filter header row.
- Sized the search input to `sm:max-w-xs` with `min-w-[160px]`.
- Sized the status filter dropdown compactly with `w-full sm:w-48`.

## Verification Plan
- Run `npm run build` to verify clean compilation with 0 errors.
- Confirm compact, responsive presentation of search and filter controls.
