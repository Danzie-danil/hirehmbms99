# Implementation Plan: Branch-Added Stock Items Registration & Branch Isolation (226)

## Problem Description
When stock items are added directly by a branch, the Owner needs visibility into these items in the Central Inventory management module. The Owner must have the authority to:
1. **Register the item to the Central Catalog** (optionally rolling out to all branches or keeping it in Central HQ).
2. **Isolate the item to that branch** so it remains exclusive to that branch and is excluded from the central catalog, central dispatch, and other branches.

## Architecture & Workflows

### 1. Database Schema & State
- **Columns on `public.inventory`:**
  - `is_isolated BOOLEAN DEFAULT false`: When true, the item is strictly restricted to its originating branch.
  - `isolation_status VARCHAR(30) DEFAULT 'unregistered'`: Lifecycle state (`unregistered`, `isolated`, `registered`).
  - Index on `(branch_id, is_isolated, central_item_id)`.
- **Dexie / IndexedDB Mirroring (`js/data/db.js`):**
  - Schema upgrade to version 12 including `is_isolated, isolation_status, central_item_id`.

### 2. Branch Addition Workflow
- When branch cashiers/managers add a stock item via branch modals (`js/modals.js`):
  - Saved with `central_item_id: null`, `is_isolated: false`, `isolation_status: 'unregistered'`.
  - Immediately sellable and accessible in the local branch POS.

### 3. Owner Review in Central Inventory (`js/owner/central_inventory.js`)
- Add a 3rd pill in the header switcher: **"Branch Items"** with a badge counter of pending items.
- In the "Branch Items" view:
  - Lists all items across branches where `central_item_id IS NULL` or `isolation_status IN ('unregistered', 'isolated')`.
  - Filter chips: `All`, `Pending Review`, `Branch Exclusive (Isolated)`.
  - Item cards display originating branch tag, item specs, stock quantity, cost, and retail price.
  - Two primary action buttons:
    - **`Register to Central`**: Prompts owner with modal to register in Central HQ catalog, with optional checkbox: *"Distribute product to all other branches (0 initial stock)?"*. Links originating branch item with `central_item_id = centralItem.id`.
    - **`Isolate to Branch`**: Marks `is_isolated = true`, `isolation_status = 'isolated'`.

### 4. Isolation Enforcement
- Central Dispatch Hub filters out isolated items so they cannot be dispatched from HQ.
- Branch-to-branch stock transfers prevent transferring isolated items to other branches.
- Branch POS continues selling the product without disruption.

## Proposed Files
- [NEW] `supabase/migrations/0001_branch_inventory_registration_and_isolation.sql`
- [NEW] `supabase/migrations/0001_single_run_branch_inventory_isolation.sql`
- [MODIFY] `js/data/db.js`
- [MODIFY] `js/db.js`
- [MODIFY] `js/owner/central_inventory.js`
- [MODIFY] `js/modals.js`
- [MODIFY] `js/branch/stock_transfers.js`

## Verification Plan
- Syntax audit with `node scripts/lint_check.cjs`.
- Production bundle verification with `npm run build`.
- Version bump to `v3.9.246`.
