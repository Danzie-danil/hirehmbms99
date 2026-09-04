# Implementation Plan - Mobile Background Wakeup & Empty Canvas Auto-Recovery

> [!IMPORTANT]
> **Plan ID**: `mobile_background_resume_and_canvas_recovery_67`
> **Objective**: Eliminate the blank canvas issue when resuming BMSTz on mobile browsers after long background sleep, while strictly preserving existing authentication, sign-in, and sign-up flows.

---

## 1. User Voice Directive (Exact Transcript)
> *"Okay, I received the test notification on the mobile. I will update you whether it's also on all devices, but for now that's it. But, you see those screenshots there? Those screenshots actually, I opened the app and left it in the background for a considerable amount of time. When I came back to it, it gave me that blank look with only the top navigation, and you can see in one of those images down in the bottom left where we have the logged in user, it just defaulted to the 'Admin' so the user email and state was kind of temporarily not visible, but the user was not logged out. So when I clicked the refresh on the navigation bar, everything just came back to normal. But I'm looking forward for us to completely avoid this blank screen issue. Yeah, see how you can fix that without destroying the login, sign up, sign in flow that we just set before, don't touch that. Just fix this minor issue when the app was left running for a long time and when the user comes back to open it, they find this empty canvas thing. Just fix that issue."*

---

## 2. Root Cause Analysis
1. **Memory Suspension during Extended Background Sleep**:
   - On iOS Safari and Android Chrome, backgrounded tabs undergo aggressive memory freezing and thread suspension.
   - When the page is resumed, `state.role` and `state.currentUser` in JavaScript memory may be unhydrated before `handleAppResume` runs.
2. **Early Exit Guard in `handleAppResume`**:
   - In [`js/lifecycle.js`](file:///d:/v2%20BMS%20OFFICIAL/js/lifecycle.js), `if (resumeInFlight || !state.role) return;` caused the recovery routine to abort immediately if `state.role` had not yet been restored in memory.
3. **Empty Canvas Detection (`currentViewNeedsRetry`)**:
   - The retry heuristic only checked specific error strings and was missing a direct blank-canvas check (`!mainContent.innerHTML.trim() || !mainContent.children.length`).
4. **Missing `pageshow` Lifecycle Listener**:
   - Mobile Safari restores tabs from `bfcache` using the `pageshow` event, which was not hooked into the resume scheduler.

---

## 3. Proposed Fixes & Safety Guarantees

### A. Strict Auth Flow Preservation
- **No changes** to login, signup, or password reset methods in [`js/auth.js`](file:///d:/v2%20BMS%20OFFICIAL/js/auth.js).
- We only reinforce the background resume watchdog in [`js/lifecycle.js`](file:///d:/v2%20BMS%20OFFICIAL/js/lifecycle.js) and ensure optimistic memory hydration.

### B. Lifecycle Enhancements in [`js/lifecycle.js`](file:///d:/v2%20BMS%20OFFICIAL/js/lifecycle.js)
1. **Hydrate Session Before Guard**: Call `_tryRestoreOfflineSession(null, false)` before checking whether to proceed, ensuring `state.role` and `state.currentUser` are populated.
2. **Re-hydrate UI Elements**: Immediately update `#currentUser`, `updateSidebarAvatar()`, and header business name upon resume.
3. **Blank Canvas Watchdog**: Strengthen `currentViewNeedsRetry()` to detect empty/blank `#mainContent` and automatically trigger `window.switchView(getCurrentView(), null, true)`.
4. **Attach `pageshow` Listener**: Ensure iOS Safari and Android bfcache resumes trigger the recovery scheduler without delay.

---

## 4. Verification Plan
- Verify build passes with `npm run build`.
- Bump app version to `v3.0.5`.
