# Implementation Plan - Enhanced Visibility Table Row Separators (58)

## Overview
Increase the contrast and visibility of table row separator lines across all data listings, making individual rows distinct, easily scannable, and clearly delineated in both light and dark themes.

## Proposed Changes

### [app/index.html](file:///d:/v2%20BMS%20OFFICIAL/app/index.html)
- Boost table separator border contrast:
  - `thead th`: `border-bottom: 1.5px solid #d1d5db` (Light) / `rgba(107, 114, 128, 0.6)` (Dark).
  - `tbody td`: `border-bottom: 1px solid #e5e7eb` (Light) / `rgba(75, 85, 99, 0.55)` (Dark).
  - Retain `border-bottom: none` on `tbody tr:last-child td`.

### Version Management
- Bump app version to `2.9.97` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.

## Verification Plan
- Run `npm run build` to verify 0 errors.
