# Implementation Plan - Mobile Sync Indicator & Offline Overlay Cleanup (122)

Simplify the mobile sync indicator to an icon-only spinner, show a yellow cellular data icon for offline status (without "Offline (Cached)" text), and remove the bottom offline mode overlay.

## User Request Analysis
1. **Sync Indicator**: On mobile, show only the spinning sync icon instead of the text "Syncing...".
2. **Offline Indicator**: In offline mode, do not show "Offline (Cached)" text; show a crisp cellular data icon in yellow/amber color.
3. **Bottom Overlay**: Remove the bottom "Offline Mode" banner/overlay (`#offlineSyncBanner`) so it does not obstruct the bottom UI.

## Proposed Changes
1. **`js/data/networkStatus.js`**:
   - In `updateNetworkUI()`:
     - When `syncing`: Render the spinning sync icon, hiding the text label on mobile (`<span class="hidden sm:inline ml-1">Syncing...</span>`).
     - When `offline`: Render an inline cellular data signal SVG icon in yellow (`text-amber-500`), hiding the text label on mobile (`<span class="hidden sm:inline ml-1">Offline</span>`).
     - Optimize pill padding on mobile (`p-1.5 sm:px-2.5 sm:py-1 rounded-full`).

2. **`js/offline_queue.js`**:
   - In `updateOfflineStatusUI()`:
     - Remove the floating bottom `#offlineSyncBanner` element and prevent it from rendering, ensuring the bottom viewport remains completely unobscured.

3. **Version Bump & App Sync**:
   - Bump app version to `3.9.18` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
   - Keep user-facing release notes simple ("Minor bugs and fixes").
   - Compile bundle via `npm run build`.
   - Update `Chat_History/chat_history.txt`.

## Verification Plan
- Run `npm run build` to confirm 0 compilation and lint errors.
- Verify compact icon-only presentation on mobile for sync and offline status.
