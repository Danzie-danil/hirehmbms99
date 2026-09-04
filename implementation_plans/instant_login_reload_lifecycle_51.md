# Implementation Plan - Instant Sign-In Reload Lifecycle (51)

## Overview
Implement an instant reload mechanism on the "Sign In" button click before any loading spinner or authentication network calls are initiated. This guarantees that when the user submits their credentials, the browser immediately performs a full page reload, clears any transient state or stalled DOM listeners, and executes authentication cleanly on the fresh page.

## Proposed Changes

### [js/auth.js](file:///d:/v2%20BMS%20OFFICIAL/js/auth.js)
1. **Immediate Reload on `login()`**:
   - Validate form fields (email, password).
   - Stash role and credentials in `sessionStorage` under key `bms_pending_login`.
   - Call `window.location.reload()` immediately upon click (no loader shown on the old page).
2. **Execution on Fresh Page (`_executePendingLogin`)**:
   - In `initAuth()`, check if `sessionStorage.getItem('bms_pending_login')` exists.
   - Consume the pending login payload.
   - Show loader (`Signing in...` / `Verifying credentials...`).
   - Run `dbAuth.signIn()`, role cross-validation, profile fetching, and session caching.
   - Transition to dashboard cleanly with `setupDashboard()` and hide loaders.
   - If error occurs, restore login screen, pre-fill email, and show error notification.

### Version Management
- Bump version to `2.9.90` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.

## Verification Plan
- Run `npm run build` to confirm 0 compile/bundle errors.
- Test login flow: clicking Sign In reloads immediately before showing the spinner and completing authentication.
