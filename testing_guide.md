# 🧪 Complete Step-by-Step Testing Guide — 7 New Features

Use this guide to test all 7 newly implemented features in your local environment.

---

## 📍 1. Enhanced Till Reconciliation (Phase 1)
**Where to find**: Navigation → **Cash Drawer** (*Kashe la Pesa*)

### Test Steps:
1. Open the **Cash Drawer** module.
2. Click the **"Close Till & Reconcile"** (*Funga Kashe*) button.
3. Observe the full-page reconciliation view displaying:
   - **Opening Float** (*Float ya Kuanzia*)
   - **Today's Cash Sales** (*Mauzo ya Pesa Taslimu*)
   - **Expected Cash** (*Pesa Inayotarajiwa*)
4. Enter an **Actual Cash Counted** number in the input field.
5. Watch the live **Variance Indicator** update in real time:
   - 🟢 **Green**: Balanced ($0.00)
   - 🔵 **Blue**: Cash Surplus (Over)
   - 🔴 **Red**: Cash Deficit (Short)
6. Enter a cash deficit/surplus to see the **Discrepancy Explanation** field appear (required when variance ≠ 0).
7. Click **Submit Till Close**.
8. **Check Owner View**: Log in as Owner or switch to Owner → **Requests** (*Maombi*). Locate the **Till Close Summary Card** showing full metrics, discrepancy notes, and action buttons (*Acknowledge* / *Flag*).

---

## 📍 2. One-Tap Restock Request (Phase 2)
**Where to find**: Navigation → **Inventory** (*Stoo/Bidhaa*)

### Test Steps:
1. Go to **Inventory**. Find or filter for low-stock items.
2. Click the amber **`⚡ Request Restock`** (*Omba Bidhaa*) button on any low-stock item card.
3. Observe the full-page Restock view:
   - Current Stock & Minimum Threshold
   - **Suggested Reorder Qty** (automatically calculated from 7-day sales velocity)
4. Modify requested quantity if desired and type a reason in the notes field.
5. Click **Submit Request**.
6. **Check Owner View**: Switch to Owner → **Requests**. See the **Restock Request Card** with item details, sales velocity metric, requested quantity, and an **Approve & Dispatch** button.

---

## 📍 3. Daily Sales Target Progress Bar (Phase 2)
**Where to find**: Navigation → **Branch Dashboard**

### Test Steps:
1. Navigate to the **Branch Dashboard**.
2. Locate the **Daily Sales Target Progress Bar** card below the KPI grid.
3. Observe:
   - Animated progress bar with dynamic color gradients (Red `<60%`, Amber `60-99%`, Green `100%+`).
   - Motivational message in Swahili/English (*Lengo limefikiwa!* / *Ongeza juhudi!*).
   - **Top 3 Best Sellers Today** displayed as interactive chips at the bottom.

---

## 📍 4. Customer Partial Payments & WhatsApp Receipt (Phase 3)
**Where to find**: Navigation → **Customers** (*Wateja*)

### Test Steps:
1. Open the **Customer Directory**.
2. Find any customer with an outstanding debt (red debt badge).
3. Click **"Record Payment"** (*Rekodi Malipo*).
4. In the full-page payment form, enter a partial payment amount.
5. Watch the **Remaining Balance Preview** calculate live as you type.
6. Click **Record Payment** to submit to the database.
7. Click **Share Debt Reminder via WhatsApp** (*Tuma Risiti kwa WhatsApp*).
   - Check that a `wa.me` URL opens in a new tab formatted with customer name, payment amount, remaining balance, and branch name.

---

## 📍 5. Physical Stock Take Audit (Phase 3)
**Where to find**: Navigation → **Inventory** → **Stock Take** (*Kuhesabu Stoo*)

### Test Steps:
1. Go to **Inventory**.
2. Click the **"Stock Take"** (*Kuhesabu Stoo*) button in the top header toolbar.
3. Observe the full-page physical count audit table listing all branch items.
4. Use the search bar to filter items by name/SKU.
5. Enter physical counts into the **Physical** input boxes.
6. Observe the live **Variance Column** (`+` or `-` indicator color-coded).
7. Click **Submit Stock Take Report**.
8. **Check Owner View**: Switch to Owner → **Requests**. View the **Stock Take Audit Card** listing total counted items, items with variance, and an itemized audit table.

---

## 📍 6. Camera Barcode & QR Code Scanner (Phase 4)
**Where to find**: Sales Register header OR **New Sale** modal

### Test Steps:
1. Go to **Sales Register** or click **New Sale**.
2. Click the **`📷 Camera Scan`** button next to the SKU input.
3. Allow camera access in your browser.
4. Point your camera at a barcode/QR code (or test with manual search bar inside the overlay).
5. Upon detection:
   - Notice the sound/vibration alert.
   - The scanner modal closes automatically.
   - The matching item is selected in the sale dropdown.
   - Focus jumps directly to the Quantity field!

---

## 📍 7. Offline Sales Queueing & Auto-Sync (Phase 4)
**Where to find**: Anywhere in app (Sales / POS)

### Test Steps:
1. Open Browser DevTools (**F12**) → **Network** tab → set throttling to **Offline** (or turn off Wi-Fi).
2. Observe the **Offline Status Banner** appear at the bottom-right corner (*⚡ Offline Mode — 0 offline sales queued*).
3. Open **New Sale** modal and record a sale. Click submit.
4. Observe toast: *⚡ Sale queued offline (1 pending sync)*.
5. Notice the offline banner updates to show *1 offline sale queued*.
6. In DevTools Network tab, set throttling back to **Online** (or reconnect Wi-Fi).
7. Watch the auto-sync engine trigger automatically (or click **"Sync Now"** in the banner).
8. Observe toast: *✅ All offline sales synced!* and the Sales Register updates!
