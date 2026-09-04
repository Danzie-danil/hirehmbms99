# Friendly Offline & Module Error Placeholders Implementation Plan

## Problem Description
Currently, when a user is offline or loses internet connection while navigating modules, the application shows generic or technical messages (e.g., "Failed to Load View", "Network or view rendering took longer than 5 seconds", "error, could not fetch").
The user requested user-friendly, module-specific offline placeholders across all Owner and Branch modules (e.g., opening Staff & HR should display *"Couldn't load Staff Information since you are currently offline"*).

## Proposed Architecture & Design

### 1. Central Module Dictionary & Offline Component in `js/utils.js`
Create a centralized mapping and rendering utility:
- `MODULE_METADATA`: Dictionary mapping all view IDs (Owner and Branch) to human-friendly titles, categories, icons, and contextual descriptions.
- `renderModuleOfflineState({ viewId, title, icon, message, retryFn, customAction })`:
  - Renders a clean, aesthetic card with soft glassmorphism, contextual icons, retry action, and offline badge.
  - Automatically translates and adapts to current network state (`navigator.onLine`).
- `renderOfflineViewPlaceholder(viewId, role, isOffline, errorMsg)`:
  - Universal view wrapper used by `switchView` in `js/app.js` when view loading encounters network latency or offline timeouts.

### 2. View Router Integration in `js/app.js`
- Update the error boundary in `switchView` to invoke `renderOfflineViewPlaceholder(viewId, state.role, !navigator.onLine, err.message)`.
- Ensure all module names are properly formatted with localized fallback support.

### 3. Owner & Branch Modules Error Catching
Audit and integrate `renderModuleOfflineState` across:
- **Owner Modules**: `overview`, `branches`, `tasks`, `analytics`, `staff`, `suppliers`, `quotations`, `payroll`, `goals`, `shifts`, `announcements`, `promotions`, `audit`, `central_inventory`, `stock_movements`, `financial_reports`, `requests`, `chat`, `settings`.
- **Branch Modules**: `dashboard`, `sales`, `expenses`, `inventory`, `customers`, `tasks`, `notes`, `loans`, `reports`, `staff`, `suppliers`, `quotations`, `invoices`, `settings`, `requests`, `cash_drawer`, `attendance`, `returns`, `shift_summary`, `loyalty`, `stock_transfers`.

### 4. App Version Bump
- Increment version to `v2.8.7` across `release_notes.json`, `public/release_notes.json`, `js/updateChecker.js`, and `public/sw.js`.

## Verification Plan
- Verify `npm run build` passes with 0 errors.
- Test offline simulation across key owner modules (`staff`, `branches`, `analytics`, `payroll`) and branch modules (`sales`, `inventory`, `staff`, `expenses`).
- Record all changes in `Chat_History/chat_history.txt`.
