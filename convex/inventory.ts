import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Server-authoritative atomic branch-to-branch stock transfer mutation.
 * Replaces PostgreSQL public.transfer_branch_to_branch_stock RPC.
 *
 * Guarantees:
 * 1. Serializable atomic execution: source and destination updated in single transaction.
 * 2. Source quantity validation and decrement.
 * 3. Destination item discovery or automatic provisioning.
 * 4. Dual immutable stockMovements ledger generation (transfer_out & transfer_in).
 * 5. Completed stockTransfers record persistence.
 */
export const transferBranchToBranchStock = mutation({
  args: {
    fromBranchId: v.string(),
    toBranchId: v.string(),
    centralItemId: v.optional(v.string()),
    inventoryId: v.optional(v.string()),
    quantity: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const qty = Number(args.quantity);
    if (qty <= 0) {
      throw new Error("Transfer quantity must be greater than 0.");
    }
    if (args.fromBranchId === args.toBranchId) {
      throw new Error("Source and destination branches cannot be the same.");
    }

    // 1. Locate source inventory item
    let sourceItem: any = null;
    if (args.inventoryId) {
      try {
        sourceItem = await ctx.db.get(args.inventoryId as any);
      } catch {
        // fall back
      }
    }

    if (!sourceItem) {
      sourceItem = await ctx.db
        .query("inventory")
        .withIndex("by_branch_id", (q) => q.eq("branchId", args.fromBranchId))
        .filter((q) =>
          q.or(
            q.eq(q.field("centralItemId"), args.centralItemId || ""),
            q.eq(q.field("legacyId"), args.inventoryId || args.centralItemId || "")
          )
        )
        .first();
    }

    if (!sourceItem) {
      throw new Error("Item not found in source branch inventory.");
    }

    const sourceQty = Number(sourceItem.quantity || 0);
    if (sourceQty < qty) {
      throw new Error(
        `Insufficient stock in source branch. Available: ${sourceQty}, Requested: ${qty}`
      );
    }

    const now = new Date().toISOString();

    // 2. Decrement source inventory
    const newSourceQty = sourceQty - qty;
    await ctx.db.patch(sourceItem._id, {
      quantity: newSourceQty,
      updatedAt: now,
    });

    // 3. Locate or create destination inventory item
    let targetItem: any = await ctx.db
      .query("inventory")
      .withIndex("by_branch_id", (q) => q.eq("branchId", args.toBranchId))
      .filter((q) =>
        q.or(
          q.eq(q.field("centralItemId"), sourceItem.centralItemId || ""),
          q.eq(q.field("sku"), sourceItem.sku),
          q.eq(q.field("name"), sourceItem.name)
        )
      )
      .first();

    let targetItemId: any;
    let targetPreviousQty = 0;
    let targetNewQty = qty;

    if (targetItem) {
      targetItemId = targetItem._id;
      targetPreviousQty = Number(targetItem.quantity || 0);
      targetNewQty = targetPreviousQty + qty;

      await ctx.db.patch(targetItem._id, {
        quantity: targetNewQty,
        updatedAt: now,
      });
    } else {
      // Provision item in target branch
      targetItemId = await ctx.db.insert("inventory", {
        branchId: args.toBranchId,
        ownerId: sourceItem.ownerId,
        centralItemId: sourceItem.centralItemId || undefined,
        name: sourceItem.name,
        sku: sourceItem.sku,
        barcode: sourceItem.barcode,
        category: sourceItem.category || "General",
        price: sourceItem.price,
        costPrice: sourceItem.costPrice || 0,
        retailPrice: sourceItem.retailPrice || sourceItem.price,
        wholesalePrice: sourceItem.wholesalePrice,
        minThreshold: sourceItem.minThreshold || 5,
        isFromMainStore: sourceItem.isFromMainStore ?? true,
        isIsolated: false,
        isolationStatus: "registered",
        quantity: qty,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 4. Create immutable stock movement: transfer_out on source branch
    await ctx.db.insert("stockMovements", {
      ownerId: sourceItem.ownerId,
      branchId: args.fromBranchId,
      inventoryId: sourceItem._id,
      movementType: "transfer_out",
      quantity: qty,
      previousQuantity: sourceQty,
      newQuantity: newSourceQty,
      notes: args.notes || `Transferred to branch ${args.toBranchId}`,
      createdAt: now,
    });

    // 5. Create immutable stock movement: transfer_in on target branch
    await ctx.db.insert("stockMovements", {
      ownerId: sourceItem.ownerId,
      branchId: args.toBranchId,
      inventoryId: targetItemId,
      movementType: "transfer_in",
      quantity: qty,
      previousQuantity: targetPreviousQty,
      newQuantity: targetNewQty,
      notes: args.notes || `Transferred from branch ${args.fromBranchId}`,
      createdAt: now,
    });

    // 6. Record completed transfer in stockTransfers ledger
    const transferId = await ctx.db.insert("stockTransfers", {
      ownerId: sourceItem.ownerId,
      fromBranchId: args.fromBranchId,
      toBranchId: args.toBranchId,
      itemName: sourceItem.name,
      quantity: qty,
      status: "received",
      notes: args.notes || undefined,
      requestedAt: now,
      resolvedAt: now,
      createdAt: now,
    });

    return {
      success: true,
      transferId,
      itemName: sourceItem.name,
      transferredQuantity: qty,
      fromBranchId: args.fromBranchId,
      toBranchId: args.toBranchId,
    };
  },
});

/**
 * Return stock from branch back to central master store.
 * Replaces PostgreSQL public.return_stock_to_main_store RPC.
 */
export const returnStockToMainStore = mutation({
  args: {
    branchId: v.string(),
    centralItemId: v.optional(v.string()),
    inventoryId: v.optional(v.string()),
    quantity: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const qty = Number(args.quantity);
    if (qty <= 0) {
      throw new Error("Return quantity must be greater than 0.");
    }

    // Locate branch item
    let branchItem: any = null;
    if (args.inventoryId) {
      try {
        branchItem = await ctx.db.get(args.inventoryId as any);
      } catch {
        // fall back
      }
    }

    if (!branchItem) {
      branchItem = await ctx.db
        .query("inventory")
        .withIndex("by_branch_id", (q) => q.eq("branchId", args.branchId))
        .filter((q) =>
          q.or(
            q.eq(q.field("centralItemId"), args.centralItemId || ""),
            q.eq(q.field("legacyId"), args.inventoryId || "")
          )
        )
        .first();
    }

    if (!branchItem) {
      throw new Error("Item not found in branch inventory.");
    }

    const currentBranchQty = Number(branchItem.quantity || 0);
    if (currentBranchQty < qty) {
      throw new Error(
        `Insufficient branch stock to return. Available: ${currentBranchQty}, Requested: ${qty}`
      );
    }

    const now = new Date().toISOString();

    // 1. Decrement branch inventory
    const newBranchQty = currentBranchQty - qty;
    await ctx.db.patch(branchItem._id, {
      quantity: newBranchQty,
      updatedAt: now,
    });

    // 2. Increment master central inventory
    let centralItem = await ctx.db
      .query("centralInventory")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", branchItem.ownerId))
      .filter((q) =>
        q.or(
          q.eq(q.field("_id"), branchItem.centralItemId as any),
          q.eq(q.field("sku"), branchItem.sku),
          q.eq(q.field("name"), branchItem.name)
        )
      )
      .first();

    if (centralItem) {
      await ctx.db.patch(centralItem._id, {
        quantity: Number(centralItem.quantity || 0) + qty,
        updatedAt: now,
      });
    }

    // 3. Write immutable stock movement
    await ctx.db.insert("stockMovements", {
      ownerId: branchItem.ownerId,
      branchId: args.branchId,
      inventoryId: branchItem._id,
      movementType: "return",
      quantity: qty,
      previousQuantity: currentBranchQty,
      newQuantity: newBranchQty,
      notes: args.notes || "Returned to main central store",
      createdAt: now,
    });

    return {
      success: true,
      returnedQuantity: qty,
      itemName: branchItem.name,
    };
  },
});

/**
 * Register a branch-specific product with isolation controls.
 */
export const createBranchItem = mutation({
  args: {
    branchId: v.string(),
    ownerId: v.string(),
    name: v.string(),
    sku: v.string(),
    barcode: v.optional(v.string()),
    category: v.string(),
    quantity: v.number(),
    minThreshold: v.optional(v.number()),
    costPrice: v.number(),
    price: v.number(),
    retailPrice: v.optional(v.number()),
    wholesalePrice: v.optional(v.number()),
    isIsolated: v.optional(v.boolean()),
    isolationStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const id = await ctx.db.insert("inventory", {
      branchId: args.branchId,
      ownerId: args.ownerId,
      name: args.name,
      sku: args.sku,
      barcode: args.barcode,
      category: args.category,
      quantity: args.quantity,
      minThreshold: args.minThreshold || 5,
      costPrice: args.costPrice,
      price: args.price,
      retailPrice: args.retailPrice || args.price,
      wholesalePrice: args.wholesalePrice,
      isFromMainStore: false,
      isIsolated: args.isIsolated ?? false,
      isolationStatus: args.isolationStatus || "registered",
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, id };
  },
});

/**
 * Query inventory items for a given branch.
 */
export const getBranchInventory = query({
  args: {
    branchId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("inventory")
      .withIndex("by_branch_id", (q) => q.eq("branchId", args.branchId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});
