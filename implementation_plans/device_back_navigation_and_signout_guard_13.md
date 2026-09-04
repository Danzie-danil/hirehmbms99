# Device Back Navigation & Sign Out Confirmation Engine Plan

Implement a hardware/browser back-navigation interceptor and universal sign-out confirmation modal. When a user is logged into `/app/`, device back navigation will navigate internal view history and dismiss modals. If no more views remain in the history stack, it triggers a sign-out confirmation modal rather than dropping the user onto the landing page. Additionally, any access to the landing page while an active session exists will automatically route back to `/app/`.

## Architecture & Implementation Steps

### 1. Landing Page Session Guard (`index.html` & public pages)
- In the `<head>` script of `index.html`, check for any active authenticated session (`bms_last_role`, `sb-...-auth-token`).
- Automatically replace location to `/app/` if an active session exists so logged-in users cannot be stranded on the landing page.

### 2. Sign Out Confirmation Modal (`js/ui/confirmSignOutModal.js`)
- Design a compact, responsive, glassmorphic sign-out confirmation dialog.
- Functions:
  - `promptSignOut()` / `window.confirmSignOut()`
  - Shows warning icon, user friendly message ("Are you sure you want to sign out?"), "Cancel / Stay in App" button, and "Sign Out" button.
  - Updates all sidebar and header logout buttons to invoke `window.confirmSignOut()`.

### 3. In-App Navigation Stack & PopState Interceptor (`js/app.js`)
- Maintain `state.viewHistory = []` synchronized with `switchView()`.
- Push browser state on view transitions: `history.pushState({ bmsView: viewId }, '', '/app/#view=' + viewId)`.
- Listen for `popstate` events:
  1. If mobile sidebar is open, close it and prevent exit.
  2. If any modal / dialog is open (e.g., release notes, surveys, confirmation, form modals), close it and prevent exit.
  3. If `state.viewHistory.length > 1`, pop the stack and switch to previous view (`switchView(prevView, null, true)`).
  4. If at root view with no remaining view history, re-push state and display `promptSignOut()`.

## Verification Plan
- Verify `npm run build` completes with 0 errors.
- Test view transitions, modal dismissal via back navigation, root view sign out prompt, and landing page redirection.
