<script setup lang="ts">
  definePageMeta({ layout: "admin" });
  useHead({ title: "Quản lý Flash Sale - Admin Panel" });
  const { formatDateTime } = useDateFormatter();

  interface FlashSaleItem {
    id: number;
    name: string;
    product: string;
    plan?: string | null;
    discountType: "percent" | "fixed";
    discountValue: number;
    maxDiscount?: number | null;
    startAt: string;
    endAt: string;
    status: "upcoming" | "running" | "ended" | "paused";
    quantityLimit: number;
    soldCount: number;
  }

  const toast = useToast();
  const flashSales = ref<FlashSaleItem[]>([]);
  const listLoading = ref(false);
  const searchQuery = ref("");
  const selectedStatus = ref("all");
  const pageSize = ref(10);
  const currentPage = ref(1);
  const isConfirmOpen = ref(false);
  const deletingId = ref<number | null>(null);
  const isDeleting = ref(false);

  const statusOptions = [
    { label: "Tất cả trạng thái", value: "all" },
    { label: "Đang chạy", value: "running" },
    { label: "Sắp diễn ra", value: "upcoming" },
    { label: "Tạm dừng", value: "paused" },
    { label: "Đã kết thúc", value: "ended" },
  ];

  const loadFlashSales = async () => {
    listLoading.value = true;

    try {
      const response = await $fetch<{ items: FlashSaleItem[] }>(
        "/api/admin/flash-sales"
      );
      flashSales.value = response.items || [];
    } catch (error: any) {
      toast.error(
        "Thất bại",
        error?.data?.message || error?.message || "Không thể tải danh sách flash sale"
      );
    } finally {
      listLoading.value = false;
    }
  };

  const openDeleteConfirm = (id: number) => {
    deletingId.value = id;
    isConfirmOpen.value = true;
  };

  const confirmDelete = async () => {
    if (!deletingId.value) {
      return;
    }

    isDeleting.value = true;
    try {
      await $fetch(`/api/admin/flash-sales/${deletingId.value}`, {
        method: "DELETE",
      });
      toast.success("Thành công", "Đã xóa flash sale");
      await loadFlashSales();
    } catch (error: any) {
      toast.error(
        "Thất bại",
        error?.data?.message || error?.message || "Không thể xóa flash sale"
      );
    } finally {
      isDeleting.value = false;
      isConfirmOpen.value = false;
      deletingId.value = null;
    }
  };

  const filteredFlashSales = computed(() => {
    const keyword = searchQuery.value.trim().toLowerCase();

    return flashSales.value.filter((item) => {
      const matchesSearch =
        !keyword ||
        item.name.toLowerCase().includes(keyword) ||
        item.product.toLowerCase().includes(keyword) ||
        String(item.plan || "")
          .toLowerCase()
          .includes(keyword) ||
        item.id.toString().includes(keyword);

      const matchesStatus =
        selectedStatus.value === "all" || item.status === selectedStatus.value;

      return matchesSearch && matchesStatus;
    });
  });

  const paginatedFlashSales = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredFlashSales.value.slice(start, start + pageSize.value);
  });

  watch([searchQuery, selectedStatus], () => {
    currentPage.value = 1;
  });

  watch(pageSize, () => {
    currentPage.value = 1;
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);

  const formatDiscount = (item: FlashSaleItem) =>
    item.discountType === "percent"
      ? `${item.discountValue}%`
      : formatCurrency(item.discountValue);

  const formatDateTimeSafe = (value: string | null) => {
    const formatted = formatDateTime(value);
    return formatted === "---" ? "Chua dat" : formatted;
  };

  const getStatusMeta = (status: FlashSaleItem["status"]) => {
    switch (status) {
      case "running":
        return { label: "Đang chạy", variant: "success" };
      case "upcoming":
        return { label: "Sắp diễn ra", variant: "info" };
      case "paused":
        return { label: "Tạm dừng", variant: "warning" };
      case "ended":
        return { label: "Đã kết thúc", variant: "error" };
      default:
        return { label: status, variant: "slate" };
    }
  };

  const progressPercent = (item: FlashSaleItem) => {
    if (item.quantityLimit <= 0) return 0;
    return Math.min(100, Math.round((item.soldCount / item.quantityLimit) * 100));
  };

  const stats = computed(() => {
    const total = flashSales.value.length;
    const running = flashSales.value.filter(
      (item) => item.status === "running"
    ).length;
    const upcoming = flashSales.value.filter(
      (item) => item.status === "upcoming"
    ).length;
    const totalSold = flashSales.value.reduce(
      (sum, item) => sum + item.soldCount,
      0
    );

    return { total, running, upcoming, totalSold };
  });

  onMounted(loadFlashSales);
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
          <Icon name="solar:fire-bold-duotone" class="text-primary" size="16" />
          Marketing & khuyến mãi
        </div>
        <h1
          class="text-xl font-semibold tracking-tight text-slate-900 dark:text-white"
        >
          Quản lý Flash Sale
        </h1>
      </div>

      <NuxtLink to="/admin/flash-sales/create">
        <UiButton>
          <template #prefix>
            <Icon name="solar:add-circle-line-duotone" size="18" />
          </template>
          Thêm Flash Sale
        </UiButton>
      </NuxtLink>
    </div>

    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div
        v-for="stat in [
          {
            label: 'Tổng chương trình',
            val: stats.total.toString(),
            icon: 'solar:widget-5-bold-duotone',
            color: 'text-primary bg-primary/10',
          },
          {
            label: 'Đang chạy',
            val: stats.running.toString(),
            icon: 'solar:play-circle-bold-duotone',
            color: 'text-emerald-500 bg-emerald-50',
          },
          {
            label: 'Sắp diễn ra',
            val: stats.upcoming.toString(),
            icon: 'solar:clock-circle-bold-duotone',
            color: 'text-sky-500 bg-sky-50',
          },
          {
            label: 'Sản phẩm đã bán',
            val: stats.totalSold.toString(),
            icon: 'solar:cart-check-bold-duotone',
            color: 'text-amber-500 bg-amber-50',
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
            {{ stat.val }}
          </p>
        </div>
      </div>
    </div>

    <UiTable
      :headers="[
        { key: 'flashSale', label: 'Flash Sale', width: '260px' },
        { key: 'status', label: 'Trạng thái', width: '140px' },
        { key: 'pricing', label: 'Giảm giá', width: '220px' },
        { key: 'duration', label: 'Thời gian', width: '220px' },
        { key: 'progress', label: 'Tiến độ', width: '180px' },
        { key: 'actions', label: 'Thao tác', width: '120px' },
      ]"
      :items="paginatedFlashSales"
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
              Danh sách Flash Sale
            </p>
          </div>

          <div class="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div class="w-full sm:min-w-[280px]">
              <UiInput
                v-model="searchQuery"
                placeholder="Tìm theo tên chương trình, sản phẩm..."
                class="h-10 rounded-[14px] border-slate-200 bg-white"
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

      <template #cell(flashSale)="{ item }">
        <div class="min-w-0">
          <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {{ item.name }}
          </p>
          <p class="mt-1 text-[11px] font-medium text-slate-400">
            {{ item.product }}
            <span v-if="item.plan"> • {{ item.plan }}</span>
            • #FS{{ item.id }}
          </p>
        </div>
      </template>

      <template #cell(status)="{ item }">
        <UiBadge
          :variant="getStatusMeta(item.status).variant as any"
          :label="getStatusMeta(item.status).label"
          rounded
        />
      </template>

      <template #cell(pricing)="{ item }">
        <div class="min-w-0">
          <p class="font-mono text-[13px] font-semibold text-primary">
            {{ formatDiscount(item) }}
          </p>
          <p class="mt-1 text-[11px] font-medium text-slate-400">
            Tối đa:
            {{
              item.maxDiscount && item.maxDiscount > 0
                ? formatCurrency(item.maxDiscount)
                : "Không giới hạn"
            }}
          </p>
        </div>
      </template>

      <template #cell(duration)="{ item }">
        <div class="min-w-0">
          <p class="text-xs font-medium text-slate-500">
            Bắt đầu: {{ formatDateTimeSafe(item.startAt) }}
          </p>
          <p class="mt-1 text-xs font-medium text-slate-500">
            Kết thúc: {{ formatDateTimeSafe(item.endAt) }}
          </p>
        </div>
      </template>

      <template #cell(progress)="{ item }">
        <div class="min-w-0">
          <div class="mb-1 flex items-center justify-between">
            <span class="text-[11px] font-medium text-slate-500">
              {{ item.soldCount }}/{{ item.quantityLimit || "∞" }}
            </span>
            <span
              class="text-[11px] font-semibold text-slate-700 dark:text-slate-300"
            >
              {{ progressPercent(item) }}%
            </span>
          </div>
          <div class="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              class="h-2 rounded-full bg-primary transition-all"
              :style="{ width: `${progressPercent(item)}%` }"
            ></div>
          </div>
        </div>
      </template>

      <template #cell(actions)="{ item }">
        <div class="flex items-center gap-1.5">
          <NuxtLink :to="`/admin/flash-sales/${item.id}`">
            <UiButton
              variant="ghost"
              size="sm"
              class="rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-primary/30 !hover:bg-primary/10 hover:text-primary dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary/20 dark:!hover:bg-primary/10"
            >
              <Icon name="solar:pen-new-square-bold" size="16" />
            </UiButton>
          </NuxtLink>

          <UiButton
            variant="ghost"
            size="sm"
            class="rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-rose-200 !hover:bg-rose-50 hover:text-rose-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-rose-900/30 dark:!hover:bg-rose-900/20"
            @click="openDeleteConfirm(item.id)"
          >
            <Icon name="solar:trash-bin-trash-bold" size="16" />
          </UiButton>
        </div>
      </template>

      <template #empty>
        <div class="py-5 text-center">
          <div
            class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"
          >
            <Icon name="solar:box-minimalistic-line-duotone" size="24" />
          </div>
          <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {{ listLoading ? "Đang tải flash sale..." : "Không có flash sale" }}
          </p>
        </div>
      </template>
      <template #footer>
        <UiPagination
          :total="filteredFlashSales.length"
          v-model:pageSize="pageSize"
          v-model:currentPage="currentPage"
        />
      </template>
    </UiTable>

    <UiConfirm
      v-model="isConfirmOpen"
      title="Xóa flash sale"
      message="Bạn có chắc muốn xóa flash sale này không? Hành động này không thể hoàn tác."
      confirm-label="Xóa"
      cancel-label="Hủy"
      :loading="isDeleting"
      variant="danger"
      @confirm="confirmDelete"
    />
  </div>
</template>


