<script setup lang="ts">
  import { computed, ref } from "vue";
  import { useRoute } from "#app";

  interface MenuLink {
    label: string;
    href: string;
    icon: string;
    requiredPermissions?: string[];
  }

  interface MenuSection {
    label: string;
    icon: string;
    children: MenuLink[];
    requiredPermissions?: string[];
  }

  interface MenuGroup {
    title: string;
    items: Array<MenuLink | MenuSection>;
  }

  interface SessionUser {
    username?: string | null;
    email?: string | null;
    role?: string | null;
    permissions?: string[] | null;
  }

  const menuGroups: MenuGroup[] = [
    {
      title: "Tổng Quan",
      items: [
        {
          label: "Tổng quan",
          href: "/admin",
          icon: "solar:pie-chart-2-line-duotone",
          requiredPermissions: ["view_dashboard"],
        },
      ],
    },
    {
      title: "Bán Hàng",
      items: [
        {
          label: "Đơn hàng",
          href: "/admin/orders",
          icon: "solar:cart-large-line-duotone",
          requiredPermissions: ["view_orders", "manage_orders"],
        },
        {
          label: "Nạp tiền",
          href: "/admin/deposits",
          icon: "solar:wallet-money-line-duotone",
          requiredPermissions: ["view_deposits", "manage_deposits"],
        },
        {
          label: "Giao dịch",
          href: "/admin/transactions",
          icon: "solar:card-line-duotone",
          requiredPermissions: ["view_transactions"],
        },
        {
          label: "Khuyến mại",
          icon: "solar:ticket-bold-duotone",
          children: [
            {
              label: "Mã giảm giá",
              href: "/admin/coupons",
              icon: "solar:ticket-line-duotone",
              requiredPermissions: ["view_coupons", "manage_coupons"],
            },
            {
              label: "Flash Sale",
              href: "/admin/flash-sales",
              icon: "solar:fire-line-duotone",
              requiredPermissions: ["view_flash_sales", "manage_flash_sales"],
            },
          ],
        },
      ],
    },
    {
      title: "Affiliate & Hoa Hồng",
      items: [
        {
          label: "Affiliate",
          icon: "solar:users-group-rounded-line-duotone",
          children: [
            {
              label: "Danh sách Affiliate",
              href: "/admin/affiliate",
              icon: "solar:users-group-rounded-line-duotone",
              requiredPermissions: ["manage_affiliates"],
            },
            {
              label: "Hoa hồng",
              href: "/admin/affiliate/commissions",
              icon: "solar:wallet-bold-duotone",
              requiredPermissions: ["manage_affiliates"],
            },
            {
              label: "Rút tiền",
              href: "/admin/affiliate/withdrawals",
              icon: "solar:arrow-up-line-duotone",
              requiredPermissions: ["manage_affiliates"],
            },
            {
              label: "Cấu hình",
              href: "/admin/affiliate/config",
              icon: "solar:settings-line-duotone",
              requiredPermissions: ["manage_settings", "manage_affiliates"],
            },
          ],
        },
      ],
    },
    {
      title: "Sản Phẩm",
      items: [
        {
          label: "Quản lý sản phẩm",
          icon: "solar:widget-5-line-duotone",
          children: [
            {
              label: "Danh mục sản phẩm",
              href: "/admin/categories",
              icon: "solar:folder-2-line-duotone",
              requiredPermissions: ["view_categories", "manage_categories"],
            },
            {
              label: "Sản phẩm / Dịch vụ",
              href: "/admin/products",
              icon: "solar:box-line-duotone",
              requiredPermissions: ["view_products", "manage_products"],
            },
            {
              label: "Gói sản phẩm",
              href: "/admin/plans",
              icon: "solar:layers-line-duotone",
              requiredPermissions: ["view_plans", "manage_plans"],
            },
            {
              label: "Kho hàng",
              href: "/admin/stock",
              icon: "solar:archive-line-duotone",
              requiredPermissions: ["view_stocks", "manage_stocks"],
            },
          ],
        },
      ],
    },
    {
      title: "Người Dùng",
      items: [
        {
          label: "Khách hàng",
          href: "/admin/users",
          icon: "solar:users-group-rounded-line-duotone",
          requiredPermissions: ["view_users", "edit_users"],
        },
        {
          label: "Tin nhắn hỗ trợ",
          href: "/admin/messages",
          icon: "solar:chat-round-line-duotone",
          requiredPermissions: ["view_messages", "manage_messages"],
        },
      ],
    },
    {
      title: "Bảo Mật & Hệ Thống",
      items: [
        {
          label: "Block IP",
          href: "/admin/block-ip",
          icon: "solar:shield-cross-line-duotone",
          requiredPermissions: ["view_block_ips", "manage_block_ips"],
        },
        {
          label: "Nhật ký hệ thống",
          href: "/admin/activity-logs",
          icon: "solar:document-text-line-duotone",
          requiredPermissions: ["view_logs"],
        },
        {
          label: "Vai trò admin",
          href: "/admin/roles",
          icon: "solar:shield-user-line-duotone",
          requiredPermissions: ["view_roles", "manage_roles"],
        },
        {
          label: "Cài đặt hệ thống",
          href: "/admin/settings",
          icon: "solar:settings-line-duotone",
          requiredPermissions: ["manage_settings"],
        },
      ],
    },
  ];

  const { user } = useUserSession();
  const isSidebarOpen = useState("isSidebarOpen");
  const route = useRoute();
  const currentUrl = computed(() => route.path || "/admin");
  const expandedSections = ref<Record<string, boolean>>({});
  const sessionUser = computed(() => user.value as SessionUser | null);

  const isMenuSection = (item: MenuLink | MenuSection): item is MenuSection =>
    "children" in item;

  const hasPermission = (permission: string) => {
    const role = String(sessionUser.value?.role || "").trim();
    if (role === "admin") return true;

    const permissions = sessionUser.value?.permissions || [];
    return permissions.includes("*") || permissions.includes(permission);
  };

  const canAccess = (requiredPermissions?: string[]) => {
    if (!requiredPermissions || requiredPermissions.length === 0) return true;
    return requiredPermissions.some((permission) => hasPermission(permission));
  };

  const filteredMenuGroups = computed(() =>
    menuGroups
      .map((group) => {
        const items = group.items
          .map((item) => {
            if (isMenuSection(item)) {
              if (!canAccess(item.requiredPermissions)) return null;

              const children = item.children.filter((child) =>
                canAccess(child.requiredPermissions)
              );

              if (children.length === 0) return null;
              return { ...item, children };
            }

            if (!canAccess(item.requiredPermissions)) return null;
            return item;
          })
          .filter(Boolean) as Array<MenuLink | MenuSection>;

        return { ...group, items };
      })
      .filter((group) => group.items.length > 0)
  );

  const isActive = (href: string): boolean => {
    return currentUrl.value === href;
  };

  const isSectionActive = (section: MenuSection): boolean =>
    section.children.some((child) => isActive(child.href));

  const isSectionOpen = (section: MenuSection): boolean =>
    expandedSections.value[section.label] ?? isSectionActive(section);

  const toggleSection = (section: MenuSection) => {
    expandedSections.value[section.label] = !isSectionOpen(section);
  };

  const profileName = computed(
    () => sessionUser.value?.username || "Administrator"
  );
  const profileEmail = computed(
    () => sessionUser.value?.email || "admin@panel.com"
  );
