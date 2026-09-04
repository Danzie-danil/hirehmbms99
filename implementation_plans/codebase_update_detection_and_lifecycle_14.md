# Codebase Update Detection & Release Notes Lifecycle Engine Plan

Fix the update lifecycle so that:
1. When changes occur in the codebase (`release_notes.json` / service worker), an interactive "Updates Available" CTA Banner is automatically shown at the top of the app with an "Update Now" button.
2. The Release Notes modal is **never** shown before the update process completes.
3. When the user clicks "Update Now", the app flushes caches, tells the Service Worker to skip waiting, records `bms_just_updated = true`, and reloads.
4. Only upon successful post-update reload does the Release Notes modal appear with the changelog.

## Implementation Steps

### 1. Update Checker Engine (`js/updateChecker.js`)
- Continuously checks for codebase updates via:
  - Service Worker `updatefound` / `waiting` state
  - Periodic polling of `/release_notes.json?_t=${Date.now()}` against bundled `CURRENT_APP_VERSION`
- When a newer version is detected:
  - Injects the **Updates Available (vX.X.X)** banner with **"Update Now"** CTA button.
  - Exposes `window.executeAppUpdate(targetVersion)`:
    - Clears client caches (`caches.delete`)
    - Posts `SKIP_WAITING` to Service Worker
    - Marks `sessionStorage.setItem('bms_just_updated', 'true')`
    - Reloads page cleanly (`window.location.reload(true)`)

### 2. Post-Update Release Notes Guard (`js/ui/releaseNotesModal.js`)
- Modifies `initReleaseNotesCheck()`:
  - On first app setup, records initial version without popping up.
  - Automatically pops up the modal **only if** `sessionStorage.getItem('bms_just_updated') === 'true'` (post-update confirmation).
  - Clears `bms_just_updated` and stores `bms_last_seen_release_version` upon clicking "Proceed".

### 3. Service Worker Integration (`app/index.html` & `js/app.js`)
- Harmonizes SW update events with the Update Checker banner.

## Verification
- Verify `npm run build` with 0 errors.
- Test update banner triggering on version change and verify modal appears only after reload.
