# Implementation Plan - Unclamp Stat Card Numerical Values (134)

Adjust the typography scale on stat and KPI cards so numbers occupy full comfortable card space and do not appear excessively squeezed/small when ample card space is available, while still gracefully scaling down for very large numbers.

## Proposed Changes
1. **`css/index.css`**:
   - Upgrade `.text-dynamic` and `.text-dynamic-lg` container queries to `clamp(0.85rem, 8.5cqw, 1.25rem)` and `clamp(0.875rem, 9.5cqw, 1.5rem)`.
   - Update mobile `@media (max-width: 480px)` stat card value rules to `clamp(11.5px, 8.5cqw, 18px) !important` so standard numbers (e.g. `0`, `1 Active`, `100,000`) render with bold, prominent clarity, while large figures scale down fluidly.

2. **Version Bump & App Sync**:
   - Bump app version to `3.9.30` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
   - Keep user-facing release notes simple ("Minor bugs and fixes").
   - Compile bundle via `npm run build`.
   - Update `Chat_History/chat_history.txt`.

## Verification Plan
- Run `npm run build` to confirm 0 compilation errors.
- Verify stat card numbers render large and prominent when space allows and scale down only when needed.
