# Implementation Plan: Service KPIs and Sales History Tagging (171)

## 1. Overview & Goal
Separate product order counts from service offerings across POS KPI cards (e.g. `0 orders, 1 service(s)`), and attach distinct purple `🛠️ Service` badges to service transactions in the Sales History ledger.

## 2. Proposed Changes

### A. Sales KPI Dashboard Card (`js/branch/sales.js`)
- Update `renderSalesStatsDOM(summary, profit, breakdown)`:
  - Dynamically format Today's Sales subtitle as `${prodOrders} orders, ${services} services` when both or services exist.
  - Dynamically format Transactions card subtitle as `${prodOrders} ord · ${services} svc`.
- In `refreshSalesModuleData()`:
  - Calculate breakdown of today's sales into product orders vs service offerings.

### B. Sales History Ledger & Details (`js/branch/sales.js` & `js/modals.js`)
- In `sales.map(...)`:
  - Identify service transactions by matching with catalog service names or `item_type === 'service'`.
  - Render purple `🛠️ Service` badge and hide `RTL`/`JML` wholesale badges.
  - Highlight revenue amount in purple.
- In `openDetailsModal('sale', id)` / `case 'saleDetails'`:
  - Display `🛠️ Service` pill in the header and apply purple branding to revenue.

## 3. Verification Plan
1. Open Sales Register.
2. Verify Today's Sales KPI card subtitle accurately displays product orders and services separately (e.g. `0 orders, 1 service`).
3. Verify the Sales History list displays `1x ANDIKO LA MRADI` with a purple `🛠️ Service` badge.
4. Run `npm run build` and ensure 0 errors.
