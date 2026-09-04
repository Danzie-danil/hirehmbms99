# Implementation Plan: Full App Realtime & Mobile Responsive Lifecycle (99)

## Goal Description
Eliminate the mobile delay / "cloud connection delayed. showing cached data" warning state when returning to the app from the background, and provide instant, zero-lag navigation and fully responsive real-time synchronization across all modules on mobile, tablet, and desktop.

---

## Proposed Changes

### 1. [js/app.js](file:///d:/v2%20BMS%20OFFICIAL/js/app.js)
- Remove the intrusive `'Cloud connection delayed. Showing cached data.'` warning toast.
- Streamline `switchView` so cached views render instantaneously (< 30ms) without waiting for slow or hung cloud network sockets.
- Decouple background network revalidation from foreground view rendering so mobile background-resume is snappy and seamless.

### 2. [js/lifecycle.js](file:///d:/v2%20BMS%20OFFICIAL/js/lifecycle.js)
- Fast-track mobile wake-up by re-establishing the Supabase Realtime channel (`initRealtimeSync(true)`) non-blockingly.
- Remove synchronous blocking timeouts from `handleAppResume` that cause watchdog races on mobile tab switching.

### 3. [js/data/repositories/dashboardRepository.js](file:///d:/v2%20BMS%20OFFICIAL/js/data/repositories/dashboardRepository.js) & [js/db.js](file:///d:/v2%20BMS%20OFFICIAL/js/db.js)
- Add 5-second resilient timeouts to background cloud queries so dead TCP sockets on mobile wake-up never block navigation.
- Ensure all module views render from IndexedDB instantly while the real-time WebSocket connection keeps all numbers synchronized live.

---

## Verification Plan
1. Test mobile wake-up lifecycle (simulating visibility change / background tab resume).
2. Test view navigation across all tabs on mobile to ensure zero warning toasts and sub-50ms transitions.
3. Run `npm run build` to verify clean compilation.
