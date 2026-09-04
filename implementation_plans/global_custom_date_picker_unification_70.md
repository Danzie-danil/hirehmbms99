# Global Custom Date Picker Unification (v3.0.9)

## Overview
Standardize and unify the custom interactive calendar date picker component (`window.renderPremiumDatePicker`) across the entire BMSTz platform, replacing legacy raw `<input type="date">` inputs with a cohesive, dark-mode aware, responsive custom date picker suite across `#owner`, `#branch`, and `#sysadmin` roles.

## User Review Required
> [!NOTE]
> All date selection points across the application now use the custom calendar popover featuring year/month fast switching, minimum/maximum boundary protections, live formatting, and responsive portal positioning.

## Proposed Changes
- **`js/modals.js`**:
  - Enhanced `window.renderPremiumDatePicker` and `window.renderCalendarGridHtml` to support `minDate`/`maxDate` constraint bounds, custom placeholders, required validations, and non-wrapping 280px portal positioning.
  - Exported and defined `window.formatReportDisplayDate` globally.
  - Upgraded date pickers in modals: `downloadReports` (`reportStartDate`, `reportEndDate`), `createTask` (`taskDeadline`), `markAttendance` (`attDate`), `addPO` (`poExpectedDate`), `createQuote` (`quoteValidUntil`), and `manageSubscription` (`adminTrialEndsInput`).
- **`js/branch/reports.js`**:
  - Upgraded branch reports date range selector (`branchReportFrom`, `branchReportTo`) with `renderPremiumDatePicker`.
- **`js/branch/attendance.js`**:
  - Upgraded attendance module header date picker and attendance modal `attDate` with `renderPremiumDatePicker`.
- **`js/branch/invoices.js`**:
  - Upgraded invoice payment due date (`docDueDate`) with `renderPremiumDatePicker`.
- **`js/owner/shifts.js`**:
  - Upgraded shift scheduling date (`shiftDate`) with `renderPremiumDatePicker`.
- **`js/owner/promotions.js`**:
  - Upgraded promotion expiration date (`promoExpiry`) with `renderPremiumDatePicker`.
- **`js/admin/dashboard.js`**:
  - Upgraded subscription expiration date (`adminTrialEndsInput`) with `renderPremiumDatePicker`.
- **`js/utils.js`**:
  - Exported `renderPremiumDatePicker` and `formatReportDisplayDate` helpers.
- **`js/updateChecker.js` & `release_notes.json`**:
  - Bumped version to `3.0.9`.

## Verification Plan
### Automated Tests
- Run `npm run build` to ensure 100% clean compilation across all modules.
### Manual Verification
- Test date pickers across:
  1. Financial Reports & Branch Reports (Custom Date Range)
  2. Attendance (Header Date & Mark Attendance Modal)
  3. Invoices (Payment Due Date)
  4. Tasks & Shifts (Deadlines & Shift Dates)
  5. Sysadmin (Subscription Expiry)
