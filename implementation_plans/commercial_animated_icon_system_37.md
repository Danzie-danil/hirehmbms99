# Implementation Plan: Commercial-Grade Animated Icon System (MIT/No Attribution)

## 1. Overview & Strategy
Integrate a clean, 100% commercial-safe, attribution-free icon architecture for BMSTZ:
- **Base UI Icons**: Tabler Icons & Lucide SVG (clean 24×24 grid, MIT license, zero attribution).
- **Animated Stateful Icons**: AnimateIcons (`@animateicons/react`) and targeted CSS micro-animations.
- **Rule of Restraint**: Only animate icons where motion communicates an active state change or tactile confirmation (avoiding visual clutter):
  - **Syncing / Offline Sync** → Rotation to checkmark burst
  - **Notification Bell** → Gentle ring on new alert
  - **Save / Submit** → Checkmark confirmation
  - **Delete Actions** → Trash lid tilt
  - **Refresh Actions** → Single smooth rotation
  - **Network / Signal** → Sublte pulse

## 2. Proposed Changes

### Dependencies
- Install `@animateicons/react` via `npm install @animateicons/react`.

### CSS Micro-Animation Engine (`index.css`)
- Implement lightweight, GPU-accelerated keyframe animation classes:
  - `.icon-spin-once`: 360-degree rotation on click/trigger.
  - `.icon-bell-ring`: Subtle harmonic bell sway on new notification.
  - `.icon-check-pop`: Elastic scale-in for success confirmations.
  - `.icon-trash-tilt`: Micro-hover interaction for delete buttons.
  - `.icon-pulse-smooth`: Gentle breathing glow for live network activity.

### Interactive Components Integration
- **Notification Header (`js/app.js`)**: Animate bell icon on new real-time alert trigger.
- **Offline Sync Banner (`js/offline_queue.js`)**: Animate refresh/sync spinner during active queue flushing and check burst on completion.
- **Data Refresh Buttons (Overview & Branch views)**: Apply smooth single-cycle rotation on click.
- **Modal Confirmation Actions (`js/modals.js`)**: Add subtle check pop on success toasts.

## 3. Verification Plan
- Build verification via `npm run build`.
- Verify 60fps performance across desktop and mobile screens.
- Ensure 100% MIT-license compliance with zero attribution dependencies.
