# BMS Ultra-Premium Global Tooltip Engine Plan

Implementation of a universal, hardware-accelerated, glassmorphic hover tooltip engine across the entire BMS platform to replace slow, unstyled native browser OS tooltips.

## User Requirements
- Create premium hover tooltips, not the native ones.
- Ensure all hover tips across the entire application use this engine.

## Architecture & Implementation Highlights

1. **Global Interception Engine (`js/ui/tooltip.js`)**:
   - Singleton tooltip container `#bms-premium-tooltip` appended to `document.body`.
   - Global event delegation for `mouseover`, `mouseout`, `focusin`, `focusout`, and mobile touch events.
   - Dynamic interceptor + `MutationObserver` that converts all `title="..."` attributes to `data-bms-tooltip` on existing and dynamically inserted DOM nodes so native browser OS rectangles never appear.
   - Fast responsiveness with intelligent delay (~110ms on fresh hover, ~40ms on rapid transition between elements).
   - Dynamic boundary calculation with automatic flipping (`top`, `bottom`, `left`, `right`) and viewport edge clamping.
   - Rich support for keyboard shortcut badges (`<kbd>`), section titles, and color variants (`indigo`, `emerald`, `amber`, `rose`, `default`).

2. **Visual Design & Micro-Animations (`css/index.css`)**:
   - Deep slate/obsidian glassmorphism with `backdrop-filter: blur(12px)`.
   - Subtle inner border highlights (`inset 0 1px 1px rgba(255,255,255,0.2)`).
   - High-contrast typography with crisp font rendering.
   - Smooth transform micro-animation (`scale(0.92)` to `scale(1)` with cubic bezier ease).
   - Adaptive directional arrow caret.

3. **Global Integration (`js/main.js`, `js/app.js`)**:
   - Initialized at root boot sequence so tooltips are active everywhere immediately.

## Verification Plan
- Verify with `npm run build` (0 lint/bundle errors).
- Confirm automatic title interception and smooth rendering.
