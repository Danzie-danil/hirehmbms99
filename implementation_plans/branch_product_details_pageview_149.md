# Branch Product Details Full Page View & Hibernation State Persistence (Plan 149)

## Problem & Requirements (#branch)
1. **Page View Layout for Product Details**:
   - In the Branch portal, viewing a product opened a small modal/subcard instead of a full, responsive, first-class Page View Layout.
2. **Persistence on Tab Switch & App Resume**:
   - Switching browser tabs, minimizing the browser, or waking from device hibernation kicked the user out of the product details view back to the main list.

## Proposed Solution

### 1. Dedicated Full Page View (`openBranchProductDetailsView(itemId)`) in `js/branch/inventory.js`
- Create a modern, mobile-first responsive Page View with:
  - Back Navigation & breadcrumbs.
  - Top KPI Metric Cards (Physical In-Stock, Retail Price & Potential Valuation, Wholesale Rate & Spread, 30-Day Sales Velocity).
  - Left Column: Product specifications, Pricing details, and Interactive Barcode Studio with Download & Print capabilities.
  - Right Column: Recent Sales History for this item at the branch with live transactional data.
  - Responsive Bottom / Top Action Bar (`Edit`, `Restock Request`, `Tag`, `Request Attention`, `Delete`).

### 2. State & Session Persistence
- Store active subview state in `sessionStorage.setItem('bms_branch_active_subview', JSON.stringify({ subview: 'product_details', itemId }))`.
- On `renderInventoryModule()`, automatically detect and restore the active product details page without kicking the user out.
- On `closeBranchProductDetailsView()`, clear the session key and cleanly return to the inventory catalog.
- Wire `openDetailsModal('inventory', id)` in `js/utils.js` to route directly to `openBranchProductDetailsView(id)` when in branch role.

## Verification Plan
- Build project cleanly with `npm run build`.
- Verify full page view layout and persistence across tab switching and app resume.
