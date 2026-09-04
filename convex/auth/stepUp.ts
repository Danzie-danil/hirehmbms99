import { QueryCtx, MutationCtx } from "../_generated/server";
import { requireSysAdmin } from "./sysAdmin";

const STEP_UP_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Validates that an active, unexpired step-up session exists for the given action.
 */
export async function requireStepUp(
  ctx: QueryCtx | MutationCtx,
  action: string
): Promise<void> {
  const user = await requireSysAdmin(ctx);

  const now = new Date().toISOString();
  const validSession = await ctx.db
    .query("sysStepUpSessions")
    .withIndex("by_user_id", (q) => q.eq("userId", user.userId))
    .filter((q) =>
      q.and(
        q.eq(q.field("action"), action),
        q.gt(q.field("expiresAt"), now)
      )
    )
    .first();

  if (!validSession) {
    throw new Error(
      `SECURITY_CHALLENGE_REQUIRED: Step-up verification required for action '${action}'`
    );
  }
}

/**
 * Creates or refreshes a verified 15-minute step-up elevation record.
 */
export async function createStepUpSession(
  ctx: MutationCtx,
  userId: string,
  action: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const now = new Date();
  const verifiedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + STEP_UP_EXPIRY_MS).toISOString();

  const id = await ctx.db.insert("sysStepUpSessions", {
    userId,
    action,
    verifiedAt,
    expiresAt,
    ipAddress,
    userAgent,
    createdAt: verifiedAt,
  });

  return id;
}
