# Implementation Plan - Standardize Mobile Component Typography & Font Weights (120)

Align section headers, subheaders, card titles, numerical values, and hints across Capital, Assets, and Loans modules to ensure uniform font weights and sizing on mobile devices.

## Root Cause Analysis
In `js/owner/capital.js`, typography classes diverged between sections and cards:
- Section 1 used `text-xs sm:text-sm uppercase tracking-wider` while Section 2 used `text-lg font-bold` (18px) non-uppercase.
- Account card titles were sized at `text-base` (16px) and balance amounts at `text-lg font-black` (18px), making them appear noticeably larger than neighboring modules and components on mobile.
- Section 2 container used `rounded-3xl p-5 sm:p-6` whereas Section 1 used `rounded-2xl p-4 sm:p-5`.

## Proposed Changes
1. **`js/owner/capital.js`**:
   - Standardize Section 1 and Section 2 headers to `text-sm sm:text-base font-bold text-gray-900 dark:text-white` and subheaders to `text-xs text-gray-500 dark:text-gray-400`.
   - Align Section 2 container to `rounded-2xl p-4 sm:p-5 shadow-xs space-y-4` matching Section 1.
   - Standardize account card titles to `text-sm font-bold text-gray-900 dark:text-white leading-snug`.
   - Standardize balance amounts to `text-sm sm:text-base font-black text-gray-900 dark:text-white` and balance hints to `text-[10px] uppercase font-bold text-gray-400`.
   - Align card badges to `text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg border`.

2. **`js/owner/loans.js` & `js/owner/assets.js`**:
   - Ensure section containers, headers, card titles, and numerical values adhere to the identical standardized typography tokens.

3. **Version Bump & App Sync**:
   - Bump app version to `3.9.16` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
   - Keep user-facing release notes simple ("Minor bugs and fixes").
   - Compile bundle via `npm run build`.
   - Update `Chat_History/chat_history.txt`.

## Verification Plan
- Run `npm run build` to verify clean compilation with 0 errors.
- Verify visual hierarchy and font size consistency across mobile viewports.
