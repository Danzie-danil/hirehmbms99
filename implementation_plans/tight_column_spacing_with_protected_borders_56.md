# Implementation Plan - Tight Table Column Spacing with Protected Outer Borders (56)

## Overview
Squish middle column distances across all tables to make data compact and tightly aligned, while preserving generous, protected padding on the outer table edges and borders.

## Proposed Changes

### [app/index.html](file:///d:/v2%20BMS%20OFFICIAL/app/index.html)
- Update universal `.overflow-x-auto table` styling:
  - Tighten internal column horizontal padding to `0.5rem` (mobile) and `0.65rem` (desktop) so adjacent columns sit close together without excessive empty space.
  - Maintain protected outer edge padding on `th:first-child`, `td:first-child` (`1.25rem` to `1.5rem` on the left) and `th:last-child`, `td:last-child` (`1.25rem` to `1.5rem` on the right).

### Version Management
- Bump version to `2.9.95` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.

## Verification Plan
- Run `npm run build` to verify 0 errors.
