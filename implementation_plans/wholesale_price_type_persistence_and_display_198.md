# Wholesale Price Type Persistence and Display Implementation Plan (#198)

## Overview
When sales are recorded with wholesale pricing at a branch, the `price_type` attribute was not being written into `public.sales` in PostgreSQL due to `create_sale` RPC lacking `price_type` in its `INSERT` statement. Additionally, frontend UI tables displayed cryptic `JML`/`RTL` acronyms or fell back to `'retail'`. This implementation fixes database persistence, heuristic fallback detection, and UI badges across Branch Sales, Owner Reports, and PDF exports.

## Proposed Changes

### 1. Database Schema & RPC
- **SQL Migration**: [`supabase/migrations/0001_fix_create_sale_price_type_persistence.sql`](file:///d:/V2BmstzOfficial/supabase/migrations/0001_fix_create_sale_price_type_persistence.sql)
  - Ensures `price_type` column exists on `public.sales` table with default `'retail'`.
  - Updates `create_sale` RPC function to persist `v_valid_price_type` directly into `public.sales (..., price_type)`.
- **Single Run Migration**: [`supabase/migrations/0001_single_run_fix_create_sale_price_type.sql`](file:///d:/V2BmstzOfficial/supabase/migrations/0001_single_run_fix_create_sale_price_type.sql)

### 2. Frontend & Reporting Views
- **Branch Sales List** ([`js/branch/sales.js`](file:///d:/V2BmstzOfficial/js/branch/sales.js)):
  - Replaced acronyms (`JML`, `RTL`, `CST`) with clear badges (`Wholesale`, `Retail`, `Custom`).
  - Added robust price type fallback resolution parsing item descriptions, arrays, and JSON objects.
- **Branch Reports** ([`js/branch/reports.js`](file:///d:/V2BmstzOfficial/js/branch/reports.js)):
  - Enhanced price type resolution in sales audit tables to accurately identify wholesale transactions.
- **Owner Financial Reports** ([`js/owner/financial_reports.js`](file:///d:/V2BmstzOfficial/js/owner/financial_reports.js)):
  - Display full badges (`Wholesale`, `Retail`, `Custom`) in the sales transaction ledger.
- **PDF Report Engine** ([`js/owner/report_pdf_engine.js`](file:///d:/V2BmstzOfficial/js/owner/report_pdf_engine.js)):
  - Accurately tags each transaction with `[Wholesale]` or `[Retail]` under unit price and payment methods.
- **Sale Details Modal** ([`js/modals.js`](file:///d:/V2BmstzOfficial/js/modals.js)):
  - Added `Price Type` badge to Payment row in the Sale Details modal.

## Verification
- Run `npm run build` to verify clean compilation.
- Version bumped to `v3.9.208`.
