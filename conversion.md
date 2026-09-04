# MASTER TASK: Convert Existing React/Vite Web App into Android + Desktop Apps

You are working on an existing production-quality web application built primarily with **React + Vite + JavaScript/TypeScript**.

Your task is to convert the existing web application into:

1. A **Web application** — MUST remain fully functional.
2. An **Android application** — using Capacitor.
3. A **Desktop application** — using Tauri 2.

Do NOT destroy, replace, or restructure the existing web application unnecessarily.

The final architecture must allow all three versions to coexist and share as much application logic/UI as reasonably possible while still allowing Android/Desktop-specific functionality later.

---

# 1. NON-NEGOTIABLE REQUIREMENTS

Follow these rules throughout the entire task.

* Do NOT delete the existing web application.
* Do NOT replace the existing React/Vite application with another framework.
* Do NOT migrate the application to Electron.
* Do NOT use Cordova.
* Do NOT create an Android app using a completely separate duplicated frontend.
* Do NOT create a desktop app using a completely separate duplicated frontend.
* Do NOT hard-code platform-specific behavior throughout the application.
* Do NOT break the existing web deployment.
* Do NOT change production environment variables unnecessarily.
* Do NOT replace existing Supabase, authentication, API, storage, database, or backend architecture unless absolutely required.
* Preserve existing routes.
* Preserve existing authentication.
* Preserve existing permissions.
* Preserve existing business logic.
* Preserve existing UI.
* Preserve existing responsive behavior.
* Preserve existing offline/data-sync architecture unless a platform-specific change is required.
* Never expose secrets in the frontend.
* Never commit `.env` files containing production secrets.
* Never replace production API keys with development/test keys.
* Never modify production database schemas merely to make packaging work.
* Test each platform independently.

The goal is to package the existing application professionally, not rebuild the application from scratch.

---

# 2. FIRST: AUDIT THE EXISTING PROJECT

Before making changes, inspect the entire repository.

Determine:

* Framework
* React version
* Vite version
* JavaScript vs TypeScript
* package manager
* Node.js requirements
* current build command
* current development command
* output directory
* routing system
* authentication system
* Supabase configuration
* API integrations
* environment variables
* local storage usage
* IndexedDB usage
* service workers
* PWA configuration
* WebSocket/realtime functionality
* file uploads
* camera usage
* notifications
* downloads
* printing
* clipboard functionality
* browser APIs
* third-party libraries
* existing native-looking functionality
* existing responsive/mobile layouts
* existing desktop layouts

Read:

* `package.json`
* `vite.config.*`
* `src/**`
* routing configuration
* authentication configuration
* environment configuration
* service worker/PWA configuration
* Supabase configuration
* any existing build scripts

Do NOT begin installing packages before understanding the existing architecture.

After auditing, create a short internal implementation plan and then execute it.

---

# 3. REQUIRED FINAL PROJECT STRUCTURE

Organize the project so the existing web version remains independent while Android and Desktop have their own native wrapper/configuration folders.

Prefer this architecture:

```text
PROJECT_ROOT/
│
├── web/
│   └── [existing React/Vite application]
│
├── android/
│   └── [Capacitor Android project]
│
├── desktop/
│   └── [Tauri 2 project]
│
├── shared/
│   └── [only genuinely shared utilities/configuration if needed]
│
├── scripts/
│   └── [build/package helper scripts]
│
├── package.json
├── README.md
└── .gitignore
```

IMPORTANT:

If the current repository already contains the React/Vite application at the root and moving it into `/web` would create significant risk, DO NOT blindly move everything.

Instead, preserve the current structure and create:

```text
PROJECT_ROOT/
├── src/
├── public/
├── package.json
├── android/
├── desktop/
├── scripts/
└── ...
```

In that case, treat the existing root React/Vite application as the shared web frontend.

Choose the safest architecture based on the actual repository.

The most important requirement is:

**The web application must continue working exactly as before.**

---

# 4. NODE.JS AND PACKAGE MANAGER

Before installation:

Check:

```bash
node -v
npm -v
```

If the project uses:

```text
npm
```

continue using npm.

If it uses:

```text
pnpm
```

continue using pnpm.

If it uses:

```text
yarn
```

continue using yarn.

Do NOT unnecessarily change package managers.

Use a currently supported LTS version of Node.js appropriate for the existing project and the current Capacitor/Tauri tooling.

If Node is incompatible, clearly identify the required version before changing anything.

---

# 5. INSTALL AND VERIFY REQUIRED SYSTEM TOOLS

The agent must determine which operating system it is currently running on.

## Android requirements

Install/configure:

