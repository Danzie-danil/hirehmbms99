# Implementation Plan - Flat Root Background Without Glows or Gradients (119)

Replace the root background gradient and radial glow overlay with a pure, solid flat background color across light and dark modes.

## Root Cause Analysis
In `css/index.css` (lines 12-13 and 263-264), `--bg-main` was configured with a radial gradient glow overlay:
- Light mode: `radial-gradient(circle at 20% 10%, rgba(71, 91, 110, 0.05), transparent 40%), #f4f6f8`
- Dark mode: `radial-gradient(circle at 20% 10%, rgba(255, 255, 255, 0.02), transparent 40%), #161a19`
- `--bg-card` was configured with subtle angled linear gradients.
This created a glowing halo/radial gradient across the root viewport background.

## Proposed Changes
1. **`css/index.css`**:
   - Update `--bg-main` in `:root` to pure flat `#f4f6f8`.
   - Update `--bg-card` in `:root` to pure flat `#ffffff`.
   - Update `--bg-main` in `.dark` to pure flat `#161a19`.
   - Update `--bg-card` in `.dark` to pure flat `#252b29`.
   - Ensure `html`, `body`, and `#app` enforce flat solid background color with `background-image: none !important;`.

2. **Version Bump & App Sync**:
   - Increment app version to `3.9.15` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
   - Keep user-facing release notes simple ("Minor bugs and fixes").
   - Compile bundle via `npm run build`.
   - Update `Chat_History/chat_history.txt`.

## Verification Plan
- Run `npm run build` to ensure 0 compile and lint errors.
- Verify that the app root background is clean, solid, and flat without any radial or linear gradient glow.
