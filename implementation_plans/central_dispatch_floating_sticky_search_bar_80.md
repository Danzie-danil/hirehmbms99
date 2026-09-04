# Implementation Plan - Central Dispatch Floating Sticky Search Bar

Detach the search bar from the Target Branch / Auto-Fill control grid card and position it as a clean floating sticky search bar directly beneath the top navigation for both desktop and mobile viewports.

## User Review Required
> [!NOTE]
> - The Search Items input is extracted from the 3-column controls grid into its own dedicated `sticky top-0 z-30` container.
> - On scroll, the search bar floats directly below the top nav bar on both desktop and mobile.
> - The Target Branch dropdown and Auto-Fill Low Stock button remain in the controls card arranged in a clean 2-column layout.

## Proposed Changes

### Central Inventory Dispatch Hub (`js/owner/central_inventory.js`)
- Extract `#dispatchSearchInput` into a standalone floating sticky component:
  ```html
  <div class="sticky top-0 z-30 py-2 mb-1 justify-center flex">
      <div class="relative max-w-lg w-full mx-auto">
          <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"></i>
          <input type="text" id="dispatchSearchInput" placeholder="${window.t('search_dispatch_items', 'Search by name, SKU, or category...')}" oninput="window.filterDispatchTable(this.value)" class="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 font-medium text-gray-900 dark:text-white rounded-full text-xs sm:text-sm shadow-sm outline-none focus:ring-2 focus:ring-emerald-500">
      </div>
  </div>
  ```
- Refactor the Controls card to a clean 2-column grid (`grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 items-end`) housing Target Branch selector and Auto-Fill Low Stock button with `rounded-full` styling.

### Version Bump & Release Notes (`release_notes.json`, `js/updateChecker.js`, `public/sw.js`)
- Bump version to `3.5.4`.
- Auto-sync `release_notes.json` with simple user-friendly notes.
- Recompile bundle via `npm run build`.

## Verification Plan
### Automated Verification
- `npm run build` to verify 0 build errors.
### Manual Verification
- Verify search bar floats and sticks cleanly below top nav during scroll on both desktop and mobile screens.
