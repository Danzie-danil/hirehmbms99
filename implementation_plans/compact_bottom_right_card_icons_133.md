# Implementation Plan - Compact Bottom-Right Stat Card Icons (133)

Make the bottom-right badge icons and SVG sparklines across all stat and KPI cards very compact, push them to the very bottom-right edge of the cards, and eliminate interference with card texts and amounts.

## Root Cause Analysis
1. In stat cards across `js/owner/loans.js`, `js/owner/assets.js`, etc., icon sockets were rendered as `w-7 h-7` (28px by 28px) at `bottom-2 right-2` (8px inset) and had large right padding on text (`pr-8 sm:pr-10`).
2. This caused the bottom-right icons to intrude into the card content, crowding numeric values and subtitle labels.

## Proposed Changes
1. **`js/owner/loans.js`**:
   - Update bottom-right icon sockets to `w-4.5 h-4.5 rounded-[6px] bottom-1 right-1` with `w-2.5 h-2.5` icons.
   - Adjust text right-padding from `pr-8 sm:pr-10` to `pr-5 sm:pr-6`.

2. **`js/owner/assets.js`**:
   - Update bottom-right icon sockets to `w-4.5 h-4.5 rounded-[6px] bottom-1 right-1` with `w-2.5 h-2.5` icons.
   - Adjust text right-padding from `pr-8 sm:pr-10` to `pr-5 sm:pr-6`.

3. **`css/index.css`**:
   - Add universal desktop and mobile rules for `.stat-card > div.absolute[class*="bottom-"]` and `.stat-card > svg.absolute[class*="bottom-"]` to enforce compact dimensions (`18px` desktop / `15px` mobile, `bottom: 3.5px; right: 3.5px`), scaling icons down to `9px - 10px` and keeping text padding optimal.

4. **Version Bump & App Sync**:
   - Bump app version to `3.9.29` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
   - Keep user-facing release notes simple ("Minor bugs and fixes").
   - Compile bundle via `npm run build`.
   - Update `Chat_History/chat_history.txt`.

## Verification Plan
- Run `npm run build` to confirm 0 compilation errors.
- Verify stat cards in Liabilities, Assets, Overview, and Branch portals have tiny, sleek icons at the bottom-right corners without overlapping text.
