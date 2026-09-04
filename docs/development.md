# Development Guide

This repository contains a unified codebase for Web, Android, and Desktop deployments of BMSTz.

## Local Environment
1. Ensure Node.js (LTS) is installed.
2. Run `npm install` to fetch dependencies.
3. Verify `.env` configuration (Vite prefixes `VITE_` required for frontend secrets).

## Cross-Platform Commands
- **Web**: `npm run dev`
- **Android**: `npm run android:sync` followed by `npm run android:open`
- **Desktop**: `npm run desktop:dev`

## Platform Abstraction
Use `src/utils/platform.js` to write platform-specific logic safely without referencing undefined global variables.
```javascript
import { platform } from '../utils/platform.js';

if (platform.isAndroid()) {
  // Capacitor logic
} else if (platform.isDesktop()) {
  // Tauri logic
} else {
  // Web fallback
}
```

Avoid introducing native plugins if standard web APIs suffice, to keep the codebase maintainable.

