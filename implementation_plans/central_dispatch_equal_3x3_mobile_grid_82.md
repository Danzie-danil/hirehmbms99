# Implementation Plan - Central Dispatch 3-Column Equal Floating Grid

Distribute the Search bar, Target Branch selector, and Auto-Fill Low Stock button equally across a 3-column grid (`grid-cols-3`) on mobile and desktop viewports.

## User Review Required
> [!NOTE]
> - Floating sticky bar uses `grid grid-cols-3 gap-1.5 sm:gap-3 w-full max-w-4xl mx-auto items-center`.
> - Each of the 3 controls (Search Input, Target Branch Select, Auto-Fill Button) is allocated exactly 1/3 (33.33%) width with `min-w-0` and text truncation to prevent mobile overflow.

## Proposed Changes

### Central Inventory Dispatch Hub (`js/owner/central_inventory.js`)
- Update the floating sticky header to use an equal 3-column grid:
  ```html
  <div class="sticky top-0 z-30 py-2 justify-center flex">
      <div class="grid grid-cols-3 gap-1.5 sm:gap-3 max-w-4xl w-full mx-auto items-center">
          <!-- 1/3: Search Input -->
          <div class="relative w-full min-w-0">...</div>
          <!-- 2/3: Target Branch Dropdown -->
          <div class="w-full min-w-0">...</div>
          <!-- 3/3: Auto-Fill Button -->
          <div class="w-full min-w-0">...</div>
      </div>
  </div>
  ```

### Version Bump & Release Notes (`release_notes.json`, `public/release_notes.json`, `js/updateChecker.js`, `public/sw.js`)
- Bump version to `3.5.6`.
- Auto-sync release notes and compile via `npm run build`.

## Verification Plan
### Automated Verification
- `npm run build` to verify 0 errors.
### Manual Verification
- Test mobile view (< 640px) to verify the 3 elements are distributed equally in a 3-column row without overlapping or overflowing.
