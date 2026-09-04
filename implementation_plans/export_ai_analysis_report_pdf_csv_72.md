# Export AI Analysis Report in PDF and CSV/XLSX (v3.1.0)

## Overview
Provides owners with the ability to export the **BMSTz AI Strategic Intelligence** reports into PDF (featuring full enterprise business header, legal/contact metadata, structured `autoTable` grids, and dynamic multi-page footer) and CSV/XLSX spreadsheets.

## Proposed Changes
1. **AI Analysis UI & Export Controls** ([`js/owner/analytics.js`](file:///d:/v2%20BMS%20OFFICIAL/js/owner/analytics.js)):
   - Add export action buttons (**Download PDF** and **Export CSV/Excel**) directly within the AI Analysis report header and footer.
   - Connect handlers `window.exportAiReportPdf(tabId)` and `window.exportAiReportCsv(tabId)`.

2. **Enterprise PDF & CSV Export Engine for AI Intelligence** ([`js/owner/analytics.js`](file:///d:/v2%20BMS%20OFFICIAL/js/owner/analytics.js) & [`js/owner/report_pdf_engine.js`](file:///d:/v2%20BMS%20OFFICIAL/js/owner/report_pdf_engine.js)):
   - **PDF Generation**:
     - Includes official business header: Enterprise Name, Report Title, Scope/Tab Focus, Business TIN, Registration Number, Phone, Email, Location, and Generation Timestamp.
     - Renders text sections, headings, bullet recommendations, and converts markdown tables directly into `jsPDF` `autoTable` grids.
     - Adds enterprise page footer (`Page X of Y`, confidential audit notice, top/bottom divider rules).
   - **CSV/Excel Generation**:
     - Formats report headers, business information, sections, key findings, and extracts markdown tables into clean delimited spreadsheet rows.
     - Triggers automated browser download with descriptive filenames (e.g. `bms_ai_strategic_intelligence_branch_performance_2026-08-20.csv`).

## Verification Plan
1. **Build & Syntax Test**: Run `npm run build` to verify 0 errors.
2. **Feature Testing**:
   - Verify that generating an AI analysis renders the **Download PDF** and **Export CSV/Excel** buttons.
   - Verify PDF export builds a multi-page document with the header, business details, tables, and footer.
   - Verify CSV export outputs the metadata and tables.
