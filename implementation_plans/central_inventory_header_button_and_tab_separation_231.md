# Implementation Plan: Central Inventory Header Button and Tab Separation (231)

## Problem Description
In the Owner Central Inventory module (`js/owner/central_inventory.js`), the top header strip squeezed the module title, the tab switcher capsule (`Inventory Products`, `Services`, `Branch Items`), and four desktop action buttons (`Restock Stock`, `+ Purchase & Add Stock`, `Central Dispatch`, `Download Stock Sheet`) onto a single horizontal line. On standard desktop screens and laptop displays with the 240px sidebar open, this resulted in horizontal space exhaustion where the action buttons encroached directly on top of the tab switcher capsule, obscuring `Branch Items`. Additionally, cached DOM shells prevented runtime updates from cleanly re-mounting.

## Proposed Changes
1. **Header Layout Restructure (`js/owner/central_inventory.js`)**:
   - Split the Bento Top Header Strip into a clean, two-row responsive layout:
     - **Top Row**: Module Icon, Title ("Main Store Inventory", "Services & Offerings", or "Branch-Added Stock Items"), and current date on the left, paired with the desktop quick action buttons (`Restock Stock`, `+ Purchase & Add Stock`, `Central Dispatch`, `Download Stock Sheet`) right-aligned.
     - **Bottom Row**: A dedicated sub-navigation bar with a subtle top border (`border-t border-gray-100 dark:border-gray-700/60`), housing the pill tab switcher capsule (`Inventory Products`, `Services`, `Branch Items`) with complete breathing room and zero possibility of colliding with action buttons.
2. **Stale Shell Detection (`js/owner/central_inventory.js`)**:
   - Added automatic detection in `renderOwnerInventoryModule()` to check if the existing shell in the DOM lacks the two-row separated header layout (`hasUpdatedLayout`), automatically purging and remounting the fresh shell without requiring a hard cache wipe.
3. **Version Bump & Production Compilation**:
   - Bumped app version to `v3.9.251` across `release_notes.json`, `public/release_notes.json`, `js/updateChecker.js`, and compiled `public/sw.js`.
   - Verified 0 syntax/lint errors with `node scripts/lint_check.cjs`.
   - Compiled production bundle via `npm run build`.

## Verification Plan
- Syntax/Lint check: `node scripts/lint_check.cjs` (Passed with 0 errors).
- Build check: `npm run build` (Passed in 5.32s).
