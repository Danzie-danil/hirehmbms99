# Implementation Plan - Custom Price Support for Multi-Item Batch Sales

## Goal
Enable branch users to set, adjust, and edit custom prices for individual line items when conducting multi-item cart batch sales in the Add Sale modal, aligning multi-item sales capabilities with single-item sales.

---

## User Review & Decisions

> [!NOTE]
> 1. **Batch Line Item Custom Price:** Added a `Custom` pricing tier toggle alongside `Retail` and `Wholesale` for products and `Standard Fee` / `Custom Fee` for service offerings inside each basket item row.
> 2. **Live Dynamic Subtotal Updates:** Integrated real-time number-formatted input fields allowing cashiers to type custom unit prices with immediate recalculation of the item subtotal and cart grand total without losing focus.
> 3. **Persistence & Payload Mapping:** Ensured `price_type: 'custom'`, `unit_price`, and custom `subtotal` are passed seamlessly through the sale creation pipeline and transaction payloads.

---

## Proposed Changes

### Add Sale Modal (`js/modals.js`)
- [MODIFY] `js/modals.js`:
  - Updated `window.updateSaleCartItemPriceType` to handle `priceType === 'custom'`, initializing with customPrice or existing unit price.
  - Enhanced `window.updateSaleCartItemCustomPrice` to parse formatted numeric strings and update live DOM subtotals and grand totals in real-time.
  - Updated `window.renderSaleCartTable` to render the `Custom` price toggle button and an inline number-formatted custom price input field for each cart item row.

---

## Verification Plan

### Automated Tests
1. `npm run build`
2. `node scripts/lint_check.cjs`

### Manual Verification
1. Open Add Sale modal in Branch / POS portal and switch to "Multi-Item Cart" tab.
2. Add products and services to the basket.
3. Click "Custom" on any product or service row and enter a custom unit price.
4. Verify that the line subtotal and Grand Total update dynamically in real time and that the batch sale is recorded with the custom price.
