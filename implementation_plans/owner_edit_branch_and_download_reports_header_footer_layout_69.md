# Owner Edit Branch & Download Reports Header, Footer & Container Standardization (v3.0.8)

## Overview
Standardize the **Edit Branch Settings** and **Download Reports** modal templates to match the unified 3-tier full-height responsive page container layout used across the BMSTz platform (Top Navigation Header with Back chevron & badge, Scrollable Centered Content Card, and Fixed Bottom Action Footer with Cancel & Submit buttons).

## User Review Required
> [!NOTE]
> Both modals now adhere strictly to the BMSTz Mobile-First Modal architecture and auto-adapt across mobile, iPad, and desktop viewports with dark mode support.

## Proposed Changes
- **`js/modals.js`**:
  - Re-architected `case 'editBranch':` to replace the unstyled legacy layout with a 3-tier responsive layout featuring sticky `modal-top-nav` (Back button, building icon, title and branch subtitle), scrollable `modal-main-content` max-w-4xl card, and sticky `modal-bottom-nav` footer.
  - Re-architected `case 'downloadReports':` to replace the unstyled legacy layout with a 3-tier responsive layout featuring sticky `modal-top-nav` (Back button, violet file icon, title and subtitle), scrollable `modal-main-content` max-w-4xl card, and sticky `modal-bottom-nav` footer with `Generate PDF` button.
- **`js/updateChecker.js` & `release_notes.json`**:
  - Auto-synced version bump to `3.0.8`.

## Verification Plan
### Automated Tests
- Run `npm run build` to confirm zero lint/bundler errors.
### Manual Verification
- Open Branch Management -> Click on a branch -> Click Settings to open `Edit Branch Settings`. Confirm header, body card, and footer layout.
- Open Download Reports from branch cards or finance views. Confirm header, body card, and footer layout.
