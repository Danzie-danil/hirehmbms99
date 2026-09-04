# Implementation Plan - Pre-Add Price Type Selector in Batch Sales

## Goal
Display price type options (Retail, Wholesale, Custom) and custom price configuration immediately upon selecting an item in multi-item cart batch sales mode before adding it to the basket, while preserving full in-basket editing capabilities.

---

## User Review & Decisions

> [!NOTE]
> 1. **Pre-Add Price Selection:** Choosing an item from the catalog dropdown reveals price tier buttons (`Retail`, `Wholesale`, `Custom`) and quantity controls directly in the quick add bar.
> 2. **Custom Price On-the-Fly:** Selecting `Custom` shows an inline unit price input allowing cashiers to set custom pricing prior to adding to basket.
> 3. **Dual Editable Support:** Items can be configured before adding to basket and remain fully editable (price tier, custom unit price, quantity) inside the basket list table.

---

## Proposed Changes

### Add Sale Modal (`js/modals.js`)
- [MODIFY] `js/modals.js`:
  - Added `window.onSaleCartProductChange` to trigger when a product or service is chosen in multi-item cart mode.
  - Added `window.setSaleCartQuickPriceType` to toggle price tiers (Retail, Wholesale, Custom) and show/hide the custom unit price input.
  - Updated `window.addSaleCartItemFromQuickBar` and `window.addSaleCartItem` to pass and apply the chosen price type and custom unit price.
  - Retained in-basket price tier switching and custom price inputs in `window.renderSaleCartTable`.

---

## Verification Plan

### Automated Tests
1. `npm run build`
2. `node scripts/lint_check.cjs`

### Manual Verification
1. Open Add Sale modal in Branch / POS portal and select "Multi-Item Cart".
2. Select an item from the dropdown and verify that the Price Type bar (Retail, Wholesale, Custom) and Qty immediately appear.
3. Click "Custom", adjust the price, and click "Add Item" to verify it enters the basket with the custom price.
4. Verify you can still edit or switch price tiers directly on items already inside the basket.
