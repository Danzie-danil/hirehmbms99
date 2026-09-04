# Custom Branding & Invoicing Server-Authoritative Connection & Enforcement (88)

## Overview
Connect and enforce **Custom Branding** (Exclusive plan) and **Custom Invoices & Document Studio** (Enterprise & Exclusive plans). All gating strictly relies on Supabase server-verified entitlements via `state.entitlements` and `window.hasFeature()` without frontend hardcoded credentials or bypasses.

## Server-Authoritative Architecture
- Supabase RPC `public.get_user_effective_entitlements(p_user_id)` returns `features: TEXT[]` populated from `public.plan_features`.
- Gating uses `window.hasFeature('custom_branding')` and `window.hasFeature('custom_invoicing')`.
- All features automatically unlock during active trials (`is_trial_active = true`) or for accounts with corresponding active paid plans (`enterprise`, `exclusive`).

## Proposed Changes

### 1. UI Branding Connection
- **`app/index.html`**: Add `#sidebarBrandHeader` and `#headerBrandLogoWrap` to cleanly mount the custom business logo when `custom_branding` is active on the account.
- **`js/auth.js`**: Create `applyCustomBranding()` to read `state.profile.logo_url` and `state.profile.brand_color` only when `hasFeature('custom_branding')` is true. Set `--brand-color` and show the brand logos in header/sidebar.
- **`js/owner/settings.js`**: Call `window.applyCustomBranding()` on save so visual changes apply instantly in real time.

### 2. Custom Invoicing & Document Studio Enforcement
- **`js/owner/settings.js`**:
  - In `Invoicing & Branding` tab content, check `window.hasFeature('custom_invoicing')`. If false, render `window.renderFeatureLock('Custom Invoice & Document Studio', 'Enterprise')`.
  - Fix required plan label on `custom_branding` lock from `'Enterprise'` to `'Exclusive'`.
- **`js/modals.js`**:
  - In `renderInvoiceReceiptPDF()`, verify `hasFeature('custom_invoicing')` before applying custom logo/accents/payment settings to generated PDF output. Fall back to standard clean branding if feature is not entitled.

### 3. CSS Dynamic Accent & Brand Tokens
- **`css/index.css`**: Add `--brand-color` variables and support for dynamic primary styling when custom branding is enabled.

## Verification
- Test with non-entitled plan: verify feature locks display for Custom Invoicing tab and Custom Branding section.
- Test with entitled plan / trial: verify custom logo and accent color appear on sidebar/header and apply to invoice PDF generation.
- Run `npm run build` to verify clean compilation.
