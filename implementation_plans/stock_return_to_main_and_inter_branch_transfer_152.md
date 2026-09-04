# Stock Return to Main Store & Inter-Branch Transfer Plan

## Overview
Currently, Business Owners can only dispatch stock outward from the Central Warehouse / Main Store to branch locations. When a branch has excess inventory, slow-moving items, or when stock needs to be reallocated to meet higher demand at another branch, owners lack a direct mechanism to:
1. **Deduct & Return Stock to Main Store (Warehouse Recall)**: Deduct a preferred quantity from a branch and credit it back to Central Inventory `main_store_stock`.
2. **Reassign / Inter-Branch Transfer**: Deduct a preferred quantity from Branch A and immediately credit it to Branch B without having to route it back through the Main Store.
3. **Audited Stock Adjustments & Logging**: Automatically create traceable entries in `stock_movements` for every return and inter-branch transfer with timestamps, quantities, and audit notes.

This plan details the full end-to-end architecture, database-level atomic transactions (PostgreSQL RPCs), client-side database abstractions, and intuitive UI workflows in both **Central Inventory** and **Branch Management**.

---

## User Review Required

> [!IMPORTANT]
> **Transactional Safety & Concurrency Locking**:
> All stock return and transfer operations will be executed via Postgres `SECURITY DEFINER` RPCs with row-level locks (`FOR UPDATE`) on both central inventory and branch inventory tables. This prevents race conditions, overselling, and negative stock quantities under concurrent usage.

> [!NOTE]
> **Owner-Authoritative Execution**:
> While branch managers can only submit pending transfer requests, Business Owners will have full direct execution power — returning or transferring stock immediately without requiring multi-step branch approvals.

---

## Proposed Changes

### 1. Database Layer (Supabase / PostgreSQL)

#### [NEW] [0018_stock_return_and_inter_branch_transfer.sql](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/supabase/sql_migrations/0018_stock_return_and_inter_branch_transfer.sql)
#### [NEW] [0018_single_run_stock_return_and_inter_branch_transfer.sql](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/supabase/sql_migrations/0018_single_run_stock_return_and_inter_branch_transfer.sql)

We will create two new server-authoritative RPC functions:

1. **`return_stock_to_main_store(p_branch_id uuid, p_central_item_id uuid, p_qty integer, p_notes text)`**:
   - Validates caller authentication (`auth.uid() = owner_id` or authorized role).
   - Locks target branch inventory row and central inventory row (`FOR UPDATE`).
   - Validates that branch inventory exists and has sufficient quantity (`quantity >= p_qty`).
   - Decrements branch inventory `quantity = quantity - p_qty`.
   - Increments central inventory `main_store_stock = main_store_stock + p_qty`.
   - Inserts audit ledger entry in `public.stock_movements` with `movement_type = 'return_to_main'`.
   - Records security audit event `STOCK_RETURNED_TO_MAIN`.

2. **`transfer_branch_to_branch_stock(p_from_branch_id uuid, p_to_branch_id uuid, p_central_item_id uuid, p_qty integer, p_notes text)`**:
   - Validates that `p_from_branch_id` and `p_to_branch_id` belong to the same owner.
   - Locks source branch inventory row, central item row, and destination branch inventory row.
   - Validates that source branch has `quantity >= p_qty`.
   - Decrements source branch inventory `quantity = quantity - p_qty`.
   - Increments (or inserts if new) destination branch inventory `quantity = quantity + p_qty` with inherited product metadata (prices, SKU, category).
   - Inserts audit ledger entries in `public.stock_movements` with `movement_type = 'transfer'`.
   - Inserts completed transfer record in `public.stock_transfers` with status `'completed'`.
   - Records security audit event `BRANCH_STOCK_TRANSFERRED`.

---

### 2. Client Database & API Layer

#### [MODIFY] [js/db.js](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/db.js)
- Extend `dbCentralInventory` with:
  - `returnStockToMain(branchId, centralItemId, qty, notes)`: Invokes RPC `return_stock_to_main_store` and broadcasts data mutations (`central_inventory`, `inventory`, `stock_movements`).
  - `transferBranchStock(fromBranchId, toBranchId, centralItemId, qty, notes)`: Invokes RPC `transfer_branch_to_branch_stock` and broadcasts data mutations (`inventory`, `stock_movements`, `stock_transfers`).

---

### 3. User Interface & Modals

