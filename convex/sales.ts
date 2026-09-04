import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Server-authoritative atomic POS sale checkout mutation.
 * Replaces the PostgreSQL public.create_sale RPC.
 *
 * Guarantees:
 * 1. Offline idempotency via clientTxId: Duplicate replay returns existing sale.
 * 2. Atomic stock decrement: Fails and rolls back if stock is insufficient.
 * 3. Immutable stockMovements ledger generation.
 * 4. Dual canonical & legacy alias preservation.
 * 5. Cash drawer active till reconciliation.
 */
export const createSale = mutation({
  args: {
    branchId: v.string(),
    ownerId: v.optional(v.string()),
    clientTxId: v.string(),
    customerName: v.optional(v.string()),
    productId: v.optional(v.string()),
    quantity: v.optional(v.number()),
    amount: v.number(),
    paymentMethod: v.optional(v.string()),
    priceType: v.optional(v.string()),
    itemType: v.optional(v.string()),
    itemName: v.optional(v.string()),
    items: v.optional(v.any()), // array of line items if multi-item cart
  },
  handler: async (ctx, args) => {
    // 1. Idempotency Check: Prevent duplicate processing of replayed offline transactions
    const existingSale = await ctx.db
      .query("sales")
      .withIndex("by_client_tx_id", (q) => q.eq("clientTxId", args.clientTxId))
      .first();

    if (existingSale) {
      return {
        success: true,
        id: existingSale._id,
        amount: existingSale.amount,
        customerName: existingSale.customerName,
        clientTxId: args.clientTxId,
        idempotent: true,
      };
    }

    // 2. Resolve ownerId from branch if not directly provided
    let resolvedOwnerId = args.ownerId || "";
    if (!resolvedOwnerId) {
      let branch = null;
      try {
        branch = await ctx.db.get(args.branchId as any);
      } catch {
        // Not a convex ID, try legacyId
      }
      if (!branch) {
        branch = await ctx.db
          .query("branches")
          .filter((q) => q.eq(q.field("legacyId"), args.branchId))
          .first();
      }
      if (branch && (branch as any).ownerId) {
        resolvedOwnerId = (branch as any).ownerId;
      }
    }

    // 3. Process Cart Line Items & Atomic Stock Decrement
    let totalCostAmount = 0;
    const lineItems: any[] = Array.isArray(args.items) && args.items.length > 0
      ? args.items
      : args.productId
        ? [{
            product_id: args.productId,
            quantity: args.quantity || 1,
            item_type: args.itemType || "product",
            price: args.amount,
            name: args.itemName || "Item",
          }]
        : [];

    for (const item of lineItems) {
      const isProduct = (item.item_type || "product") !== "service";
      const productId = item.product_id || item.productId;
      const reqQty = Number(item.quantity || 1);

      if (isProduct && productId) {
        // Resolve inventory item
        let invDoc: any = null;
        try {
          invDoc = await ctx.db.get(productId);
        } catch {
          // not a valid convex ID, fall back to legacyId / sku match
        }
        if (!invDoc) {
          invDoc = await ctx.db
            .query("inventory")
            .withIndex("by_branch_id", (q) => q.eq("branchId", args.branchId))
            .filter((q) =>
              q.or(
                q.eq(q.field("legacyId"), productId),
                q.eq(q.field("sku"), productId)
              )
            )
            .first();
        }

        if (invDoc) {
          const currentQty = Number(invDoc.quantity || 0);
          if (currentQty < reqQty) {
            throw new Error(
              `Insufficient stock for '${invDoc.name}'. Available: ${currentQty}, Requested: ${reqQty}`
            );
          }

          const newQty = currentQty - reqQty;
          await ctx.db.patch(invDoc._id, {
            quantity: newQty,
            updatedAt: new Date().toISOString(),
          });

          // Insert immutable stockMovements ledger row
          await ctx.db.insert("stockMovements", {
            ownerId: resolvedOwnerId,
            branchId: args.branchId,
            inventoryId: invDoc._id,
            movementType: "sale",
            quantity: reqQty,
            previousQuantity: currentQty,
            newQuantity: newQty,
            referenceId: args.clientTxId,
            notes: `POS Sale checkout (${args.clientTxId})`,
            createdAt: new Date().toISOString(),
          });

          const itemCost = Number(invDoc.costPrice || 0) * reqQty;
          totalCostAmount += itemCost;
        }
      }
    }

    // 4. Financial profit calculation
    const totalAmount = Number(args.amount) || 0;
    const grossProfit = totalAmount - totalCostAmount;

    // 5. Insert Sale Record preserving canonical & legacy aliases
    const customerName = args.customerName || "Walk-in Customer";
    const paymentMethod = (args.paymentMethod || "cash").toLowerCase();
    const priceType = args.priceType || "retail";
    const itemType = args.itemType || "product";

    const saleId = await ctx.db.insert("sales", {
      branchId: args.branchId,
      ownerId: resolvedOwnerId,
      productId: args.productId || undefined,
      clientTxId: args.clientTxId,
      customer: customerName,
      customerName,
      items: lineItems,
      quantity: args.quantity || 1,
      amount: totalAmount,
      costAmount: totalCostAmount,
      grossProfit,
      profit: grossProfit,
      payment: paymentMethod,
      paymentMethod,
      priceType,
      itemType,
      itemName: args.itemName || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 6. Cash Drawer Till Reconciliation (if paid by cash)
    if (paymentMethod === "cash") {
      const openDrawer = await ctx.db
        .query("cashDrawer")
        .withIndex("by_branch_and_status", (q) =>
          q.eq("branchId", args.branchId).eq("status", "open")
        )
        .first();

      if (openDrawer) {
        const currentExpected = openDrawer.expectedBalance !== undefined
          ? openDrawer.expectedBalance
          : openDrawer.openingBalance;
        const newExpected = currentExpected + totalAmount;

        await ctx.db.patch(openDrawer._id, {
          expectedBalance: newExpected,
        });

        await ctx.db.insert("cashTransactions", {
          drawerId: openDrawer._id,
          branchId: args.branchId,
          ownerId: resolvedOwnerId,
          type: "cash_in",
          amount: totalAmount,
          reason: `Sale ${args.clientTxId}`,
          performedBy: "Cashier",
          createdAt: new Date().toISOString(),
        });
      }
    }

    return {
      success: true,
      id: saleId,
      amount: totalAmount,
      customerName,
      clientTxId: args.clientTxId,
    };
  },
});

/**
 * Fetch recent sales for a branch.
 */
export const getBranchSales = query({
  args: {
    branchId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db
      .query("sales")
      .withIndex("by_branch_id", (q) => q.eq("branchId", args.branchId))
      .order("desc")
      .take(limit);
  },
});
