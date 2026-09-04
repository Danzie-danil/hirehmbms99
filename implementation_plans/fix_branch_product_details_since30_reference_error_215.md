# Implementation Plan: Fix BranchProductDetails ReferenceError (since30 is not defined) (215)

## Overview
When opening the product details view in Branch Inventory (`window.openBranchProductDetailsView`), a `ReferenceError: since30 is not defined` occurs at line 758 when filtering 30-day sales metrics:
```javascript
const monthlyItems = itemSales.filter(s => s.created_at >= since30);
```
`since30` was never declared in the function scope, causing the item details fetch to fail and abort.

---

## Proposed Changes

### 1. Declare `since30` in `openBranchProductDetailsView` (`js/branch/inventory.js`)
- Define `const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();` before filtering `itemSales`.
- Ensure safe date string comparison: `(s.created_at || '') >= since30`.

---

## Verification Plan
1. `node scripts/lint_check.cjs` (0 issues).
2. `npm run build` (0 bundling errors).
3. Bump version to `v3.9.227` in `release_notes.json` and `js/updateChecker.js`.
4. Prepend log entry to `Chat_History/chat_history.txt`.
