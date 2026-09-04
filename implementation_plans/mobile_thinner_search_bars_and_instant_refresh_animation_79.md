# Implementation Plan - Mobile Thinner Search Bars & Instant Refresh Animation

Make mobile search input bars significantly thinner and compact, and provide instant visual feedback on the top navbar refresh button with the `/loading.gif` animation and animated WhatsApp typing indicator dots.

## User Review Required
> [!IMPORTANT]
> - Search bars across mobile viewports (Central Inventory, Central Dispatch Hub, Modals, and Global Search) will have reduced height (`32px` / `h-8`) and sleek compact padding with centered search icons.
> - The top navbar refresh button on mobile will instantly spin the icon and trigger the `#global-loader` overlay with `/loading.gif` and typing animated dots for `"Just a moment..."` before reloading the app.

## Proposed Changes

### 1. Global CSS Polish (`css/index.css`)
- Configure `@media (max-width: 640px)` and `@media (max-width: 480px)` rules for all search bars (`#dispatchSearchInput`, `#invSearchInput`, `#modalInvSearchInput`, `input[type="search"]`, `input[placeholder*="Search" i]`, `.search-input`, etc.):
  - Height: `32px !important`
  - Vertical padding: `0.32rem !important`
  - Left padding: `2.15rem !important`
  - Font size: `11.5px !important`
  - Centered icon alignment: `top: 50% !important; transform: translateY(-50%) !important; width: 13px !important; height: 13px !important; left: 0.7rem !important;`
- Add support for animated typing dots in `.typing-indicator-dots` and `.loader-text`.

### 2. Central Inventory & Dispatch Hub Search Inputs (`js/owner/central_inventory.js`)
- Update `#dispatchSearchInput` and `#invSearchInput` markup to use compact mobile height (`h-8 sm:h-auto`, `py-1 sm:py-2.5`, `pl-8 sm:pl-11`, `text-xs sm:text-sm`).

### 3. Top Nav Refresh Button & Loader Utilities (`app/index.html`, `js/utils.js`)
- In `app/index.html`:
  - Update top nav refresh button `onclick="window.triggerAppRefresh(this)"`.
  - Add inline `window.triggerAppRefresh(btn)` implementation in head failsafe scripts.
- In `js/utils.js`:
  - Export `triggerAppRefresh(btn)` and attach to `window`.
  - Enhance `showLoader(message)` to automatically format trailing dots as animated WhatsApp typing indicator dots (`animate-ping-dot-1`, `animate-ping-dot-2`, `animate-ping-dot-3`).

### 4. Version Bump & Release Notes Sync (`release_notes.json`, `js/updateChecker.js`, `public/sw.js`)
- Increment version to `3.5.3`.
- Update `release_notes.json` with simple, non-technical release notes.

## Verification Plan

### Automated Verification
- Run `npm run build` to verify Vite bundle build, Service Worker sync, and 0 lint/syntax errors.

### Manual Verification
- Test mobile viewports (< 640px and < 480px) to verify search bars are sleek and thin without overflowing icons or text.
- Click the top navbar refresh button to verify the instant visual feedback: icon spinning, immediate appearance of the loading GIF, and animated "Just a moment..." typing dots before reload.
