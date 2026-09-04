# Implementation Plan: SEO, Sitemap, Meta Tags & Public Landing/About Pricing Alignment - #46

Update the public-facing pages (`index.html`, `about/index.html`, `support/index.html`, `terms/index.html`, `privacy/index.html`), sitemap (`public/sitemap.xml`), and search engine metadata to reflect current application features, exact app-configured dual pricing (Monthly & Annual), and rich schema structured data.

---

## User Review Required

> [!IMPORTANT]
> **Strict Pricing Accuracy**: In accordance with user directives, no custom discounts or arbitrary numbers are introduced. All public pricing card presentations and JSON-LD schema reflect the exact values configured in `js/owner/billing.js`:
> - **Starter**: TZS 5,000 / month OR TZS 52,800 / year (12% OFF, Save TZS 7,200/yr, Effective TZS 4,400/mo). Up to 3 Branches.
> - **Enterprise**: TZS 15,000 / month OR TZS 158,400 / year (12% OFF, Save TZS 21,600/yr, Effective TZS 13,200/mo). Up to 10 Branches.
> - **Exclusive**: TZS 25,000 / month OR TZS 255,000 / year (15% OFF, Save TZS 45,000/yr, Effective TZS 21,250/mo). Unlimited Branches.

---

## Proposed Changes

### 1. Public Landing Page (`index.html`)

#### [MODIFY] [`index.html`](file:///d:/v2%20BMS%20OFFICIAL/index.html)
- **Head & SEO Metadata**:
  - Add canonical link (`https://bmstz.com/`).
  - Upgrade OpenGraph (`og:title`, `og:description`, `og:url`, `og:image`, `og:type`, `og:site_name`).
  - Add Twitter Card metadata (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`).
  - Expand JSON-LD structured data (`SoftwareApplication`, `OfferCatalog`, `AggregateOffer`) with exact TZS prices and features.
- **Pricing Cards Section (`#pricing`)**:
  - Integrate a clean Monthly / Annual billing toggle (or dual-price breakdown badges) matching `js/owner/billing.js`.
  - Display exact annual pricing, 12%/15% savings badges, and effective monthly rates for all three plans (Starter, Enterprise, Exclusive).
- **Features & System Overview**:
  - Highlight recent features: Dual Pricing, Shift & Attendance tracking, POS Till Reconciliation, Stock Audit Ledger, and AI Strategic Intelligence.

---

### 2. About & Operational Manual Page (`about/index.html`)

#### [MODIFY] [`about/index.html`](file:///d:/v2%20BMS%20OFFICIAL/about/index.html)
- **Head & Meta Tags**:
  - Add OpenGraph, Twitter Card metadata, and canonical link (`https://bmstz.com/about/`).
- **Content Updates**:
  - Update subscription and pricing documentation section to detail both Monthly and Discounted Annual billing cycles with exact TZS prices and branch thresholds.
  - Update operational manual sections with recent capabilities: Dual Pricing, Multi-Branch Stock Audit Ledger, Real-time Till Reconciliation, and AI Strategic Assistant.

---

### 3. Support, Terms & Privacy Pages

#### [MODIFY] [`support/index.html`](file:///d:/v2%20BMS%20OFFICIAL/support/index.html)
#### [MODIFY] [`terms/index.html`](file:///d:/v2%20BMS%20OFFICIAL/terms/index.html)
#### [MODIFY] [`privacy/index.html`](file:///d:/v2%20BMS%20OFFICIAL/privacy/index.html)
- Add canonical tags, OpenGraph metadata, Twitter Cards, and standardized site branding across all public sub-pages.

---

### 4. Sitemap & Search Engine Crawling

#### [MODIFY] [`public/sitemap.xml`](file:///d:/v2%20BMS%20OFFICIAL/public/sitemap.xml)
- Include all public routes with updated priorities and change frequencies:
  - `https://bmstz.com/` (1.0)
  - `https://bmstz.com/app/` (0.9)
  - `https://bmstz.com/about/` (0.8)
  - `https://bmstz.com/support/` (0.8)
  - `https://bmstz.com/terms/` (0.5)
  - `https://bmstz.com/privacy/` (0.5)

#### [MODIFY] [`public/robots.txt`](file:///d:/v2%20BMS%20OFFICIAL/public/robots.txt)
- Ensure proper crawl directives and reference to `https://bmstz.com/sitemap.xml`.

---

## Verification Plan

### Automated Verification
- Run `npm run build` to verify 100% clean production bundle compilation with 0 errors.

### Manual Verification
- Test pricing toggle / dual pricing display on `index.html` across mobile and desktop viewports.
- Validate OpenGraph and structured data JSON-LD syntax for search engines.
- Verify `public/sitemap.xml` structure against standard sitemap schema.
