# Implementation Plan 27: Server-Authoritative Entitlements and Plan Security Refactor

Refactor the subscription and entitlement architecture so that Supabase is the sole authoritative source of truth for subscription status, feature entitlements, trial validity, and branch limits, while `plan.js` and `state.js` remain clean, robust, and responsive client-side UI presenters.

## 1. Problem Statement & Architecture Audit

Currently, plan permissions, branch maximums (`DEFAULT_MAX_BRANCHES`), and feature mappings (`PLAN_FEATURES`) are statically defined in `js/plan.js`.
- **Security Limitation**: A malicious user modifying client-side JavaScript memory (`state.profile.plan = 'exclusive'` or `hasFeature = () => true`) could attempt unauthorized operations if backend validation is incomplete.
- **Sentinel Inconsistency**: `9999` is used for "unlimited" branches instead of standard SQL `NULL`.
- **Authoritative Goal**: Supabase Postgres RLS, triggers, and RPCs must become the authoritative enforcement layer. The frontend will receive verified server entitlements (`state.entitlements`) on authentication while keeping `plan.js` helper methods (`getPlan()`, `hasFeature()`, `getPlanMaxBranches()`, paywalls, and lock banners) 100% intact and backward-compatible.

---

## 2. Proposed Architecture & Migration Design

```text
                             SUPABASE (Postgres Security Layer)
                                              │
           ┌──────────────────────────────────┼──────────────────────────────────┐
           │                                  │                                  │
   public.sys_pricing_plans          public.plan_features                public.profiles
 (starter: 3, enterprise: 10,       (plan_name ↔ feature_key)         (plan, trial_ends_at,
  exclusive: NULL [unlimited])                                         status, is_suspended)
           │                                  │                                  │
           └──────────────────────────────────┼──────────────────────────────────┘
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    │                                                   │
        SERVER ENFORCEMENT                                  SECURE ENTITLE RPC
  • Trigger: trg_enforce_branch_limits               • RPC: get_user_effective_entitlements()
  • RPC: create_branch_secure()                      • RPC: check_user_entitlement()
  • RLS on operational & export tables                • RLS / RPCs for AI, Dispatch, Stock
                    │                                                   │
                    └─────────────────────────┬─────────────────────────┘
                                              │
                                   FRONTEND CONSUMPTION
                                              │
                             ┌────────────────┴────────────────┐
                             │                                 │
                      js/state.js                         js/plan.js
                 (state.entitlements)                • getPlan()
                                                     • hasFeature()
                                                     • getPlanMaxBranches()
                                                     • renderOwnerPaywall()
                                                     • renderFeatureLock()
```

---

## 3. Database Schema & Server Enforcement (SQL Migration)

Create migration file `supabase/0001_server_authoritative_entitlements_and_branch_limits.sql`:

1. **Standardize `sys_pricing_plans`**:
   - `free_trial`: `max_branches = 3`
   - `starter`: `max_branches = 3`
   - `enterprise`: `max_branches = 10`
   - `exclusive`: `max_branches = NULL` (unlimited, eliminating `9999`).
2. **Authoritative Feature Registry (`public.plan_features`)**:
   - Table `public.plan_features (id uuid primary key, plan_name text, feature_key text, unique(plan_name, feature_key))`.
   - Seeded with all 17 feature keys mapped to `enterprise` and `exclusive`.
3. **Branch Limit Database Trigger & Validation Function**:
   - `check_owner_branch_limit(p_owner_id uuid)`:
     - Identifies owner, resolves active plan & trial status.
     - Fetches authoritative `max_branches` (if `NULL`, unlimited allowed).
     - Counts existing non-deleted branches. If `count >= max_branches`, throws exception `'Branch creation limit reached for your plan'`.
   - `BEFORE INSERT ON public.branches`: Fires trigger `trg_enforce_branch_limit` to prevent unauthorized inserts even via direct Supabase client calls.
4. **Authoritative Server RPCs**:
   - `public.get_user_effective_entitlements(p_user_id uuid)`:
     - Returns `{ plan_id, is_active, is_trial, is_trial_active, is_trial_expired, is_skipped_trial, is_paid, max_branches, features: [...], branch_count }`.
   - `public.check_user_entitlement(p_user_id uuid, p_feature_key text)`:
     - Returns boolean server-validated authorization.

---

## 4. Frontend Implementation

### 4.1 `js/state.js`
- Add single normalized `entitlements: null` property to `_internalState`.
- Retain existing Proxy reactivity and application state structure.

### 4.2 `js/auth.js`
- During `initAuth()` and `login()`, invoke `get_user_effective_entitlements` in parallel with profile/branch fetches.
- Populate `state.entitlements` and persist in verified session cache.

### 4.3 `js/plan.js`
- **`getPlan()`**: Reads `state.entitlements` when present; falls back to current `state.profile` for instant offline rendering without UI flicker.
- **`hasFeature(feature)`**: Checks `state.entitlements.features` array when populated, otherwise evaluates verified local state.
- **`getPlanMaxBranches()`**: Returns `state.entitlements.max_branches` (supporting `NULL` = `Infinity`/unlimited and numbers 3, 10), eliminating `9999`.
- **Paywalls & UI Locks**: Preserve all existing UI screens (`renderOwnerPaywall()`, `renderBranchBillingRequired()`, `renderFeatureLock()`, translations).

### 4.4 Call Sites & Operational Flow Audit
- `js/owner/branches.js`: Handles `NULL` unlimited branch display and surfaces server rejection messages smoothly.
- `js/admin/dashboard.js`: Standardize pricing plan management UI to display `Unlimited` for `NULL` max branches.
- `js/aiAssistant.js` & `api/chat.js`: Verify server context resolution.

---

## 5. Verification Plan

### Automated Build & Syntax Check
- Run `npm run build` to ensure 100% clean compilation, zero linter/syntax errors, and all modules bundled.

### Manual & Security Verification
1. **Frontend Manipulation Test**: Modifying `state.profile.plan` in DevTools will not allow unauthorized branch creation or bypass server-gated RPCs.
2. **Branch Limit Test**: Creating a 4th branch on Starter/Free Trial is blocked at the database trigger layer.
3. **Exclusive/Unlimited Test**: Exclusive plan correctly shows unlimited branches without integer overflow (`9999` replaced by `NULL`).
4. **Trial Expiration & Paywall Test**: Expired and skipped trials display correct paywalls and block database mutations.
5. **Role Preservation**: System Admin, Owner, and Branch Manager flows remain intact with zero regression.
