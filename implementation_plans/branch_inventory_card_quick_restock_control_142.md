# Branch Inventory Card Quick Restock Control Implementation Plan (142)

## Problem & Feature Description
In the Branch Details view (`#owner` / `#branch`), each branch inventory product card shows the item's current stock, pricing, and cost valuation. The user requested adding an inline Quick Restock widget to each physical product card consisting of:
1. A decrement button (`-`)
2. A direct number input to specify exact restock quantity
3. An increment button (`+`)
4. An immediate restock trigger (`+ Add` / Restock button)

## Proposed Changes
1. **Branch Details Modal & Inventory Cards (`js/modals.js`):**
   - Add element IDs to executive KPI stats cards (`branchDetailsStatAssigned`, `branchDetailsStatValuation`, `branchDetailsStatLowStock`) and tab counts (`branchDetailsTabAll`, `branchDetailsTabLow`) for live reactivity.
   - In `renderBranchDetailsTable()`, append a tactile Quick Restock widget to each physical inventory product card (`!isSvc`).
   - Implement `window.adjustBranchItemQuickRestock(itemId, delta)` to dynamically adjust the input value with bounds check (`>= 1`).
   - Implement `window.applyBranchItemQuickRestock(itemId)` to:
     - Read specified quantity.
     - Call `dbInventory.updateQty(itemId, newQty)`.
     - Update local cache item quantity and branch data in memory.
     - Record optional stock movement ledger entry.
     - Reactively refresh the cards, stats counters, and tab counts.
     - Provide immediate toast feedback with updated quantity totals.

2. **Verification & Build:**
   - Verify build passes via `npm run build`.
   - Update `Chat_History/chat_history.txt`.
