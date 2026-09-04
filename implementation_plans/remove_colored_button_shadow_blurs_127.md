# Implementation Plan - Remove Colored Button Shadow Blurs (127)

Eliminate all colored glow effects and color drop-shadow blurs (such as emerald/green glows under "+ New Sale" and other action buttons) across the application, replacing them with clean, crisp, neutral elevation shadows.

## Root Cause Analysis
In `css/index.css` (lines 523-546 and 1369-1422), `button.bg-emerald-600`, `.btn-primary`, `.btn-danger`, and several action buttons had explicit colored box-shadows (e.g., `0 8px 20px rgba(16, 185, 129, 0.28)`, `rgba(239, 68, 68, 0.3)`, etc.), creating visible colored halo/blur artifacts beneath buttons.

## Proposed Changes
1. **`css/index.css`**:
   - Strip all colored `rgba(16, 185, 129, ...)` and `rgba(71, 91, 110, ...)` colored glow box-shadows on `.btn-primary`, `.action-btn-primary`, `button.bg-emerald-600`, `button.bg-indigo-600`, `.btn-danger`, and `.btn-success`.
   - Add a global rule overriding all `button[class*="shadow-emerald-"]`, `button[class*="shadow-indigo-"]`, etc. with clean neutral elevation (`box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)`).

2. **Version Bump & App Sync**:
   - Bump app version to `3.9.23` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
   - Keep user-facing release notes simple ("Minor bugs and fixes").
   - Compile bundle via `npm run build`.
   - Update `Chat_History/chat_history.txt`.

## Verification Plan
- Run `npm run build` to verify clean compilation.
- Inspect "+ New Sale" button and other action buttons to confirm the colored halo/blur is completely gone and replaced with clean styling.
