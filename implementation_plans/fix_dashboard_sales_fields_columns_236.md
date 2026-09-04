# Fix Dashboard Repository Sales Fields 400 Bad Request Error

## Problem Description
A console network error occurred when loading the dashboard sales:
`GET https://ojnxraxdynbhddfviweb.supabase.co/rest/v1/sales?select=id%2Cbranch_id%2Ccustomer_name%2Camount%2Ccost_amount%2Cgross_profit%2Ccreated_at%2Cpayment%2Cpayment_method&branch_id=in.(...) 400 (Bad Request)`

## Root Cause
In `js/data/repositories/dashboardRepository.js` line 308:
```javascript
const salesFields = 'id, branch_id, customer_name, amount, cost_amount, gross_profit, created_at, payment, payment_method';
```
The query requests `customer_name` and `payment_method`. In the database table `public.sales`, the canonical column names are `customer` and `payment`. Because `customer_name` and `payment_method` do not exist on `public.sales`, Supabase PostgREST rejects the query with HTTP `400 Bad Request`.

## Proposed Solutions
1. **Database-Level Aliasing (Recommended)**:
   - Provide migration `supabase/migrations/0001_ensure_sales_customer_name_and_payment_method.sql` and single-run script `supabase/migrations/0001_single_run_sales_customer_name_and_payment_method.sql`.
   - Adds `customer_name`, `payment_method`, `profit`, `item_type`, and `item_name` columns to `public.sales` with an automatic trigger (`trg_sync_sales_column_aliases`) to keep canonical and alias columns bi-directionally synchronized.
   - This resolves the issue immediately without requiring dangerous modifications to core real-time sync engines.
2. **Frontend Protection Rule**:
   - `js/data/repositories/dashboardRepository.js` is protected under the workspace rule ("Strict Real-Time & Data Sync Protection Guard"), which mandates asking the user twice to confirm before touching real-time sync files.
