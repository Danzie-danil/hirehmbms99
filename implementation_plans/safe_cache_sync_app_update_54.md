# Implementation Plan - Safe Cache & Offline Data Sync on App Update (54)

## Overview
Enhance the "Update Now" flow in `js/updateChecker.js` to safely synchronize pending offline data from `localDb.sync_queue` before updating, and upgrade the Service Worker & cache gracefully without destructive, indiscriminate cache wiping or service worker unregistration.

## Proposed Changes

### [js/updateChecker.js](file:///d:/v2%20BMS%20OFFICIAL/js/updateChecker.js)
- Refactor `executeAppUpdate(newVersion)`:
  - Check if any offline mutations are pending in `localDb.sync_queue`.
  - If online, trigger and await `syncManager.processPendingQueue()` (with a safe timeout) to ensure all pending sales/transactions are safely confirmed by Supabase before reloading.
  - Seamlessly prompt the Service Worker to update (`reg.update()`) and activate (`SKIP_WAITING`), allowing the new Service Worker to swap and cache new assets gracefully.
  - Avoid wiping entire `caches` storage manually or unregistering service workers destructively.
  - Preserve all auth tokens, user state, and IndexedDB persistent storage.
  - Reload cleanly and smoothly.

### Version Management
- Bump app version to `2.9.93` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.

## Verification Plan
- Run `npm run build` to verify 0 errors.
