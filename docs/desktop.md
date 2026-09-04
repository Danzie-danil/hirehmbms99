# Desktop Application

The Desktop version uses Tauri 2 to package the React/Vite web application.

## Prerequisites
- Rust (via rustup)
- C++ Build Tools (Windows) / Xcode (macOS) / WebKit2GTK (Linux)
- Node.js & npm

## Development Workflow
To run the desktop application in development mode with hot-reloading:
```bash
npm run desktop:dev
```

## Production Build
To create a native desktop installer or executable:
```bash
npm run desktop:build
```
The output will be placed in the `src-tauri/target/release/bundle/` directory.

## Architecture
- Project Location: `/src-tauri`
- Configuration: `src-tauri/tauri.conf.json`
- Security: Uses Tauri's capability model. Ensure plugins/permissions are explicitly whitelisted.

