# Multi-Platform Auto-Update Engine (Android APK & Windows Desktop)

Configure automated update synchronization and native in-app updater flows so that users on **Android APK** and **Windows Desktop** receive updates effortlessly alongside web users.

---

## 1. Background & Architecture

Currently:
- **Web PWA Users**: Receive instant updates via Service Worker lifecycle events and cache-busting reloads.
- **Android APK (Capacitor)** & **Windows Desktop (Tauri)**: Run client-side packages. They require platform-aware update mechanisms to keep users on the latest release without manual friction.

---

## 2. Multi-Platform Auto-Update Strategy

### A. Android APK Auto-Update Architecture
1. **Live Remote Web Sync with Offline Cache**:
   - In [`capacitor.config.json`](file:///d:/V2BmstzOfficial/capacitor.config.json), configure the production web origin (`https://bmstz.com/app/`) with `androidScheme: "https"`.
   - The Android app loads the latest deployed web code while the Service Worker caches the app for full offline support.
2. **Native APK Binary Update Trigger**:
   - When a native binary update is released with a bumped version in `release_notes.json`, [`js/updateChecker.js`](file:///d:/V2BmstzOfficial/js/updateChecker.js) detects the update.
   - On Android devices, clicking **Update Now** directly fetches `https://pub-5f77889b51404f04a57b3a83e611a3fc.r2.dev/BMSTz.apk` to initiate in-place Android package upgrade.

### B. Windows Desktop (Tauri) Auto-Update Architecture
1. **Native In-App Desktop Updater Flow**:
   - In [`js/updateChecker.js`](file:///d:/V2BmstzOfficial/js/updateChecker.js), detect Desktop environment (`window.__TAURI_INTERNALS__` / `window.__TAURI__` / Desktop OS).
   - When a new version is detected, the **Update Now** button prompts and initiates direct download/installation of `https://pub-5f77889b51404f04a57b3a83e611a3fc.r2.dev/BMSTz-Setup.exe`.
2. **Tauri Updater Plugin Configuration**:
   - Enable `tauri-plugin-updater = "2"` in [`src-tauri/Cargo.toml`](file:///d:/V2BmstzOfficial/src-tauri/Cargo.toml).
   - Configure updater endpoints in [`src-tauri/tauri.conf.json`](file:///d:/V2BmstzOfficial/src-tauri/tauri.conf.json) pointing to Cloudflare R2 manifest `https://pub-5f77889b51404f04a57b3a83e611a3fc.r2.dev/updates.json`.

---

## 3. Proposed Changes

### Component 1: Update Detection & Action Dispatcher

#### [MODIFY] [`js/updateChecker.js`](file:///d:/V2BmstzOfficial/js/updateChecker.js)
- Enhance `executeAppUpdate()` to detect runtime environment:
  - **Browser**: Clear caches, activate new Service Worker, smooth reload.
  - **Android Capacitor**: Display update confirmation and launch direct Cloudflare APK download (`https://pub-5f77889b51404f04a57b3a83e611a3fc.r2.dev/BMSTz.apk`).
  - **Windows Tauri / Desktop**: Invoke Tauri background updater or open direct Cloudflare EXE installer (`https://pub-5f77889b51404f04a57b3a83e611a3fc.r2.dev/BMSTz-Setup.exe`).

---

### Component 2: Android (Capacitor) Configuration

#### [MODIFY] [`capacitor.config.json`](file:///d:/V2BmstzOfficial/capacitor.config.json)
- Configure `androidScheme: "https"` and production server fallback rules.

---

### Component 3: Windows Desktop (Tauri) Configuration

#### [MODIFY] [`src-tauri/tauri.conf.json`](file:///d:/V2BmstzOfficial/src-tauri/tauri.conf.json)
- Configure updater plugin schema, endpoints, and permissions.

#### [MODIFY] [`src-tauri/Cargo.toml`](file:///d:/V2BmstzOfficial/src-tauri/Cargo.toml)
- Include `tauri-plugin-updater = "2"`.

---

## 4. Verification Plan

### Automated Tests / Builds
- Run `npm run build` to verify Vite bundle compiles with zero errors.

### Manual Verification
- Test in Browser: Verify Service Worker update notification still works cleanly.
- Test Update Banner: Verify platform-specific action handling (Browser reload vs APK download vs Desktop installer).
