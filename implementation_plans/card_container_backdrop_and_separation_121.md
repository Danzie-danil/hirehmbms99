# Implementation Plan - Enhanced Card & Container Backdrop Separation (121)

Enhance visual contrast and depth separation between the root background and UI cards/containers across light and dark modes.

## Root Cause Analysis
1. In `css/index.css` (lines 3328-3410), a global override block had set `box-shadow: none !important;` on all cards, containers, and shadow utility classes (`.shadow-2xs`, `.shadow-xs`, `.shadow-sm`, `.shadow-md`, etc.).
2. The root background color (`--bg-main: #f4f6f8`) and white card surfaces (`--bg-card: #ffffff`) had low contrast without any subtle backdrop shadow or distinct border definition.
3. This made cards appear visually merged into the root background without clear boundary definition.

## Proposed Changes
1. **`css/index.css`**:
   - Tune `--background` and `--bg-main` to `#edf1f5` in light mode (and `#111615` in dark mode) to create a clear tonal contrast difference with pure white card surfaces (`#ffffff` / `#222826`).
   - Enhance `--border-color` and `--divider` to crisp, subtle borders (`rgba(71, 91, 110, 0.14)` in light mode, `rgba(255, 255, 255, 0.10)` in dark mode).
   - Restore clean, modern, subtle backdrop elevation on cards and containers:
     - Light mode: `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 14px rgba(0, 0, 0, 0.04);`
     - Dark mode: `box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.35);`
   - Remove the blanket `box-shadow: none !important;` overrides to allow natural backdrop depth across the entire app.

2. **Version Bump & App Sync**:
   - Increment version to `3.9.17` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
   - Keep user-facing release notes simple ("Minor bugs and fixes").
   - Compile bundle via `npm run build`.
   - Update `Chat_History/chat_history.txt`.

## Verification Plan
- Run `npm run build` to confirm 0 compilation and lint errors.
- Verify clear visual separation and distinct backdrop between cards/containers and the root canvas.
