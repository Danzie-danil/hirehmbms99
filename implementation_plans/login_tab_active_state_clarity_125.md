# Implementation Plan - Login Role Tab Active State Clarity & Contrast (125)

Enhance visual contrast and active tab indicator clarity between "Business Admin" and "Branch Manager" tabs on the login screen.

## Root Cause Analysis
1. In `app/index.html` (lines 475-494), `#roleSlider` had `bg-white` without sufficient shadow or container background contrast, making the active indicator visually blend into the surrounding card.
2. In `css/index.css` (line 2121), `.dark #btn-owner, .dark #btn-branch { color: var(--text-secondary) !important; }` forced both tabs to share the exact same text color in dark mode, masking the active selection.
3. In `js/auth.js` (`setLoginRole`), tab class replacements left font weights and text colors ambiguous across theme switches.

## Proposed Changes
1. **`app/index.html`**:
   - Modernize `.login-role-toggle` container background and border.
   - Update `#roleSlider` with clear active border and drop-shadow elevation.
   - Define active and inactive font weights (`font-bold` for active, `font-medium` for inactive).

2. **`js/auth.js`**:
   - In `setLoginRole()`, cleanly toggle `font-bold text-indigo-600 dark:text-indigo-400` on the active tab, and `font-medium text-gray-500 dark:text-gray-400` on the inactive tab.

3. **`css/index.css`**:
   - Remove the blanket text color override (`.dark #btn-owner, .dark #btn-branch`) so active/inactive colors render properly.
   - Define distinct container and slider backgrounds for both light and dark modes.

4. **Version Bump & App Sync**:
   - Bump app version to `3.9.21` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
   - Keep user-facing release notes simple ("Minor bugs and fixes").
   - Compile bundle via `npm run build`.
   - Update `Chat_History/chat_history.txt`.

## Verification Plan
- Run `npm run build` to verify clean compilation.
- Test switching between "Business Admin" and "Branch Manager" tabs to confirm high-contrast visual clarity on active/inactive states.
