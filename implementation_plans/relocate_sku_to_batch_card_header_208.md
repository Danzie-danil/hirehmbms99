# Implementation Plan - Move SKU Scanner to Batch Card Header

## Goal
Reposition the Barcode / SKU scanning input and camera scanner trigger to the header bar of the "Add Products to Basket" multi-item cart card in the Add Sale modal, expanding the catalog item selector for improved usability on POS terminals.

---

## User Review & Decisions

> [!NOTE]
> 1. **Header Layout Integration:** Relocated the `saleCartBarcode` input field and camera scanner trigger into the card's header next to "Clear Basket" with a sleek, compact container.
> 2. **Catalog Dropdown Expansion:** Expanded the primary item/service selector grid column span (`sm:col-span-8`) for cleaner readability and quicker item selection.

---

## Proposed Changes

### Add Sale Modal (`js/modals.js`)
- [MODIFY] `js/modals.js`:
  - Moved `#saleCartBarcode` and camera scanner action button into the card header.
  - Reorganized the grid below with `col-span-8` for the catalog item dropdown, `col-span-2` for quantity, and `col-span-2` for Add Item.

---

## Verification Plan

### Automated Tests
1. `npm run build`
2. `node scripts/lint_check.cjs`

### Manual Verification
1. Open Add Sale modal in Branch / POS portal and switch to "Multi-Item Cart".
2. Confirm the Barcode / SKU input and camera scanner icon are cleanly seated in the card header.
3. Confirm catalog item dropdown has generous width and barcode scanning functions normally.
