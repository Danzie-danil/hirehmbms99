# [!IMPORTANT SHIFT] Multi-Platform Architecture Transformation (Mobile APK/iOS & Desktop EXE)

> [!IMPORTANT]
> **Status**: Strategic Roadmap / Future Milestone
> **Target Platforms**: Android (`.apk` / `.aab`), iOS (`.ipa`), Windows Desktop (`.exe` / `.msi`), macOS (`.dmg`), Web/PWA.

---

## 1. Executive Summary & Vision
Transform the existing **BMS (Business Management System)** web application into a unified, high-performance, multi-platform native suite from a **single shared codebase**:
- **Mobile Edition**: Native Android and iOS applications with fast hardware barcode scanning, native push notifications, offline SQLite/IndexedDB caching, and Bluetooth POS receipt printing.
- **Desktop Edition**: Lightweight native Windows and macOS applications with raw USB/Serial ESC-POS thermal printer integration, instant offline database exports, and hardware scanner wedge support.
- **Web/PWA Edition**: Retain the existing high-speed cloud-synced web dashboard.

---

## 2. Platform Architecture Stack

```
                               ┌──────────────────────────────────────────────────────────┐
                               │             Shared Core Application Engine               │
                               │  (Vite + HTML5 + Modular Vanilla JS + Tailwind + Dexie)  │
                               └────────────────────────────┬─────────────────────────────┘
                                                            │
                     ┌──────────────────────────────────────┼─────────────────────────────────────┐
                     │                                      │                                     │
                     ▼                                      ▼                                     ▼
        ┌─────────────────────────┐            ┌─────────────────────────┐           ┌─────────────────────────┐
        │  Capacitor Engine Core  │            │    Tauri Engine Core    │           │    Vite Web Engine      │
        │   (Native Mobile API)   │            │   (Rust Native Desktop) │           │    (Browser & PWA)      │
        └────────────┬────────────┘            └────────────┬────────────┘           └────────────┬────────────┘
                     │                                      │                                     │
             ┌───────┴───────┐                      ┌───────┴───────┐                             ▼
             ▼               ▼                      ▼               ▼                     Universal Cloud /
          Android           iOS                  Windows          macOS                   Supabase Backend
        (.apk/.aab)        (.ipa)                (.exe)           (.dmg)
```

---

## 3. Technology Selection & Rationale

### A. Mobile Layer: **Capacitor (by Ionic)**
- **Why Capacitor**: Native direct packaging of Vite `dist/` into Android Studio (Kotlin/Java) and Xcode (Swift) without framework rewrites.
- **Key Mobile Plugins**:
  - `@capacitor/camera` & `@capacitor-mlkit/barcode-scanning` (instant hardware-accelerated QR & Barcode scanning).
  - `@capacitor/push-notifications` (FCM for Android & APNs for iOS).
  - `@capacitor/biometrics` (Fingerprint / Face ID instant terminal login).
  - `@capacitor-community/bluetooth-le` (Direct Bluetooth 58mm/80mm thermal receipt printing).
  - `@capacitor/network` & `@capacitor/filesystem` (Native offline network state and receipt storage).

### B. Desktop Layer: **Tauri (Rust-Powered Desktop Runtime)**
- **Why Tauri over Electron**:
  - Tiny executable footprint (~10MB vs ~120MB with Electron).
  - Minimal RAM usage (~30MB vs ~350MB with Electron).
  - Uses native Windows WebView2 and macOS WebKit.
- **Key Desktop Features**:
  - Direct USB/Serial ESC/POS printing (silent raw thermal printing without browser print dialogs).
  - Native Windows taskbar notifications and auto-updater.
  - Native file dialogs for one-click Excel, PDF, and database backup exports.

---

## 4. Architectural Enhancements Needed

### 1. Hardware & Platform Abstraction Layer (HAL)
Create a centralized bridge (`js/platform/deviceBridge.js`) to handle platform variances seamlessly:

```javascript
// Hardware Abstraction Layer
export const DeviceBridge = {
    getPlatform() {
        if (window.Capacitor?.isNativePlatform()) return 'mobile';
        if (window.__TAURI__) return 'desktop';
        return 'web';
    },

    async scanBarcode() {
        const platform = this.getPlatform();
        if (platform === 'mobile') {
            return await NativeCapacitorScanner.start();
        } else if (platform === 'desktop') {
            return await TauriUSBScanner.listen();
        } else {
            return await WebHtml5Scanner.start();
        }
    },

    async printReceipt(rawEscPosBytes) {
        const platform = this.getPlatform();
        if (platform === 'desktop') {
            return await TauriThermalPrinter.sendRaw(rawEscPosBytes);
        } else if (platform === 'mobile') {
            return await BluetoothThermalPrinter.send(rawEscPosBytes);
        } else {
            window.print();
        }
    }
};
```

### 2. Native Deep Linking & Authentication
- Android: App Links (`https://app.bmstz.com/auth`) and Custom Scheme (`bmstz://auth`).
- iOS: Universal Links.
- Windows: Protocol registration (`bmstz://`).

### 3. Continuous Over-The-Air (OTA) Updates
- Integrate live asset update pipelines (e.g. Capgo / Tauri In-App Updater) to ship urgent bug fixes and UI improvements instantly without requiring manual app store resubmissions.

---

## 5. Phased Implementation Roadmap

### Phase 1: Mobile Project Scaffold (Android & iOS)
1. Install Capacitor dependencies:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
   ```
2. Initialize Capacitor configuration (`capacitor.config.json`):
   ```bash
   npx cap init "BMS Official" "com.bmstz.app" --web-dir "dist"
   ```
3. Add Android platform & build debug APK:
   ```bash
   npx cap add android
   npm run build
   npx cap sync
   ```

### Phase 2: Desktop Project Scaffold (Windows EXE)
1. Install Tauri CLI:
   ```bash
   npm install --save-dev @tauri-apps/cli
   ```
2. Initialize Tauri configuration:
   ```bash
   npx tauri init
   ```
3. Configure build commands pointing to Vite `dist/` and build the Windows executable:
   ```bash
   npm run tauri build
   ```

### Phase 3: Hardware Integrations & Polish
1. Replace browser-only print dialogue with raw ESC-POS thermal printer driver.
2. Integrate native barcode scanner camera view overlay.
3. Configure native app splash screens, adaptive icons, and permissions (Camera, Bluetooth, Notifications).

---

## 6. Verification & Validation Metrics
- **Android APK**: Successful installation and offline functionality on Android 10+.
- **Windows EXE**: Standalone installation without external runtime requirements on Windows 10/11.
- **Zero Regressions**: 100% feature parity with existing Web dashboard.
