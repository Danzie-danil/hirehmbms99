# Implementation Plan - True Offline-First Native & Desktop Engine

Restore guaranteed, 100% offline startup and offline execution for **Windows Desktop (Tauri)** and **Android (Capacitor)** by eliminating remote startup dependencies and loading directly from local bundles.

---

## User Review Required

> [!IMPORTANT]
> **Root Cause & Permanent Offline Guarantee**:
> In the previous configuration, the desktop app was configured with a remote URL (`https://bmstz.com/app/index.html`), causing it to fail on startup when offline or when DNS resolution is unavailable (`ERR_NAME_NOT_RESOLVED`).
>
> By setting the native entry point back to local assets (`/app/index.html` from embedded local files):
> * **100% Offline Capability**: The Desktop and Android apps boot **instantly** without internet, on airplane mode, or with zero connectivity.
> * **Local Database & POS**: All Dexie IndexedDB offline caching, mutations, and local state run completely offline.
> * **Reliable Updates**: When the device is online and an update is published to Cloudflare R2, the in-app update banner detects the new version and provides direct one-tap binary download (`BMSTz-Setup.exe` / `BMSTz.apk`).

---

## Proposed Changes

### 1. Windows Desktop Configuration

#### [MODIFY] [`src-tauri/tauri.conf.json`](file:///d:/V2BmstzOfficial/src-tauri/tauri.conf.json)
* Change `app.windows[0].url` from `"https://bmstz.com/app/index.html"` to `"/app/index.html"`.
* Point `$schema` to `"../node_modules/@tauri-apps/cli/config.schema.json"`.

---

### 2. Android Capacitor Configuration

#### [MODIFY] [`capacitor.config.json`](file:///d:/V2BmstzOfficial/capacitor.config.json)
* Ensure `webDir` is `"dist"` and `server` contains only `{"androidScheme": "https", "cleartext": false}` (no remote `server.url` dependency on boot).

---

### 3. In-App Update Engine Alignment

#### [MODIFY] [`js/updateChecker.js`](file:///d:/V2BmstzOfficial/js/updateChecker.js)
* Keep platform-aware update detection:
  * **Android Native**: Banner displays **"Download APK"** $\to$ downloads `BMSTz.apk` from Cloudflare R2.
  * **Windows Desktop**: Banner displays **"Download Setup"** $\to$ downloads `BMSTz-Setup.exe` from Cloudflare R2.
  * **Web PWA**: Banner displays **"Update Now"** $\to$ performs Service Worker cache swap & reload.

---

### 4. Build, Package & Verify

* Run `node scripts/lint_check.cjs` to ensure 0 lint errors.
* Build web assets via `npm run build`.
* Sync Android assets via `npx cap sync android` and compile `BMSTz.apk` (`gradlew.bat assembleDebug`).
* Build Windows desktop installers via `npx @tauri-apps/cli build` (`BMSTz-Setup.exe` and `BMSTz-Setup.msi`).

---

## Verification Plan

### Automated Tests
* `node scripts/lint_check.cjs` — Verify 0 syntax/lint errors.
* `npm run build` — Verify web bundle compilation.
* `gradlew.bat assembleDebug` — Verify Android APK compiles.
* `npx @tauri-apps/cli build` — Verify Windows desktop installers compile.

### Manual Verification
* Verify that `app.exe` launches directly to `/app/index.html` without needing an internet connection.
