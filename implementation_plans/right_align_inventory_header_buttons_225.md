# Implementation Plan: Right-Align Central Inventory Header Action Buttons (225)

## Problem Description
In the Main Store Inventory module header strip (`js/owner/central_inventory.js`), the primary action buttons (`Restock Stock`, `+ Purchase & Add Stock`, `Central Dispatch`, `Download Stock Sheet`) were left-aligned on smaller/medium desktop widths and collided with the module title and tab switcher capsule.

## Proposed Changes
1. **`js/owner/central_inventory.js`**:
   - Update the Bento Top Header Strip flex layout to `flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 sm:gap-4`.
   - On the left container: wrap title and tab switcher gracefully with `flex flex-col sm:flex-row sm:items-center justify-between xl:justify-start gap-3`.
   - On the desktop action buttons container: enforce `hidden sm:flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 shrink-0 sm:ml-auto` to strictly align all action buttons to the right edge of the card across all viewport widths.
   - Add `whitespace-nowrap` to each button pill to prevent awkward multi-line text wrapping within individual buttons.

## Verification
- Checked syntax across 238 files using `node scripts/lint_check.cjs` (0 issues).
- Compiled production bundle via `npm run build` (9.04s, 0 errors).
- Bumped app version to `v3.9.245`.
