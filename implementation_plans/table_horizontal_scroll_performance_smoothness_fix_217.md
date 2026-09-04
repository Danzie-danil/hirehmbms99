# Implementation Plan: Fix Table Horizontal Scroll Lag & Sluggishness (217)

## Overview
When scrolling vertically, pages and tables scroll smoothly and fast at native GPU speed. However, scrolling horizontally (left/right) on tables feels noticeably slow and laggy.
Investigation revealed two compounding root causes:
1. **Conflicting Smooth Scroll CSS**: `css/index.css` set `scroll-behavior: smooth;` on `.overflow-x-auto`. Unlike vertical scrolling over large distances, horizontal table scrolling involves high-frequency micro-deltas (from trackpads, horizontal wheel ticks, or mouse drags). `scroll-behavior: smooth` intercepts every micro-delta and queues an ease-out animation curve, causing extreme animation queue lag and sluggish creeping movement.
2. **JavaScript Native Gesture Hijacking**: In `js/app.js` (`window.initTouchpadWheelScroll`), the `wheel` event handler checked `if (e.deltaX !== 0 || e.shiftKey)` and called `e.preventDefault()`. Whenever a user swiped horizontally with a trackpad or tilt wheel (`e.deltaX !== 0`), JavaScript killed the browser's hardware-accelerated 120 FPS compositor scroll, replacing it with stepped manual assignments (`scrollLeft += delta * 1.2`), which then fought with `scroll-behavior: smooth`.

---

## User Review Required

> [!IMPORTANT]
> - By removing `e.preventDefault()` on native horizontal gestures (`e.deltaX !== 0`), trackpads and precision touchpads will now use the browser's native C++ compositor thread with hardware acceleration, matching vertical scrolling speed and momentum.
> - Setting `scroll-behavior: auto !important;` on `.overflow-x-auto` ensures immediate, responsive 1:1 tracking without animation queue lag.
> - Shift + Mouse Wheel horizontal scrolling will remain fully supported.

---

## Proposed Changes

### 1. Update Global Table Scroll CSS (`css/index.css` & `app/index.html`)
- In `css/index.css`:
  - Separate `.overflow-x-auto` from `.overflow-y-auto` and `#mainContent`.
  - Set `scroll-behavior: auto !important;` and `overscroll-behavior-x: contain;` on `.overflow-x-auto`.
- In `app/index.html`:
  - Ensure `.overflow-x-auto` has `scroll-behavior: auto !important;` and `overscroll-behavior-x: contain;`.

### 2. Refactor Horizontal Wheel Handler (`js/app.js`)
- In `window.initTouchpadWheelScroll`:
  - Do NOT intercept native horizontal delta (`e.deltaX !== 0`). Allow the browser to scroll natively at full GPU speed.
  - Only intercept when the user holds `Shift` with a vertical-only mouse wheel (`e.shiftKey && e.deltaY !== 0 && e.deltaX === 0`) or scrolls over the floating dock (`#globalTableScrollDock`).

---

## Verification Plan

### Automated & Build Verification
1. `node scripts/lint_check.cjs` (verify 0 syntax errors).
2. `npm run build` (verify bundle compilation).

### Manual Verification
1. Open the Low Stock Report modal or any table (Branch Inventory, Sales, Expenses, Central Inventory).
2. Scroll horizontally with trackpad (two-finger horizontal swipe) or mouse drag:
   - Verify it moves instantaneously and fluidly without any lag or delayed creeping.
3. Hold Shift and roll the vertical mouse wheel:
   - Verify it scrolls horizontally fast and smoothly.
4. Scroll vertically:
   - Verify vertical scrolling remains smooth and unaffected.
