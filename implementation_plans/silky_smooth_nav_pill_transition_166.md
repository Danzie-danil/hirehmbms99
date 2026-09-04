# Silky Smooth Scrolled Navbar Transition & Dynamic Pill Width

## Overview
The transition between the large navbar (unscrolled) and the small pill navbar (scrolled) felt "clingy" / janky because CSS cannot interpolate transitions between relative percentages and intrinsic keyword values (`width: max-content`). When scrolling past the threshold, the layout snapped instantly rather than smoothly gliding into the pill shape.

## Proposed Changes
1. **Dynamic Length Property (`--nav-pill-width`)**:
   - In JavaScript (`index.html`), measure the exact natural width of the navbar content (Logo + Nav Links + Action buttons + gaps + padding) and assign it to a CSS custom property `--nav-pill-width`.
   - Update on window load, fonts/icons load, and resize.
2. **GPU-Accelerated Smooth CSS Interpolation**:
   - Configure `#mainNav` to transition `max-width` smoothly from `80rem` (1280px) to `var(--nav-pill-width)` using an organic ease-out curve (`cubic-bezier(0.16, 1, 0.3, 1)`).
   - Use `will-change: max-width, box-shadow` to ensure hardware compositing and 60fps/120fps frame rates.
   - Use `requestAnimationFrame` for scroll event throttling.
3. **Build & Version Sync**:
   - Bump version to `v3.9.141` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
   - Run `npm run build` and verify.
   - Record in `Chat_History/chat_history.txt`.
