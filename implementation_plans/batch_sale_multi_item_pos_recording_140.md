# Implementation Plan: Batch Sales & Multi-Item Cart POS Recording (#branch)

## 1. Problem Statement & Background
Currently, the "Record New Sale" modal in the Branch portal is designed around a single item per transaction (e.g., 5 units of Soap). When a customer purchases 10 different products/services at once, the cashier is forced to record 10 separate transactions, generating 10 separate receipts and fragmenting accounting and customer records.

## 2. Proposed Solution & UX Architecture
Upgrade the Sale modal into a dual-mode POS checkout experience:
1. **Single Item (Quick Mode):** The existing fast 1-click single-item sale for instant walk-ins.
2. **Multi-Item Batch (Cart Mode):** A multi-line basket where cashiers can add multiple distinct items (via barcode scan or search dropdown), adjust quantities and prices per item, review line-item subtotals, and record the entire purchase in **one single transaction with one receipt**.

---

## 3. Key Components & Implementation Steps

### A. Sale Modal UI Redesign (`js/modals.js` `case 'addSale'`)
- **Mode Toggle Header:** "Single Item" vs "Batch / Multi-Item Basket".
- **Multi-Item Basket UI:**
  - **Quick Add Bar:** Barcode scanner + searchable item selector + "Add to Cart" button. Scanning an existing cart item automatically increments its quantity by 1.
  - **Cart Table / List:**
    - Line item thumbnail & title (e.g. *Sample Rice 50kg*).
    - Price type dropdown/pill per row (*Retail / Wholesale / Custom*).
    - Responsive quantity controls (`[-]` input `[+]`).
    - Line subtotal formatted in real-time (`TSh 150,000`).
    - Remove row button (`trash` icon).
  - **Live Totals Dock:**
    - Item Count (e.g., *10 items, 24 total units*).
    - Grand Total Amount (`TSh 1,245,000`).
    - Payment Method selector (Cash, Mobile Money, Card, Bank Transfer).
    - Customer selection (Walk-in or registered Customer).

### B. Business Logic & Submission Handler (`js/modals.js` `handleAddSale`)
- Detects whether submission is single-item or multi-item cart.
- Validates sufficient stock for all product lines before committing.
- Constructs an itemized summary string and structured `items` payload (e.g., `2x Milk, 3x Bread, 1x Juice`).
- Calculates cumulative gross amount.

### C. Database & Offline Storage (`js/db.js` `dbSales.add`)
- Invokes atomic `create_sale` RPC with itemized payload or runs atomic multi-item stock deduction.
- Deducts stock for each item from branch inventory in one atomic operation.
- Logs stock movement entries for all items under the same transaction.
- Full offline resilience: queues multi-item payloads in `offlineQueue.js` when offline, syncing cleanly upon reconnection.

### D. Single Itemized Thermal Receipt (`js/branch/sales.js` `generateReceipt`)
- Receipt template renders each line item in the basket with its respective quantity, unit price, and line subtotal.
- Prints total tax, payment method, customer details, and grand total in one clean printable receipt.

---

## 4. Proposed Changes Summary

| File | Changes |
| :--- | :--- |
| [`js/modals.js`](file:///d:/v2%20BMS%20OFFICIAL/js/modals.js) | Add Multi-Item Cart mode to Sale modal, interactive basket table, live subtotal math, and batch submit handler. |
| [`js/branch/sales.js`](file:///d:/v2%20BMS%20OFFICIAL/js/branch/sales.js) | Enhance `generateReceipt` to format itemized multi-line sales receipts cleanly. |
| [`js/db.js`](file:///d:/v2%20BMS%20OFFICIAL/js/db.js) | Ensure `dbSales.add` handles multi-item payloads and atomic inventory deductions. |
| [`js/utils/offlineQueue.js`](file:///d:/v2%20BMS%20OFFICIAL/js/utils/offlineQueue.js) | Support offline queue replay for multi-item cart payloads. |

---

## 5. Verification Plan

### Manual Verification
1. **Barcode & Quick Add Test:** Scan multiple items sequentially; verify cart appends new items and increments duplicate items.
2. **Price & Quantity Adjustment:** Change quantity and switch between Retail/Wholesale on individual items; verify live totals update instantly.
3. **Batch Checkout:** Complete a 5-item batch sale; verify:
   - Only 1 sale record is created in Sales History.
   - All 5 items have their branch inventory stock deducted correctly.
   - Stock movements ledger reflects all 5 item deductions linked to the sale.
   - The printed receipt shows all 5 items itemized with the correct grand total.
4. **Offline Resilience:** Disconnect internet, record a multi-item batch sale, reconnect; verify background sync processes the batch sale without errors.
5. **Build Verification:** Run `npm run build` and ensure 0 compilation errors.
