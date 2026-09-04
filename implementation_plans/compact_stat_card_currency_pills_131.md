# Implementation Plan - Compact Stat Card Currency Pills (131)

Resize and compact the floating currency indicator badges ("TSh") on top of KPI and Stat Cards on mobile viewports so they appear sleek, subtle, and proportional instead of bloated.

## Root Cause Analysis
In `css/index.css` (line 2821), the mobile media query included `#mainContent [class*="rounded-full"]` in the general button padding rule (`padding: 0.45rem 0.6rem !important`). This caused stat card currency indicator badges (`<div class="... rounded-full ...">`) to expand into oversized inflated bubbles overlapping card borders.

## Proposed Changes
1. **`css/index.css`**:
   - Remove `#mainContent [class*="rounded-full"]` from the button padding rule in `@media (max-width: 480px)`.
   - Add explicit micro-pill styling for `.stat-card div[class*="-top-2.5"]`, `.currency-pill`, and currency indicators (`padding: 1px 5px !important`, `font-size: 7.5px !important`, `top: -7px !important`, `right: 10px !important`).
   - Add default desktop micro-pill styling for stat card currency badges (`padding: 1.5px 6px`, `font-size: 8px`).

2. **Version Bump & App Sync**:
   - Bump app version to `3.9.27` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
   - Keep user-facing release notes simple ("Minor bugs and fixes").
   - Compile bundle via `npm run build`.
   - Update `Chat_History/chat_history.txt`.

## Verification Plan
- Run `npm run build` to confirm 0 compilation errors.
- Verify stat card currency pills ("TSh") render as neat, compact, micro-badges without bloated padding.
