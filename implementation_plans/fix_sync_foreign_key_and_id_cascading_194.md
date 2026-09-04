# Implementation Plan: Fix Sync Queue Foreign Key Constraint & Temporary ID Cascading (#194)

## Problem Overview
During offline CSV import or background synchronization, the console reported:
```
[SYNC] Failed op 38: insert or update on table "inventory" violates foreign key constraint "inventory_central_item_id_fkey" {code: '23503', details: 'Key is not present in table "central_inventory".'}
POST https://.../rest/v1/inventory 409 (Conflict)
```

### Root Cause Analysis:
1. **Un-cascaded Temporary UUIDs in Offline Sync Queue:**
   - When 50 items are uploaded via CSV while offline, temporary client UUIDs (`tempId`) are assigned to `central_inventory` and passed to `inventory` branch catalogue rows as `central_item_id`.
   - When the device comes back online, `create_central_item` runs and receives a server-generated UUID (`newItemId`).
   - The pending `CREATE_INVENTORY` operations in `localDb.sync_queue` still held the old `tempId`. When pushed to PostgreSQL, the database threw a foreign key violation (`23503`) because `tempId` does not exist on the cloud `central_inventory` table.
2. **409 Conflict Handling on Duplicate Items:**
   - If an item was already partially registered on a branch, inserting the same SKU triggered a 409 Conflict rather than gracefully updating the existing record.

---

## Proposed Changes:

### 1. Cascading Temporary ID Remapping in [`js/data/syncManager.js`](file:///d:/V2BmstzOfficial/js/data/syncManager.js):
- When `CREATE_CENTRAL_ITEM` completes and receives `newItemId`, automatically scan and remap all pending `CREATE_INVENTORY` queue operations and local Dexie rows referencing `tempId` to `newItemId`.

### 2. Auto-Resolving Foreign Key Fallback in `CREATE_INVENTORY`:
- Before inserting into `inventory`, check if `central_item_id` exists. If a foreign key error (`23503`) occurs, automatically resolve the server's `central_item_id` by matching the `sku` on `central_inventory` or omit the foreign key safely so the branch inventory row is never blocked or lost.

### 3. Graceful 409 Conflict Resolution:
- If a `409 Conflict` (duplicate key on SKU/branch) is returned, perform an `UPDATE` on the existing branch inventory record instead of throwing an error.
