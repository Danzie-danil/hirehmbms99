# Implementation Plan: Compact Dashboard Cards & Reduced Spacing (103)

## Goal Description
Compact the dashboard cards and bento widgets across Branch and Owner views by reducing outer margins, inner padding, and grid gaps, giving a tighter, more cohesive, and information-dense layout without feeling cramped.

---

## Proposed Changes

### 1. [js/branch/dashboard.js](file:///d:/v2%20BMS%20OFFICIAL/js/branch/dashboard.js)
- Reduce layout vertical space from `space-y-4 sm:space-y-5` to `space-y-2.5 sm:space-y-3`.
- Tighten top greeting strip padding from `p-3.5 sm:p-5` to `p-2.5 sm:p-3.5`.
- Reduce KPI grid gap from `gap-2.5 sm:gap-3.5` to `gap-2 sm:gap-2.5`.
- Reduce 3-column bento grid gap from `gap-3.5 sm:gap-4` to `gap-2.5 sm:gap-3`.
- Tighten column spacing from `space-y-3.5 sm:space-y-4` to `space-y-2.5 sm:space-y-3`.
- Reduce card inner padding from `p-4 sm:p-5` to `p-3 sm:p-3.5`.

### 2. [js/owner/overview.js](file:///d:/v2%20BMS%20OFFICIAL/js/owner/overview.js)
- Apply the same compact grid gaps (`gap-2 sm:gap-2.5`), reduced column spacing (`space-y-2.5 sm:space-y-3`), and card padding (`p-3 sm:p-3.5`) across the Owner Overview layout.

### 3. [app/index.html](file:///d:/v2%20BMS%20OFFICIAL/app/index.html)
- Tighten main canvas container padding from `p-3.5 sm:p-5` to `p-2.5 sm:p-3.5`.

---

## Verification Plan

### Automated Verification
- Run `npm run build` to verify clean compilation with 0 errors.

### Visual Verification
- Verify that cards sit closer together with balanced whitespace and improved visual density across desktop and mobile screens.
