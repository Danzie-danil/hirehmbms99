# Android Application

The Android version uses Capacitor to wrap the existing React/Vite web application.

## Prerequisites
- Android Studio
- Android SDK & SDK Command-line Tools
- Java JDK (Compatible with Capacitor's Gradle)

## Development Workflow
1. Build the web application first:
   ```bash
   npm run build
   ```
2. Synchronize changes to the Android project:
   ```bash
   npm run android:sync
   ```
3. Open Android Studio to build, run, or debug the app:
   ```bash
   npm run android:open
   ```

## Package Details
- App ID: `com.bmstz.app` (configurable in `capacitor.config.ts`)
- Project Location: `/android`

## Building for Production
Within Android Studio, use **Build > Generate Signed Bundle / APK** to create the `.aab` file for Google Play or `.apk` for direct distribution.
Ensure production signing keys are configured securely (do not commit `.keystore` or `.jks` files).

