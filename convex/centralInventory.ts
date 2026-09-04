import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Server-authoritative central inventory dispatch to branch.
 * Replaces PostgreSQL public.dispatch_central_stock RPC.
 *
 * Guarantees:
 * 1. Validates master enterprise stock availability.
 * 2. Decrements central inventory atomically.
 * 3. Upserts target branch inventory with master catalog metadata.
 * 4. Generates immutable transfer_in stockMovements audit record.
 */
export const dispatchCentralStock = mutation({
  args: {
    centralItemId: v.string(),
    branchId: v.string(),
    quantity: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const qty = Number(args.quantity);
    if (qty <= 0) {
      throw new Error("Dispatch quantity must be greater than 0.");
    }

    // 1. Locate master central inventory item
    let centralItem: any = null;
    try {
      centralItem = await ctx.db.get(args.centralItemId as any);
    } catch {
      // not a convex ID
    }

    if (!centralItem) {
      centralItem = await ctx.db
        .query("centralInventory")
        .filter((q) =>
          q.or(
            q.eq(q.field("legacyId"), args.centralItemId),
            q.eq(q.field("sku"), args.centralItemId)
          )
        )
        .first();
    }

    if (!centralItem) {
      throw new Error("Item not found in central enterprise inventory.");
    }

    const currentCentralQty = Number(centralItem.quantity || 0);
    if (currentCentralQty < qty) {
      throw new Error(
        `Insufficient central stock for '${centralItem.name}'. Available: ${currentCentralQty}, Requested: ${qty}`
      );
    }

    const now = new Date().toISOString();

    // 2. Decrement central master inventory
    const newCentralQty = currentCentralQty - qty;
    await ctx.db.patch(centralItem._id, {
      quantity: newCentralQty,
      updatedAt: now,
    });

    // 3. Find or provision target branch inventory
    let branchItem: any = await ctx.db
      .query("inventory")
      .withIndex("by_branch_id", (q) => q.eq("branchId", args.branchId))
      .filter((q) =>
        q.or(
          q.eq(q.field("centralItemId"), centralItem._id),
          q.eq(q.field("sku"), centralItem.sku),
          q.eq(q.field("name"), centralItem.name)
        )
      )
      .first();

    let branchItemId: any;
    let branchPrevQty = 0;
    let branchNewQty = qty;

    if (branchItem) {
      branchItemId = branchItem._id;
      branchPrevQty = Number(branchItem.quantity || 0);
      branchNewQty = branchPrevQty + qty;

      await ctx.db.patch(branchItem._id, {
        quantity: branchNewQty,
        updatedAt: now,
      });
    } else {
      branchItemId = await ctx.db.insert("inventory", {
        branchId: args.branchId,
        ownerId: centralItem.ownerId,
        centralItemId: centralItem._id,
        name: centralItem.name,
        sku: centralItem.sku,
        barcode: centralItem.barcode,
        category: centralItem.category || "General",
        price: centralItem.price,
        costPrice: centralItem.costPrice || 0,
        retailPrice: centralItem.retailPrice || centralItem.price,
        wholesalePrice: centralItem.wholesalePrice,
        minThreshold: centralItem.minThreshold || 5,
        isFromMainStore: true,
        isIsolated: false,
        isolationStatus: "registered",
        quantity: qty,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 4. Create immutable stock movement record on branch
    await ctx.db.insert("stockMovements", {
      ownerId: centralItem.ownerId,
      branchId: args.branchId,
      inventoryId: branchItemId,
      movementType: "transfer_in",
      quantity: qty,
      previousQuantity: branchPrevQty,
      newQuantity: branchNewQty,
      notes: args.notes || `Dispatched from master enterprise catalog`,
      createdAt: now,
    });

    return {
      success: true,
      itemName: centralItem.name,
      dispatchedQuantity: qty,
      remainingCentralStock: newCentralQty,
      targetBranchId: args.branchId,
    };
  },
});

/**
 * Register a new master product in the enterprise central repository.
 */
export const createCentralItem = mutation({
  args: {
    ownerId: v.string(),
    name: v.string(),
    sku: v.string(),
    barcode: v.optional(v.string()),
    category: v.string(),
    quantity: v.number(),
    minThreshold: v.optional(v.number()),
    costPrice: v.number(),
    price: v.number(),
    retailPrice: v.number(),
    wholesalePrice: v.optional(v.number()),
    itemType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const id = await ctx.db.insert("centralInventory", {
      ownerId: args.ownerId,
      name: args.name,
      sku: args.sku,
      barcode: args.barcode,
      category: args.category,
      quantity: args.quantity,
      minThreshold: args.minThreshold || 5,
      costPrice: args.costPrice,
      price: args.price,
      retailPrice: args.retailPrice,
      wholesalePrice: args.wholesalePrice,
      itemType: args.itemType || "product",
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, id };
  },
});

/**
 * Soft delete master central inventory items.
 */
export const deleteCentralItems = mutation({
  args: {
    itemIds: v.array(v.id("centralInventory")),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    let deletedCount = 0;

    for (const id of args.itemIds) {
      await ctx.db.patch(id, {
        deletedAt: now,
        updatedAt: now,
      });
      deletedCount++;
    }

    return { success: true, count: deletedCount };
  },
});

/**
 * Fetch all active central inventory items for an owner.
 */
export const getCentralInventory = query({
  args: {
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("centralInventory")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", args.ownerId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});
