# Implementation Plan - Fix Missing DB Batch and Alias Methods

## Goal
Resolve `TypeError: dbBusinessLoans.addBatch is not a function` occurring when saving loan batches in the liabilities/loans module, and proactively audit all `db*` services to supply missing batch methods and function aliases (`add`, `create`, `createAccount`, `addBatch`) across all modules and offline sync dispatchers.

---

## User Review & Decisions

> [!NOTE]
> 1. **`dbBusinessLoans.addBatch` Implemented:** Added batch insertion capability to `dbBusinessLoans` with transparent local caching (`cacheLocalItems`) and realtime mutation broadcast.
> 2. **Cross-Service Alias Audit:** Unified method signatures (`add` vs `create`) across all database objects to ensure calls from offline queue dispatchers, modals, and batch forms execute seamlessly.

---

## Proposed Changes

### Database Service Layer (`js/db.js`)
- [MODIFY] `js/db.js`:
  - Added `dbBusinessLoans.addBatch(itemsArray)` and `dbBusinessLoans.add(payload)`.
  - Added `dbCapital.createAccount(data)` alias for `addAccount`.
  - Added `dbQuotations.add(quoteData, itemsData)` alias for `create`.
  - Added `dbPayroll.add(payload)` alias for `create`.
  - Added `dbAnnouncements.add(payload)` alias for `create`.
  - Added `dbPromotions.add(payload)` alias for `create`.
  - Added `dbGoals.add(payload)` alias for `create`.
  - Added `dbCustomRoles.add(payload)` alias for `create`.
  - Added `dbTickets.add(payload)` alias for `create`.
  - Added `dbPurchaseOrders.add(poData, itemsData)` and enhanced `create` to handle embedded items array.

---

## Verification Plan

### Automated Tests
1. `npm run build`
2. `node scripts/lint_check.cjs`

### Manual Verification
1. Open Loans & Liabilities module -> Add Batch Loans.
2. Submit batch and verify successful registration toast and table refresh.
