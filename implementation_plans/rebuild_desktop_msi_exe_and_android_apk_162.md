# Implementation Plan - Rebuild Desktop (MSI/EXE) & Android APK (#global, #build)

Rebuild both the Windows Desktop installers (MSI and NSIS EXE) and the Android Mobile Application (APK) with the latest functional web application codebase, sync the resulting build binaries to public and root download directories, and verify all artifacts.

## User Review Required
> [!NOTE]
> This rebuild will compile the current web code (`dist/`), sync with Capacitor for Android (`assembleDebug`), compile Rust binaries and Windows bundles (`MSI` & `EXE` via Tauri CLI), and update all download mirrors.

## Proposed Changes

### Build Pipeline Execution

#### 1. Web Production Build (`npm run build`)
- Compile the latest web frontend code into `dist/` using Vite.
- Verify that service worker asset hashes and production modules bundle with 0 errors.

#### 2. Android APK Build (Capacitor + Gradle)
- Synchronize the compiled web assets from `dist/` to the Android platform: `npx cap sync android`.
- Set Java environment path: `$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"`.
- Compile the Android APK via Gradle: `cd android; .\gradlew assembleDebug; cd ..`.
- Verify the output binary at `android/app/build/outputs/apk/debug/app-debug.apk`.
- Copy the newly compiled `app-debug.apk` to:
  - `public/downloads/BMSTz.apk`
  - `downloads/BMSTz.apk`
  - `dist/downloads/BMSTz.apk`

#### 3. Windows Desktop Build (Tauri CLI - MSI & NSIS EXE)
- Execute `npx @tauri-apps/cli build` to compile the native Rust backend and package:
  - Windows MSI Installer: `src-tauri/target/release/bundle/msi/BMSTz_0.1.0_x64_en-US.msi`
  - Windows NSIS Executable Setup: `src-tauri/target/release/bundle/nsis/BMSTz_0.1.0_x64-setup.exe`
- Copy the newly compiled MSI installer to:
  - `public/downloads/BMSTz-Setup.msi`
  - `downloads/BMSTz-Setup.msi`
  - `dist/downloads/BMSTz-Setup.msi`

#### 4. Final Distribution Refresh & Verification
- Execute `npm run build` once more to ensure all updated download binaries in `public/downloads/` are embedded cleanly into the final `dist/` bundle.
- Verify file sizes, existence of binaries, and build logs.

#### 5. Chat History Summary Record
- Update `Chat_History/chat_history.txt` with a comprehensive entry documenting the rebuild, file sizes, paths, and changes.

## Verification Plan

### Automated Tests & Checks
- `npm run build` succeeds with exit code 0.
- `gradlew assembleDebug` succeeds with `BUILD SUCCESSFUL`.
- `@tauri-apps/cli build` finishes packaging MSI and EXE bundles successfully.
- Verify binary existence and non-zero byte size on all target paths.
