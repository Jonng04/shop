<script setup lang="ts">
  definePageMeta({ layout: "admin" });
  useHead({ title: "Quản lý hoa hồng Affiliate - Admin Panel" });

  const toast = useToast();
  const { user } = useUserSession();

  interface SessionUser {
    role?: string | null;
    permissions?: string[] | null;
  }

  interface AffiliateCommission {
    id: number;
    affiliateUserId: number;
    affiliateUsername?: string;
    referredUserId?: number;
    referredUsername?: string;
    orderId: number;
    orderCode?: string;
    commissionRate: number;
    orderAmount: number;
    commissionAmount: number;
    status: string;
    note?: string;
    createdAt: string;
  }

  const { formatDateTime } = useDateFormatter();

  const { data: response, refresh } = await useFetch<{
    commissions: AffiliateCommission[];
    stats: any;
  }>("/api/admin/affiliate/commissions", {
    key: "admin-affiliate-commissions",
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

  const commissions = computed(() => {
    if (!response.value?.commissions) return [];
    return response.value.commissions.map((item: AffiliateCommission) => ({
      ...item,
      createdDateTime: formatDateTime(item.createdAt, "vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    }));
  });

  const stats = computed(
    () =>
      response.value?.stats || {
        totalCommissions: 0,
        successAmount: 0,
        cancelledAmount: 0,
      }
  );

  const statusOptions = [
    { label: "Tất cả trạng thái", value: "all" },
    { label: "Thành công", value: "paid" },
    { label: "Đã hủy", value: "cancelled" },
  ];

  const searchQuery = ref("");
  const selectedStatus = ref("all");

  const filteredCommissions = computed(() => {
    return commissions.value.filter((item) => {
      const keyword = searchQuery.value.trim().toLowerCase();
      const matchesSearch =
        !keyword ||
        item.affiliateUsername?.toLowerCase().includes(keyword) ||
        item.orderCode?.toLowerCase().includes(keyword) ||
        item.referredUsername?.toLowerCase().includes(keyword);

      const matchesStatus =
        selectedStatus.value === "all" || item.status === selectedStatus.value;

      return matchesSearch && matchesStatus;
    });
  });

  const pageSize = ref(10);
  const currentPage = ref(1);

  const paginatedCommissions = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredCommissions.value.slice(start, start + pageSize.value);
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

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, "success" | "info" | "warning" | "slate"> =
      {
        paid: "success",
        cancelled: "slate",
      };
    return statusMap[status] || "slate";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      paid: "Thành công",
      cancelled: "Đã hủy",
    };
    return labels[status] || status;
  };

  const showCancelModal = ref(false);
  const cancelling = ref(false);
  const cancelNote = ref("");
  const selectedCommission = ref<AffiliateCommission | null>(null);

  const openCancelModal = (commission: AffiliateCommission) => {
    selectedCommission.value = commission;
    cancelNote.value = "";
    showCancelModal.value = true;
  };

  const closeCancelModal = () => {
    if (cancelling.value) return;
    showCancelModal.value = false;
    selectedCommission.value = null;
    cancelNote.value = "";
  };

  const handleRejectCommission = async () => {
    if (!canManageAffiliates.value) {
      toast.error("Từ chối", "Bạn không có quyền quản lý affiliate");
      return;
    }

    const commission = selectedCommission.value;
    if (!commission) {
      toast.error("Lỗi", "Không tìm thấy hoa hồng cần hủy");
      return;
    }

    const note = cancelNote.value.trim();
    if (!note) {
      toast.error("Thiếu ghi chú", "Vui lòng nhập lý do hủy hoa hồng");
      return;
    }

    cancelling.value = true;

    const loading = toast.loading(
      "Hủy hoa hồng...",
      `Đang hủy hoa hồng của ${commission.affiliateUsername}`
    );

    try {
      await $fetch(`/api/admin/affiliate/commissions/${commission.id}`, {
        method: "PATCH",
        body: {
          status: "cancelled",
          note,
        },
      });

      toast.remove(loading);
      toast.success(
        "Hủy thành công!",
        `Hoa hồng của ${commission.affiliateUsername} đã được hủy.`
      );
      closeCancelModal();
      refresh();
    } catch {
      toast.remove(loading);
      toast.error("Thao tác thất bại", "Có lỗi xảy ra khi hủy hoa hồng");
    } finally {
      cancelling.value = false;
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
            name="solar:wallet-bold-duotone"
            class="text-primary"
            size="16"
          />
          Hệ thống Affiliate
        </div>
        <h1
          class="text-xl font-semibold tracking-tight text-slate-900 dark:text-white"
        >
          Quản lý hoa hồng
        </h1>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div
        v-for="stat in [
          {
            label: 'Tổng hoa hồng',
            val: formatCurrency(stats.totalCommissions),
            icon: 'solar:wallet-bold-duotone',
            color: 'text-primary bg-primary/10',
          },
          {
            label: 'Thành công',
            val: formatCurrency(stats.successAmount),
            icon: 'solar:check-circle-bold-duotone',
            color: 'text-emerald-500 bg-emerald-50',
          },
          {
            label: 'Đã hủy',
            val: formatCurrency(stats.cancelledAmount),
            icon: 'solar:danger-triangle-bold-duotone',
            color: 'text-rose-500 bg-rose-50',
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
        { key: 'affiliate', label: 'Affiliate' },
        { key: 'order', label: 'Đơn hàng' },
        { key: 'amount', label: 'Tiền đơn', width: '130px' },
        { key: 'rate', label: 'Tỷ lệ (%)', width: '100px' },
        { key: 'commission', label: 'Hoa hồng', width: '130px' },
        { key: 'status', label: 'Trạng thái', width: '120px' },
        { key: 'date', label: 'Ngày giờ', width: '170px' },
        { key: 'actions', label: 'Hành động', align: 'right', width: '150px' },
      ]"
      :items="paginatedCommissions"
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
                Danh sách hoa hồng
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

      <template #cell(affiliate)="{ item }">
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary"
          >
            {{ item.affiliateUsername?.charAt(0).toUpperCase() }}
          </div>
          <div class="min-w-0">
            <p
              class="max-w-[150px] truncate text-sm font-semibold leading-tight text-slate-800 dark:text-slate-100"
            >
              {{ item.affiliateUsername }}
            </p>
          </div>
        </div>
      </template>

      <template #cell(order)="{ item }">
        <div class="flex flex-col">
          <span
            class="text-[13px] font-bold text-slate-800 dark:text-slate-200"
          >
            {{ item.orderCode || `#${item.orderId}` }}
          </span>
          <span
            v-if="item.referredUsername"
            class="mt-1 text-[11px] text-slate-400"
          >
            {{ item.referredUsername }}
          </span>
        </div>
      </template>

      <template #cell(amount)="{ item }">
        <span
          class="font-mono text-[13px] font-bold text-slate-800 dark:text-slate-200"
        >
          {{ formatCurrency(item.orderAmount) }}
        </span>
      </template>

      <template #cell(rate)="{ item }">
        <span class="font-mono font-bold text-primary"
          >{{ item.commissionRate }}%</span
        >
      </template>

      <template #cell(commission)="{ item }">
        <span
          class="font-mono text-[13px] font-bold text-emerald-600 dark:text-emerald-400"
        >
          {{ formatCurrency(item.commissionAmount) }}
        </span>
      </template>

      <template #cell(status)="{ item }">
        <UiBadge
          :variant="getStatusBadge(item.status)"
          :label="getStatusLabel(item.status)"
          rounded
        />
      </template>

      <template #cell(date)="{ item }">
        <span
          class="text-[12px] font-medium text-slate-600 dark:text-slate-400"
        >
          {{ item.createdDateTime }}
        </span>
      </template>

      <template #cell(actions)="{ item }">
        <div
          v-if="canManageAffiliates"
          class="flex items-center justify-end gap-1"
        >
          <button
            v-if="item.status === 'paid'"
            type="button"
            class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20"
            @click="openCancelModal(item)"
          >
            <Icon name="solar:trash-bin-trash-line-duotone" size="18" />
          </button>
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
            Không có hoa hồng
          </p>
        </div>
      </template>

      <template #footer>
        <UiPagination
          :total="filteredCommissions.length"
          v-model:pageSize="pageSize"
          v-model:currentPage="currentPage"
        />
      </template>
    </UiTable>

    <UiModal v-model="showCancelModal" title="Hủy hoa hồng" size="md">
      <div class="space-y-4">
        <p class="text-sm text-slate-600 dark:text-slate-300">
          Hủy hoa hồng của
          <span class="font-semibold text-slate-900 dark:text-white">
            {{ selectedCommission?.affiliateUsername || "---" }}
          </span>
          do nghi ngờ gian lận.
        </p>

        <UiTextarea
          v-model="cancelNote"
          placeholder="Nhập lý do hủy hoa hồng..."
          :rows="4"
        />

        <div class="flex justify-end gap-2 pt-1">
          <UiButton
            variant="secondary"
            :disabled="cancelling"
            @click="closeCancelModal"
          >
            Đóng
          </UiButton>
          <UiButton
            variant="danger"
            :loading="cancelling"
            @click="handleRejectCommission"
          >
            Xác nhận hủy
          </UiButton>
        </div>
      </div>
    </UiModal>
  </div>
</template>
