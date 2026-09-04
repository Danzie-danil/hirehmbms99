# Implementation Plan - Restore Global Pill Buttons Except Quick Actions (130)

Restore the rounded stadium-pill radius to general buttons and filter controls across the entire application while strictly preserving compact rectangular rounded styling exclusively on Quick Action grid buttons.

## Proposed Changes
1. **`css/index.css`**:
   - Re-enable the global rounded full pill styling (`border-radius: 9999px !important`) for general buttons, header actions, CTAs, and filter buttons (`.filter-btn`, `[class*="-filter-btn"]`, `.btn`, `.btn-*`, etc.).
   - Explicitly exclude grid quick action tiles via `:not(.grid button)` and apply strict compact rectangular rounded corners (`border-radius: 0.5rem !important` on mobile, `0.65rem !important` on desktop) with smaller icon sizing solely to Quick Action buttons.

2. **Version Bump & App Sync**:
   - Bump app version to `3.9.26` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
   - Keep user-facing release notes simple ("Minor bugs and fixes").
   - Compile bundle via `npm run build`.
   - Update `Chat_History/chat_history.txt`.

## Verification Plan
- Run `npm run build` to confirm 0 compilation errors.
- Verify filter buttons, header buttons, and CTAs have their rounded pill appearance, while Quick Action tiles remain compact and rectangular.
