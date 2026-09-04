Here is the complete step-by-step list of commands to build everything for production (Web, Android APK, and Windows Desktop Tauri Installer):

1. Web Production Build
Generates the optimized static distribution assets in dist/ and updates the Service Worker:

powershell


npm run build
2. Android App (Capacitor & Gradle APK)
Syncs the web build into Capacitor and compiles the Android APK:

powershell


# 1. Sync the dist/ web assets to Android
npx cap sync android
# 2. Set JAVA_HOME (pointing to Android Studio's bundled JDK)
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
# 3. Assemble Android APK
cd android
.\gradlew assembleDebug      # For standard Debug APK
# or
.\gradlew assembleRelease    # For Production Release APK
cd ..
Output Path: android/app/build/outputs/apk/debug/app-debug.apk (or release/app-release-unsigned.apk)
3. Desktop Application (Tauri Windows Installer)
Compiles the Rust desktop shell and packages both the .exe (NSIS) and .msi installers:

powershell


npx @tauri-apps/cli build
Output Paths:
NSIS Setup (.exe): src-tauri/target/release/bundle/nsis/BMSTz_0.1.0_x64-setup.exe
MSI Installer (.msi): src-tauri/target/release/bundle/msi/BMSTz_0.1.0_x64_en-US.msi
4. Single-Line Full Assembly (Run Everything at Once)
If you want to run the entire pipeline in one command:

powershell


npm run build; npx cap sync android; $env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"; cd android; .\gradlew assembleDebug; cd ..; npx @tauri-apps/cli build
5. Automated WebPush Broadcast (Optional post-deployment)
To broadcast the update notification to all installed devices/browsers:

powershell


npm run push-update