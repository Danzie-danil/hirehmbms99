# Implementation Plan: Auto-Trigger Refresh Button After Inactivity Session (172)

## 1. Overview & Goal
Enforce auto-refresh behavior such that when the application resumes from an inactive session / background / sleep / tab switch, the app automatically triggers the global header refresh button (`<i data-lucide="refresh-cw">`), spinning the refresh icon, invalidating stale caches, and cleanly synchronizing fresh data.

## 2. Proposed Changes

### A. Inactivity Session Manager (`js/inactivityManager.js`)
- Update `INACTIVITY_LIMIT_MS` to 5 minutes.
- In `triggerInactivityReload`, target the global header refresh button element (`document.querySelector('button[onclick*="triggerAppRefresh"]')`) to auto-click it, or invoke `window.triggerAppRefresh()`.
- Ensure spin animation (`animate-spin`), loader indicator, cache clearing, and active view persistence are triggered seamlessly on resume.

## 3. Verification Plan
1. Test tab resume and wake events via `initInactivityManager`.
2. Verify that upon resume past inactivity threshold, `triggerAppRefresh` executes, spinning the `refresh-cw` icon and reloading fresh data.
3. Run `npm run build` and ensure 0 errors.
