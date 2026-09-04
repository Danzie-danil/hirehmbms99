# Release Notes File & Update Popup Modal Engine Plan

Establish a centralized, human-authored `release_notes.json` file in the workspace root as the single source of truth for application updates and changelogs. When updates occur, if release notes are present and have not yet been seen by the user, a small, elegant release notes popup modal will automatically present the highlights.

## Design & Architecture

### 1. Source of Truth File (`release_notes.json`)
- Placed in project root (`d:\v2 BMS OFFICIAL\release_notes.json`).
- Schema:
  ```json
  {
    "version": "2.5.0",
    "date": "2026-08-15",
    "title": "What's New in BMS",
    "notes": [
      "✨ Enhanced interactive system banners with Call-To-Action tracking",
      "🎨 Premium glassmorphic tooltip engine across Business Owner and Branch views",
      "⚡ Instant app update synchronization and service worker refresh",
      "📱 Optimized mobile toggle switches and responsive platform controls"
    ]
  }
  ```
- If `notes` is empty (`"notes": []`), no popup is ever shown.

### 2. Presentation Layer (`js/ui/releaseNotesModal.js`)
- Reads `release_notes.json`.
- Compares `release_notes.version` with `localStorage.getItem('bms_last_seen_release_version')`.
- If new notes exist, renders a compact, responsive, glassmorphic modal with bulleted changelog items.
- On close / "Got it", updates `bms_last_seen_release_version` in `localStorage`.
- Exports `initReleaseNotesCheck()` and `openReleaseNotesModal(force = false)`.

### 3. Bootstrap Integration (`js/app.js`)
- Boots `initReleaseNotesCheck()` on app load after authentication.

## Verification
- Verify `npm run build` completes with 0 errors.
- Test modal dismissal and persistence in `localStorage`.
