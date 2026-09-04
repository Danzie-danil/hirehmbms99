# Implementation Plan: Owner Sidebar Navigation Isolation & Role Guard Fix

## Problem Description
When logged in as an **Owner**, branch menus were appearing on the side navigation. Investigation identified the following root causes:
1. **Unscoped DOM Group Unhiding in `applyModuleRestrictions` (`js/app.js:1711-1719`)**: `applyModuleRestrictions` executed `document.querySelectorAll('#sidebarNav > div')` which matched `#ownerNav`, `#branchNav`, and `#sysadminNav`. Because `#branchNav` contains `<p>` section titles (e.g., "Operations", "More") and buttons, it checked `visibleButtons.length > 0` and called `navGroup.classList.remove('hidden')` on `#branchNav`, thereby unhiding the branch menus below the owner navigation.
2. **Ambiguous Role Resolution in `initAuth` (`js/auth.js:1180-1230`)**: When querying `dbBranches.fetchByManager(session.user.id)`, if a business owner owned branches where `manager_id` happened to match their own ID, `initAuth` resolved their role to `'branch'` before evaluating their owner profile.
3. **Missing Direct Navigation Synchronization in `setupDashboard` (`js/auth.js`)**: `setupDashboard` and `signIn` relied on proxy change detection which could be skipped if `state.role` had not mutated in the JavaScript object target.

## User Review Required
> [!NOTE]
> No database migration is needed. The fix directly hardens client-side navigation scoping, role resolution, and module restriction handling.

## Proposed Changes

### Navigation Scoping & Module Restrictions
#### [MODIFY] [app.js](file:///d:/v2%20BMS%20OFFICIAL/js/app.js)
- Fix `window.applyModuleRestrictions()`:
  - Determine the active navigation container (`#ownerNav`, `#branchNav`, or `#sysadminNav`) based strictly on `state.role`.
  - Enforce `hidden` on all inactive role containers and remove `hidden` on the active container.
  - Query buttons and section headers scoped strictly inside the active role container instead of `#sidebarNav > div`.

### Authentication & Role Verification
#### [MODIFY] [auth.js](file:///d:/v2%20BMS%20OFFICIAL/js/auth.js)
- Update `initAuth()` role assignment:
  - If `branch && branch.owner_id === session.user.id`, recognize the user as the business owner (`state.role = 'owner'`).
  - In `setupDashboard()`, call `window.applyDashboardRole(state.role)` to ensure DOM navigation visibility is synchronized on all login/session restore flows.
  - In `signIn()`, ensure `window.applyDashboardRole(state.role)` is called after successful sign-in.

### Version Synchronization & Audit Logging
#### [MODIFY] [release_notes.json](file:///d:/v2%20BMS%20OFFICIAL/release_notes.json)
- Bump version to `2.7.8` and update notes cleanly.

#### [MODIFY] [updateChecker.js](file:///d:/v2%20BMS%20OFFICIAL/js/updateChecker.js)
- Sync `CURRENT_VERSION` to `2.7.8`.

#### [MODIFY] [chat_history.txt](file:///d:/v2%20BMS%20OFFICIAL/Chat_History/chat_history.txt)
- Record summary, exact modified files, and lines.

## Verification Plan
### Automated & Build Verification
- Run `npm run build` to verify Vite bundle compilation and 0 lint/parser errors.
### Manual Verification
- Test `applyDashboardRole('owner')` and verify that only `#ownerNav` is displayed and `#branchNav` / `#sysadminNav` remain strictly hidden even after `loadDisabledModules()` and `applyModuleRestrictions()` execute.
