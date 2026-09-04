# Implementation Plan: Annual Subscription Billing & Dual Pricing Options - #41

## Objective
Introduce an Annual Billing option for all three subscription tiers (**Starter**, **Enterprise**, and **Exclusive**) with integrated discounts (12% off for Starter & Enterprise, 15% off for Exclusive) and direct checkout routing via Snippe payment pages. In accordance with user specifications, the existing 3 plan cards will be preserved and upgraded to display dual pricing (Monthly and Discounted Annual) alongside dedicated payment action buttons for each billing cycle.

---

## 1. Plan & Pricing Specifications

| Plan Tier | Monthly Price | Regular Annual Price | Discount Rate | Discount Amount | Final Annual Price | Monthly Payment Link | Annual Payment Link |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Starter** | TZS 5,000 / mo | TZS 60,000 / yr | **12% OFF** | TZS 7,200 | **TZS 52,800 / yr** | `https://snippe.me/pay/bms-starter-plan` | `https://snippe.me/pay/bmstz-starter-annual` |
| **Enterprise** | TZS 15,000 / mo | TZS 180,000 / yr | **12% OFF** | TZS 21,600 | **TZS 158,400 / yr** | `https://snippe.me/pay/bms-enterprise-plan` | `https://snippe.me/pay/bmstz-enterprise-annual` |
| **Exclusive** | TZS 35,000 / mo | TZS 300,000 / yr | **15% OFF** | TZS 45,000 | **TZS 255,000 / yr** | `https://snippe.me/pay/bms-exclusive-plan` | `https://snippe.me/pay/bmstz-exclusive-annual-plan` |

---

## 2. Proposed Changes

### Component 1: Owner Billing Interface (`js/owner/billing.js`)
* **Dual Pricing Presentation on Existing Cards**:
  - Maintain the 3 existing plan cards without generating redundant cards.
  - Display the Monthly rate (`TZS 5,000 / mo`, `TZS 15,000 / mo`, `TZS 35,000 / mo`).
  - Add the Annual section inside each card featuring:
    * Discount Badge (e.g. `12% OFF · SAVE TZS 7,200` / `15% OFF · SAVE TZS 45,000`).
    * Strikethrough regular price (e.g. `~~TZS 60,000~~`) next to the discounted annual total (`TZS 52,800 / yr`).
  - Provide two separate, prominent action buttons inside each card:
    1. **Pay Monthly Button**: `onclick="initiateSnippeCheckout('${plan.id}', '${plan.name}', '${plan.monthlyPrice}', 'monthly')"`
    2. **Pay Annually Button**: `onclick="initiateSnippeCheckout('${plan.id}', '${plan.name}', '${plan.annualPrice}', 'annual')"` (with badge / highlight)
* **Checkout Link Routing (`initiateSnippeCheckout`)**:
  - Upgrade `initiateSnippeCheckout(planId, planName, planPrice, billingCycle = 'monthly')` to accept `billingCycle`.
  - Map `planId` + `billingCycle` to the exact Snippe payment URLs:
    * `starter.monthly` -> `https://snippe.me/pay/bms-starter-plan`
    * `starter.annual` -> `https://snippe.me/pay/bmstz-starter-annual`
    * `enterprise.monthly` -> `https://snippe.me/pay/bms-enterprise-plan`
    * `enterprise.annual` -> `https://snippe.me/pay/bmstz-enterprise-annual`
    * `exclusive.monthly` -> `https://snippe.me/pay/bms-exclusive-plan`
    * `exclusive.annual` -> `https://snippe.me/pay/bmstz-exclusive-annual-plan`
  - Pass `billingCycle` within the base64-encoded `meta` payload (`{ ownerId, planId, billingCycle, customerPhone, paymentMethod }`).

### Component 2: Snippe Webhook Function (`supabase/functions/snippe-webhook/index.ts`)
* Update fallback amount-to-plan resolution to support both monthly and annual amounts:
  - `5,000` / `52,800` / `60,000` -> `'starter'`
  - `15,000` / `158,400` / `180,000` -> `'enterprise'`
  - `25,000` / `35,000` / `255,000` / `300,000` -> `'exclusive'`
* Decode `billingCycle` from `url_metadata` and record it in `saas_audit_logs`.

### Component 3: Translations (`js/i18n.js`)
* Add translation keys for:
  - `billed_monthly`, `billed_annually`, `save_discount`, `pay_monthly`, `pay_annually`, `annual_savings`.

---

## 3. Verification Plan

### Automated Build Check
- Run `npm run build` locally to ensure clean compilation and 0 bundling/lint errors.

### Manual Verification
1. Navigate to Owner Settings -> Security & Billing.
2. Verify all 3 plan cards display both monthly and discounted annual pricing with correct discount badges.
3. Test clicking "Pay Monthly" -> Verify phone prompt & Snippe monthly redirect URL with metadata.
4. Test clicking "Pay Annually" -> Verify phone prompt & Snippe annual redirect URL with metadata.
