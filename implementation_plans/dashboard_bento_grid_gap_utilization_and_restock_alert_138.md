# Dashboard Bento Grid Gap Utilization & Stock Health Widget (138)

## Overview
Transform empty dashboard gaps and asymmetric voids into high-value executive intelligence:
1. **Top KPI Row Gap:** Eliminate the empty 6th slot by converting the KPI container to a responsive 5-column executive strip (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` with `col-span-2 sm:col-span-1 lg:col-span-1` for the 5th card on mobile).
2. **Right Column Empty Void:** Eliminate the massive empty space below the Activity Feed by introducing a dedicated **"Stock Health & Low Stock Alerts"** widget in the right column, balancing all 3 Bento columns with 2 cards each.
3. **Balanced Column Grid:** Equalize the 3-column Bento grid on desktop (`lg:grid-cols-3` / `lg:col-span-4` each) for harmonious proportions and clean vertical cadence.

## Proposed Changes

### `js/owner/overview.js`
- Update `#overviewKPIs` grid classes to `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`.
- Make the 5th KPI card (`Expected Sales`) span `col-span-2 sm:col-span-1 lg:col-span-1` so there are no awkward gaps on 2-col mobile screens.
- Equalize the Bento column structure (`lg:col-span-4`, `lg:col-span-4`, `lg:col-span-4`).
- Add the `#lowStockAlertWidget` card in the right column beneath `#activityFeed`.
- Hydrate `#lowStockAlertWidget` during `_populateOverviewDOM()` from `payload.inventory` (identifying items where stock is low or below reorder level, with direct 1-click restock reminder action or "All Stock Optimal" status).
- Standardize activity feed height (`max-h-[200px]`) so both cards in the right column align cleanly with the left and center columns.

### App Versioning & Release Notes
- Bump version to `v3.9.71` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
- Run `npm run build` to verify clean build and sw compilation.
- Record all changes in `Chat_History/chat_history.txt`.

## Verification Plan
1. `npm run build` validation.
2. Verify visual balance across desktop, tablet, and mobile breakpoints.
