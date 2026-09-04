# Implementation Plan: Dropselect Categories & Pre-existing User Category Mapping (174)

## Overview
Implement an authoritative, reusable Category Dropselect system across the BMS platform for physical products and service offerings. When users create items or services with a new category, that category is automatically persisted to their account for future reuse. Users can also select existing categories with fuzzy search or create a new category directly in-place from the dropdown. Additionally, all pre-existing categories currently in `central_inventory` and `inventory` will be mapped and migrated cleanly per owner account.

---

## 1. Database Schema & Migration (`0001_create_categories_table_and_backfill.sql`)
1. **Create Table `public.categories`**:
   - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
   - `owner_id uuid NOT NULL` (references owner profile / auth user)
   - `name text NOT NULL`
   - `type text NOT NULL DEFAULT 'all'` (`'product'`, `'service'`, or `'all'`)
   - `created_at timestamptz DEFAULT now()`
   - `updated_at timestamptz DEFAULT now()`
   - Constraint: `UNIQUE(owner_id, LOWER(TRIM(name)), type)`
2. **Row-Level Security (RLS)**:
   - Owners can `SELECT`, `INSERT`, `UPDATE`, `DELETE` their own categories (`owner_id = auth.uid()`).
   - Branch managers can `SELECT` categories belonging to their owner (`owner_id = (SELECT owner_id FROM branches WHERE id = ...)`).
3. **Data Backfill Migration**:
   - Distinctly extract and populate existing categories per owner from `central_inventory` (products & services) and `inventory`.

---

## 2. Offline-First & Dexie Local Database Mirroring
1. **Dexie Local Schema (`js/data/db.js`)**:
   - Add `categories: 'id, owner_id, name, type, created_at, updated_at'` to Dexie table schema stores (version 5).
2. **Repository Abstraction (`js/db.js` & `js/data/repositories/categoriesRepository.js`)**:
   - `dbCategories.fetchAll(ownerId, type)`: Fetch categories with local Dexie caching and offline fallback.
   - `dbCategories.add(ownerId, categoryData)`: Persist new category locally and sync to Supabase.
   - `dbCategories.ensureCategory(ownerId, name, type)`: Auto-ensure category exists without throwing duplicates.

---

## 3. Reusable Category Dropselect UI Component
1. **Dropdown / Combobox Component (`js/ui/categorySelect.js` or `js/utils.js`)**:
   - Searchable select containing existing user categories with tag/folder icon.
   - Inline **`+ Add New Category`** / Create `"..."` button when a user types a name not currently in their list.
   - Auto-syncs with input draft preservation and real-time state.
2. **Form Integrations**:
   - **Central Inventory & Services Modal** (`js/owner/central_inventory.js`):
     - Replace raw `<input id="ciCategory">` with the Category Dropselect.
     - Auto-filters categories by `item_type` (`service` vs `product`).
   - **Edit Item Modals & Branch Inventory Forms** (`js/modals.js`, `js/branch/inventory.js`).

---

## 4. Verification Plan
1. Run `npm run build` to ensure 0 bundling/lint errors.
2. Verify category creation in "Register New Service / Offering" and "Add Stock Item".
3. Verify newly created category appears immediately in the dropselect list for subsequent items.
4. Verify pre-existing categories are populated for existing items.
