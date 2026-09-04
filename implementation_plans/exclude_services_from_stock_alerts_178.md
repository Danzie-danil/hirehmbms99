# Exclude Services from Stock Alerts Across Branch and Owner Portals (v3.9.171)

## Problem Description
Services (which are non-physical offerings with zero inventory count) were being evaluated for low-stock thresholds in certain Owner and Branch dashboard widgets, KPI counters, telemetry aggregations, reports, and detail modals. The user requested that services must not trigger or be included in stock alerts for both branches and owners.

## Proposed Changes

### Owner Overview & Dashboards
- **[js/owner/overview.js](file:///d:/V2BmstzOfficial/js/owner/overview.js)**: Exclude services (`item_type === 'service'`, category containing `service`, or unit `service`) from low-stock items and restock alert cards in the owner overview.
- **[js/branch/dashboard.js](file:///d:/V2BmstzOfficial/js/branch/dashboard.js)**: Exclude services from the branch dashboard inventory alert section and low-stock count.

### Central & Branch Inventory Modules
- **[js/owner/central_inventory.js](file:///d:/V2BmstzOfficial/js/owner/central_inventory.js)**: Ensure central inventory low-stock metrics, batch restock, and dispatch tools exclude services.
- **[js/branch/inventory.js](file:///d:/V2BmstzOfficial/js/branch/inventory.js)**: Ensure robust service filtering across branch inventory cards, low stock alerts, and restock actions.

### Analytics, Reports & Modals
- **[js/owner/analytics.js](file:///d:/V2BmstzOfficial/js/owner/analytics.js)**: Exclude services from low stock / out of stock telemetry.
- **[js/owner/report_pdf_engine.js](file:///d:/V2BmstzOfficial/js/owner/report_pdf_engine.js)**: Exclude services from low stock count in PDF summary cards and table status tags.
- **[js/modals.js](file:///d:/V2BmstzOfficial/js/modals.js)**: Ensure branch details modal, stock stat cards, and quick restock ignore services for low stock calculations.

### Version & Release Notes
- **[release_notes.json](file:///d:/V2BmstzOfficial/release_notes.json)** & **[public/release_notes.json](file:///d:/V2BmstzOfficial/public/release_notes.json)** & **[js/updateChecker.js](file:///d:/V2BmstzOfficial/js/updateChecker.js)**: Bump version to `v3.9.171`.

## Verification Plan
1. Run `node scripts/lint_check.cjs` to confirm 0 lint/syntax errors.
2. Run `npm run build` to ensure successful bundle compilation.