</script>

<template>
  <aside
    class="fixed inset-y-0 left-0 z-[100] flex w-[260px] flex-col border-r border-slate-200/70 bg-white shadow-xl transition-all duration-300 lg:sticky lg:top-0 lg:z-10 lg:h-screen lg:shrink-0 lg:translate-x-0 lg:shadow-none dark:border-slate-800 dark:bg-[#0f1011]"
    :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
  >
    <div class="flex h-[60px] shrink-0 items-center justify-between px-6">
      <NuxtLink to="/admin" class="flex items-center gap-3">
        <span
          class="text-xl font-bold tracking-tight text-slate-800 dark:text-white"
        >
          Admin Panel
        </span>
      </NuxtLink>

      <button
        type="button"
        @click="isSidebarOpen = false"
        class="text-slate-400 transition hover:text-rose-500 lg:hidden"
      >
        <Icon name="solar:close-circle-bold" size="20" />
      </button>
    </div>

    <div class="custom-scrollbar flex-1 overflow-y-auto px-4 py-4">
      <section
        v-for="(group, idx) in filteredMenuGroups"
        :key="group.title"
        :class="idx > 0 && 'mt-6'"
      >
        <h3
          class="mb-3 px-3 text-[12px] font-semibold tracking-widest text-slate-400 dark:text-slate-500"
        >
          {{ group.title }}
        </h3>

        <nav class="space-y-1">
          <template v-for="item in group.items" :key="item.label">
            <div v-if="isMenuSection(item)">
              <button
                type="button"
                @click="toggleSection(item)"
                :class="[
                  'group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[14px] font-semibold transition-all duration-200',
                  isSectionActive(item)
                    ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200',
                ]"
              >
                <span class="flex items-center gap-3">
                  <Icon
                    :name="item.icon"
                    class="h-5 w-5 shrink-0 transition-transform duration-200"
                    :class="[
                      isSectionActive(item)
                        ? 'scale-110 text-primary'
                        : 'text-slate-400 group-hover:text-slate-500 dark:text-slate-500',
                    ]"
                  />
                  {{ item.label }}
                </span>

                <Icon
                  name="solar:alt-arrow-down-linear"
                  class="h-4 w-4 shrink-0 transition-all duration-300 ease-out"
                  :class="[
                    isSectionActive(item)
                      ? 'text-primary'
                      : 'text-slate-400 group-hover:text-slate-500 dark:text-slate-500',
                    isSectionOpen(item) && 'rotate-180 scale-110',
                  ]"
                />
              </button>

              <Transition name="submenu">
                <div
                  v-if="isSectionOpen(item)"
                  class="ml-4 mt-1 space-y-1 border-l border-slate-200/80 pl-3 dark:border-slate-800"
                >
                  <NuxtLink
                    v-for="child in item.children"
                    :key="child.label"
                    :to="child.href"
                    :aria-current="isActive(child.href) ? 'page' : undefined"
                    :class="[
                      'group flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold transition-all duration-200',
                      isActive(child.href)
                        ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200',
                    ]"
                  >
                    <Icon
                      :name="child.icon"
                      class="h-4 w-4 shrink-0 transition-transform duration-200"
                      :class="[
                        isActive(child.href)
                          ? 'scale-110 text-primary'
                          : 'text-slate-400 group-hover:text-slate-500 dark:text-slate-500',
                      ]"
                    />
                    <span class="truncate">{{ child.label }}</span>
                  </NuxtLink>
                </div>
              </Transition>
            </div>

            <NuxtLink
              v-else
              :to="item.href"
              :aria-current="isActive(item.href) ? 'page' : undefined"
              :class="[
                'group flex items-center justify-between rounded-xl px-3 py-2.5 text-[14px] font-semibold transition-all duration-200',
                isActive(item.href)
                  ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200',
              ]"
            >
              <span class="flex items-center gap-3">
                <Icon
                  :name="item.icon"
                  class="h-5 w-5 shrink-0 transition-transform duration-200"
                  :class="[
                    isActive(item.href)
                      ? 'text-primary'
                      : 'text-slate-400 group-hover:text-slate-500 dark:text-slate-500',
                    isActive(item.href) && 'scale-110',
                  ]"
                />
                {{ item.label }}
              </span>
            </NuxtLink>
          </template>
        </nav>
      </section>
    </div>

    <div class="border-t border-slate-200/70 p-4 dark:border-slate-800">
      <div
        class="cursor-pointer rounded-xl border border-slate-100 bg-slate-50 p-3 transition hover:border-slate-200 dark:border-slate-700/50 dark:bg-slate-800/50"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"
          >
            <Icon name="solar:user-bold" class="h-5 w-5" />
          </div>
          <div class="min-w-0 flex-1">
            <p
              class="truncate text-sm font-bold text-slate-800 dark:text-white"
            >
              {{ profileName }}
            </p>
            <p
              class="truncate text-[11px] font-medium text-slate-400 dark:text-slate-400"
            >
              {{ profileEmail }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
  .submenu-enter-active,
  .submenu-leave-active {
    transition:
      opacity 0.24s ease,
      transform 0.24s ease,
      max-height 0.24s ease,
      margin-top 0.24s ease;
    overflow: hidden;
  }

  .submenu-enter-from,
  .submenu-leave-to {
    opacity: 0;
    transform: translateY(-8px);
    max-height: 0;
    margin-top: 0;
  }

  .submenu-enter-to,
  .submenu-leave-from {
    opacity: 1;
    transform: translateY(0);
    max-height: 320px;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: transparent;
    border-radius: 4px;
  }

  aside:hover .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: #cbd5e1;
  }
</style>