* Android Studio
* Android SDK
* Android SDK Platform
* Android SDK Build-Tools
* Android SDK Command-line Tools
* Android Emulator
* Android Platform Tools
* Java/JDK compatible with the installed Android Gradle tooling
* Gradle tooling as required by the generated Capacitor project

Do NOT manually install a random Gradle version if the Capacitor Android project already provides the Gradle wrapper.

Verify:

```bash
adb --version
java -version
```

and Android SDK availability.

If Android Studio is already installed, reuse it.

If the environment cannot install GUI software automatically, provide the exact manual installation steps and continue with everything that can be automated.

---

# 6. CAPACITOR INSTALLATION

Use the current stable Capacitor release compatible with the existing project.

Install:

```bash
npm install @capacitor/core
npm install -D @capacitor/cli
```

Initialize Capacitor appropriately.

The Android application must live in:

```text
/android
```

Do NOT put Android-specific source code inside the main React source unless absolutely necessary.

Add:

```bash
npx cap add android
```

or the equivalent command required by the installed Capacitor version.

Configure Capacitor so that the Android project loads the production React/Vite build output.

---

# 7. CAPACITOR CONFIGURATION

Create/configure:

```text
capacitor.config.ts
```

or the appropriate configuration file.

Configure:

* app ID
* app name
* web directory
* Android settings
* server behavior where appropriate
* splash screen
* status bar
* keyboard behavior
* navigation behavior
* deep linking if required
* safe areas
* viewport behavior

Use a proper application ID such as:

```text
com.yourcompany.yourapp
```

Do NOT invent a final company/package identifier if the project already has one.

If no identifier exists, use a clearly documented placeholder and tell me exactly where it must be changed.

---

# 8. ANDROID APPLICATION REQUIREMENTS

The Android version must behave like a real Android application, not simply a badly sized website.

Implement:

* Android back button handling
* proper splash screen
* status bar handling
* safe-area support
* keyboard handling
* Android navigation behavior
* app icon
* adaptive icon where appropriate
* correct screen orientation
* network handling
* external link handling
* file upload handling
* downloads
* camera access if the web app already uses camera functionality
* notifications only if the existing application needs them
* deep links where required

Do NOT request Android permissions unless they are actually required.

Follow least-privilege principles.

---

# 9. ANDROID ICONS AND SPLASH SCREEN

Inspect the existing application branding.

Generate/prepare all required Android assets from the existing logo.

Create proper assets for:

* launcher icon
* adaptive icon
* splash screen
* foreground/background icon assets where required

Do not distort the logo.

Do not arbitrarily change the application's brand colors.

Do not create a completely different Android visual identity.

---

# 10. ANDROID ENVIRONMENT VARIABLES

Never place secrets directly inside:

```text
android/
```

Never hard-code:

* Supabase service-role keys
* private API keys
* server secrets
* authentication secrets

The mobile application may contain public client configuration such as a Supabase anon/publishable key if that is already how the web application is designed, but verify that this is genuinely safe.

Do NOT expose privileged credentials.

Use the existing Vite environment variable system appropriately.

Verify:

```text
.env
.env.local
.env.production
.env.development
```

and ensure secrets are not committed.

Update `.gitignore` appropriately.

---

# 11. DESKTOP APPLICATION USING TAURI 2

Create a separate desktop application using **Tauri 2**.

The desktop project must live in:

```text
/desktop
```

Do NOT use Electron.

Install/configure the current Tauri tooling appropriate to the project.

Tauri requires Rust tooling.

Verify:

```bash
rustc --version
cargo --version
```

If Rust is missing, install Rust using the official Rust toolchain installer.

Also install the platform-specific prerequisites required by Tauri.

For Windows, ensure the required:

* Microsoft Visual Studio C++ build tools
* Windows SDK
* WebView2

are available.

Use the Tauri documentation/tooling to determine the exact current prerequisites rather than assuming old versions.

---

# 12. TAURI FRONTEND

The desktop application must use the existing React/Vite frontend.

Do NOT duplicate the entire frontend.

Configure Tauri to load the Vite build output.

The architecture should effectively be:

```text
React/Vite
     │
     ├── Web browser
     │
     ├── Capacitor → Android
     │
     └── Tauri → Desktop
```

The React application remains the shared UI/application layer.

---

# 13. DESKTOP APPLICATION BEHAVIOR

Implement desktop-specific behavior where appropriate:

* native window
* application icon
* window title
* minimum window size
* responsive desktop layout
* maximize/minimize/close behavior
* external links
* file uploads
* downloads
* printing
* clipboard
* keyboard shortcuts where appropriate
* native filesystem functionality only if genuinely required
* deep links if needed
* automatic updates only if explicitly configured later

