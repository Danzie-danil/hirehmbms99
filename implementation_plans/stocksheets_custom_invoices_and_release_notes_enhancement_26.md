# Implementation Plan 26: Advanced Stock Sheets, Custom Invoices Studio & Authenticated Release Notes

## 1. Executive Summary
This end-to-end plan incorporates user-specified refinements across three operational pillars:
1. **Authenticated Release Notes Delivery**: Ensuring users who open the app fresh after background updates always see the What's New release notes modal once authenticated (and never on pre-login/public screens).
2. **Physical Stock Sheet & Audit Engine (Enterprise & Exclusive)**: Enabling printable/digital stocktaking count sheets (including Blind Count mode), variance calculation, and 1-click inventory reconciliation.
3. **Pro Invoicing & Customization Studio (Enterprise & Exclusive)**:
   - Customized invoices (brand colors, heavily compressed logo, VAT/TIN, Terms & Notes).
   - Full support for **Mobile Payments** (M-Pesa, Airtel Money, Tigo Pesa, HaloPesa, Till/Paybill numbers & USSD payment instructions).
   - Heavy client-side logo compression (max 50KB via Canvas) to guarantee fast PDF rendering.
   - **1-Click WhatsApp Invoice Sharing** (Gated for Enterprise & Exclusive).

---

## 2. Plan Gating & Permissions (`js/plan.js`)
- Define feature keys in `PLAN_FEATURES`:
  - `custom_invoicing: ['enterprise', 'exclusive']`
  - `whatsapp_invoicing: ['enterprise', 'exclusive']`
  - `stock_take_audit: ['enterprise', 'exclusive']`
- Display stylish plan badge upgrade modals for lower tiers (Free Trial / Starter) when attempting to customize invoices or share via WhatsApp.

---

## 3. Technical Architecture & File Modifications

### Component 1: Authenticated Release Notes Delivery
- **Target File**: `js/ui/releaseNotesModal.js` & `js/auth.js`
- **Logic**:
  - Guard check: Verify `state.role || state.currentUser || localStorage.getItem('bms_last_role')` exists before displaying.
  - Fix condition: Ensure `lastSeen !== releaseData.version` triggers the modal regardless of whether `initInstalledVersionTracking()` already updated `bms_installed_version`.
  - Lifecycle integration: Trigger `initReleaseNotesCheck()` in `setupDashboard()` after authentication completes and dashboard DOM is ready.

### Component 2: Stock Sheet & Physical Audit Generator
- **Target Files**:
  - `js/branch/inventory.js` & `js/owner/central_inventory.js`
  - `js/modals.js` (Stock Sheet modal & PDF export engine)
- **Features**:
  - **Stocktaking Export Studio**: Generate filtered stock sheets by Category, Branch, Warehouse, or Stock Status.
  - **Audit Modes**:
    - *Blind Count Sheet*: Omits system quantities to enforce honest physical counts.
    - *Standard Count Sheet*: Displays System Qty, Counted Qty blank boxes, Unit Cost, and Sign-off fields.
  - **Digital Stock Reconciliation**: Quick count entry UI, automated Surplus/Shrinkage financial valuation, and 1-click inventory level update logging `STOCK_AUDIT_VARIANCE` to stock movements.

### Component 3: Pro Invoicing & Customization Studio (Enterprise / Exclusive)
- **Target Files**:
  - `js/branch/settings.js` & `js/owner/settings.js`:
    - **Logo Upload**: Canvas-based client compression (downscales & compresses to WebP/JPEG max 50KB).
    - **Branding**: Color palette selector (Modern Indigo, Emerald Green, Slate Navy, Crimson Red, Deep Charcoal).
    - **Tax & Registration**: VAT / TIN / Tax PIN number.
    - **Mobile Payment & Banking Setup**:
      - Mobile Money Providers: M-Pesa, Airtel Money, Tigo Pesa, HaloPesa.
      - Till Number, Paybill / Account Number, Merchant Name, USSD instructions.
      - Bank Name, Account Number, SWIFT / Branch Code.
    - **Terms & Notes**: Custom payment terms (e.g. *Net 30, Due upon receipt*), Notes, and Return Policy.
  - `js/branch/invoices.js`:
    - Invoice creation with **Mobile Payment** selection, **Due Date**, and **Status Lifecycle** (`Draft`, `Sent`, `Partially Paid`, `Paid`, `Overdue`).
    - Partial payment recording to update remaining balance due.
    - **1-Click WhatsApp Share** button (Enterprise/Exclusive gated): Pre-formats clean invoice summary with direct payment instructions & Till number.
  - `js/modals.js`:
    - Upgrade `downloadDocumentPDF()` to use the customized brand color theme, compressed logo, Tax/TIN number, Mobile Money / Bank payment instructions box, due dates, and structured line items with status badge.

---

## 4. SQL Migration
Create `supabase/0002_pro_invoicing_and_stocksheet_schema.sql`:
- Add `invoice_settings` JSONB column to `profiles` and `branches` tables.
- Add `status`, `due_date`, `paid_amount`, and `mobile_payment_details` columns to `documents` table.

---

## 5. Verification & Testing Plan
1. **Release Notes**:
   - Verify that logged-out users on `/` or `/app/` login screen never see the modal.
   - Verify that upon logging in after a version bump, the release notes modal appears reliably.
2. **Stocktaking**:
   - Generate Blind and Standard PDF/print stock sheets.
   - Run a digital stock count and verify stock reconciliation adjusts quantities and logs movements.
3. **Invoicing**:
   - Save custom invoice settings (compressed logo, mobile payment Till/Paybill, Bank info, Tax PIN, Color theme).
   - Create invoice with Due Date and Mobile Payment instructions.
   - Download PDF to verify custom branding and styling.
   - Test WhatsApp share button with plan gating.
4. **Build & Lint**:
   - Run `npm run build` to confirm 0 compilation errors.
