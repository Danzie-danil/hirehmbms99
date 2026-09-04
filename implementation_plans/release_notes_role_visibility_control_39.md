# Release Notes & Update Banner Role Visibility Control (`show: true/false`)

## Overview
This plan introduces granular role-based visibility controls (`enabled`, `show: { owner: true/false, branch: true/false }`) in `release_notes.json` so you can selectively show or suppress release notes and banners for Branch, Owner, or Sysadmin independently.

---

## Technical Design

### 1. Enhanced Schema in `release_notes.json`
Add flexible visibility flags to `release_notes.json`:

```json
{
  "version": "2.9.8",
  "date": "2026-08-17",
  "title": "Release Notes",
  "enabled": true,
  "show": {
    "owner": true,
    "branch": true,
    "sysadmin": false
  },
  "banners": {
    "owner": "New multi-branch reports, analytics & management tools are available.",
    "branch": "New task workflows, speed improvements & offline stability are ready.",
    "default": "A new update is available with performance and stability improvements."
  },
  "notes": {
    "owner": [
      "Fixed mobile Daily Branch Summary to render as a dedicated full-bleed page view.",
      "Advanced multi-branch performance reports, instant CSV exports, and automated data synchronization."
    ],
    "branch": [
      "Redesigned Task Details view with clear guidelines, metadata chips, and instant discussion thread.",
      "Faster offline syncing, reliable data entry, and smoother page transitions."
    ]
  }
}
```

### 2. Visibility Evaluation Engine
A dedicated resolver `isReleaseNotesVisibleForRole(releaseData, role)`:
1. **Global Toggle**: If `releaseData.enabled === false`, returns `false`.
2. **Boolean `show`**: If `typeof releaseData.show === 'boolean'`, returns `releaseData.show`.
3. **Role-Specific `show` Dictionary**:
   - `show.owner === false` -> Owner will NEVER see release notes for this version.
   - `show.branch === false` -> Branch will NEVER see release notes for this version.
   - Defaults to `true` if not specified.
4. **Empty Notes Check**: If `notes[role]` is empty (`[]`), `null`, or undefined, it automatically suppresses display for that role.

### 3. Integration Points
- **[`js/ui/releaseNotesModal.js`](file:///d:/v2%20BMS%20OFFICIAL/js/ui/releaseNotesModal.js)**:
  - `initReleaseNotesCheck()` checks `isReleaseNotesVisibleForRole(releaseData, userRole)` before popping up the modal.
  - If suppressed for that role, it silently marks the version as acknowledged in `localStorage` without interrupting the user.
- **[`js/updateChecker.js`](file:///d:/v2%20BMS%20OFFICIAL/js/updateChecker.js)**:
  - Supports role suppression on update banners if `show.banner_owner === false` or `show.branch === false`.

---

## Proposed Changes

### [MODIFY] [release_notes.json](file:///d:/v2%20BMS%20OFFICIAL/release_notes.json) & [public/release_notes.json](file:///d:/v2%20BMS%20OFFICIAL/public/release_notes.json)
- Add `enabled: true` and `show: { owner: true, branch: true }`.

### [MODIFY] [js/updateChecker.js](file:///d:/v2%20BMS%20OFFICIAL/js/updateChecker.js)
- Add `isReleaseNotesVisibleForRole(data, role)` helper.

### [MODIFY] [js/ui/releaseNotesModal.js](file:///d:/v2%20BMS%20OFFICIAL/js/ui/releaseNotesModal.js)
- Incorporate role visibility check into `initReleaseNotesCheck()` and `openReleaseNotesModal()`.

---

## Verification Plan

### Automated Build Verification
- Execute `npm run build` to verify 0 build errors.

### Manual Verification
1. **Test Owner Disabled (`show.owner = false`, `show.branch = true`)**:
   - Verify modal does NOT pop up for Owner.
   - Verify modal DOES pop up for Branch.
2. **Test Branch Disabled (`show.owner = true`, `show.branch = false`)**:
   - Verify modal does NOT pop up for Branch.
   - Verify modal DOES pop up for Owner.
3. **Test Global Disabled (`enabled = false`)**:
   - Verify modal never pops up for any role.
