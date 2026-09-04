# Implementation Plan - Desktop Central Dispatch Navigation Visibility & Action Header Placement

Ensure the **Central Dispatch Hub** action is prominently accessible on desktop / computer screens directly within the **Inventory & Services** header strip and Command Palette navigator, matching mobile feature parity.

## User Review Required
- No breaking changes.
- Preserves all completed features, real-time channels, offline caches, and business logic.

## Proposed Changes

### Central Inventory & Services (`js/owner/central_inventory.js`)
- Update the Bento Top Header Strip right action area when on the `Inventory Products` tab (`!isServicesTab`) to render both the emerald **Central Dispatch** button (`window.openCentralDispatchView()`) and the indigo **Purchase & Add Stock** button (`window.openCentralItemModal('product')`).
- Maintains mobile responsive layout (`flex flex-wrap sm:flex-row items-center gap-1.5 sm:gap-2`) with soft-depth hover/active states and tooltips.

### Global Navigator (`js/ui/globalNavigator.js`)
- Register `Central Dispatch Hub` in `Main Navigation` and `Quick Actions & Creation` for the Business Owner role to allow instant jumping via Quick Search (Cmd+K / Ctrl+K).

### App Version & Release Notes (`release_notes.json`, `public/release_notes.json`, `js/updateChecker.js`)
- Increment version to `3.8.3`.
- Update user-friendly release notes describing desktop dispatch header visibility and general improvements.

## Verification Plan
### Automated & Build Verification
- Execute `npm run build` to compile the Vite production bundle and service worker with 0 errors.

### Manual Verification
- Verify that `Inventory & Services` header on computer displays the emerald "Central Dispatch" button alongside "+ Purchase & Add Stock".
- Verify clicking "Central Dispatch" opens the Central Dispatch Hub (`window.openCentralDispatchView()`) with branch selector, batch inputs, auto-fill, and CSV import/export.
- Verify mobile quick shortcuts continue working properly.
