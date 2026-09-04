# Fix Sales Select Columns PostgREST 400 Bad Request Error

## Problem Description
A console network error occurred when fetching branch sales KPIs:
`GET https://ojnxraxdynbhddfviweb.supabase.co/rest/v1/sales?select=amount%2Cgross_profit%2Cprofit%2Ccost_amount%2Citems%2Citem_name%2Citem_type&branch_id=... 400 (Bad Request)`

## Root Cause
1. In `js/branch/sales.js` line 1165 (`fetchBranchSalesKPIsServer`), the query requested columns `profit`, `item_name`, and `item_type`.
2. In `public.sales`, the schema defines `amount, gross_profit, cost_amount, items, quantity, client_tx_id, customer, payment, price_type, created_at`. The columns `profit`, `item_name`, and `item_type` do not exist in the cloud database table, causing PostgREST to reject the query with `400 (Bad Request)`.
3. Similar references to `item_type` in `js/branch/shift_summary.js` (lines 11 and 222) were also querying `item_type` from `sales`.

## Proposed Changes
1. **Frontend Query Alignment**:
   - In `js/branch/sales.js`: Updated `fetchBranchSalesKPIsServer` to select only valid existing columns on `public.sales` (`amount,gross_profit,cost_amount,items,quantity,created_at`).
   - In `js/branch/shift_summary.js`: Removed `item_type` from `.from('sales').select(...)` queries in lines 11 and 222, relying on existing string parsing of `items`.
2. **Database Schema Robustness**:
   - Created migration `supabase/migrations/0001_ensure_sales_kpi_compatibility_columns.sql` and single-run script `supabase/migrations/0001_single_run_sales_kpi_compatibility_columns.sql` to add `item_type`, `item_name`, and `profit` columns if missing on `public.sales`.

## Verification Plan
1. Run `node scripts/lint_check.cjs` to ensure 0 syntax/lint errors.
2. Run `npm run build` to verify production bundling.
3. Bump app version to `v3.9.256`.
4. Update `Chat_History/chat_history.txt`.
