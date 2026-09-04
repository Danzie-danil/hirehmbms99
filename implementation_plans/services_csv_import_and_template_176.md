# Implementation Plan - Services CSV Import & Template Integration (#owner, #services, #csv, #import)

## Overview
Currently, BMSTz supports bulk CSV/Excel import specifically tailored for physical inventory products (requiring warehouse stock, purchasing cost, wholesale/retail prices, low stock alert thresholds, etc.). However, services and offerings have distinct business parameters: they do not hold physical stock counts, but instead have customer service pricing (standard billing rate), optional direct service costs/expenses, and dedicated service categories.

This plan details the implementation of a dedicated **Services CSV Template & Bulk Importer** system that allows business owners to import hundreds of service offerings in one click.

---

## Proposed Architecture & Changes

### 1. Dedicated Service CSV Template Generation (`js/owner/central_inventory.js`)
- Function: `window.downloadServicesCSVTemplate()`
- Template file name: `services_catalog_template.csv`
- Header Columns:
  1. `name` - Service / Offering Name (e.g. "Full Synthetic Oil Change", "Men's Haircut & Beard Trim", "Tax Audit & Advisory") *(Required)*
  2. `category` - Service Category (e.g. "Automotive Maintenance", "Salon & Grooming", "Professional Services")
  3. `service_price` - Amount charged to the customer / Rate *(Required)*
  4. `cost_price` - Direct cost / operational expenses incurred to perform the service *(Optional, defaults to 0)*
  5. `sku` - Service Code / Identifier (e.g. "SRV-101", auto-generated if left blank)
  6. `description` - Details / Notes regarding the service offering *(Optional)*
- Includes comprehensive right-side instruction guide and realistic sample rows.

---

### 2. Dedicated Service CSV/Excel Import Processor (`js/owner/central_inventory.js`)
- Function: `window.importServicesCSV()`
- Leverages `window.triggerCSVUpload` to accept `.csv`, `.xlsx`, `.xls` spreadsheets.
- Smart header key matching for variations:
  - Name: `name`, `servicename`, `service_name`, `item_name`, `title`
  - Category: `category`, `service_category`, `cat`
  - Price: `service_price`, `serviceprice`, `price`, `retail_price`, `selling_price`, `rate`, `fee`
  - Cost: `cost_price`, `costprice`, `direct_cost`, `cost`, `expense`, `purchase_price`
  - SKU: `sku`, `service_code`, `code`, `id` (Auto-generated with `SRV-` prefix if blank)
  - Description: `description`, `notes`, `details`
- Processing pipeline:
  1. Validates non-empty rows and required service name.
  2. Auto-registers category in `dbCategories.ensureCategory(ownerId, category, 'service')`.
  3. Inserts service item into `dbCentralInventory` with `item_type: 'service'`, `main_store_stock: 0`, `min_threshold: 0`.
  4. Automatically maps and creates the service item across all active branches in `dbInventory` with `item_type: 'service'`, `quantity: 0`, `is_from_main_store: true`.
  5. Displays toast notifications and refreshes the services table view.

---

### 3. Context-Aware Modal & UI Integration
- **Add Item / Service Modal (`openCentralItemModal`)**:
  - Dynamically updates the Bulk Import banner based on the active tab or selected item type:
    - **Physical Product selected**: Shows indigo theme with "Bulk Add Items", `downloadCentralCSVTemplate()`, and `importCentralCSV()`.
    - **Service / Offering selected**: Shows purple theme with "Bulk Add Services", `downloadServicesCSVTemplate()`, and `importServicesCSV()`.
  - Seamlessly toggles the banner text and handlers during `window.toggleCentralItemType('service' | 'product')`.
- **Owner Central Inventory Top Bar (Services Tab)**:
  - Add an "Import Services (CSV)" button directly accessible on desktop and mobile in the Services tab.
- **Modals / Import Inventory Info (`js/modals.js`)**:
  - Add quick action for Services CSV alongside Main Store and Branch inventory imports.

---

## Verification Plan
1. **Lint Check**: Run `node scripts/lint_check.cjs` to confirm 0 errors.
2. **Build Verification**: Run `npm run build` to verify Vite bundle compilation.
3. **Functional Testing**:
   - Download the services CSV template and verify headers and instructions.
   - Upload sample services with pricing, categories, and direct costs.
   - Confirm services appear in the Central Catalog (Services tab) and across all branch service menus with correct prices and zero stock interference.
