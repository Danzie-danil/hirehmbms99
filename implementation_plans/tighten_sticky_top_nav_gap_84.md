# Implementation Plan - Tighten Sticky Controls Gap Below Top Nav

Tighten the vertical gap between the sticky floating controls (Search & Filters) and the bottom border of the top navigation bar to create a sleek, minimal gap on both mobile and desktop viewports.

## User Review Required
> [!NOTE]
> - Reduces the top padding on the sticky floating container from `py-2` to `pt-0.5 pb-1` (2px top gap on mobile, 4px on desktop).
> - Applies to both Central Dispatch Hub and Central Inventory sticky headers for visual consistency.

## Proposed Changes

### Central Inventory & Central Dispatch Hub (`js/owner/central_inventory.js`)
- Update Central Dispatch sticky floating container:
  ```html
  <div class="sticky top-0 z-30 pt-0.5 pb-1 sm:pt-1 sm:pb-1.5 justify-center flex">
  ```
- Update Central Inventory sticky floating container:
  ```html
  <div class="hidden sm:flex sticky top-0 z-30 pt-0.5 pb-1 sm:pt-1 sm:pb-1.5 mb-2 justify-center">
  ```

### Version Bump & Release Notes (`release_notes.json`, `public/release_notes.json`, `js/updateChecker.js`, `public/sw.js`)
- Bump version to `3.5.8`.
- Auto-sync release notes and compile via `npm run build`.

## Verification Plan
### Automated Verification
- `npm run build` to verify 0 errors.
### Manual Verification
- Verify the gap between top nav bottom border and the sticky elements is tight and minimal during scroll and at rest.
