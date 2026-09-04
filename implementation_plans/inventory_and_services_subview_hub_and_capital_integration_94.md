# Implementation Plan - Inventory & Services Navigation, Sub-Views & External Capital Integration

Rename the sidebar navigation item from **Central Inventory** to **Inventory & Services**, introduce an interactive sub-view selector (Physical Inventory vs Services & Offerings), customize labels and modal behaviors specifically for services (e.g. Add Service, Save Service, no dispatch or supplier fields), and integrate External Capital Sources in the Capital & Balance module.

---

## User Review Required

> [!IMPORTANT]
> - The sidebar link is renamed to **Inventory & Services** (`nav_central_inventory`).
> - Clicking this menu will present a dual-tab switcher: **📦 Physical Inventory** and **🛠️ Services & Offerings**.
> - When in **Services View**:
>   - Header & buttons display: **"Add Service"**, **"Save Service"**, **"Update Service"**.
>   - Physical stock dispatches, warehouse supplier pickers, and restock sheets are omitted.
>   - Funding options include an **"🌐 External Capital / Third-Party Source"** option.
> - The **Capital & Balance Sheet** module and `dbCapital.adjustBalance` are extended to gracefully recognize and track external third-party funding transactions.

---

## Proposed Changes

### 1. Navigation & Internationalization
#### [MODIFY] [`app/index.html`](file:///d:/v2%20BMS%20OFFICIAL/app/index.html)
- Update Owner navigation link label to `Inventory & Services` with a modern box-wrench icon.

#### [MODIFY] [`js/i18n.js`](file:///d:/v2%20BMS%20OFFICIAL/js/i18n.js)
- English: `nav_central_inventory: "Inventory & Services"`
- Swahili: `nav_central_inventory: "Bidhaa na Huduma"`

#### [MODIFY] [`src/components/layout/Sidebar.jsx`](file:///d:/v2%20BMS%20OFFICIAL/src/components/layout/Sidebar.jsx) & [`js/app.js`](file:///d:/v2%20BMS%20OFFICIAL/js/app.js)
- Align route titles and error/lock fallback strings to `"Inventory & Services"`.

---

### 2. Central Inventory & Services Hub (`js/owner/central_inventory.js`)
#### [MODIFY] [`js/owner/central_inventory.js`](file:///d:/v2%20BMS%20OFFICIAL/js/owner/central_inventory.js)
- Add top dual-tab switcher:
  - `[ 📦 Physical Inventory ]` (Stock levels, supplier orders, dispatches, audits).
  - `[ 🛠️ Services & Offerings ]` (Service fee rates, billing tiers, consumable expenses, active branch assignments).
- Add `window.setInventoryActiveTab('inventory' | 'services')`.
- Tailor view headers, stats, action buttons, and table schemas based on active tab:
  - **In Services tab**:
    - Primary CTA: `➕ Add Service`.
    - Quick actions: `📊 Service Revenue Analytics`, `🏷️ Service Categories & Pricing`.
    - Table columns: `Service Name`, `SKU / Code`, `Category`, `Standard Fee (Retail)`, `Partner Rate (Wholesale)`, `Operational Cost`, `Branch Distribution`, `Actions (Edit / Delete)`.
    - No physical "Dispatch" buttons.
- Tailor Add/Edit Modal:
  - If opened from Services view, default item type to `service`, change modal title to `Register New Service / Offering`, change button to `Save Service`, hide supplier selector, and show **External Capital Source (Third-Party / Direct Out of Pocket)** in funding capital dropdown.

---

### 3. Capital & Balance Sheet Integration (`js/db.js` & `js/owner/capital.js`)
#### [MODIFY] [`js/db.js`](file:///d:/v2%20BMS%20OFFICIAL/js/db.js)
- In `dbCapital.adjustBalance`, add special handling for `accountId === 'external'` to record an external drawing/injection entry into `capital_transactions` without causing missing-account errors on `capital_accounts`.

#### [MODIFY] [`js/owner/capital.js`](file:///d:/v2%20BMS%20OFFICIAL/js/owner/capital.js)
- Ensure transaction history displays `🌐 External Capital Source` badges for transactions funded outside traditional bank/mobile money/cash accounts.

---

## Verification Plan

### Automated Build Verification
```bash
npm run build
```

### Manual Verification
1. Click **Inventory & Services** in the Owner sidebar navigation.
2. Toggle between **📦 Physical Inventory** and **🛠️ Services & Offerings**.
3. Verify that in the **Services** tab:
   - Button says **"Add Service"**.
   - Modal has title **"Register New Service / Offering"** and button **"Save Service"**.
   - Funding source dropdown contains **"🌐 External Capital / Third-Party Source"**.
   - Table rows show service fees and do not show dispatch buttons.
4. Verify that in the **Physical Inventory** tab:
   - Standard inventory stock, supplier restocks, and dispatch workflows remain intact.
