# Unpack Batch Sales Line Items in Reports Implementation Plan (#199)

## Overview
When sales are recorded in batch mode (multi-item POS cart transactions), the item descriptions were aggregated into a comma-separated string (e.g. `"Air pids, 3x BAR SOAPS"`). As a result, product catalog lookups failed, causing the in-stock countdown to evaluate to 0 and hiding individual product quantities and unit prices. This implementation unpacks batch sales into distinct, individual line item rows across the Sales Audit Table, PDF exports, and owner reporting views.

## Changes Implemented

### 1. Universal Line Item Extractor (`js/owner/report_pdf_engine.js`)
- Created `extractSaleLineItems(sale, branchInventory, centralItems)` that parses:
  1. `sale.cart_items` array
  2. `sale.items` JSON serialized arrays
  3. `sale.items` comma-separated item summary strings with quantities (e.g. `"Air pids, 3x BAR SOAPS"`)
  4. Single product transactions
- Returns structured items with `name`, `product_id`, `sku`, `qty`, `unit_price`, `total_price`, `price_type`, and `item_type`.

### 2. Precise Chronological In-Stock Tracing (`js/owner/report_pdf_engine.js`)
- Iterates backwards through individual unpacked line items so each product (e.g. `Air pids`, `BAR SOAPS`) calculates its own exact chronological in-stock count (`currentQty + subsequentSold`).

### 3. Sales Audit Log & PDF Report Expansion
- **PDF Report Engine** ([`js/owner/report_pdf_engine.js`](file:///d:/V2BmstzOfficial/js/owner/report_pdf_engine.js)):
  - Expanded `salesBody` from transaction-level rows to itemized product lines.
  - Each row shows: `Date / Time`, `Customer / Entity`, `Items / Products Sold`, `In stock` (exact count), `Qty`, `Unit Price` (`[Wholesale]`/`[Retail]`), and `Total Sales Price`.
- **Branch Reports Preview** ([`js/branch/reports.js`](file:///d:/V2BmstzOfficial/js/branch/reports.js)):
  - Updated HTML table to unpack batch sales into individual product rows.
- **Owner Financial Reports Preview** ([`js/owner/financial_reports.js`](file:///d:/V2BmstzOfficial/js/owner/financial_reports.js)):
  - Unpacked batch sales in the owner sales transaction log.

## Verification
- Clean build verified via `npm run build` (exit code 0).
- Version bumped to `v3.9.209`.
