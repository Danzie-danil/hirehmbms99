import { QueryCtx, MutationCtx } from "../_generated/server";
import { requireAuthenticated, AuthenticatedUser } from "./identity";

/**
 * Validates that the caller is an authoritative SysAdmin.
 */
export async function requireSysAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<AuthenticatedUser> {
  const user = await requireAuthenticated(ctx);

  const sysAdmin = await ctx.db
    .query("sysAdmins")
    .withIndex("by_user_id", (q) => q.eq("userId", user.userId))
    .first();

  if (!sysAdmin) {
    throw new Error("FORBIDDEN: Requires SysAdmin privileges");
  }

  return {
    ...user,
    role: "sysadmin",
  };
}

/**
 * Checks if the caller is a SysAdmin without throwing an exception.
 */
export async function isSysAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<boolean> {
  try {
    await requireSysAdmin(ctx);
    return true;
  } catch {
    return false;
  }
}
