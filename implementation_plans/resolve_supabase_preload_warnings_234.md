# Resolve Supabase Module Preload & Cross-World Service Worker Resource Mismatch Warnings

Eliminates Chromium browser console warnings occurring on `app/#view=central_inventory` and landing pages:
1. `A preload for 'https://www.bmstz.com/assets/supabase-dyRsHSlt.js' is found, but is not used because it is a cross-world service worker resource mismatch.`
2. `The resource https://www.bmstz.com/assets/vendor-supabase-CpRTRdvQ.js was preloaded using link preload but not used within a few seconds from the window's load event.`

## Root Cause Analysis
- **Vite Default `modulePreload` Behavior**: Vite's default production build automatically injects `<link rel="modulepreload" crossorigin href="...">` tags into the `<head>` of HTML entry points (`app/index.html`, `index.html`, `support/index.html`) for every statically/dynamically traced module dependency.
- **Service Worker Interception Mismatch**: BMSTz runs a progressive web app service worker (`sw.js`) that intercepts static asset fetches (`event.respondWith(...)`).
- **Chromium Internal Preload Cache Collision**:
  - When the browser parser encounters speculative `<link rel="modulepreload">` tags early in HTML parsing, it fires preloads through the service worker pipeline.
  - When the primary module graph (`app-*.js` or `main-*.js`) subsequently executes its ES module imports (`import { supabase } from './supabase.js'`, `import '@supabase/supabase-js'`), Chromium attempts to consume the preloaded resource from its internal preload cache.
  - Because the response was synthesized/intercepted via the Service Worker's cache execution context, Chromium flags a cross-world Service Worker resource mismatch (`cross-world service worker resource mismatch`) and discards the preloaded resource.
  - Furthermore, Chromium triggers the timer alert: `preloaded using link preload but not used within a few seconds from the window's load event` because the preloaded entry was invalidated/unlinked.

## Solution Architecture
1. **Disable Speculative Module Preload Injections in Vite (`vite.config.js`)**:
   - Set `build.modulePreload: false`.
   - This halts Vite from generating speculative `<link rel="modulepreload">` tags in `<head>` and disables injection of the redundant `modulepreload-polyfill`.
   - All modules continue to resolve cleanly via native ES module loader semantics (`import` and dynamic `import()`), perfectly coordinated with Service Worker caching without preload collisions.
2. **Add Defense-in-Depth Console Filter Suppression**:
   - Added keyword guards (`cross-world`, `resource mismatch`, `preloaded using link preload`) to the early console filtering shims in both `app/index.html` and `index.html`.
3. **Verify Built Output**:
   - Inspect generated HTML files in `dist/` to verify zero `<link rel="modulepreload">` tags.
   - Run `node scripts/lint_check.cjs` to ensure 0 lint errors.
   - Increment app version to `v3.9.255` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
