interface UserSession {
  id: number;
  username: string;
  email: string;
  role: string;
  permissions?: string[];
  [key: string]: any;
}

const isDefaultAdmin = (user: UserSession | null) => {
  return String(user?.role || "").trim() === "admin";
};

const hasPermission = (user: UserSession | null, permission: string) => {
  if (!user) return false;
  if (isDefaultAdmin(user)) return true;
  const permissions = user.permissions || [];
  return permissions.includes("*") || permissions.includes(permission);
};

const hasAnyPermission = (user: UserSession | null, permissions: string[]) => {
  return permissions.some((permission) => hasPermission(user, permission));
};

const adminRoutePermissions: Array<{
  prefix: string;
  permissions: string[];
}> = [
  { prefix: "/admin/roles", permissions: ["view_roles", "manage_roles"] },
  { prefix: "/admin/settings", permissions: ["manage_settings"] },
  { prefix: "/admin/block-ip", permissions: ["view_block_ips", "manage_block_ips"] },
  { prefix: "/admin/activity-logs", permissions: ["view_logs"] },
  { prefix: "/admin/users", permissions: ["view_users", "edit_users"] },
  { prefix: "/admin/messages", permissions: ["view_messages", "manage_messages"] },
  { prefix: "/admin/orders", permissions: ["view_orders", "manage_orders"] },
  {
    prefix: "/admin/deposits/config",
    permissions: ["manage_deposit_config", "manage_banks", "manage_settings"],
  },
  {
    prefix: "/admin/deposits",
    permissions: ["view_deposits", "manage_deposits"],
  },
  {
    prefix: "/admin/transactions",
    permissions: ["view_transactions"],
  },
  {
    prefix: "/admin/categories",
    permissions: ["view_categories", "manage_categories"],
  },
  {
    prefix: "/admin/products",
    permissions: ["view_products", "manage_products"],
  },
  {
    prefix: "/admin/plans",
    permissions: ["view_plans", "manage_plans"],
  },
  {
    prefix: "/admin/stock",
    permissions: ["view_stocks", "manage_stocks"],
  },
  {
    prefix: "/admin/coupons",
    permissions: ["view_coupons", "manage_coupons"],
  },
  {
    prefix: "/admin/flash-sales",
    permissions: ["view_flash_sales", "manage_flash_sales"],
  },
];

export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn, user, fetch } = useUserSession();

  if (!to.path.startsWith("/admin")) {
    return;
  }

  // Luôn làm mới session khi vào admin để role/permission phản ánh ngay theo DB
  await fetch();
  const freshUserData = user.value as UserSession | null;

  if (!loggedIn.value) {
    return navigateTo("/auth/login");
  }

  if (!freshUserData?.role || freshUserData.role === "user") {
    return navigateTo("/");
  }

  if (to.path === "/admin" && !hasPermission(freshUserData, "view_dashboard")) {
    return navigateTo("/");
  }

  const matchedRoute = adminRoutePermissions.find((route) =>
    to.path.startsWith(route.prefix),
  );

  if (matchedRoute && !hasAnyPermission(freshUserData, matchedRoute.permissions)) {
    return navigateTo("/admin");
  }
});
