# Implementation Plan: Seamless Session Retention & App Resume (106)

## Goal Description
Implement TUBA-style seamless session persistence, zero-delay offline-first app bootstrapping, background focus guard, and bulletproof session retention across device restarts, screen lock/unlock, and background resume.

---

## Key Enhancements

### 1. Deterministic Supabase Auth Client Configuration ([js/supabase.js](file:///d:/v2%20BMS%20OFFICIAL/js/supabase.js))
- Set explicit `storageKey: 'bmstz-auth-token'`, `multiTab: true`, `persistSession: true`, and `autoRefreshToken: true` with `window.localStorage`.
- Guarantees tokens survive phone restarts, browser process drops, and PWA standalone restarts.

### 2. Background Focus Guard on Resume ([js/auth.js](file:///d:/v2%20BMS%20OFFICIAL/js/auth.js))
- In `supabase.auth.onAuthStateChange`, check if `event === 'SIGNED_IN'` is triggered for an already-authenticated user (`state.currentUserUuid === session.user.id`).
- Skip redundant re-initialization and UI tear-downs so navigation and active data views stay intact without flickering or blank screens.

### 3. Immediate Zero-Delay Optimistic State Hydration ([js/auth.js](file:///d:/v2%20BMS%20OFFICIAL/js/auth.js))
- On cold boot, immediately hydrate state from cached offline sessions and render the dashboard without waiting for network responses.
- Concurrently verify backend session in a detached non-blocking background promise.

### 4. Resilient Token Refresh & Error Handling
- Smoothly handle `TOKEN_REFRESHED` events by updating credentials and preserving active role states.

---

## Proposed Changes

### [MODIFY] [js/supabase.js](file:///d:/v2%20BMS%20OFFICIAL/js/supabase.js)
- Configure `storageKey: 'bmstz-auth-token'` and `multiTab: true`.

### [MODIFY] [js/auth.js](file:///d:/v2%20BMS%20OFFICIAL/js/auth.js)
- Add the background focus guard to `onAuthStateChange`.
- Ensure zero-blocking session check on app resume.

---

## Verification Plan

### Automated Verification
- Run `npm run build` to verify clean compilation with 0 errors.

### Manual / Flow Verification
- Verify that closing and reopening the app keeps the user logged in instantly without flash of login or blank screen.
