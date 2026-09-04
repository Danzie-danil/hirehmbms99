# Implementation Plan - Recompile & Rebuild Android APK and Desktop Application (#global, #build)

Recompile and rebuild the native Android application (APK) via Capacitor & Gradle and the Windows Desktop applications (MSI installer & NSIS setup executable) via Tauri CLI with the updated web application code, sync all output binaries to download distributions, and verify build artifacts.

## User Review Required

> [!NOTE]
> This rebuild will bundle the latest functional web application code into native platforms:
> - **Web**: Compile production assets into `dist/` via Vite.
> - **Android APK**: Sync web assets via `npx cap sync android` and compile debug APK via Gradle `assembleDebug`.
> - **Windows Desktop**: Compile Rust native backend and package Windows installer (`.msi`) and setup executable (`.exe`) via Tauri CLI.
> - **Distribution Sync**: Synchronize output binaries into `downloads/`, `public/downloads/`, and `dist/downloads/`.
> - **Version Auto-Sync**: Bump version to `v3.9.248` across release notes and update checker.

## Proposed Changes

### Version Sync & Release Notes

#### [MODIFY] [release_notes.json](file:///d:/V2BmstzOfficial/release_notes.json)
#### [MODIFY] [public/release_notes.json](file:///d:/V2BmstzOfficial/public/release_notes.json)
#### [MODIFY] [js/updateChecker.js](file:///d:/V2BmstzOfficial/js/updateChecker.js)
- Increment version to `v3.9.248`.
- Set simple user-facing release notes: "Cross-platform performance improvements, native stability updates, and enhanced application synchronization."

---

### Build Pipeline Execution

#### 1. Web Compilation
- Run `npm run build` to generate the updated `dist/` bundle.

#### 2. Android APK Compilation
- Synchronize compiled web assets: `npx cap sync android`.
- Set Java home to Android Studio JBR: `$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"`.
- Run Gradle debug build: `cd android; .\gradlew assembleDebug; cd ..`.
- Sync `android/app/build/outputs/apk/debug/app-debug.apk` to:
  - `downloads/BMSTz.apk`
  - `public/downloads/BMSTz.apk`
  - `dist/downloads/BMSTz.apk`

#### 3. Windows Desktop Compilation (Tauri)
- Execute `npx @tauri-apps/cli build`.
- Sync compiled MSI (`src-tauri/target/release/bundle/msi/BMSTz_0.1.0_x64_en-US.msi`) to:
  - `downloads/BMSTz-Setup.msi`
  - `public/downloads/BMSTz-Setup.msi`
  - `dist/downloads/BMSTz-Setup.msi`
- Sync compiled NSIS EXE (`src-tauri/target/release/bundle/nsis/BMSTz_0.1.0_x64-setup.exe`) to:
  - `downloads/BMSTz-Setup.exe`
  - `public/downloads/BMSTz-Setup.exe`
  - `dist/downloads/BMSTz-Setup.exe`

#### 4. Final Distribution Refresh
- Run `npm run build` once more so any static assets copied to `public/downloads/` are embedded in `dist/`.

#### 5. Chat History Summary
- Record full execution details, binary sizes, and line changes in `Chat_History/chat_history.txt`.

## Verification Plan

### Automated Tests & Checks
- Run syntax and lint audit: `node scripts/lint_check.cjs`.
- Verify `assembleDebug` generates non-zero APK binary.
- Verify Tauri build generates non-zero MSI and EXE binaries.
- Verify binary sizes and checksums across `downloads/`, `public/downloads/`, and `dist/downloads/`.
- Ensure final `npm run build` exits with code 0.