Do NOT introduce native Rust functionality unnecessarily.

Use web APIs when they are sufficient.

Use Tauri APIs only when they provide meaningful desktop functionality.

---

# 14. DESKTOP SECURITY

Configure Tauri with the principle of least privilege.

Do NOT give the application unrestricted filesystem access.

Do NOT enable unnecessary shell commands.

Do NOT expose arbitrary native commands to the frontend.

Only enable capabilities required by the application.

Review:

```text
src-tauri/
```

and particularly:

* capabilities
* permissions
* commands
* window configuration
* CSP
* allowlists/capabilities

Use Tauri 2's current security model.

---

# 15. PLATFORM DETECTION

Create a centralized platform utility.

For example:

```text
src/utils/platform.*
```

or an equivalent appropriate location.

It should allow the application to determine whether it is running as:

```text
web
android
desktop
```

Do NOT scatter checks such as:

```javascript
if (window.someRandomThing)
```

throughout the application.

Create one centralized abstraction.

Example conceptual API:

```javascript
platform.isWeb()
platform.isAndroid()
platform.isDesktop()
platform.isNative()
```

Adapt the implementation to the actual project.

---

# 16. NATIVE FEATURE ABSTRACTION

If a feature requires different implementations on:

* Web
* Android
* Desktop

create a service abstraction.

Example:

```text
src/services/platform/
├── web.*
├── android.*
├── desktop.*
└── index.*
```

Use this architecture only when needed.

For example:

```text
notifications
file system
camera
sharing
printing
downloads
clipboard
```

The React UI should call the abstraction rather than directly depending on Android or Tauri internals.

---

# 17. ROUTING

Audit the existing React routing.

Make sure routes work correctly in:

### Web

```text
https://example.com/dashboard
```

### Android

The same application routes should resolve correctly inside Capacitor.

### Desktop

The same application routes should resolve correctly inside Tauri.

Do NOT blindly change routing to hash routing unless technically necessary.

If the current routing system requires configuration for native builds, implement the minimum safe change.

Test:

* login
* dashboard
* nested routes
* refresh/navigation
* logout
* protected routes
* unknown routes

---

# 18. SUPABASE / BACKEND

The backend remains the source of truth.

Do NOT create a second database for Android.

Do NOT create a second database for desktop.

Do NOT create separate business logic implementations.

All platforms should communicate with the same backend unless there is a compelling architectural reason not to.

The architecture should be:

```text
                  ┌── Web
                  │
React Application ├── Android
                  │
                  └── Desktop
                       │
                       ▼
                    Supabase
```

Preserve:

* authentication
* database
* storage
* realtime
* RLS
* edge functions
* APIs
* business logic

---

# 19. OFFLINE FUNCTIONALITY

Audit the existing offline architecture carefully.

Determine whether the current application uses:

* localStorage
* IndexedDB
* service workers
* browser cache
* custom caching
* Supabase realtime
* background synchronization

Do NOT automatically replace the existing system.

If offline behavior is currently unreliable, document the problem separately.

The native conversion must not accidentally create a second conflicting caching system.

If the application requires offline functionality, design it so:

```text
Local cache
     ↓
Offline operations
     ↓
Sync queue
     ↓
Supabase
     ↓
Realtime updates
```

However, do not implement a major offline rewrite unless it is necessary for the current task.

---

# 20. AUTHENTICATION

Test authentication independently on:

* Web
* Android
* Desktop

Verify:

* login
* logout
* session persistence
* token refresh
* protected routes
* expired sessions
* multiple accounts
* password reset
* OAuth if used

If OAuth is used, investigate native deep-link handling.

Do not assume browser OAuth will work identically inside Capacitor/Tauri.

---

# 21. FILES AND CAMERA

Audit whether the existing application uses:

* `<input type="file">`
* camera capture
* image uploads
* document uploads
* downloads
* PDF generation
* printing

Test each feature on Android and desktop.

Where browser behavior is sufficient, keep it.

Only introduce native plugins when browser behavior does not work correctly.

---

# 22. NETWORKING

Ensure all API requests work from:

* browser
* Android
* desktop

Check:

* HTTPS
* CORS
* authentication headers
* cookies
* Supabase requests
* WebSockets/realtime
* API endpoints
* file uploads

Do not weaken backend security to make the mobile app work.

Never solve CORS by disabling security in production.

---

# 23. DEEP LINKS

If the application has authentication links, password reset links, invitations, or other links that need to open the application:

