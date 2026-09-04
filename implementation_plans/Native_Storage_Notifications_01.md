# Native Storage & Notifications Implementation Plan (Option B: Native File-System Snapshots)

This plan details the architectural implementation of **Option B: Native File-System Snapshots** and **True Native OS Notifications** for Android (Capacitor) and Desktop (Tauri), while retaining standard IndexedDB fallback for the Web.

## User Review & Confirmation Required

> [!IMPORTANT]
> **Data Storage & Sync Architecture Confirmation (Option B)**
> - **Zero Invasive Query Rewriting:** Dexie.js is preserved for in-memory fast indexing and querying across all 50+ existing modules.
> - **Native File Snapshots:** Database mutations are asynchronously serialized into encrypted/structured JSON snapshots stored directly on the operating system's native file system:
>   - **Desktop (Tauri):** Stored in the native OS AppData/AppLocalData directory (`com.bmstz.app/local_cache_snapshot.json`) via `@tauri-apps/plugin-fs`.
>   - **Android (Capacitor):** Stored in the native internal app storage directory (`Directory.Data/local_cache_snapshot.json`) via `@capacitor/filesystem`.
>   - **Web:** Preserved on standard IndexedDB with no overhead.
> - **Hydration on Boot:** If browser storage or IndexedDB is ever cleared, the app automatically checks the native hard drive/flash storage snapshot and hydrates Dexie upon launch.

> [!CAUTION]
> **Real-Time & Data Sync Protection Notice**
> Modifying `js/data/db.js` interacts with the local storage persistence layer. As per our safety rules, we will only add non-invasive native snapshot dispatch hooks without touching query schemas, cursors, or sync logic.

---

## Proposed Changes

### 1. Universal Native Storage Wrapper

#### [NEW] `src/utils/nativeStorage.js` (and exported to `js/data/nativeStorage.js`)
- Detects the platform via `src/utils/platform.js` (`isDesktop`, `isAndroid`, `isWeb`).
- Implements:
  - `saveDatabaseToNativeDisk()`: Extracts snapshots from Dexie tables (`sales`, `inventory`, `central_inventory`, `customers`, `expenses`, `purchases`, `quotations`, `staff`, `branches`, `suppliers`, `tasks`, `notes`, `loans`, `requests`, `documents`, `announcements`, `product_returns`, `stock_transfers`, `notifications`, `users`, `dashboard_snapshots`, `subscription_snapshot`) and writes to native disk with debounce (2500ms).
  - `hydrateDatabaseFromNativeDisk()`: Reads the snapshot file from native disk on app boot and populates local Dexie if needed.
  - `clearNativeDiskBackup()`: Deletes or resets the local backup snapshot when performing a full account wipe/logout.
  - Adds a listener to `visibilitychange` (minimizing/backgrounding app) to immediately flush any pending snapshot to disk.

#### [MODIFY] `js/data/db.js`
- Hook `scheduleNativeSnapshot()` into write operations (`cacheLocalItems`, `upsertLocalItem`, `deleteLocalItem`, `saveLocalSnapshot`).
- Add `initNativeStorageHydration()` called during local DB initialization.

---

### 2. True Native OS Notifications

#### [MODIFY] `src/utils/nativeFeatures.js` & `js/pushNotifications.js`
- **Android (`@capacitor/local-notifications`):**
  - Initialize local notification channel `bms_alerts` (High Importance, Sound, Vibration).
  - When `showLocalPushNotification(title, options)` or `handleIncomingPushPayload()` is called, dispatch native notification via `LocalNotifications.schedule()`.
  - Handle notification click deep-links to open specific BMS views.
- **Desktop (`@tauri-apps/plugin-notification`):**
  - Check and request desktop notification permission via `isPermissionGranted()` and `requestPermission()`.
  - When `showLocalPushNotification(title, options)` is called, trigger `sendNotification()` to pop up in the Windows 11 Action Center / macOS Notification Center.
- **Web Fallback:**
  - Fall back to standard Service Worker `reg.showNotification()` or in-app toast for browser users.

---

### 3. Tauri Desktop Configurations & Capabilities

#### [MODIFY] `src-tauri/capabilities/default.json`
- Ensure granular permissions for `fs` and `notification`:
  - `fs:default`
  - `fs:allow-appdata-read`, `fs:allow-appdata-write`, `fs:allow-appdata-recursive`
  - `fs:allow-applocaldata-read`, `fs:allow-applocaldata-write`, `fs:allow-applocaldata-recursive`
  - `fs:allow-read-text-file`, `fs:allow-write-text-file`, `fs:allow-exists`, `fs:allow-mkdir`
  - `notification:default`, `notification:allow-is-permission-granted`, `notification:allow-request-permission`, `notification:allow-notify`

---

## Verification Plan

### Automated Tests
- Run `npm run build` to verify clean bundle compilation, no import/export errors, and 0 lint/syntax warnings.

### Manual Verification
1. **Desktop Verification (Tauri):**
   - Run `npm run desktop:dev`.
   - Verify native notification appears in the Windows Action Center when triggered.
   - Verify database snapshot file is created in `%APPDATA%/com.bmstz.app/local_cache_snapshot.json`.
   - Clear browser cache / IndexedDB via DevTools, restart app, and verify data is restored from native disk.
2. **Android Verification (Capacitor):**
   - Run `npm run android:sync`.
   - Trigger a notification and verify it displays in the Android status bar and lock screen with sound/vibration.
   - Verify native file is created in Android internal app data directory.
3. **Web Verification:**
   - Run `npm run dev` and open in Chrome / Edge.
   - Verify app runs standard IndexedDB without errors or crashes.
