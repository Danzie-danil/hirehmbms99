# Implementation Plan: Sidebar Auto-Close on Window Resize (233)

## Problem Description
When users resized their browser window from desktop resolutions down to narrow mobile/tablet viewports (or snapped browser windows into half-screen view), the left navigation sidebar remained stuck open as a persistent floating drawer covering half of the mobile content area. Furthermore, view switching logic had an outdated breakpoint (`< 768px`) that failed to auto-dismiss the drawer on tablet viewports between 768px and 1024px.

## Proposed Changes
1. **Window Resize Listener Enhancement (`js/app.js` lines 303-317)**:
   - Updated the `resize` event handler so that whenever the viewport width is below the desktop breakpoint (`window.innerWidth < 1024`), `#mainSidebar` is automatically closed (`sidebar.classList.add('-translate-x-full')`) and `#sidebarOverlay` is hidden (`overlay.classList.add('hidden')`).
2. **Outside Click Dismissal (`js/app.js` lines 318-330)**:
   - Added a global `click` listener for mobile/tablet screen sizes (`window.innerWidth < 1024`) that automatically dismisses the sidebar if the user clicks anywhere on the page outside `#mainSidebar` and outside the toggle hamburger button.
3. **Unified Breakpoint Alignment (`js/app.js`)**:
   - Replaced `< 768` with `< 1024` across view transitions (`switchView`), ensuring that clicking any navigation item or switching views on tablets/mobile immediately collapses the drawer.
   - Aligned onboarding tour drawer checks to `< 1024`.
4. **App Version Bump & Compilation**:
   - Incremented version to `v3.9.254` across `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
   - Audited with `node scripts/lint_check.cjs` (238 files, 0 issues).
   - Built production bundle with `npm run build` (6.55s, 0 errors).

## Verification Plan
- Verified via `browser_subagent` at `1200x700` and resized down to `450x700`.
- Verified `#mainSidebar` automatically adds `-translate-x-full`, transforms to `-240px`, and leaves the page content completely clean and unobstructed.
