# Implementation Plan - Table Action Column Row Alignment Fix

Fix vertical and border misalignment of the action buttons column separator line on inventory and data tables.

## Problem Description
In the Central Inventory table and listings, the horizontal row separator lines under the Actions column appeared misaligned (offset vertically) from the rest of the row. This occurred because the `<td>` element itself was given flex utility classes (`flex items-center justify-center`), removing its native table-cell display behavior and causing its height and bottom border to calculate independently from the parent row `<tr>`.

## Proposed Changes

### `js/owner/central_inventory.js`
- Converted the actions `<td>` back to a standard table cell (`display: table-cell`).
- Wrapped action buttons (`Dispatch`, `Edit`, `Delete`) inside an inner container (`<div class="inline-flex items-center justify-center gap-1">`).

### `app/index.html`
- Unified `vertical-align: middle;` on `.overflow-x-auto table th, .overflow-x-auto table td` to guarantee seamless baseline and border alignment across all table columns.

## Verification
- Run `npm run build` to verify clean module compilation with zero errors.
- Confirm full border-bottom continuity across all cells in table rows.
