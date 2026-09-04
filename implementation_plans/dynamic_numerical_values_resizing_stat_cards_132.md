# Implementation Plan - Dynamic Numerical Values Auto-Scaling on Stat Cards (132)

Ensure numerical values in stat and KPI cards across all modules (including Liabilities/Loans and Assets) automatically resize down to fit the card without ellipsis (`...`) truncation.

## Root Cause Analysis
1. In `js/owner/loans.js` (lines 119-154) and `js/owner/assets.js` (lines 125-160), stat values used static `<h3>` tags with fixed typography classes (`text-lg sm:text-xl md:text-2xl truncate`) rather than the fluid `.text-dynamic-lg` container-query system.
2. In `css/index.css`, fixed font sizing and `text-overflow: ellipsis` on mobile stat cards forced longer numeric sums (e.g. 9-11 digit figures) to truncate with `...` instead of scaling down proportionally.

## Proposed Changes
1. **`js/owner/loans.js`**:
   - Update metric elements in stat cards (Total Principal Borrowed, Outstanding Debt Balance, Total Repaid, Active Credit Lines) to use `<p class="text-dynamic-lg font-black ... leading-tight my-1 ...">`.

2. **`js/owner/assets.js`**:
   - Update metric elements in stat cards (Total Asset Valuation, Current Book Value, Total Maintenance Spent, Active vs Service) to use `<p class="text-dynamic-lg font-black ... leading-tight my-1 ...">`.

3. **`css/index.css`**:
   - Upgrade `.text-dynamic`, `.text-dynamic-lg`, and mobile `#mainContent .stat-card` numeric selectors with fluid container-query scaling `clamp(9px, 6.5cqw, 1.35rem)` and `text-overflow: clip` so amounts gracefully scale down instead of cutting off with ellipsis.

4. **Version Bump & App Sync**:
   - Bump app version to `3.9.28` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
   - Keep user-facing release notes simple ("Minor bugs and fixes").
   - Compile bundle via `npm run build`.
   - Update `Chat_History/chat_history.txt`.

## Verification Plan
- Run `npm run build` to confirm 0 compilation errors.
- Verify large currency amounts in Liabilities, Assets, and Overview scale down smoothly without `...` ellipsis.
