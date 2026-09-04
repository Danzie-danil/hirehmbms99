import { QueryCtx, MutationCtx } from "../_generated/server";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: "sysadmin" | "owner" | "branch" | "staff";
  profileId?: string;
  ownerId?: string;
  branchId?: string;
}

/**
 * Resolves the authenticated user from the request context or authoritative profiles.
 */
export async function getAuthenticatedUser(
  ctx: QueryCtx | MutationCtx
): Promise<AuthenticatedUser | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const email = identity.email?.toLowerCase() || "";
  const userId = identity.subject;

  // 1. Check if SysAdmin
  const sysAdmin = await ctx.db
    .query("sysAdmins")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .first();

  if (sysAdmin) {
    return {
      userId,
      email,
      role: "sysadmin",
    };
  }

  // 2. Check Owner Profile
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .first();

  if (profile) {
    return {
      userId,
      email: profile.email,
      role: "owner",
      profileId: profile._id,
      ownerId: profile.userId,
    };
  }

  // 3. Check Staff / Branch Assignment
  const staffMember = await ctx.db
    .query("staff")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();

  if (staffMember) {
    return {
      userId,
      email: staffMember.email || email,
      role: staffMember.role?.toLowerCase() === "manager" ? "branch" : "staff",
      ownerId: staffMember.ownerId,
      branchId: staffMember.branchId,
    };
  }

  // Default fallback for registered user
  return {
    userId,
    email,
    role: "staff",
  };
}

/**
 * Enforces that a caller is authenticated, otherwise throws an error.
 */
export async function requireAuthenticated(
  ctx: QueryCtx | MutationCtx
): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser(ctx);
  if (!user) {
    throw new Error("UNAUTHORIZED: Authentication required");
  }
  return user;
}
