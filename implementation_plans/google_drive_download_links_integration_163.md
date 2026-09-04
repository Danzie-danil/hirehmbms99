# Implementation Plan - Google Drive Cloud Download Links Integration (#global, #downloads)

Integrate Google Drive direct download links for the Windows Desktop installers (MSI and EXE) and Android APK across the web application, Vercel routing configuration, downloads landing page, and in-app download modals.

## Google Drive Cloud Links
* **Windows NSIS Setup (.EXE)**: `https://drive.google.com/file/d/1n5e0z4WGsEHNuKeHmDT7JT_44gF0oUhH/view?usp=drive_link`
* **Windows WiX Installer (.MSI)**: `https://drive.google.com/file/d/1e4WJAIryATllZST8ONDVtx0FowCQgg3C/view?usp=drive_link`
* **Android Application (.APK)**: `https://drive.google.com/file/d/1mVPujWHc2rKWfm9SGdG3VrRSYUJOviR2/view?usp=drive_link`

## Proposed Changes

### 1. Server-Side Routing & Redirects (`vercel.json`)
- Add HTTP redirect rules in `vercel.json` for:
  - `/downloads/BMSTz.apk` -> Google Drive APK link
  - `/downloads/BMSTz-Setup.msi` -> Google Drive MSI link
  - `/downloads/BMSTz-Setup.exe` -> Google Drive EXE link

### 2. Downloads Page (`downloads/index.html`)
- Update Windows Card to provide direct download buttons for both `.MSI` and `.EXE` with `target="_blank" rel="noopener"`.
- Update Android Card to link directly to the Google Drive APK with `target="_blank" rel="noopener"`.
- Align clipboard copy and share functions with the verified URLs.

### 3. Main Landing Page (`index.html`)
- Update the desktop and mobile download CTAs and helper functions to route seamlessly to Google Drive.

### 4. In-App Download Modals (`js/ui/appDownloadModal.js`)
- Wire `btnDownloadMsi` and `btnDownloadApk` to the cloud URLs with `target="_blank"`.

### 5. Verification & Version Sync
- Recompile web distribution (`npm run build`, 0 errors).
- Auto-sync `release_notes.json` and bump version if needed.
- Update `Chat_History/chat_history.txt`.

## Verification Plan
- Verify all links in `index.html`, `downloads/index.html`, `js/ui/appDownloadModal.js`, and `vercel.json`.
- Execute `npm run build` with 0 errors.
