# Implementation Plan - Automated Single-Sentence App Update Push Notifications

Architecture and workflow plan to automatically dispatch a clean, single-sentence OS/PWA Push Notification to all subscribed devices whenever the BMSTz application is updated to a new version.

## Proposed Architecture

```
                                  ┌───────────────────────────────┐
                                  │   release_notes.json          │
                                  │   - version: "2.9.32"         │
                                  │   - banner: "Single sentence" │
                                  └───────────────┬───────────────┘
                                                  │
                                                  ▼
                         ┌─────────────────────────────────────────────────┐
                         │ Node Automation / API Endpoint                  │
                         │ /api/push/send-update-notification              │
                         └────────────────────────┬────────────────────────┘
                                                  │
                         ┌────────────────────────┴────────────────────────┐
                         │                                                 │
                         ▼                                                 ▼
        ┌──────────────────────────────────┐             ┌──────────────────────────────────┐
        │ WebPush VAPID Server Broadcast   │             │ Service Worker (sw.js) Fallback  │
        │ - Delivers OS Push to Devices    │             │ - Fires showNotification() when  │
        │   Even When Tab is Closed        │             │   new SW version is detected     │
        └──────────────────────────────────┘             └──────────────────────────────────┘
```

## Proposed Changes

### 1. Dedicated Single-Sentence Notification API
- Create a dedicated serverless function [`api/push/send-update-notification.js`](file:///d:/v2%20BMS%20OFFICIAL/api/push/send-update-notification.js) (or enhance `/api/push/broadcast`):
  - Reads `release_notes.json` automatically during/after build or via deployment webhook.
  - Extracts the exact single-sentence banner message (e.g. `"New official app logo updated!"`).
  - Constructs a concise OS Push Notification payload:
    - **Title**: `BMSTz Updated (v{version})`
    - **Body**: `{single_sentence_message}` (e.g., *"New official app logo updated! Tap to apply."*)
    - **Icon**: `/bmtzofficiallogo.png`
    - **Tag**: `bms-update-v{version}` (prevents duplicate notification stacking)
    - **URL**: `/app/`

### 2. Service Worker OS Notification Fallback ([`public/sw.js`](file:///d:/v2%20BMS%20OFFICIAL/public/sw.js))
- Enhance Service Worker update listener:
  - When `sw.js` detects a cache version bump or new release signal, trigger `self.registration.showNotification()` using the single-sentence note from `release_notes.json`.
  - Ensures users receive an OS system tray notification even if offline during server broadcast.

### 3. Automated Command Line & Build Hook (`scripts/push_update_notification.cjs`)
- Add a Node utility script [`scripts/push_update_notification.cjs`](file:///d:/v2%20BMS%20OFFICIAL/scripts/push_update_notification.cjs):
  - Can be executed automatically via `npm run push-update` or attached to the build lifecycle (`package.json`).
  - Fetches the active `release_notes.json`, formats the single sentence, and dispatches the WebPush broadcast to all active subscribers across Owner, Branch, and Sysadmin roles.

### 4. Client Notification Click Handler ([`js/updateChecker.js`](file:///d:/v2%20BMS%20OFFICIAL/js/updateChecker.js))
- When the user taps the OS Push Notification on mobile or desktop:
  - Tapping opens/focuses the BMSTz PWA app directly.
  - Triggers automatic cache refresh (`executeAppUpdate()`) so the new version assets load instantaneously.

## User Review Required

> [!IMPORTANT]
> **Single-Sentence Guarantee**: The push notification text will strictly pull from `release_notes.json` (`banners.default` or `notes.owner[0]`) to ensure it remains a single concise sentence under 100 characters for optimal display on iOS, Android, Windows, and macOS lockscreens.

## Verification Plan

### Automated Verification
- Run `node scripts/push_update_notification.cjs` in dry-run mode to verify payload formatting and VAPID key signing.
- Run `npm run build` to verify Service Worker compilation with 0 errors.

### Manual Verification
- Test receiving the single-sentence Push Notification on desktop browser and mobile device.
- Tapping the notification verifies instant app launch and version synchronization.
