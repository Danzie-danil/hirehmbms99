# Adaptive Scrolled Navbar Width & Nav Links Protection

## Overview
On the landing page (`index.html`), when the user scrolls down, `#mainNav.nav-scrolled` previously clamped to a rigid fixed width (`max-width: 800px !important;`) combined with `flex-1 min-w-0 justify-center` on the links container. This forced the nav links to compress, causing "Features" to be partially clipped under the logo and "Support" to be hidden behind the "Sign In" button.

## Proposed Changes
1. **CSS Adaptation (`index.html`)**:
   - Update `#mainNav.nav-scrolled` to dynamically adapt to its contents with `width: max-content !important; max-width: calc(100vw - 2rem) !important;` instead of hardcoding `max-width: 800px`.
   - Ensure smooth transition for `width`, `max-width`, and `padding`.
2. **Layout Structure (`index.html`)**:
   - Replace `flex flex-1 min-w-0` on the nav links container with `flex items-center justify-center shrink-0` and balanced responsive gaps (`gap-2 sm:gap-3 md:gap-4 lg:gap-5`).
   - Prevent any clipping, overlapping, or mask degradation.
3. **Build & Version Sync**:
   - Bump version to `v3.9.140` across `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
   - Run `npm run build` to verify clean build without syntax/lint errors.
   - Update `Chat_History/chat_history.txt`.
