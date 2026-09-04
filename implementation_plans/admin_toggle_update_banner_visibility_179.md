# Admin Capability to Hide/Unhide App Update Banner (v3.9.172)

## Problem Description
Admins need the ability to hide or unhide the in-app update banner (`#bms-codebase-update-banner`) across the system. When hidden, users will not see the top update banner during deployments; when unhidden, users will immediately see the update banner when a new version is released.

## Proposed Changes

### Update Engine & Checker
- **[js/updateChecker.js](file:///d:/V2BmstzOfficial/js/updateChecker.js)**:
  - Add `isUpdateBannerAllowed()` and `setUpdateBannerVisibility(visible)` functions.
  - Check visibility preference before displaying update banner.
  - Dynamically remove the banner from the DOM when set to hidden, and trigger check when set to visible.
  - Listen to `sys_settings_update` events and sync initial state from `sys_settings`.

### Admin Dashboard & Platform Controls
- **[js/admin/dashboard.js](file:///d:/V2BmstzOfficial/js/admin/dashboard.js)**:
  - Add `show_update_banner` property to `adminSettings` (default `true`).
  - Load and sync `show_update_banner` from `sys_settings` in `loadAdminData()`.
  - Add "App Update Banner" switch in `renderSiteControls()` under Global System Switches.
  - Implement `window.toggleUpdateBannerControl()`.

### Admin Communications Hub
- **[js/admin/communications.js](file:///d:/V2BmstzOfficial/js/admin/communications.js)**:
  - Add "In-App Update Banner Controller" card in In-App History & Alerts tab with instant toggle and live banner preview.

### Version & Release Notes
- Bump app version to `v3.9.172` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.

## Verification Plan
1. Run `node scripts/lint_check.cjs` to confirm 0 lint/syntax errors.
2. Run `npm run build` to verify production bundle compilation.
