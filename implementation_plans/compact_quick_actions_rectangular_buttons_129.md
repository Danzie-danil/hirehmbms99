# Implementation Plan - Compact Quick Actions & Rectangular Button Sizing (129)

Remove the circular/oval pill styling from Quick Action buttons on mobile, make them compact, and restore clean rectangular rounded tile geometry.

## Root Cause Analysis
In `css/index.css` (lines 2803-2815), the mobile media query `@media (max-width: 480px)` contained `#mainContent button { border-radius: 9999px !important; }`, which overrode all local button radius classes on mobile devices, forcing Quick Action grid tiles into stadium-shaped ovals.

## Proposed Changes
1. **`css/index.css`**:
   - In `@media (max-width: 480px)`, remove the universal `#mainContent button { border-radius: 9999px !important; }` rule and scope it strictly to actual pill elements (`.btn-pill`, `button.rounded-full`).
   - Define compact dimensions for `.grid button.rounded-xl.border`, `.grid button.rounded-lg.border`, and `.grid button.border` (`padding: 0.35rem 0.2rem`, `border-radius: 0.5rem !important` / 8px rounded corners, smaller 1.35rem icon container, and compact text).
   - In default desktop rules (lines 473-510), ensure standard `border-radius: 0.65rem !important` and compact padding.

2. **Version Bump & App Sync**:
   - Bump app version to `3.9.25` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
   - Keep user-facing release notes simple ("Minor bugs and fixes").
   - Compile bundle via `npm run build`.
   - Update `Chat_History/chat_history.txt`.

## Verification Plan
- Run `npm run build` to verify clean compilation.
- Inspect Quick Actions on mobile viewports to confirm buttons are compact, flat, rectangular rounded tiles with no circular/oval stadium artifacts.
