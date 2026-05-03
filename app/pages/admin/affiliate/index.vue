<script setup lang="ts">
  definePageMeta({ layout: "admin" });
  useHead({ title: "Quản lý chương trình Affiliate - Admin Panel" });
  const { formatDate } = useDateFormatter();

  const toast = useToast();
  const { user } = useUserSession();

  interface SessionUser {
    role?: string | null;
    permissions?: string[] | null;
  }

  interface AffiliateLink {
    id: number;
    userId: number;
    username?: string;
    email?: string;
    refCode: string;
    commissionRate: number;
    totalClicks: number;
    totalOrders: number;
    totalEarned: number;
    pendingBalance: number;
    status: string;
    createdAt: string;
  }

  const { data: response, refresh } = await useFetch<{
    affiliateLinks: AffiliateLink[];
    stats: any;
  }>("/api/admin/affiliate/links", {
    key: "admin-affiliate-links",
    lazy: true,
  });

  const sessionUser = computed(() => user.value as SessionUser | null);

  const hasPermission = (permission: string) => {
    const role = String(sessionUser.value?.role || "").trim();
    if (role === "admin") return true;

    const permissions = sessionUser.value?.permissions || [];
    return permissions.includes("*") || permissions.includes(permission);
  };

  const canManageAffiliates = computed(() =>
    hasPermission("manage_affiliates")
  );

  const affiliateLinks = computed(() => {
    if (!response.value?.affiliateLinks) return [];
    return response.value.affiliateLinks.map((link: AffiliateLink) => ({
      ...link,
      joined: formatDate(link.createdAt),
    }));
  });

  const stats = computed(
    () =>
      response.value?.stats || {
        totalAffiliates: 0,
        activeAffiliates: 0,
        totalCommission: 0,
        avgCommissionRate: 0,
      }
  );

  const statusOptions = [
    { label: "Tất cả trạng thái", value: "all" },
    { label: "Đang hoạt động", value: "active" },
    { label: "Tạm dừng", value: "paused" },
  ];

  const searchQuery = ref("");
  const selectedStatus = ref("all");

  const filteredLinks = computed(() => {
    return affiliateLinks.value.filter((link) => {
      const keyword = searchQuery.value.trim().toLowerCase();
      const matchesSearch =
        !keyword ||
        link.username?.toLowerCase().includes(keyword) ||
        link.email?.toLowerCase().includes(keyword) ||
        link.refCode?.toLowerCase().includes(keyword);

      const matchesStatus =
        selectedStatus.value === "all" || link.status === selectedStatus.value;

      return matchesSearch && matchesStatus;
    });
  });

  const pageSize = ref(10);
  const currentPage = ref(1);

  const paginatedLinks = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredLinks.value.slice(start, start + pageSize.value);
  });

  watch([searchQuery, selectedStatus], () => {
    currentPage.value = 1;
  });

  watch(pageSize, () => {
    currentPage.value = 1;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(val);
  };

  const handleToggleStatus = async (link: any) => {
    if (!canManageAffiliates.value) {
      toast.error("Từ chối", "Bạn không có quyền quản lý affiliate");
      return;
    }

    const newStatus = link.status === "active" ? "paused" : "active";
    const action = link.status === "active" ? "tạm dừng" : "kích hoạt";

    const loading = toast.loading(
      `${action.charAt(0).toUpperCase() + action.slice(1)} affiliate...`,
      `Đang ${action} chương trình affiliate của ${link.username}`
    );

    try {
      await $fetch(`/api/admin/affiliate/links/${link.id}`, {
        method: "PATCH",
        body: { status: newStatus },
      });

      toast.remove(loading);
      toast.success(
        `${action.charAt(0).toUpperCase() + action.slice(1)} thành công!`,
        `Chương trình affiliate của ${link.username} đã được ${action}.`
      );
      refresh();
    } catch {
      toast.remove(loading);
      toast.error("Thao tác thất bại", "Có lỗi xảy ra khi cập nhật trạng thái");
    }
  };

  const handleEdit = (link: any) => {
    if (!canManageAffiliates.value) {
      toast.error("Từ chối", "Bạn không có quyền quản lý affiliate");
      return;
    }

    navigateTo(`/admin/affiliate/${link.id}`);
  };

  const copyRefCode = async (refCode: string) => {
    try {
      await navigator.clipboard.writeText(refCode);
      toast.success("Thành công", `Sao chép mã affiliate: ${refCode}`);
    } catch {
      toast.error("Sao chép thất bại", "Không thể sao chép mã affiliate");
    }
  };
</script>

<template>
  <div class="space-y-6">
    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <div
          class="mb-1 flex items-center gap-2 text-xs font-semibold tracking-widest text-slate-400"
        >
          <Icon
            name="solar:users-group-rounded-bold-duotone"
            class="text-primary"
            size="16"
          />
          Hệ thống Affiliate
        </div>
        <h1
          class="text-xl font-semibold tracking-tight text-slate-900 dark:text-white"
        >
          Quản lý Affiliate
        </h1>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div
        v-for="stat in [
          {
            label: 'Tổng Affiliate',
            val: stats.totalAffiliates.toLocaleString(),
            icon: 'solar:users-group-rounded-bold-duotone',
            color: 'text-primary bg-primary/10',
          },
          {
            label: 'Đang hoạt động',
            val: stats.activeAffiliates.toLocaleString(),
            icon: 'solar:check-circle-bold-duotone',
            color: 'text-emerald-500 bg-emerald-50',
          },
          {
            label: 'Tổng hoa hồng',
            val: formatCurrency(stats.totalCommission),
            icon: 'solar:wallet-bold-duotone',
            color: 'text-sky-500 bg-sky-50',
          },
          {
            label: 'Tỷ lệ hoa hồng TB',
            val: stats.avgCommissionRate + '%',
            icon: 'solar:chart-2-bold-duotone',
            color: 'text-violet-500 bg-violet-50',
          },
        ]"
        :key="stat.label"
        class="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div
          :class="[
            'flex h-10 w-10 items-center justify-center rounded-xl',
            stat.color,
          ]"
        >
          <Icon :name="stat.icon" size="20" />
        </div>
        <div>
          <p
            class="mb-1 text-[12px] font-semibold tracking-tighter leading-none text-slate-400"
          >
            {{ stat.label }}
          </p>
          <p
            class="text-lg font-semibold leading-none text-slate-800 dark:text-white"
          >
            {{ stat.val }}
          </p>
        </div>
      </div>
    </div>

    <!-- Table -->
    <UiTable
      :headers="[
        { key: 'user', label: 'Affiliate' },
        { key: 'refCode', label: 'Mã Ref', width: '120px' },
        { key: 'rate', label: 'Tỷ lệ (%)', width: '100px' },
        { key: 'clicks', label: 'Lượt click', width: '120px' },
        { key: 'orders', label: 'Đơn hàng', width: '120px' },
        { key: 'earned', label: 'Đã kiếm', width: '130px' },
        { key: 'pending', label: 'Chờ rút', width: '130px' },
        { key: 'status', label: 'Trạng thái', width: '110px' },
        { key: 'actions', label: 'Hành động', align: 'right', width: '120px' },
      ]"
      :items="paginatedLinks"
      striped
    >
      <template #top>
        <div
          class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div class="flex items-center gap-3">
            <span
              class="h-7 w-1.5 rounded-full bg-gradient-to-b from-sky-300 via-primary to-violet-400"
            ></span>
            <div>
              <p class="text-base font-semibold text-slate-800 dark:text-white">
                Danh sách Affiliate
              </p>
            </div>
          </div>

          <div class="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div class="w-full sm:min-w-[280px]">
              <UiInput
                v-model="searchQuery"
                placeholder="Tìm kiếm..."
                class="h-10 rounded-[14px] border-slate-200 bg-white shadow-sm focus:bg-white"
              >
                <template #left-icon>
                  <Icon name="solar:magnifer-line-duotone" size="18" />
                </template>
              </UiInput>
            </div>
            <div class="w-full shrink-0 sm:w-[190px]">
              <UiDropdown v-model="selectedStatus" :options="statusOptions" />
            </div>
          </div>
        </div>
      </template>

      <template #cell(user)="{ item }">
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary"
          >
            {{ item.username?.charAt(0).toUpperCase() }}
          </div>
          <div class="min-w-0">
            <p
              class="max-w-[150px] truncate text-sm font-semibold leading-tight text-slate-800 dark:text-slate-100"
            >
              {{ item.username }}
            </p>
            <p
              class="mt-1 truncate text-[12px] font-medium leading-none text-slate-400"
            >
              {{ item.email }}
            </p>
          </div>
        </div>
      </template>

      <template #cell(refCode)="{ item }">
        <div class="flex items-center gap-2">
          <span
            class="font-mono text-[13px] font-semibold text-slate-800 dark:text-slate-200"
          >
            {{ item.refCode }}
          </span>
          <button
            type="button"
            class="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
            @click="copyRefCode(item.refCode)"
            title="Sao chép mã"
          >
            <Icon
              name="solar:copy-line-duotone"
              size="16"
              class="text-slate-500"
            />
          </button>
        </div>
      </template>

      <template #cell(rate)="{ item }">
        <span class="font-mono font-semibold text-primary"
          >{{ item.commissionRate }}%</span
        >
      </template>

      <template #cell(clicks)="{ item }">
        <span
          class="text-[13px] font-semibold text-slate-600 dark:text-slate-400"
        >
          {{ item.totalClicks.toLocaleString() }}
        </span>
      </template>

      <template #cell(orders)="{ item }">
        <span
          class="text-[13px] font-semibold text-slate-600 dark:text-slate-400"
        >
          {{ item.totalOrders.toLocaleString() }}
        </span>
      </template>

      <template #cell(earned)="{ item }">
        <span
          class="font-mono text-[13px] font-semibold text-emerald-600 dark:text-emerald-400"
        >
          {{ formatCurrency(item.totalEarned) }}
        </span>
      </template>

      <template #cell(pending)="{ item }">
        <span
          class="font-mono text-[13px] font-semibold text-orange-600 dark:text-orange-400"
        >
          {{ formatCurrency(item.pendingBalance) }}
        </span>
      </template>

      <template #cell(status)="{ item }">
        <UiBadge
          :variant="item.status === 'active' ? 'success' : 'slate'"
          :label="item.status === 'active' ? 'Hoạt động' : 'Tạm dừng'"
          rounded
        />
      </template>

      <template #cell(actions)="{ item }">
        <div
          v-if="canManageAffiliates"
          class="flex items-center justify-end gap-1.5"
        >
          <button
            type="button"
            class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800"
            @click="handleEdit(item)"
            title="Chỉnh sửa"
          >
            <Icon name="solar:pen-bold" size="18" />
          </button>
          <button
            type="button"
            class="rounded-lg p-2 transition-colors"
            :class="
              item.status === 'active'
                ? 'text-slate-400 hover:bg-orange-50 hover:text-orange-500 dark:hover:bg-orange-900/20'
                : 'text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20'
            "
            @click="handleToggleStatus(item)"
            :title="item.status === 'active' ? 'Tạm dừng' : 'Kích hoạt'"
          >
            <Icon
              :name="
                item.status === 'active'
                  ? 'solar:pause-bold'
                  : 'solar:play-bold'
              "
              size="18"
            />
          </button>
        </div>
        <span v-else class="text-xs font-medium text-slate-400">---</span>
      </template>

      <template #footer>
        <UiPagination
          :total="filteredLinks.length"
          v-model:pageSize="pageSize"
          v-model:currentPage="currentPage"
        />
      </template>
    </UiTable>
  </div>
</template>
