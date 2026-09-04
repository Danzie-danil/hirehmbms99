# Implementation Plan - Full JSON Backup Export & Import with Supabase Sync

## Problem & Feature Description
Add a complete, robust **JSON Backup Export & Import** system to BMSTZ.
- **Button Placement:** The last item in the main side navigation.
- **User Flow:** Clicking opens a modal giving the user the choice between:
  1. **Export Full Backup (JSON):** Downloads a comprehensive, timestamped JSON snapshot of all business data.
  2. **Import & Sync Backup (JSON):** Uploads a JSON backup, validates tenant integrity, prevents duplicate entries using authoritative UUIDs, imports new/missing items, and syncs them directly with Supabase and local IndexedDB.

---

## Technical Architecture & Design

### 1. Data Schema & Export Payload Specification
The exported JSON structure will contain:
```json
{
  "_bms_backup_meta": {
    "version": "1.0",
    "app_version": "v3.9.174",
    "exported_at": "2026-08-30T22:00:00.000Z",
    "owner_id": "<UUID>",
    "business_name": "<Enterprise Name>",
    "checksum": "<Hash / Verification Tag>"
  },
  "data": {
    "branches": [...],
    "categories": [...],
    "central_inventory": [...],
    "inventory": [...],
    "sales": [...],
    "expenses": [...],
    "customers": [...],
    "staff": [...],
    "suppliers": [...],
    "purchase_orders": [...],
    "quotations": [...],
    "documents": [...],
    "capital_accounts": [...],
    "business_assets": [...],
    "business_loans": [...],
    "payroll": [...],
    "tasks": [...],
    "notes": [...],
    "goals": [...],
    "promotions": [...],
    "shifts": [...]
  }
}
```
* **Consistent Identifiers:** Every row preserves its canonical UUID `id`, `owner_id`, `branch_id`, and `created_at` timestamp.

---

### 2. Zero-Duplicate Import & Sync Logic
1. **Integrity & Tenant Validation:** Verify JSON syntax, backup metadata, and match the target owner ID.
2. **Authoritative Idempotency Check:**
   - Query existing IDs from Supabase and local Dexie IndexedDB for each table.
   - Compute delta:
     - `Existing Records`: Skipped to prevent duplicates.
     - `New / Missing Records`: Batched and inserted into Supabase with their original `id` via bulk upsert (`onConflict: 'id'`) and mirrored into local IndexedDB (`localDb`).
3. **Live Progress Feedback:** Real-time modal progress meter displaying the status for each table:
   * e.g., *"Products: 25 new imported, 50 existing skipped."*

---

## Proposed File Changes

### 1. UI & Navigation Layer
- **`app/index.html` & `refference/app/index.html`**:
  - Add "Backup & Sync" button as the last button of the main navigation in `#ownerNav` and `#branchNav`.
  - Add data-i18n translation keys.
- **`js/i18n.js`**:
  - Add translations for English & Swahili: `nav_backup_sync`, `export_backup`, `import_backup`, `backup_modal_title`, etc.

### 2. Backup & Sync Engine
- **`js/owner/backup_engine.js` (NEW MODULE)**:
  - `window.openBackupModal()`: Displays responsive modal with Export and Import tabs/cards.
  - `window.exportFullJSONBackup()`: Iterates all stores, serializes to JSON, triggers browser download `BMSTZ_Backup_[Business]_[Date].json`.
  - `window.importFullJSONBackup(file)`: File reader, validator, zero-duplicate batch sync engine, and progress UI.

### 3. Modals & Global Integration
- **`js/modals.js` / `js/app.js`**:
  - Register `window.openBackupModal` and ensure responsive backdrop blur and accessibility.

---

## Verification Plan
1. **Export Testing:** Export full JSON backup and verify structure, metadata, and tables.
2. **Import & Idempotency Testing:**
   - Re-importing the same backup produces 0 new duplicates and skips 100% of existing items.
   - Adding a new record to JSON and importing successfully inserts the new record into Supabase and Dexie.
3. **Syntax & Production Build:**
   - Run `node scripts/lint_check.cjs` (0 errors).
   - Compile bundle via `npm run build` (0 errors).
4. **App Version & Documentation:**
   - Bump version in `release_notes.json`, `public/release_notes.json`, `js/updateChecker.js`.
   - Update `Chat_History/chat_history.txt`.
