import { QueryCtx, MutationCtx } from "../_generated/server";
import { requireAuthenticated, AuthenticatedUser } from "./identity";
import { isSysAdmin } from "./sysAdmin";

/**
 * Ensures caller is the owner of the specified tenant, or a SysAdmin.
 */
export async function requireOwnerOrSysAdmin(
  ctx: QueryCtx | MutationCtx,
  targetOwnerId: string
): Promise<AuthenticatedUser> {
  const user = await requireAuthenticated(ctx);

  if (await isSysAdmin(ctx)) {
    return user;
  }

  if (user.role === "owner" && user.ownerId === targetOwnerId) {
    return user;
  }

  throw new Error("FORBIDDEN: Access denied for this business tenant");
}

/**
 * Ensures caller has verified access to the specified branch, is the owning business, or a SysAdmin.
 */
export async function requireBranchAccess(
  ctx: QueryCtx | MutationCtx,
  branchId: string
): Promise<AuthenticatedUser> {
  const user = await requireAuthenticated(ctx);

  // 1. SysAdmin has global access
  if (await isSysAdmin(ctx)) {
    return user;
  }

  // Fetch branch to verify ownership
  const branch = await ctx.db
    .query("branches")
    .filter((q) => q.eq(q.field("_id"), branchId as any))
    .first();

  if (!branch) {
    // Also try matching by legacyId or string ID
    const legacyBranch = await ctx.db
      .query("branches")
      .withIndex("by_branch_code", (q) => q.eq("branchCode", branchId))
      .first();

    if (!legacyBranch) {
      throw new Error(`NOT_FOUND: Branch '${branchId}' does not exist`);
    }

    if (user.role === "owner" && user.ownerId === legacyBranch.ownerId) {
      return user;
    }
    if (user.branchId === legacyBranch._id || user.branchId === legacyBranch.legacyId) {
      return user;
    }
  } else {
    if (user.role === "owner" && user.ownerId === branch.ownerId) {
      return user;
    }
    if (user.branchId === branch._id || user.branchId === branch.legacyId) {
      return user;
    }
  }

  throw new Error("FORBIDDEN: No access rights to this branch");
}
