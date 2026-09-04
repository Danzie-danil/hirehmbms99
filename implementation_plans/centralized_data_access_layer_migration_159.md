# Centralized Data Access Layer & Repository Migration

Decouple all UI view modules (`js/owner/*.js`, `js/branch/*.js`, `js/ui/*.js`, and `js/modals.js`) from direct `supabase` client imports. Route all queries and mutations through `js/db.js` and `js/data/repositories/*` with automated timeout protection, IndexedDB caching, and offline fallback.

---

## User Review & Confirmation Required

> [!IMPORTANT]
> **Data Sync & Real-Time Engine Guard Notice**:
> Under workspace rules, modifications affecting `js/db.js` or data access pipelines require explicit user confirmation.
> Please review this implementation plan and confirm proceeding with Phase 1 (Data Layer enrichment) and Phase 2 (View migration).

---

## Current Architecture vs Target Architecture

```
Current (Scattered Direct Calls):
[UI Views: owner/*.js, modals.js] ────► Direct supabase.from(...) / supabase.rpc(...) [Bypasses cache & timeout]
[UI Views: branch/*.js]           ────► Mixed db.js & direct supabase calls

Target (Clean Architectural Layering):
[UI Views: owner/*.js, branch/*.js, modals.js]
             │
             ▼
[Repository & DAL Layer: js/db.js, js/data/repositories/*]
   ├── 1. Live Supabase PostgREST / RPC (with withTimeout guard)
   ├── 2. Auto-cache to localDb (IndexedDB via Dexie) on success
   └── 3. Instant localDb fallback on network timeout / offline
             │
             ▼
[Supabase Backend / PostgreSQL]
```

---

## Proposed Changes

### Phase 1: Enrich `js/db.js` with Missing Domain Helpers
Ensure `js/db.js` provides comprehensive methods for all entity domains with timeout wrapping and localDb caching:
- `dbCapital`: `fetchAll`, `fetchAccounts`, `addTransaction`, `deleteTransaction`
- `dbLoans`: `fetchAll`, `fetchPayments`, `addLoan`, `recordPayment`, `updateStatus`
- `dbPayroll`: `fetchHistory`, `fetchStaffPreferences`, `savePayrollRun`, `updateRecord`
- `dbShifts`: `fetchAll`, `fetchActive`, `startShift`, `endShift`, `approveShift`
- `dbAssets`: `fetchAll`, `addAsset`, `updateAsset`, `deleteAsset`, `recordDepreciation`
- `dbAnnouncements`: `fetchAll`, `createAnnouncement`, `deleteAnnouncement`
- `dbPromotions`: `fetchAll`, `createPromotion`, `updatePromotion`, `deletePromotion`
- `dbGoals`: `fetchAll`, `createGoal`, `updateGoal`, `deleteGoal`
- `dbCustomRoles`: `fetchAll`, `saveRole`, `deleteRole`
- `dbAudit`: `fetchAll`, `logAction`
- `dbBilling`: `fetchInvoices`, `fetchSubscriptionStatus`, `changePlan`
- `dbBackup`: `generateBackupPayload`, `fetchBackups`

### Phase 2: Refactor UI Views to Remove Direct Supabase Imports
Remove `import { supabase } from '../supabase.js'` from:
- `js/owner/capital.js`
- `js/owner/loans.js`
- `js/owner/payroll.js`
- `js/owner/shifts.js`
- `js/owner/assets.js`
- `js/owner/announcements.js`
- `js/owner/promotions.js`
- `js/owner/goals.js`
- `js/owner/billing.js`
- `js/owner/custom_roles.js`
- `js/owner/backup_suite.js`
- `js/owner/audit.js`
- `js/owner/security.js`
- `js/owner/handshakeListener.js`
- `js/ui/surveyModal.js`
- `js/ui/popups.js`
- `js/modals.js`

Replace all inline `supabase.from(...)` and `supabase.rpc(...)` calls in these files with their corresponding `db.*` methods.

---

## Verification Plan

### Automated Verification
- Run `npm run build` after each module refactor to ensure zero syntax, import, or bundling errors.

### Manual & Functional Verification
1. **Owner Portal Navigation**:
   - Navigate to Capital, Loans, Payroll, Shifts, Assets, Announcements, Promotions, Goals, Billing, Settings.
   - Verify all tables, modals, action forms, and delete buttons function seamlessly.
2. **Offline & Wake Simulation**:
   - Put app to sleep / disconnect network.
   - Verify views fall back to cached IndexedDB data gracefully without throwing unhandled exceptions.
3. **Data Mutation & Real-Time Sync**:
   - Add a transaction in Capital / Loans / Expenses.
   - Verify immediate local UI update and live broadcast trigger.
