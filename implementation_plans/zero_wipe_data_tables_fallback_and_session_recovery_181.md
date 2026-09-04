# Implementation Plan - Zero-Wipe Data Tables Fallback & Session Recovery

## Summary
Extend the zero-wipe fallback and proactive session token auto-recovery across all core operational data tables in `js/db.js` (Loans, Expenses, Sales, Customers, Staff, Payroll, Quotations, Documents, Tasks, Notes, Suppliers, Capital, Business Loans, Business Assets, Shifts).

## Proposed Changes

### Database Layer (`js/db.js`)
- Implement `_resilientFetch` centralized helper.
- Update `fetchAll` methods across all entities in `js/db.js` to utilize `_resilientFetch`:
  - If a query returns 0 rows while online, attempts an automatic silent session token refresh and retries.
  - If remote returns 0, checks local IndexedDB (`localDb` via `getLocalItems`) and retains verified offline data rather than wiping the UI.
  - Caches fresh remote data to IndexedDB when received.

## Verification Plan
1. Run syntax and lint check across codebase (`node scripts/lint_check.cjs`).
2. Run full production build (`npm run build`) to ensure 0 errors.
3. Bump app version to `v3.9.174` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
4. Update `Chat_History/chat_history.txt`.
