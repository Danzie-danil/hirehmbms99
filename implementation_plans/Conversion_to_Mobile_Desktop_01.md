# Conversion to Mobile and Desktop Plan

This document outlines the approach to convert the existing React/Vite application into native Android (using Capacitor) and Desktop (using Tauri 2) applications, while maintaining full web compatibility.

## User Review Required

> [!WARNING]
> The current environment lacks `rustc`, `cargo`, `adb`, and `java`. I cannot automate the installation of Rust and Android Studio/SDK without your intervention. I will scaffold the Capacitor and Tauri projects, but you will need to manually install these dependencies and run the final build steps. Do you approve of proceeding with setting up what can be automated?

## Open Questions

- Should we use `com.bmstz.app` as the app ID for Android and Desktop?

## Proposed Changes

### Setup Capacitor (Android)
- Install `@capacitor/core` and `@capacitor/cli`
- Initialize Capacitor configuration (`capacitor.config.ts`) pointing to `dist`.
- Install `@capacitor/android` and add the Android platform (this might fail partially if Android SDK is missing, but the folder can be scaffolded).

### Setup Tauri (Desktop)
- Install `@tauri-apps/api@2` and `@tauri-apps/cli@2`.
- Initialize Tauri project in `src-tauri` directory (if `npx tauri init` allows it without Cargo, otherwise I will provide the command for you to run).

### Platform Detection Abstraction
#### [NEW] [platform.js](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/src/utils/platform.js)
Create a centralized platform detection utility to distinguish between Web, Android, and Desktop environments.

### Build Scripts
#### [MODIFY] [package.json](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/package.json)
Add helpful scripts for syncing and building Android and Desktop apps.

## Verification Plan

### Automated Tests
- Run `npm run build` to ensure the web build still succeeds.

### Manual Verification
- You will need to install Rust and Android Studio to manually verify the Android and Desktop builds.

