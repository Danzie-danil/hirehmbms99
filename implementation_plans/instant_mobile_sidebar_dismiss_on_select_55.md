# Implementation Plan - Instant Mobile Sidebar Dismiss on Selection (55)

## Overview
Ensure that when a user selects any option in the sidebar (such as Analytics, Inventory, Dashboard, etc.), the mobile sidenav drawer immediately closes upon click instead of waiting for the view rendering/data fetching promise to complete.

## Proposed Changes

### [js/app.js](file:///d:/v2%20BMS%20OFFICIAL/js/app.js)
- In `switchView(viewId, context)`:
  - Immediately call `toggleSidebar(false)` at the very beginning of navigation (synchronously upon user interaction).
  - This ensures the sidenav drawer and backdrop dismiss instantly so the loading spinner and view transitions are immediately visible to the user.

### Version Management
- Bump version to `2.9.94` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.

## Verification Plan
- Run `npm run build` to verify 0 errors.
