# Role-Specific Release Notes & Update Banner Architecture

## Overview
This plan outlines the architecture for delivering tailored, role-specific messages in both the **Update Banner** (when a new version is detected) and the **Release Notes Modal** (when viewing "What's New" / post-update summary) for **Branch** and **Owner** users.

---

## Technical Design & Strategy

### 1. Schema Enhancement in `release_notes.json`
We enhance `release_notes.json` (and `public/release_notes.json`) to support segmented content with backward-compatible fallbacks:

```json
{
  "version": "2.9.5",
  "date": "2026-08-17",
  "title": "Release Notes",
  "banners": {
    "owner": "New multi-branch reports, analytics & management tools are available.",
    "branch": "New task workflows, speed improvements & offline stability are ready.",
    "default": "A new update is available with performance and stability improvements."
  },
  "notes": {
    "owner": [
      "Advanced multi-branch performance reports and consolidated exports.",
      "Real-time task delegation, staff activity tracking, and security controls.",
      "Business analytics optimizations and automated data synchronization."
    ],
    "branch": [
      "Redesigned Task Details view with clear guidelines and instant admin chat.",
      "Enhanced offline reliability, rapid POS/sales entries, and responsive navigation.",
      "Smooth shift summaries and real-time inventory updates."
    ]
  }
}
```

### 2. Backward Compatibility
The resolution helper `resolveRoleSpecificContent(content, userRole)` will:
- If `content` is an array: Return it directly (universal notes).
- If `content` is an object: Look up `content[userRole]`, fallback to `content.owner` or `content.branch` or `content.default`, or extract all values.
- If `userRole` is not yet available (unauthenticated splash screen): Use general default items.

### 3. Update Banner Tailoring (`js/updateChecker.js`)
- Detect the active user role (`window.state?.role || localStorage.getItem('bms_last_role') || 'branch'`).
- Display the tailored banner headline and subtext in the sticky update bar (`#bms-codebase-update-banner`).
- For Owner: Highlights executive features, business controls, and analytics.
- For Branch: Highlights operational speed, task management, POS, and offline reliability.

### 4. Release Notes Modal Tailoring (`js/ui/releaseNotesModal.js`)
- Render the role-targeted bullet points in the "What's New" modal.
- Include role context badges (e.g. `Owner Edition` / `Branch Operations`) next to the version number.
- Ensure the modal works seamlessly when opened via the update flow or manually from Settings / Profile.

---

## Proposed Changes

### Configuration & Data
#### [MODIFY] [release_notes.json](file:///d:/v2%20BMS%20OFFICIAL/release_notes.json)
- Restructure `banners` and `notes` to support `owner` and `branch` role dictionaries.

#### [MODIFY] [public/release_notes.json](file:///d:/v2%20BMS%20OFFICIAL/public/release_notes.json)
- Synchronize role-targeted configuration.

---

### Logic & UI Modules
#### [MODIFY] [js/updateChecker.js](file:///d:/v2%20BMS%20OFFICIAL/js/updateChecker.js)
- Add `getRoleSpecificBannerMessage(remoteData, role)` to pick role-specific banner copy.
- Pass the resolved message to `triggerAppUpdateBanner()`.

#### [MODIFY] [js/ui/releaseNotesModal.js](file:///d:/v2%20BMS%20OFFICIAL/js/ui/releaseNotesModal.js)
- Add `getRoleSpecificNotes(releaseData, role)` helper.
- Render role-specific note items and role chip badge in the modal header.

---

## Verification Plan

### Automated Build Verification
- Execute `npm run build` to verify 0 bundling/compilation errors.

### Manual Verification
1. **Branch User Simulation**:
   - Check banner and release notes under `state.role = 'branch'`.
   - Verify branch-specific bullet points (Task workflows, speed, offline) are rendered.
2. **Owner User Simulation**:
   - Check banner and release notes under `state.role = 'owner'`.
   - Verify owner-specific bullet points (Multi-branch analytics, executive controls) are rendered.
3. **Fallback Testing**:
   - Test legacy string arrays to ensure existing standard JSON files continue to work without errors.
