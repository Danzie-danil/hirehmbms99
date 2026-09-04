# Offline-First Operations & Native Routing Plan

This plan outlines the architecture for making the Desktop and Android apps fully functional offline while enforcing strict multi-tenant data security, and fixing the initial launch routing.

## Proposed Changes

### 1. App Launch Routing (Bypass Landing Page)
Currently, Native apps launch into `dist/index.html` (the marketing landing page) because they serve the root folder.
- **Tauri (Desktop):** Modify `tauri.conf.json` -> `app.windows[0].url` to explicitly point to `/app/index.html`.
- **Capacitor (Android):** Modify `capacitor.config.json` to set the `bundledWebRuntime` or explicitly route the `webDir` to serve the `app` folder, OR modify `index.html` to instantly redirect to `/app/index.html` if it detects it is running natively (using `isNative` check).
- **Navigation Lock:** Remove or hide all "Back to Home / Landing Page" buttons within the `/app/` dashboard when running natively.

### 2. Universal Native Offline Mutation Queue
The current `js/offline_queue.js` relies on volatile `localStorage` (`bms_offline_sales_queue`, `bms_offline_ops_queue`). We will replace this with a robust, native-backed queue.
- **Queue Structure:**
  ```json
  {
    "mutation_id": "uuid",
    "operation": "INSERT | UPDATE | DELETE",
    "table": "sales",
    "payload": { ... },
    "auth": { "user_id": "req...", "role": "branch" },
    "timestamp": 123456789
  }
  ```
- **Storage Strategy:** Mutations will be written to `Dexie` (for quick memory access) AND immediately persisted to the hard drive via the `nativeStorage.js` adapter you just implemented.

### 3. Multi-Tenant Data Security (Role/User ID Tagging)
To prevent cross-contamination if two different users log into the same device offline:
- **Local DB Schema Update:** Every Dexie table (sales, expenses, customers, etc.) will be appended with an `auth_user_id` and `auth_role_id` index.
- **Data Guard:** All local read queries (e.g., loading the dashboard offline) will automatically append `.where('auth_user_id').equals(currentUser.id)`. 
- **Auto-Scrub:** When a user explicitly logs out, their secure local cache remains encrypted on disk, OR is wiped entirely depending on the security preference.

### 4. Making All Modules Fully Offline-Capable
Currently, some modules might block user action if `navigator.onLine` is false.
- **Optimistic UI:** We will refactor the save buttons across all Owner (Add Stock, Add Loan, Customers) and Branch (Add Sale, Add Expense) modules. 
- When offline, clicking "Save" will:
  1. Generate a temporary UUID for the record.
  2. Write it directly to the local Dexie state (UI updates instantly).
  3. Push the `INSERT/UPDATE` command to the Native Offline Queue.
- **Sync Visuals:** Records that are in the queue will show a subtle ⏳ (Pending Sync) icon next to them until the internet returns.

### 5. Background Sync Engine
- **Event Hooks:** The app will listen to `window.addEventListener('online')` and the Capacitor Network Plugin.
- **Sequential Flush:** Upon reconnection, the queue will process chronologically, sending payloads to Supabase. Upon success, the record is marked as synced, and the ⏳ icon is removed.

## Verification Plan
1. **Routing:** Build Desktop & Android; ensure both launch directly into the Login/Dashboard screen.
2. **Offline Mode:** Turn off PC/Phone Wi-Fi. Add a new Customer and a new Sale. Verify they appear in the UI immediately.
3. **Multi-Tenant:** Log out, log in as a different branch offline (if cached). Verify the previous branch's offline sales are hidden.
4. **Syncing:** Turn Wi-Fi back on. Verify the pending records successfully arrive in the Supabase backend.
