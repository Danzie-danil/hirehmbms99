# Implementation Plan: Service Tag in Sales List (170)

## 1. Overview & Goal
Ensure service offerings in the POS / Record New Sale modal dropdown and card lists display with a dedicated `(Service)` tag instead of showing `(Out of stock)` when physical quantity is 0.

## 2. Proposed Changes

### A. Sale Modal Dropdown Options (`js/modals.js` & `js/branch/sales.js`)
- Update `productSelectOptions` in `openAddSaleModal`:
  - Detect service offerings via `item.item_type === 'service' || item.unit === 'service' || item.category.includes('service')`.
  - Display label: `${item.name} (Service) - ${fmt.currency(item.retail_price || item.price || 0)}`.
  - Ensure `disabled: isOutOfStock` is false for all services.
- Update `_salePriceMap` and `refreshSaleProducts` in `js/branch/sales.js`:
  - Accurately categorize services as `item_type: 'service'` so price resolution and unlimited stock availability pills render correctly.

### B. Database & Local Sync (`js/db.js` & `supabase/migrations/0001_sync_service_item_types.sql`)
- Ensure `dbInventory.add` receives and stores `item_type: 'service'`.
- Provide SQL migration script `0001_sync_service_item_types.sql` to backfill `item_type = 'service'` on existing branch inventory items linked to central inventory services.

## 3. Verification Plan
1. Open Record New Sale modal.
2. Verify service items appear with `(Service)` tag and wrench icon in the dropdown list rather than `(Out of stock)`.
3. Select a service item and verify the stock hint badge shows `Service Offering · Unlimited Availability`.
4. Run `npm run build` and ensure 0 errors.
