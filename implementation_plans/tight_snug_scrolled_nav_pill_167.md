# Tight Snug Scrolled Navbar & Gap Elimination

## Overview
When the navbar transitioned to the scrolled state, two large empty gaps appeared between the Logo and the Nav Links, and between the Nav Links and the Sign In / Get Started buttons. This was caused by `mx-auto` and `justify-between` spreading the elements to the outer edges of an overly loose container width.

## Proposed Changes
1. **Remove Empty Space Distribution on Scrolled State (`index.html`)**:
   - Add `.nav-links-wrap` class to the links container and override `margin: 0 !important;` when `#mainNav.nav-scrolled` is active.
   - Set `#navContent` to `justify-content: center !important; gap: 1.5rem !important;` when scrolled.
2. **Accurate Tight Pill Width Calculation**:
   - In `computeNavPillWidth()`, measure the exact sum of `Logo + Gap (24px) + Links + Gap (24px) + CTAs + Padding (26px)` without arbitrary bloated buffers.
   - Set the CSS custom property `--nav-pill-width` to this exact snug pixel value.
3. **Build & Version Sync**:
   - Increment version to `v3.9.142` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
   - Run `npm run build` to verify 0 errors.
   - Record in `Chat_History/chat_history.txt`.
