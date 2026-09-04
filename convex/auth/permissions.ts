import { AuthenticatedUser } from "./identity";

export const PERMISSIONS = {
  MANAGE_ENTERPRISE: ["sysadmin", "owner"],
  MANAGE_BRANCH: ["sysadmin", "owner", "branch"],
  MAKE_SALES: ["sysadmin", "owner", "branch", "staff"],
  VIEW_FINANCIALS: ["sysadmin", "owner"],
  MODIFY_STOCK: ["sysadmin", "owner", "branch"],
} as const;

export function hasPermission(
  user: AuthenticatedUser,
  permission: keyof typeof PERMISSIONS
): boolean {
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles.includes(user.role as any);
}

export function assertPermission(
  user: AuthenticatedUser,
  permission: keyof typeof PERMISSIONS
): void {
  if (!hasPermission(user, permission)) {
    throw new Error(`FORBIDDEN: Permission denied for '${permission}'`);
  }
}
