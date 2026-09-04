# Implementation Plan - App Official Logo & Asset Resizing Suite

Resizing and replacing all application icons, favicons, browser icons, PWA manifests, iOS profile configuration icons, and splash screens using the new official logo (`bms_logo_official.png`), replacing old assets, and purging obsolete legacy logo files across the repository.

## Proposed Changes

### Image Generation & Automation Script
- Create a dedicated PowerShell asset generator script (`scripts/generate_all_icons.ps1`) using high-quality bicubic resampling via `System.Drawing`:
  - **High-Res Master Logos**: Overwrite `bmtzofficiallogo.png`, `bmstzlogo.png`, `logo.png`, `bg_logo.png`, `logo.jpg`, `badge.png` in both root and `public/`.
  - **Favicons & Browser Icons**:
    - `public/favicon.ico` (multi-res ICO containing 16x16, 32x32, 48x48)
    - `public/favicon-16x16.png`
    - `public/favicon-32x32.png`
    - `public/favicon-48x48.png`
    - `public/icon-64x64.png`
    - `public/icon-96x96.png`
    - `public/icon-128x128.png`
    - `public/icon-144x144.png`
    - `public/apple-touch-icon-152x152.png`
    - `public/apple-touch-icon.png` (180x180)
    - `public/icon-192x192.png` (192x192 PWA)
    - `public/icon-384x384.png` (384x384 PWA)
    - `public/icon-512x512.png` (512x512 PWA)
  - **Splash Screens** (Dark `#0b141a` background with centered crisp logo):
    - `public/splash-screen.png` (1024x1024)
    - `public/apple-splash-640x1136.png` (iPhone SE, 5s)
    - `public/apple-splash-750x1334.png` (iPhone 6/7/8/SE)
    - `public/apple-splash-828x1792.png` (iPhone XR, 11)
    - `public/apple-splash-1125x2436.png` (iPhone X, XS, 11 Pro)
    - `public/apple-splash-1242x2688.png` (iPhone XS Max, 11 Pro Max)
    - `public/apple-splash-1170x2532.png` (iPhone 12/13/14)
    - `public/apple-splash-1284x2778.png` (iPhone 12/13/14 Pro Max)
    - `public/apple-splash-1290x2796.png` (iPhone 14/15/16 Pro Max)
  - **iOS Profile Config & Base64 Assets**:
    - Update Base64 string in `public/bmstz.mobileconfig`
    - Update Base64 string in `js/logoBase64.js`
    - Update `scripts/update_icon.cjs` to reference `bms_logo_official.png`

### PWA Manifest & HTML Meta Tags
- Update [public/manifest.json](file:///d:/v2%20BMS%20OFFICIAL/public/manifest.json) to declare icons across all standard resolutions (16x16, 32x32, 180x180, 192x192, 512x512, maskable) and splash screen assets.
- Update HTML files ([index.html](file:///d:/v2%20BMS%20OFFICIAL/index.html), [app/index.html](file:///d:/v2%20BMS%20OFFICIAL/app/index.html), [manual/index.html](file:///d:/v2%20BMS%20OFFICIAL/manual/index.html), [privacy/index.html](file:///d:/v2%20BMS%20OFFICIAL/privacy/index.html), [support/index.html](file:///d:/v2%20BMS%20OFFICIAL/support/index.html), [terms/index.html](file:///d:/v2%20BMS%20OFFICIAL/terms/index.html)) to link favicons, apple-touch-icons, apple-touch-startup-images, og:image, twitter:image, and logo images.

### Versioning & Post-Execution Verification
- Increment app version in `release_notes.json`, sync with `js/updateChecker.js`.
- Execute `npm run build` to compile `public/sw.js` and verify 0 build/lint errors.
- Update `Chat_History/chat_history.txt` with detailed record of changes.

## Verification Plan

### Automated Verification
- Run `npm run build` to verify Vite compilation cleanly succeeds with 0 errors.

### Manual Verification
- Verify generated icon files exist in `public/` and root with non-zero file size.
- Inspect Base64 payload in `public/bmstz.mobileconfig` and `js/logoBase64.js`.
