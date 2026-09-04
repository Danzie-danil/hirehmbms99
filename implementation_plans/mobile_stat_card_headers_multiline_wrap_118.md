# Implementation Plan - Mobile Stat Card Headers Multi-Line Wrap (118)

Ensure KPI and metric stat card headers/titles gracefully wrap onto multiple lines on mobile screens without overflowing or expanding outside card boundaries.

## Root Cause Analysis
1. In `css/index.css` (line 1286), `.stat-card` had `align-items: center !important; text-align: center !important; justify-content: center !important;`. This centered all contents, causing left-aligned headers with right-padding (e.g. `pr-12` for badge clearance) to have their visual bounding box shifted far left and overflowing outside the card border.
2. In `js/owner/assets.js` and `js/owner/loans.js`, stat headers utilized `block truncate` (which forces `white-space: nowrap !important; text-overflow: ellipsis;`) and large right padding (`pr-12` / 48px), restricting the printable width on mobile and preventing multi-line wrapping.
3. On narrow viewport widths (e.g. 2-column mobile layout), uppercase tracking (`tracking-wider`) and single-line enforcement made titles like "TOTAL ASSET VALUATION" and "TOTAL MAINTENANCE SPENT" expand outside the card.

## Proposed Changes
1. **`css/index.css`**:
   - Normalize `.stat-card` base layout to maintain clean left-alignment and vertical space distribution without forcing center alignment.
   - Add universal wrapping rules for `.stat-card` headers, titles, and uppercase labels so text breaks and wraps cleanly (`white-space: normal !important; word-break: break-word !important; overflow-wrap: break-word !important; line-height: 1.25 !important;`).
   - Under mobile `@media` rules, ensure `#mainContent .stat-card` properly constrains padding and sets badge padding room without squeezing header titles.

2. **`js/owner/assets.js`**:
   - Remove `pr-12` and replace with `pr-8 sm:pr-10`.
   - Remove `truncate` and add multi-line wrapping classes `block whitespace-normal break-words leading-tight text-[11px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wider`.

3. **`js/owner/loans.js`**:
   - Remove `pr-12` and replace with `pr-8 sm:pr-10`.
   - Remove `truncate` and add multi-line wrapping classes `block whitespace-normal break-words leading-tight text-[11px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wider`.

4. **Version Bump & App Sync**:
   - Increment app version to `3.9.14` across `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
   - Keep user-facing release notes simple ("Minor bugs and fixes").
   - Compile service worker via `npm run build`.
   - Update `Chat_History/chat_history.txt`.

## Verification Plan
- Run `npm run build` to confirm clean compilation and zero lint/type errors.
- Verify that stat headers on mobile wrap neatly into two lines without expanding outside the card.
