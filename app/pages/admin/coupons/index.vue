<script setup lang="ts">
  definePageMeta({ layout: "admin" });
  useHead({ title: "Quản lý mã giảm giá - Admin Panel" });
  const { formatDateTime, parseServerDate } = useDateFormatter();

  const toast = useToast();
  const { user } = useUserSession();

  interface SessionUser {
    role?: string | null;
    permissions?: string[] | null;
  }

  interface CouponItem {
    id: number;
    code: string;
    discountValue: number;
    discountType: "percent" | "fixed";
    maxDiscount?: number;
    minOrderValue?: number;
    applicableProductIds?: object;
    applicableCategoryIds?: object;
    usageLimit?: number;
    usedCount: number;
    maxPerUser?: number;
    startAt?: string | null;
    expiryDate: string | null;
    status?: string;
    description?: string;
    createdAt: string | null;
  }

  const sessionUser = computed(() => user.value as SessionUser | null);

  const hasPermission = (permission: string) => {
    const role = String(sessionUser.value?.role || "").trim();
    if (role === "admin") return true;

    const permissions = sessionUser.value?.permissions || [];
    return permissions.includes("*") || permissions.includes(permission);
  };

  const canManageCoupons = computed(() => hasPermission("manage_coupons"));

  const { data, refresh, pending } = await useFetch<CouponItem[]>(
    "/api/admin/coupons",
    {
      key: "admin-coupons-list",
      default: () => [],
    }
  );

  const couponsList = computed(() => data.value || []);

  const searchQuery = ref("");
  const selectedStatus = ref("all");
  const selectedType = ref("all");
  const pageSize = ref(10);
  const currentPage = ref(1);
  const isConfirmOpen = ref(false);
  const deleting = ref(false);
  const couponToDelete = ref<CouponItem | null>(null);

  const statusOptions = [
    { label: "Tất cả trạng thái", value: "all" },
    { label: "Đang hoạt động", value: "active" },
    { label: "Hết hạn", value: "expired" },
    { label: "Hết lượt", value: "exhausted" },
  ];

  const typeOptions = [
    { label: "Tất cả loại giảm", value: "all" },
    { label: "Phần trăm", value: "percent" },
    { label: "Tiền mặt", value: "fixed" },
  ];

  const nowTime = () => Date.now();

  const getCouponStatus = (item: CouponItem) => {
    const expiryDate = parseServerDate(item.expiryDate);
    const expiryTime = expiryDate ? expiryDate.getTime() : null;

    if (expiryTime && expiryTime < nowTime()) {
      return { key: "expired", label: "Hết hạn", variant: "error" };
    }

    if (
      item.usageLimit &&
      item.usageLimit > 0 &&
      item.usedCount >= item.usageLimit
    ) {
      return { key: "exhausted", label: "Hết lượt", variant: "warning" };
    }

    return { key: "active", label: "Đang hoạt động", variant: "success" };
  };

  const filteredCoupons = computed(() => {
    const keyword = searchQuery.value.trim().toLowerCase();

    return couponsList.value.filter((item) => {
      const status = getCouponStatus(item).key;
      const matchesSearch =
        !keyword ||
        item.code.toLowerCase().includes(keyword) ||
        item.id.toString().includes(keyword);
      const matchesStatus =
        selectedStatus.value === "all" || status === selectedStatus.value;
      const matchesType =
        selectedType.value === "all" ||
        item.discountType === selectedType.value;

      return matchesSearch && matchesStatus && matchesType;
    });
  });

  const paginatedCoupons = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredCoupons.value.slice(start, start + pageSize.value);
  });

  const stats = computed(() => {
    const active = couponsList.value.filter(
      (item) => getCouponStatus(item).key === "active"
    ).length;
    const expired = couponsList.value.filter(
      (item) => getCouponStatus(item).key === "expired"
    ).length;
    const exhausted = couponsList.value.filter(
      (item) => getCouponStatus(item).key === "exhausted"
    ).length;
    const totalUsage = couponsList.value.reduce(
      (sum, item) => sum + item.usedCount,
      0
    );

    return {
      total: couponsList.value.length,
      active,
      expired,
      exhausted,
      totalUsage,
    };
  });

  watch([searchQuery, selectedStatus, selectedType], () => {
    currentPage.value = 1;
  });

  watch(pageSize, () => {
    currentPage.value = 1;
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value || 0);

  const formatDiscount = (item: CouponItem) => {
    if (item.discountType === "percent") return `-${item.discountValue}%`;
    return `-${formatCurrency(item.discountValue)}`;
  };

  const usagePercent = (item: CouponItem) => {
    if (!item.usageLimit || item.usageLimit <= 0) return 0;
    return Math.min(100, Math.round((item.usedCount / item.usageLimit) * 100));
  };

  const openDeleteConfirm = (item: CouponItem) => {
    if (!canManageCoupons.value) {
      toast.error("Từ chối", "Bạn không có quyền xóa mã giảm giá");
      return;
    }

    couponToDelete.value = item;
    isConfirmOpen.value = true;
  };

  const confirmDelete = async () => {
    if (!canManageCoupons.value) {
      toast.error("Từ chối", "Bạn không có quyền xóa mã giảm giá");
      return;
    }

    if (!couponToDelete.value) return;

    deleting.value = true;
    try {
      await $fetch(`/api/admin/coupons/${couponToDelete.value.id}`, {
        method: "DELETE",
      });
      toast.success("Thành công", `Đã xóa mã ${couponToDelete.value.code}.`);
      isConfirmOpen.value = false;
      couponToDelete.value = null;
      await refresh();
    } catch (error: any) {
      toast.error("Lỗi", error.data?.message || "Không thể xóa mã giảm giá");
    } finally {
      deleting.value = false;
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
            name="solar:ticket-bold-duotone"
            class="text-primary"
            size="16"
          />
          Marketing & khuyến mãi
        </div>
        <h1
          class="text-xl font-semibold tracking-tight text-slate-900 dark:text-white"
        >
          Quản lý mã giảm giá
        </h1>
      </div>

      <NuxtLink v-if="canManageCoupons" to="/admin/coupons/create">
        <UiButton>
          <template #prefix>
            <Icon name="solar:add-circle-line-duotone" size="18" />
          </template>
          Thêm mã giảm giá
        </UiButton>
      </NuxtLink>
    </div>

    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div
        v-for="stat in [
          {
            label: 'Tổng mã',
            value: stats.total.toString(),
            icon: 'solar:ticket-bold-duotone',
            color: 'text-primary bg-primary/10',
          },
          {
            label: 'Đang hoạt động',
            value: stats.active.toString(),
            icon: 'solar:shield-check-bold-duotone',
            color: 'text-emerald-500 bg-emerald-50',
          },
          {
            label: 'Đã hết hạn',
            value: stats.expired.toString(),
            icon: 'solar:clock-circle-bold-duotone',
            color: 'text-rose-500 bg-rose-50',
          },
          {
            label: 'Tổng lượt dùng',
            value: stats.totalUsage.toString(),
            icon: 'solar:chart-2-bold-duotone',
            color: 'text-sky-500 bg-sky-50',
          },
        ]"
        :key="stat.label"
        class="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
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
            class="mb-1 text-[11px] font-medium uppercase tracking-wider text-slate-400"
          >
            {{ stat.label }}
          </p>
          <p
            class="text-lg font-semibold leading-none text-slate-800 dark:text-white"
          >
            {{ stat.value }}
          </p>
        </div>
      </div>
    </div>

    <UiTable
      :headers="[
        { key: 'coupon', label: 'Mã giảm giá', width: '220px' },
        { key: 'discount', label: 'Ơu đãi', width: '160px' },
        { key: 'conditions', label: 'Điều kiện', width: '200px' },
        { key: 'status', label: 'Trạng thái', width: '140px' },
        { key: 'usage', label: 'Lượt dùng', width: '170px' },
        { key: 'expiry', label: 'Hết hạn', width: '170px' },
        { key: 'actions', label: 'Thao tác', width: '110px' },
      ]"
      :items="paginatedCoupons"
      :loading="pending"
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
            <p class="text-base font-semibold text-slate-800 dark:text-white">
              Danh sách mã giảm giá
            </p>
          </div>

          <div class="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div class="w-full sm:min-w-[280px]">
              <UiInput
                v-model="searchQuery"
                placeholder="Tìm theo mã coupon..."
                class="h-10 rounded-[14px] border-slate-200 bg-white"
              >
                <template #left-icon>
                  <Icon name="solar:magnifer-line-duotone" size="18" />
                </template>
              </UiInput>
            </div>

            <div class="w-full shrink-0 sm:w-[190px]">
              <UiDropdown v-model="selectedType" :options="typeOptions" />
            </div>

            <div class="w-full shrink-0 sm:w-[190px]">
              <UiDropdown v-model="selectedStatus" :options="statusOptions" />
            </div>
          </div>
        </div>
      </template>

      <template #cell(coupon)="{ item }">
        <div class="min-w-0">
          <p
            class="font-mono text-[14px] font-semibold tracking-wide text-primary"
          >
            {{ item.code }}
          </p>
          <p class="mt-1 text-[11px] font-medium text-slate-400">
            #CP{{ item.id }} • Tạo lúc {{ formatDateTime(item.createdAt) }}
          </p>
        </div>
      </template>

      <template #cell(discount)="{ item }">
        <div class="min-w-0">
          <p
            class="font-mono text-[13px] font-semibold text-slate-800 dark:text-white"
          >
            {{ formatDiscount(item) }}
          </p>
          <p class="mt-1 text-[11px] font-medium text-slate-400">
            {{
              item.discountType === "percent"
                ? "Giảm theo phần trăm"
                : "Giảm trực tiếp vào đơn"
            }}
          </p>
        </div>
      </template>

      <template #cell(conditions)="{ item }">
        <div class="min-w-0 space-y-1">
          <div
            v-if="item.minOrderValue"
            class="text-[11px] font-medium text-slate-600 dark:text-slate-400"
          >
            <span class="font-semibold">Đơn tối thiểu:</span>
            {{ formatCurrency(item.minOrderValue) }}
          </div>
          <div
            v-if="item.maxPerUser"
            class="text-[11px] font-medium text-slate-600 dark:text-slate-400"
          >
            <span class="font-semibold">Tối đa/người:</span>
            {{ item.maxPerUser }} lần
          </div>
          <div
            v-if="!item.minOrderValue && !item.maxPerUser"
            class="text-[11px] font-medium text-slate-400"
          >
            Không có điều kiện
          </div>
        </div>
      </template>

      <template #cell(status)="{ item }">
        <UiBadge
          :variant="getCouponStatus(item).variant as any"
          :label="getCouponStatus(item).label"
          rounded
        />
      </template>

      <template #cell(usage)="{ item }">
        <div class="min-w-0">
          <div class="mb-1 flex items-center justify-between">
            <span class="text-[11px] font-medium text-slate-500">
              {{ item.usedCount }}/{{ item.usageLimit || "8" }}
            </span>
            <span
              class="text-[11px] font-semibold text-slate-700 dark:text-slate-300"
            >
              {{ usagePercent(item) }}%
            </span>
          </div>
          <div
            v-if="item.usageLimit"
            class="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800"
          >
            <div
              class="h-2 rounded-full bg-primary transition-all"
              :style="{ width: `${usagePercent(item)}%` }"
            ></div>
          </div>
          <div
            v-else
            class="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700"
          ></div>
        </div>
      </template>

      <template #cell(expiry)="{ item }">
        <span class="text-xs font-medium text-slate-500">
          {{ formatDateTime(item.expiryDate) }}
        </span>
      </template>

      <template #cell(actions)="{ item }">
        <div v-if="canManageCoupons" class="flex items-center gap-1.5">
          <NuxtLink :to="`/admin/coupons/${item.id}`">
            <UiButton
              variant="ghost"
              size="sm"
              class="rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-sky-200 !hover:bg-sky-50 hover:text-sky-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-900/30 dark:!hover:bg-sky-900/20"
            >
              <Icon name="solar:pen-2-bold" size="16" />
            </UiButton>
          </NuxtLink>

          <UiButton
            variant="ghost"
            size="sm"
            class="rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-rose-200 !hover:bg-rose-50 hover:text-rose-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-rose-900/30 dark:!hover:bg-rose-900/20"
            @click="openDeleteConfirm(item)"
          >
            <Icon name="solar:trash-bin-trash-bold" size="16" />
          </UiButton>
        </div>
        <span v-else class="text-xs font-medium text-slate-400">---</span>
      </template>

      <template #empty>
        <div class="py-5 text-center">
          <div
            class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"
          >
            <Icon name="solar:box-minimalistic-line-duotone" size="24" />
          </div>
          <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Không có mã giảm giá
          </p>
        </div>
      </template>
      <template #footer>
        <UiPagination
          :total="filteredCoupons.length"
          v-model:pageSize="pageSize"
          v-model:currentPage="currentPage"
        />
      </template>
    </UiTable>

    <UiConfirm
      v-model="isConfirmOpen"
      title="Xóa mã giảm giá"
      :message="
        couponToDelete
          ? `Bạn có chắc chắn muốn xóa mã ${couponToDelete.code}?`
          : 'Bạn có chắc chắn muốn xóa mã này?'
      "
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>
