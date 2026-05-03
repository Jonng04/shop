import { eq } from "drizzle-orm";
import { createError } from "h3";

import { db } from "../database";
import { adminRoles } from "../database/schema";

export interface AdminSessionUser {
  id?: number | null;
  role?: string | null;
  [key: string]: unknown;
}

export const ADMIN_PERMISSION_ALL = "*";
export const ADMIN_DEFAULT_ROLE = "admin";

export const normalizeAdminPermission = (permission?: string | null) =>
  String(permission || "")
    .trim()
    .toLowerCase();

export const parseAdminPermissions = (roleValue?: string | null) => {
  const permissions = String(roleValue || "")
    .split(/[\r\n,]+/)
    .map((item) => normalizeAdminPermission(item))
    .filter(Boolean);

  return [...new Set(permissions)];
};

export const hasPermissionFromRole = (
  roleValue: string | null | undefined,
  permission: string,
) => {
  const normalizedPermission = normalizeAdminPermission(permission);

  if (!normalizedPermission) {
    return false;
  }

  const permissions = parseAdminPermissions(roleValue);

  return (
    permissions.includes(ADMIN_PERMISSION_ALL) ||
    permissions.includes(normalizedPermission)
  );
};

export const hasAnyPermissionFromRole = (
  roleValue: string | null | undefined,
  permissions: string[],
) =>
  permissions.some((permission) =>
    hasPermissionFromRole(roleValue, permission),
  );

export const hasAllPermissionsFromRole = (
  roleValue: string | null | undefined,
  permissions: string[],
) =>
  permissions.every((permission) =>
    hasPermissionFromRole(roleValue, permission),
  );

export const isAdminUser = (user?: AdminSessionUser | null) => {
  const roleName = String(user?.role || "").trim();
  return Boolean(roleName) && roleName !== "user";
};

export const getAdminRoleRecord = async (roleName?: string | null) => {
  const normalizedRoleName = String(roleName || "").trim();

  if (
    !normalizedRoleName ||
    normalizedRoleName === "user" ||
    normalizedRoleName === ADMIN_DEFAULT_ROLE
  ) {
    return null;
  }

  const [roleRecord] = await db
    .select()
    .from(adminRoles)
    .where(eq(adminRoles.name, normalizedRoleName))
    .limit(1);

  return roleRecord || null;
};

export const getAdminPermissions = async (user?: AdminSessionUser | null) => {
  if (!isAdminUser(user)) {
    return [];
  }

  const roleRecord = await getAdminRoleRecord(user?.role);

  if (!roleRecord) {
    return user?.role === ADMIN_DEFAULT_ROLE ? [ADMIN_PERMISSION_ALL] : [];
  }

  return parseAdminPermissions(roleRecord.role);
};

export const getAdminPermissionsByRoleName = async (roleName?: string | null) => {
  const roleRecord = await getAdminRoleRecord(roleName);

  if (!roleRecord) {
    return roleName === ADMIN_DEFAULT_ROLE ? [ADMIN_PERMISSION_ALL] : [];
  }

  return parseAdminPermissions(roleRecord.role);
};

export const hasAdminPermission = async (
  user: AdminSessionUser | null | undefined,
  permission: string,
) => {
  if (!isAdminUser(user)) {
    return false;
  }

  const roleRecord = await getAdminRoleRecord(user?.role);

  if (!roleRecord) {
    return user?.role === ADMIN_DEFAULT_ROLE;
  }

  return hasPermissionFromRole(roleRecord.role, permission);
};

export const hasAnyAdminPermission = async (
  user: AdminSessionUser | null | undefined,
  permissions: string[],
) => {
  if (!isAdminUser(user)) {
    return false;
  }

  const roleRecord = await getAdminRoleRecord(user?.role);

  if (!roleRecord) {
    return user?.role === ADMIN_DEFAULT_ROLE;
  }

  return hasAnyPermissionFromRole(roleRecord.role, permissions);
};

export const hasAllAdminPermissions = async (
  user: AdminSessionUser | null | undefined,
  permissions: string[],
) => {
  if (!isAdminUser(user)) {
    return false;
  }

  const roleRecord = await getAdminRoleRecord(user?.role);

  if (!roleRecord) {
    return user?.role === ADMIN_DEFAULT_ROLE;
  }

  return hasAllPermissionsFromRole(roleRecord.role, permissions);
};

export const requireAdminAccess = (user?: AdminSessionUser | null) => {
  if (!isAdminUser(user)) {
    throw createError({
      statusCode: 403,
      message: "Bạn không có quyền truy cập",
    });
  }

  return user;
};

export const requireAdminPermission = async (
  user: AdminSessionUser | null | undefined,
  permission: string,
) => {
  requireAdminAccess(user);

  const allowed = await hasAdminPermission(user, permission);

  if (!allowed) {
    throw createError({
      statusCode: 403,
      message: "Bạn không có quyền thực hiện thao tác này",
    });
  }

  return true;
};
