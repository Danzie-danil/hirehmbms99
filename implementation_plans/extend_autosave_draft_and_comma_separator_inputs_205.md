# Implementation Plan - Extend Autosave Draft & Comma Separator Number Formatting

## Goal
Extend seamless IndexedDB autosave form draft hydration, auto-saving, and clearing across all missing modules (including business loans, loan repayments, capital accounts, capital deposits/withdrawals, fixed assets, asset maintenance, payroll, promotions, goals, announcements, shifts, staff, and modal forms). Additionally, comprehensively extend automatic comma-separation formatting across all numeric and monetary inputs application-wide.

---

## User Review & Decisions

> [!NOTE]
> 1. **Universal Comma Separator Regex:** Expanded `shouldFormatInput` numeric detection to automatically handle all monetary/quantity/financial keywords (`principal`, `balance`, `interest`, `repayment`, `capital`, `budget`, `valuation`, `book_value`, `target`, `discount`, `fee`, `deposit`, `withdrawal`, `rate`, `sum`, `total`, etc.) and automatically convert standard number inputs to formatted text with `inputmode="decimal"`.
> 2. **Universal Form Draft Persistence:** Extended `hydrateFormDraft`, `attachFormDraftAutoSave`, and `clearFormDraft` to support batch loan arrays (`_batchLoansList`), batch asset arrays (`_batchAssetsList`), and all dedicated owner full-page view forms with real-time visual draft status badges.

---

## Proposed Changes

### Utilities Layer (`js/utils.js`)
- [MODIFY] `js/utils.js`:
  - Expanded numeric detection regex in `shouldFormatInput` to cover all monetary fields.
  - Added multi-batch support in `attachFormDraftAutoSave` and `hydrateFormDraft` for `_batchLoansList` and `_batchAssetsList`.
  - Exported and globally bound `clearFormDraft`, `attachFormDraftAutoSave`, `hydrateFormDraft`, and `showDraftIndicator`.

### Owner Module Views
- [MODIFY] `js/owner/loans.js`:
  - Added `ownerLoanDraft` hydration and auto-saving in `renderAddLoanView`.
  - Added `ownerLoanRepaymentDraft` hydration and auto-saving in `renderAddLoanRepaymentView`.
  - Added draft clearing upon batch save and repayment save.
- [MODIFY] `js/owner/capital.js`:
  - Added `ownerCapitalAccountDraft` hydration and auto-saving in `renderAddCapitalAccountView`.
  - Added `ownerCapitalTransactionDraft` hydration and auto-saving in `renderAddCapitalTransactionView`.
  - Added draft clearing upon account save and transaction save.
- [MODIFY] `js/owner/assets.js`:
  - Added `ownerAssetDraft` hydration and auto-saving in `renderAddAssetView`.
  - Added `ownerAssetMaintenanceDraft` hydration and auto-saving in `renderAddMaintenanceView`.
  - Added draft clearing upon batch asset save and maintenance logging.
- [MODIFY] `js/owner/payroll.js`:
  - Added `ownerPayrollDraft` hydration and auto-saving in `renderAddPayrollView`.
  - Added draft clearing upon payroll entry submit.
- [MODIFY] `js/owner/promotions.js`:
  - Added `ownerPromotionDraft` hydration and auto-saving in `renderAddPromotionView`.
  - Added draft clearing upon promotion create.
- [MODIFY] `js/owner/goals.js`:
  - Added `ownerGoalDraft` hydration and auto-saving in `renderAddGoalView`.
  - Added draft clearing upon goal submit.
- [MODIFY] `js/owner/announcements.js`:
  - Added `ownerAnnouncementDraft` hydration and auto-saving in `renderAddAnnouncementView`.
  - Added draft clearing upon announcement publish.
- [MODIFY] `js/owner/shifts.js`:
  - Added `ownerShiftDraft` hydration and auto-saving in `renderAddShiftView`.
  - Added draft clearing upon shift scheduling.
- [MODIFY] `js/owner/staff.js`:
  - Added modal key `ownerAddStaff` and draft clearing on staff member save.
- [MODIFY] `js/modals.js`:
  - Added draft clearing for customer, supplier, note, loan, and inventory additions.

---

## Verification Plan

### Automated Tests
1. `npm run build`
2. `node scripts/lint_check.cjs`

### Manual Verification
1. Open Loans, Capital, Assets, Payroll, Promotions, Goals, Announcements, and Shifts views, enter data, navigate away, and re-open to verify persistent draft hydration.
2. Enter values in numerical fields across all forms to confirm live comma-formatting without jumping cursors.
