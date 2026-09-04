# Fix Update Checker Syntax Error & Restore Module Loading (v3.9.170)

## Problem Description
During startup, Vite failed to transform `js/updateChecker.js` with HTTP 500 (`Internal Server Error`), causing the browser to abort script loading and trigger the 5-second failsafe loader overlay. The root cause was an unclosed block in `executeAppUpdate()`, placing top-level `export function initUpdateChecker()` inside a function block.

## Proposed Changes

### Update Engine
- **[js/updateChecker.js](file:///d:/V2BmstzOfficial/js/updateChecker.js)**:
  - Fix syntax structure of `executeAppUpdate()`.
  - Restore proper platform handling (Capacitor Android, Windows Tauri, and Web PWA).
  - Move `initUpdateChecker()`, `showAppUpdateBanner`, `executeAppUpdate`, and `triggerAppUpdateBanner` to the module top level.
  - Bump `APP_VERSION` to `3.9.170`.

### Version & Release Notes
- **[release_notes.json](file:///d:/V2BmstzOfficial/release_notes.json)** & **[public/release_notes.json](file:///d:/V2BmstzOfficial/public/release_notes.json)**:
  - Update version to `v3.9.170`.

## Verification Plan
1. Run `node scripts/lint_check.cjs` to confirm 0 lint/syntax errors.
2. Run `npm run build` to ensure the Vite bundle transforms all 2000+ modules and produces 0 errors.
