# BMSTz Cross-Platform Application

This repository contains the unified source code for the BMSTz application, targeting Web, Android, and Desktop environments using a single React codebase.

## Quick Start
- **Web**: `npm run dev`
- **Android**: `npm run build && npm run android:sync && npm run android:open`
- **Desktop**: `npm run desktop:dev`

## Architecture Overview
- **Web App**: The core React/Vite application.
- **Android App**: Native wrapper utilizing Capacitor (`/android`).
- **Desktop App**: Native wrapper utilizing Tauri (`/src-tauri`).
- **Shared Code**: Centralized logic across platforms with abstractions in `src/utils/platform.js`.

## Documentation
Please refer to the following documentation files for detailed instructions:
- [Web Guide](docs/web.md)
- [Android Guide](docs/android.md)
- [Desktop Guide](docs/desktop.md)
- [Development Workflow](docs/development.md)
- [Deployment & Releases](docs/deployment.md)

