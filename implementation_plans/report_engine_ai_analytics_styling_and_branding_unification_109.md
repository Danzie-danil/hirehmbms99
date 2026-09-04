# Report Engine AI Analytics Styling & Custom Branding Unification (v3.9.1)

## Overview
Unify the visual design, typography, layout, table structure, and color system of all PDF reports generated across the application (Owner and Branch reports in `js/owner/report_pdf_engine.js`) to match the clean, modern aesthetic of the **AI Analytics Strategic Reports** (`js/owner/analytics.js`), while supporting custom brand colors for users with custom privileges/branding.

---

## User Review Required
> [!IMPORTANT]
> The default table headers across all generated PDF reports (Sales, Expenses, Inventory, Loans, P&L, Branch Performance, Stock Flow, Restocks, Dispatches, Best Sellers, Returns, Staff) will adopt the **AI Analytics signature slate theme** (`fillColor: [71, 91, 110]` with crisp white bold text `[255, 255, 255]`, Inter font, `#F8FAFC` alternate rows, and `#E2E8F0` hairline grid).
> 
> If the user has custom branding privileges or custom invoice/brand colors configured (`state.profile?.brand_color` or `state.profile?.invoice_settings?.brand_color`), the report engine will automatically adapt table headers and accent badges to their custom brand accent color.

---

## Proposed Technical Changes

### 1. `js/owner/report_pdf_engine.js`
- **Dynamic Font & Brand Color Resolution**:
  - Load and enforce `'Inter'` font with `'helvetica'` fallback.
  - Implement `getReportBrandColors()` helper that checks `state.profile?.brand_color` and `state.profile?.invoice_settings?.brand_color`, converting HEX to RGB.
  - Default Table Header fill: `[71, 91, 110]` (#475B6E slate-600/700) with `[255, 255, 255]` bold white text.
  - Custom Table Header fill: `customBrandRgb` (when custom branding is active).
- **Hero Header & Sub-banner Alignment**:
  - Top Hero bar height: `38mm` with `#F8FAFC` fill, `#E2E8F0` hairline divider.
  - Enterprise Name (15pt bold, `#1E293B`), Report Title (10.5pt bold, `#475B6E`), Scope Badge (8pt bold with brand accent color).
  - Sub-banner: 11mm rounded card with timeframe and branch operating age/active branches.
- **Summary KPI Cards Styling**:
  - Height: `16mm`, `#FFFFFF` card with `#E2E8F0` hairline border and 2mm radius.
  - Card label: 6.5pt bold `#64748B`.
  - Card value: 9.5pt bold `#1E293B`.
  - Card subtext: 6.5pt normal `#94A3B8`.
- **AutoTable Universal Theme**:
  - `styles`: `{ font: fontName, fontSize: 7.5, cellPadding: 2.5, textColor: [30, 41, 59], valign: 'middle' }`.
  - `headStyles`: `{ font: fontName, fillColor: tableHeaderFill, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 }`.
  - `alternateRowStyles`: `{ fillColor: [248, 250, 252] }`.
  - `tableLineColor`: `[226, 232, 240]`, `tableLineWidth: 0.3`.
- **Dynamic Footer**:
  - Separator line `[226, 232, 240]` at `ph - 12`.
  - 7pt normal `#94A3B8` text: `BMS Enterprise Multi-Tenant System  |  Confidential Business Audit` on left, `Page i of total` on right.

---

## Verification Plan
1. **Automated Build Validation**:
   - Run `npm run build` to ensure 0 lint errors, 0 syntax issues, and clean bundle generation.
2. **Design Matching Verification**:
   - Verify that tables in exported reports have dark slate/custom brand headers with white text, Inter font, alternate zebra rows, and aligned metric cards identical to AI Analytics PDFs.
3. **Version Sync**:
   - Bump version to `3.9.1` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
   - Update `Chat_History/chat_history.txt` with transcript and files changed.
