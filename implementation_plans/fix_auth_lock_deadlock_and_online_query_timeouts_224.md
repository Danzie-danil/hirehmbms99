# Implementation Plan: Fix Auth Lock Deadlock & Online Query Timeouts (224)

## Problem Description
1. Online queries to Supabase were timing out after 12000ms and falling back to `localDb` despite active network connectivity.
2. In `syncManager.js`, two scoping errors occurred during cloud reconciliation:
   - `[SYNC] Query error for purchase_orders: column purchase_orders.owner_id does not exist`
   - `[SYNC] Query error for stock_transfers: column stock_transfers.branch_id does not exist`

## Root Causes Identified
1. **Auth Lock Deadlock:**
   Inside `@supabase/auth-js` (`GoTrueClient.ts`), `_callRefreshToken` held the auth lock while executing `await this._notifyAllSubscribers('TOKEN_REFRESHED', data.session)`. In `js/auth.js`, the `TOKEN_REFRESHED` listener synchronously awaited `dbProfile.fetch`, which issued a PostgREST query (`_db.from('profiles')`). PostgREST required `_getAccessToken()`, which requested the auth lock that was already held. This deadlock blocked all subsequent database queries across the application until their 12000ms timeouts elapsed.
2. **Sync Scoping Mismatch:**
   In `js/data/syncManager.js`:
   - `stock_transfers` has `owner_id`, `from_branch_id`, and `to_branch_id` (not `branch_id`).
   - `purchase_orders` has `branch_id` (not `owner_id`).
   The scoping filters in `buildQuery` had their assignments inverted.

## Changes Applied
1. **`js/auth.js`:**
   - In `onAuthStateChange`, wrapped profile refresh logic inside `setTimeout(async () => { ... }, 0)`.
   - GoTrue's `_notifyAllSubscribers` returns immediately, releasing the auth lock without delay.
2. **`js/supabase.js`:**
   - Added a 6000ms timeout race to `_inFlightRefreshPromise` so singleton refresh promises never stall indefinitely.
3. **`js/data/syncManager.js`:**
   - Updated `SYNCABLE_ENTITIES` so `purchase_orders` is marked `requiresBranchOrOwner: true`.
   - Updated `buildQuery`:
     - Role `owner`: filter `stock_transfers` by `.eq('owner_id', ownerId)` and `purchase_orders` by `.in('branch_id', ownerBranchIds)`.
     - Role `branch`: filter `purchase_orders` by `.eq('branch_id', branchId)` and `stock_transfers` by `.or('from_branch_id.eq.${branchId},to_branch_id.eq.${branchId}')`.

## Verification
- Checked syntax across 238 files using `node scripts/lint_check.cjs` (0 issues).
- Compiled production bundle via `npm run build` (17.14s, 0 errors).
- Bumped app version to `v3.9.244`.
