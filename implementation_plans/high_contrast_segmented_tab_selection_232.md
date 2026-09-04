# Implementation Plan: High-Contrast Segmented Tab Selection (232)

## Problem Description
Across segmented tab capsules in the application (Owner Central Inventory navigation, Branch Items status filters, POS mode selector, Branch Sales filter modes, and Branch Expenses filter modes), the active tab previously used a washed-out white background (`bg-white shadow-xs`) on top of a light gray track container (`bg-gray-100`). Against white background cards, the contrast ratio was nearly 1:1, making it virtually impossible for users to discern which tab was currently selected without straining to see subtle text tints.

## Proposed Changes
1. **Owner Central Inventory Main Tabs (`js/owner/central_inventory.js`)**:
   - Replaced washed-out active tab styling with solid vibrant backgrounds and crisp white text:
     * `Inventory Products`: `bg-indigo-600 text-white shadow-sm font-black`
     * `Services`: `bg-purple-600 text-white shadow-sm font-black`
     * `Branch Items`: `bg-amber-600 text-white shadow-sm font-black` with inverted contrast badge pill (`bg-white/30 text-white`)
     * Unselected tabs: `text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-bold hover:bg-gray-200/50 dark:hover:bg-gray-700/50`
   - Updated stale shell detection in `renderOwnerInventoryModule()` (`#tabBtnInventory.bg-indigo-600`) to auto-purge and replace old cached tab DOM.
2. **Branch Items Status Filter Pills (`js/owner/central_inventory.js`)**:
   - `All Items`: `bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm font-black`
   - `Pending Approval`: `bg-amber-600 text-white shadow-sm font-black`
   - `Branch Isolated`: `bg-violet-600 text-white shadow-sm font-black`
   - Track container: `bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner`
3. **POS Mode Selector Tabs (`js/modals.js`)**:
   - `Quick Single Item` & `Multi-Item Cart (Batch)`: Active state styled with `bg-emerald-600 text-white shadow-sm font-black`, inactive with `text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50`.
   - Updated both initial modal template and dynamic `setSaleMode(mode)` handler.
4. **Branch Sales & Expenses Filter Toggles (`js/branch/sales.js` & `js/branch/expenses.js`)**:
   - Sales: `Today's Sales` active in `bg-emerald-600 text-white shadow-sm`, `Sales History` active in `bg-indigo-600 text-white shadow-sm`.
   - Expenses: `Today's Expenses` active in `bg-rose-600 text-white shadow-sm`, `Expense History` active in `bg-indigo-600 text-white shadow-sm`.
   - Inactive buttons updated to high-contrast legible slate with soft hover fill.
5. **App Version & Production Build**:
   - Incremented app version to `v3.9.253` across `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
   - Validated syntax with `node scripts/lint_check.cjs` (238 files, 0 issues).
   - Compiled production bundle with Vite via `npm run build` (7.03s, 0 errors).

## Verification Plan
- Automated syntax & lint check: `node scripts/lint_check.cjs` (Passed, 0 issues).
- Production build: `npm run build` (Passed, 0 errors).
- Live browser test at 1259x475 via `browser_subagent`: Verified active tab `Inventory Products` renders with solid high-contrast background and crisp white text.