Design deep linking for Android and desktop.

Use appropriate application URL schemes.

Example conceptual structure:

```text
myapp://login
myapp://reset-password
myapp://invite
```

Do not use this exact scheme if another application identifier already exists.

Configure the system only if the application actually requires deep links.

---

# 24. WEB VERSION MUST REMAIN WORKING

After every major change, run:

```bash
npm run build
```

and the existing development command.

Confirm:

```text
Web build succeeds
Routes work
Authentication works
Supabase works
No production functionality was removed
```

The web version is not optional.

---

# 25. BUILD SCRIPTS

Create clear scripts in `package.json`.

For example, adapt as appropriate:

```json
{
  "scripts": {
    "dev": "...",
    "build": "...",
    "preview": "...",

    "android:sync": "...",
    "android:open": "...",
    "android:run": "...",
    "android:build": "...",

    "desktop:dev": "...",
    "desktop:build": "..."
  }
}
```

Do NOT overwrite existing scripts without preserving their functionality.

Use scripts appropriate for the actual package manager and project.

---

# 26. DEVELOPMENT WORKFLOW

The final workflow should be simple.

## Web

```bash
npm run dev
```

## Android

Build the web frontend first, then synchronize Capacitor:

```bash
npm run build
npx cap sync android
npx cap open android
```

or create project-specific scripts that perform the equivalent.

Android Studio should then be able to:

* run the emulator
* run on a physical Android device
* build APK
* build AAB

---

# 27. ANDROID BUILD OUTPUT

Configure the project so the following are possible:

### Development APK

```text
debug APK
```

### Release APK

```text
release APK
```

### Google Play package

```text
AAB
```

Do NOT commit signing keys.

Do NOT commit:

```text
.keystore
.jks
```

or signing passwords.

Create documentation explaining where production signing credentials must be configured.

---

# 28. DESKTOP BUILD OUTPUT

Configure Tauri so the application can eventually produce:

```text
Windows installer
Windows executable
```

and, where the build environment supports it:

```text
macOS application/package
Linux package
```

Do not claim that macOS/Linux builds were tested if the current environment cannot test them.

At minimum, fully configure and test the desktop target available in the current development environment.

---

# 29. VERSIONING

Create one clear application version strategy.

The web, Android, and desktop applications should have compatible versions.

For example:

```text
1.0.0
1.0.1
1.1.0
```

Avoid having unrelated version numbers unless technically required.

Document where each platform's version is controlled.

---

# 30. ENVIRONMENT SEPARATION

Create clear development/production handling.

The application must never accidentally use:

```text
development Supabase URL
development Supabase key
test API
local database
```

when producing a production build.

Before production builds, explicitly verify:

```text
VITE_* environment variables
Supabase URL
Supabase public key
API endpoints
application environment
```

Never print secret values into build logs.

Never commit environment secrets.

---

# 31. GIT SAFETY

Before making major changes:

Check:

```bash
git status
```

Create a safe checkpoint/branch if the repository is already under Git.

Do not delete unrelated uncommitted user changes.

Do not reset the repository.

Do not run destructive commands such as:

```bash
git reset --hard
git clean -fd
```

unless explicitly authorized.

Add appropriate entries to `.gitignore`.

---

# 32. TEST MATRIX

Create a test checklist and actually execute what is possible.

## Web

Test:

* [ ] application starts
* [ ] production build
* [ ] login
* [ ] logout
* [ ] dashboard
* [ ] navigation
* [ ] API calls
* [ ] Supabase
* [ ] file upload
* [ ] downloads
* [ ] responsive layout

## Android

Test:

* [ ] app launches
* [ ] splash screen
* [ ] login
* [ ] logout
* [ ] session persistence
* [ ] navigation
* [ ] Android back button
* [ ] keyboard
* [ ] file upload
* [ ] camera if applicable
* [ ] downloads
* [ ] network failure
* [ ] reconnect
* [ ] Supabase
* [ ] realtime
* [ ] app background/foreground
* [ ] screen rotation if supported

## Desktop

Test:

* [ ] application launches
* [ ] window sizing
* [ ] login
* [ ] logout
* [ ] session persistence
* [ ] navigation
* [ ] keyboard/mouse interaction
* [ ] file upload
* [ ] downloads
* [ ] printing if applicable
* [ ] clipboard if applicable
* [ ] network failure
* [ ] reconnect
* [ ] Supabase
* [ ] realtime
* [ ] application close/reopen

---

# 33. PERFORMANCE

Do not make the native versions significantly heavier than necessary.

For Android:

* avoid unnecessary native plugins
* avoid duplicate frontend bundles
* optimize assets
* keep startup fast
* avoid unnecessary background processes

