import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Server-authoritative branch creation with plan limit enforcement.
 * Enforces max_branches quota from sys_pricing_plans.
 */
export const createBranch = mutation({
  args: {
    ownerId: v.string(),
    name: v.string(),
    branchCode: v.optional(v.string()),
    location: v.optional(v.string()),
    currency: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Fetch Owner Profile & Current Plan
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.ownerId))
      .first();

    const planCode = profile ? (profile.plan || "free_trial").toLowerCase() : "free_trial";

    // 2. Fetch Pricing Plan Quotas
    const plan = await ctx.db
      .query("pricingPlans")
      .withIndex("by_name", (q) => q.eq("name", planCode))
      .first();

    const maxBranches = plan ? plan.maxBranches : 2;

    // 3. Count existing active branches for owner
    const existingBranches = await ctx.db
      .query("branches")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", args.ownerId))
      .filter((q) => q.neq(q.field("status"), "inactive"))
      .collect();

    if (existingBranches.length >= maxBranches) {
      throw new Error(
        `Branch limit reached. Current plan allows a maximum of ${maxBranches} branches.`
      );
    }

    // 4. Generate branch code if not provided
    const branchCode = args.branchCode || `BR-${String(existingBranches.length + 1).padStart(3, "0")}`;
    const now = new Date().toISOString();

    // 5. Insert Branch
    const branchId = await ctx.db.insert("branches", {
      ownerId: args.ownerId,
      name: args.name,
      branchCode,
      location: args.location,
      currency: args.currency || (profile ? profile.currency : "TZS"),
      phone: args.phone,
      email: args.email,
      status: "active",
      lowStockNotifications: true,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      branchId,
      branchCode,
      name: args.name,
    };
  },
});

/**
 * Server-authoritative cascading branch deletion and archiving.
 * Replaces PostgreSQL public.delete_branch_cascade RPC.
 */
export const deleteBranchCascade = mutation({
  args: {
    branchId: v.string(),
  },
  handler: async (ctx, args) => {
    let branch: any = null;
    try {
      branch = await ctx.db.get(args.branchId as any);
    } catch {
      // not a convex ID
    }

    if (!branch) {
      branch = await ctx.db
        .query("branches")
        .filter((q) => q.eq(q.field("legacyId"), args.branchId))
        .first();
    }

    if (!branch) {
      throw new Error("Branch not found.");
    }

    const now = new Date().toISOString();

    // 1. Mark branch inactive
    await ctx.db.patch(branch._id, {
      status: "inactive",
      updatedAt: now,
    });

    // 2. Disassociate staff members
    const staffMembers = await ctx.db
      .query("staff")
      .withIndex("by_branch_id", (q) => q.eq("branchId", args.branchId))
      .collect();

    for (const member of staffMembers) {
      await ctx.db.patch(member._id, {
        status: "terminated",
        updatedAt: now,
      });
    }

    // 3. Log SaaS audit event
    await ctx.db.insert("saasAuditLogs", {
      ownerId: branch.ownerId,
      eventType: "branch_deleted",
      newPlan: "retention",
      metadata: {
        branchId: args.branchId,
        branchName: branch.name,
        staffAffected: staffMembers.length,
      },
      createdAt: now,
    });

    return {
      success: true,
      branchId: args.branchId,
      staffDisassociated: staffMembers.length,
    };
  },
});

/**
 * Query active branches for an owner.
 */
export const getOwnerBranches = query({
  args: {
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("branches")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", args.ownerId))
      .filter((q) => q.neq(q.field("status"), "inactive"))
      .collect();
  },
});
