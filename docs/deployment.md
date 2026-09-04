# Deployment & Release Process

## Web (Production)
1. Run `npm run build`.
2. Ensure VITE_* variables are set correctly for production.
3. Deploy the `dist` folder to your static host (e.g., Vercel, Netlify, or Nginx).

## Android (Google Play)
1. Run `npm run build`.
2. Run `npm run android:sync`.
3. Open the Android project in Android Studio.
4. Generate a signed bundle (.aab) using the production `.jks` keystore.
5. Upload the `.aab` to the Google Play Console.
**Note**: Never commit the `.jks` file or passwords to the repository.

## Desktop (Windows)
1. Ensure Rust and Windows Build Tools are installed.
2. Run `npm run desktop:build`.
3. The MSI/EXE installers will be generated in `src-tauri/target/release/bundle/`.
4. Distribute the installers to your users.

## Versioning
Coordinate versions across `package.json`, `capacitor.config.ts`, and `src-tauri/tauri.conf.json` so releases share the same semantic version.

