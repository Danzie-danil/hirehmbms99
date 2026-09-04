# Implementation Plan - Over-The-Air (OTA) Live Updates Engine for Android & Desktop

Enable instant, zero-download updates for installed **Android (Capacitor)** and **Windows Desktop (Tauri)** applications so that when web updates are deployed, all platforms update automatically via Service Worker cache swap without requiring users to redownload or reinstall `.apk` or `.exe` files.

---

## User Review Required

> [!IMPORTANT]
> **Zero-Download Seamless Updates**: Once configured, pushing changes to Vercel/production will update Web, Android, and Windows Desktop users simultaneously.
> * First-time users will still download the `.apk`, `.exe`, or `.msi` from Cloudflare R2.
> * Existing users will receive all UI, feature, and data changes over the air (OTA) with a simple reload.
> * Full offline functionality is preserved via the Service Worker runtime cache and local Dexie IndexedDB database.

---

## Proposed Changes

### 1. Capacitor Native Wrapper Configuration

#### [MODIFY] [`capacitor.config.json`](file:///d:/V2BmstzOfficial/capacitor.config.json)
* Set `server.url` to `"https://bmstz.com/app/"` with `androidScheme: "https"` and `cleartext: false`.
* Ensures the native Android container loads the live web application and utilizes the active Service Worker for caching and instant live updates.

---

### 2. Tauri Windows Desktop Configuration

#### [MODIFY] [`src-tauri/tauri.conf.json`](file:///d:/V2BmstzOfficial/src-tauri/tauri.conf.json)
* Set `app.windows[0].url` to `"https://bmstz.com/app/index.html"`.
* Enables the desktop WebView2 container to run the live application with automatic Service Worker background updates and offline cache support.

---

### 3. Update Flow & Banner Polish

#### [MODIFY] [`js/updateChecker.js`](file:///d:/V2BmstzOfficial/js/updateChecker.js)
* Unify the update action for Web, Android, and Desktop: clicking **"Update Now"** triggers the fast Service Worker cache swap and non-disruptive reload on all platforms.
* Keep direct Cloudflare R2 download options accessible in the Settings / Download modal for manual reinstallations if ever needed.

---

### 4. Binary Rebuild & Verification

* Re-sync Capacitor (`npx cap sync android`) and recompile the Android APK (`gradlew.bat assembleDebug`).
* Recompile the Windows Tauri desktop packages (`npx @tauri-apps/cli build`).
* Verify output package sizes and ensure zero errors.

---

## Verification Plan

### Automated Verification
* `npm run build` — Verify production web bundle compiles with 0 errors.
* `npx cap sync android` — Verify Android native bridge sync.
* `gradlew assembleDebug` — Verify Android APK compiles cleanly.
* `npx @tauri-apps/cli build` — Verify Windows NSIS Setup EXE and WiX MSI compile cleanly.

### Manual Verification
* Test update banner flow in `js/updateChecker.js`.
* Confirm offline caching and database availability.
