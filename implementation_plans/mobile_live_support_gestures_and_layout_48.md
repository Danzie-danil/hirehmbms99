# Implementation Plan - Mobile Live Support Touch Gestures, Swipes, & Mobile Layout Suite (Index 48)

Support live remote interaction for mobile devices by introducing touch tap visualizers, directional swipe detection (up, down, left, right), mobile soft keyboard input mirroring, and mobile viewport responsive layout safeguards for Live Support sessions.

## Proposed Changes

### 1. Touch & Swipe Gesture Engine (`js/admin/handshake.js`)

#### [MODIFY] [`js/admin/handshake.js`](file:///d:/v2/BMS/OFFICIAL/js/admin/handshake.js)
- Add `touchstart`, `touchmove`, and `touchend` event listeners to `setupSysadminInteractionTracking()`.
- Calculate touch delta (`deltaX`, `deltaY`) and duration to detect swipes vs. mobile taps.
- Broadcast `mobile_tap` payload `{ xPct, yPct, targetSelector }` for quick touch taps.
- Broadcast `mobile_swipe` payload `{ direction: 'up'|'down'|'left'|'right', deltaX, deltaY, xPct, yPct }` for swipe gestures.
- Capture mobile keyboard input events (`input`, `compositionend`) with input selector tracking.

---

### 2. Owner Mobile Gesture Renderer & Visualizer (`js/owner/handshakeListener.js`)

#### [MODIFY] [`js/owner/handshakeListener.js`](file:///d:/v2/BMS/OFFICIAL/js/owner/handshakeListener.js)
- Add `renderMobileTouchRipple(xPct, yPct)` to render an expanding, glowing emerald touch ripple circle on the owner's mobile/desktop screen.
- Add `renderMobileSwipeIndicator(xPct, yPct, direction)` to show an animated floating gesture vector indicating swipe movement.
- Handle `mobile_tap` action: render touch ripple and trigger click / element focus.
- Handle `mobile_swipe` action:
  - **Vertical Swipes ('up', 'down')**: Smoothly scroll active window or `.overflow-y-auto` scroll container by `deltaY * 1.5`.
  - **Horizontal Swipes ('left', 'right')**: Smoothly scroll `.overflow-x-auto` horizontal tab containers, or trigger sidebar toggle on edge swipe.
- Enhance `input_change` handler to auto-scroll target input into view (`scrollIntoView({ behavior: 'smooth', block: 'nearest' })`).

---

### 3. Responsive Mobile Banner Safeguards

#### [MODIFY] [`js/owner/handshakeListener.js`](file:///d:/v2/BMS/OFFICIAL/js/owner/handshakeListener.js) & [`js/admin/handshake.js`](file:///d:/v2/BMS/OFFICIAL/js/admin/handshake.js)
- Ensure the sticky control banner layout remains compact on mobile screens (`py-2 px-3 text-[10px] sm:text-xs`) with no line wrap glitches or button overflows.

---

### 4. Version Bump & Log Updates

#### [MODIFY] [`release_notes.json`](file:///d:/v2/BMS/OFFICIAL/release_notes.json), [`public/release_notes.json`](file:///d:/v2/BMS/OFFICIAL/public/release_notes.json), [`js/updateChecker.js`](file:///d:/v2/BMS/OFFICIAL/js/updateChecker.js), [`public/sw.js`](file:///d:/v2/BMS/OFFICIAL/public/sw.js)
- Increment version to `2.9.25`.
- Record entry #125 in [`Chat_History/chat_history.txt`](file:///d:/v2/BMS/OFFICIAL/Chat_History/chat_history.txt).

## Verification Plan

### Automated Build Verification
- Execute `npm run build` to verify clean bundle compilation with 0 lint or module errors.

### Manual Verification
- Test touch tap ripple visualization.
- Test directional swipe detection (`up`, `down`, `left`, `right`).
- Test soft keyboard input mirroring with scroll-into-view.
