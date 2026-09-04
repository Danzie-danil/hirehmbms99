# Implementation Plan - Table Row Separator Lines (57)

## Overview
Add crisp, subtle horizontal separator lines between all table body rows and beneath table headers across the application for improved row scanning and visual clarity in both light and dark modes.

## Proposed Changes

### [app/index.html](file:///d:/v2%20BMS%20OFFICIAL/app/index.html)
- Add universal border rules to `.overflow-x-auto table`:
  - `thead th`: crisp bottom border (`#e5e7eb` light / `rgba(75, 85, 99, 0.5)` dark).
  - `tbody td`: subtle row separator line (`#f3f4f6` light / `rgba(55, 65, 81, 0.4)` dark).
  - `tbody tr:last-child td`: remove bottom border so the last row fits flush with the container.

### Version Management
- Bump app version to `2.9.96` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.

## Verification Plan
- Run `npm run build` to verify 0 errors.