For desktop:

* keep Tauri lightweight
* avoid Electron
* avoid unnecessary Rust commands
* avoid unnecessary native permissions

Do not sacrifice functionality for arbitrary optimization.

---

# 34. UI/UX

The existing web UI should remain visually consistent.

However, intelligently adapt where necessary.

Android:

* respect safe areas
* respect touch targets
* avoid hover-dependent controls
* handle keyboard properly
* avoid tiny desktop-only controls

Desktop:

* support mouse and keyboard naturally
* use available screen space
* preserve responsive behavior

Do not redesign the application unless required for platform compatibility.

---

# 35. DOCUMENTATION

Create/update:

```text
README.md
```

and create:

```text
docs/
├── web.md
├── android.md
├── desktop.md
├── development.md
└── deployment.md
```

Document:

* prerequisites
* installation
* development
* building
* Android Studio setup
* emulator setup
* physical Android device setup
* APK generation
* AAB generation
* Tauri development
* desktop builds
* environment variables
* signing
* release process
* troubleshooting

---

# 36. ROOT COMMANDS

Make the project easy to operate.

Document commands such as:

```bash
npm install
npm run dev
npm run build

npm run android:sync
npm run android:open
npm run android:run
npm run android:build

npm run desktop:dev
npm run desktop:build
```

Use the actual scripts created in the project.

Do not document commands that do not exist.

---

# 37. IMPORTANT: DO NOT OVERENGINEER

Do not:

* rewrite React
* rewrite Supabase
* replace Vite
* replace routing
* replace authentication
* rewrite the UI
* create three independent applications
* create a second backend
* create unnecessary microservices
* introduce Electron
* introduce unnecessary native plugins
* create unnecessary Rust code
* migrate databases
* change production infrastructure

The objective is:

**One application codebase → Web + Android + Desktop.**

---

# 38. FAILURE HANDLING

If something cannot be completed automatically:

1. Do not fake completion.
2. Do not skip the issue silently.
3. Document exactly what failed.
4. Explain why.
5. Complete every other part that can be completed.
6. Give the exact command/manual action required to finish it.

For example:

```text
Android Studio installation requires GUI interaction.
```

Do not pretend it was installed.

---

# 39. FINAL AUDIT

Before declaring completion, inspect the entire diff.

Check:

```bash
git status
git diff --stat
```

Review:

* package.json
* Capacitor configuration
* Android project
* Tauri project
* environment configuration
* routing
* authentication
* Supabase configuration
* platform abstraction
* scripts
* README
* documentation
* `.gitignore`

Look specifically for:

* hard-coded secrets
* broken paths
* broken imports
* incorrect environment variables
* duplicated code
* accidental deletion
* production configuration changes
* insecure Tauri permissions
* unnecessary Android permissions

---

# 40. FINAL DELIVERABLE

At the end, provide a concise implementation report containing:

## Architecture

Explain:

```text
Web
Android
Desktop
Shared code
Backend
```

## Files created

List the important files/folders created.

## Packages installed

List every npm package installed and why.

## System tools required

List:

* Node
* npm
* Android Studio
* Android SDK
* JDK
* Rust
* Tauri prerequisites
* anything else actually required

## Commands

Show the exact commands to:

* run web
* build web
* run Android
* build Android
* run desktop
* build desktop

## Testing

Show what was actually tested and what could not be tested.

## Remaining manual steps

Clearly list anything that still requires human action.

## Production release

Explain the exact next steps for:

```text
Android APK
Android AAB / Google Play
Windows desktop installer
future macOS/Linux builds
```

---

# FINAL PRINCIPLE

Do not treat this as "put the website inside an app."

Treat it as a **multi-platform application architecture**:

```text
                    ┌─────────────────────┐
                    │   React + Vite      │
                    │   Shared Frontend   │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
        ┌──────────┐     ┌──────────┐     ┌──────────┐
        │   WEB    │     │ ANDROID  │     │ DESKTOP  │
        │ Browser  │     │Capacitor │     │ Tauri 2  │
        └────┬─────┘     └────┬─────┘     └────┬─────┘
             │                │                │
             └────────────────┼────────────────┘
                              ▼
                       ┌──────────────┐
                       │   Supabase   │
                       │ Source Truth │
                       └──────────────┘
```

The existing web application is the foundation.

Android and Desktop are native shells around the same application architecture, with platform-specific functionality isolated behind clean abstractions.

**Do not stop after installing the packages. Execute the implementation, configure the projects, build them, test them, document them, and report any remaining manual steps.**
