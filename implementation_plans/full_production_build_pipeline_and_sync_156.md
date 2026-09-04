# Implementation Plan - Full Multi-Platform Production Build Pipeline & Artifact Sync (#global)

## Goal
Execute the complete end-to-end multi-platform production build pipeline as specified in `1_final_run_and_build.md`:
1. **Web Production Build**: Vite production bundle (`dist/`) and Service Worker compilation.
2. **Android Mobile Build**: Sync web assets to Capacitor Android project and compile Android APK via Gradle.
3. **Windows Desktop App Build**: Compile Rust desktop shell via Tauri CLI to package Windows NSIS and MSI installers.
4. **Artifact Syncing**: Synchronize compiled binaries (`BMSTz.apk` and `BMSTz-Setup.msi`) to `public/downloads/` and ensure web distribution bundles match latest assets.
5. **Quality Verification**: Verify all compilation steps pass with 0 errors and record build outputs in chat history.

## Proposed Steps
1. **Step 1: Web Production Bundle (`npm run build`)**
   - Run `npm run build` to compile the Vite web app into `dist/`.
2. **Step 2: Android Capacitor Sync & Gradle Build**
   - Run `npx cap sync android` to push latest web distribution into `android/app/src/main/assets/public`.
   - Set `$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"` and compile Android APK via `cd android; .\gradlew assembleDebug; cd ..` (and/or assembleRelease).
   - Copy compiled APK (`android/app/build/outputs/apk/debug/app-debug.apk`) to `public/downloads/BMSTz.apk`.
3. **Step 3: Desktop Tauri Windows Build**
   - Run `npx @tauri-apps/cli build` to compile Windows MSI and NSIS installers.
   - Copy compiled MSI installer to `public/downloads/BMSTz-Setup.msi`.
4. **Step 4: Verification & Web Re-Build**
   - Re-run `npm run build` so `dist/` contains latest synced `public/downloads/` binaries.
   - Verify all binaries exist and file sizes are correct.
5. **Step 5: Chat History & Version Sync**
   - Update `Chat_History/chat_history.txt` with detailed record.

## Verification Plan
- Web build exits with code 0.
- Android APK compiled and copied to `public/downloads/BMSTz.apk`.
- Tauri Windows installer compiled and copied to `public/downloads/BMSTz-Setup.msi`.