#### [MODIFY] [js/owner/central_inventory.js](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/owner/central_inventory.js)
1. **Unified Stock Movement Modal (`openStockOperationsModal`)**:
   - Upgrade the current single-purpose `openDispatchModal` to a comprehensive 3-tab Modal:
     - **Tab 1: 🚚 Dispatch to Branch (Main → Branch)** (Existing flow preserved).
     - **Tab 2: 📥 Return to Main Store (Branch → Main)**: Select source branch, view current branch stock, enter quantity to recall, enter reason/notes.
     - **Tab 3: 🔄 Inter-Branch Transfer (Branch → Branch)**: Select source branch, select destination branch, enter transfer quantity and notes.
2. **Central Dispatch / Logistics Hub Enhancements**:
   - Add segmented operational mode switch: `Dispatch (Outward)`, `Recall (Inward)`, `Inter-Branch Transfer`.

#### [MODIFY] [js/modals.js](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/modals.js)
1. **Branch Details Modal (`branchDetails`)**:
   - On each branch item card/row in `renderBranchDetailsTable`, add direct action buttons / quick menu:
     - **"Return to Main" button**: Opens quick recall modal with source branch pre-selected and maximum stock capped at current branch quantity.
     - **"Transfer to Branch" button**: Opens inter-branch transfer modal with source branch and item pre-filled.
   - Dynamic real-time recalculation of branch assigned stock, stock valuation, and low stock counters upon return or transfer.

---

### 4. Stock Movements Ledger & Reconciliation

#### [MODIFY] [js/owner/stock_movements.js](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/owner/stock_movements.js)
1. **Type Badges & Filters**:
   - Add `return_to_main` (`Return to Main / Recall` badge with cyan/blue accent).
   - Enhance `transfer` badge to display route (`Branch A → Branch B`).
2. **Reconciliation Formula Alignment**:
   - Update Stock Flow reconciliation calculations:
     $$\text{Net Distributed} = \text{Dispatches} - \text{Returns to Main}$$
     $$\text{Expected Reconciliation} = \text{Net Distributed} = \text{Branch Sales} + \text{Current Branch Stock}$$

---

### 5. Internationalization & Localization

#### [MODIFY] [js/i18n.js](file:///d:/v2%20BMS%20OFFICIAL%20-%20Copy%20%282%29/js/i18n.js)
- Add English and Swahili translations for:
  - `return_to_main_store` ("Return to Main Store" / "Rudisha Ghala Kuu")
  - `inter_branch_transfer` ("Inter-Branch Transfer" / "Hamisha Tawi hadi Tawi")
  - `source_branch` ("Source Branch" / "Tawi la Kutolea")
  - `destination_branch` ("Destination Branch" / "Tawi Lengwa")
  - `qty_to_return` ("Quantity to Return" / "Idadi ya Kurudisha")
  - `qty_to_transfer` ("Quantity to Transfer" / "Idadi ya Kuhamisha")
  - `return_success` ("Stock returned to Main Store successfully!" / "Mzigo umerudishwa ghala kuu kikamilifu!")
  - `transfer_success` ("Stock transferred to branch successfully!" / "Mzigo umehamishiwa tawi kikamilifu!")

---

## Verification Plan

### Automated Verification
1. **Syntax & Lint Check**: Run `npm run build` to verify clean Vite compilation with 0 lint/bundling errors.
2. **Type/Schema Alignment**: Ensure all SQL parameters match JavaScript invocation contracts.

### Manual Verification
1. **Dispatch Flow**: Dispatch 20 units of Item A from Main Store to Branch 1. Verify Main Store stock decreases by 20 and Branch 1 stock increases by 20.
2. **Return to Main Flow**: Return 8 units of Item A from Branch 1 to Main Store. Verify Branch 1 stock decreases to 12 and Main Store stock increases by 8.
3. **Inter-Branch Transfer Flow**: Transfer 5 units of Item A from Branch 1 to Branch 2. Verify Branch 1 stock decreases to 7 and Branch 2 receives 5 units.
4. **Validation Bounds**: Try returning or transferring more units than currently exist at a branch (e.g. attempt to transfer 50 when only 7 remain); verify that the RPC throws an explicit error and blocks the transaction.
5. **Ledger & Reconciliation Check**: Open Stock Movements view; verify all entries (`dispatch`, `return_to_main`, `transfer`) appear in the audit trail and reconciliation numbers remain 100% balanced.
