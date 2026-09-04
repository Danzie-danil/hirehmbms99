# Web Application

The core of BMSTz is the React/Vite web application located in the root directory.

## Development
Run the web application locally:
```bash
npm run dev
```

## Production Build
Build the web application for production:
```bash
npm run build
```
This command outputs to the `dist` directory. Both Capacitor and Tauri are configured to use this build output.

## Architecture
- Framework: React
- Bundler: Vite
- Routing: Multi-page and React-based routing (App.jsx)
- Backend: Supabase

Ensure that `npm run build` succeeds before attempting to synchronize Android or build Desktop, as they depend on the `dist` folder.

