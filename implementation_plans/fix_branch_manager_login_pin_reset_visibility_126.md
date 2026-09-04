# Implementation Plan - Fix Branch Manager Login PIN Reset Form Visibility (126)

Ensure normal Branch Manager login (Email & Password) is displayed when switching to the Branch Manager tab, keeping the Request PIN Reset form hidden by default.

## Root Cause Analysis
In `js/auth.js` (`setLoginRole`, line 851), `branchPinReset.classList.remove('hidden')` was inadvertently called on branch tab activation. This caused the Request PIN Reset form to render alongside the normal Manager login form.

## Proposed Changes
1. **`js/auth.js`**:
   - In `setLoginRole()`, ensure `branchPinReset.classList.add('hidden')` and `branchSelector.classList.remove('hidden')` when switching to the `branch` tab.

2. **Version Bump & App Sync**:
   - Bump app version to `3.9.22` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
   - Keep user-facing release notes simple ("Minor bugs and fixes").
   - Compile bundle via `npm run build`.
   - Update `Chat_History/chat_history.txt`.

## Verification Plan
- Run `npm run build` to verify clean compilation.
- Verify switching between Business Admin and Branch Manager tabs shows the standard login inputs without unprompted PIN reset forms.
