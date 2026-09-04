# Phase 3: Convex RPC & Transactional Engine Replacement

This implementation plan defines the replacement of critical PostgreSQL stored procedures and server-authoritative RPCs with atomic, typed Convex mutations.

## 1. Objectives & Scope
- **Convex Target:** `https://lovely-rhinoceros-87.convex.cloud` (Project: `lovely-rhinoceros-87`)
- **Key Invariant:** Convex mutations are natively serializable, atomic ACID transactions. Every mutation executes completely or rolls back entirely upon any error.
- **Supabase Guarantee:** Zero modification or writes to production Supabase database.

---

## 2. Server Mutations Architecture

### A. Core POS Checkout Engine (`convex/sales.ts`)
- **`createSale` mutation**:
  1. **Idempotency Guard:** Queries `sales` index `by_client_tx_id` using `clientTxId`. If already recorded, returns the existing sale record immediately without re-executing.
  2. **Authorization:** Verifies user has access to `branchId` via tenant context.
  3. **Stock Decrement & Validation:**
     - For single-item or multi-item cart sales: fetches `inventory` record for each item.
     - If item is a product (non-service): checks `quantity >= requestedQty`. If insufficient, throws typed error.
     - Atomically decrements `quantity`.
     - Appends an immutable row to `stockMovements` (`movementType: 'sale'`).
  4. **Profit & Financial Computation:**
     - Resolves cost price vs. sell price (retail/wholesale/custom).
     - Computes gross profit (`amount - costAmount`).
  5. **Sale Insertion:**
     - Inserts into `sales` table preserving both canonical fields and legacy aliases (`customer`/`customerName`, `payment`/`paymentMethod`, `profit`/`grossProfit`).
  6. **Cash Drawer Integration:**
     - If payment method is cash: locates open `cashDrawer` for the branch.
     - Increments expected balance with cash sale amount and logs to `cashTransactions`.
  7. **Return:** Returns `{ success: true, id, amount, customerName, clientTxId }`.

---

### B. Multi-Branch Stock Transfers & Store Returns (`convex/inventory.ts`)
- **`transferBranchToBranchStock` mutation**:
  1. Validates `fromBranchId != toBranchId` and `quantity > 0`.
  2. Authorizes user has permission on `fromBranchId`.
  3. Checks source `inventory` has sufficient stock.
  4. Atomically decrements source branch inventory.
  5. Finds or creates corresponding inventory in `toBranchId` and increments stock.
  6. Writes two immutable `stockMovements`:
     - `transfer_out` on `fromBranchId`.
     - `transfer_in` on `toBranchId`.
  7. Records completed transfer in `stockTransfers`.
- **`returnStockToMainStore` mutation**:
  1. Decrements branch inventory atomically.
  2. Increments master enterprise `centralInventory`.
  3. Writes immutable `stockMovements` (`movementType: 'return'`).
- **`createBranchItem` mutation**:
  1. Creates a branch-specific inventory item with isolation flag (`isIsolated: true`, `isolationStatus: 'approved'`).

---

### C. Master Central Inventory Management (`convex/centralInventory.ts`)
- **`dispatchCentralStock` mutation**:
  1. Verifies enterprise owner permission.
  2. Decrements master stock in `centralInventory`.
  3. Finds or provisions inventory item in target `branches`.
  4. Increments branch stock and logs `stockMovements` (`movementType: 'transfer_in'`).
- **`createCentralItem` mutation**:
  1. Creates central catalog item with SKU, barcode, cost price, and retail/wholesale prices.
- **`deleteCentralItems` mutation**:
  1. Soft-deletes (`deletedAt = now()`) catalog items.

---

### D. Branch & Plan Lifecycle Controls (`convex/branches.ts`)
- **`createBranch` mutation**:
  1. Inspects tenant `profiles` subscription plan (`free_trial`, `pro`, `enterprise`).
  2. Queries `pricingPlans` to enforce `maxBranches` limit.
  3. Rejects creation if limit is reached.
  4. Generates unique `branchCode` and provisions branch document.
- **`deleteBranchCascade` mutation**:
  1. Verifies SysAdmin or Business Owner authorization.
  2. Cascades deletion / marks branch inactive, unlinks staff assignments, and records SaaS audit log.

---

## 3. Verification & Deployment Plan
1. Deploy new mutations to Convex dev cloud: `npx convex dev --once`.
2. Run test suite against Convex mutations using `convex/browser` client:
   - Test sale idempotency: Re-submitting same `clientTxId` produces identical ID and doesn't double-decrement stock.
   - Test atomic stock rollback: If stock is insufficient, transaction throws and 0 movements are created.
   - Test inter-branch transfer: Both branches and both movements are updated atomically.
3. Validate code quality:
   - `node scripts/lint_check.cjs` (0 issues).
   - `npm run build` (successful compilation).
4. Update `Chat_History/chat_history.txt`.
