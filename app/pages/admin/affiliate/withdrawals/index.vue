<script setup lang="ts">
  definePageMeta({ layout: "admin" });
  useHead({ title: "Quản lý yêu cầu rút tiền - Admin Panel" });

  const toast = useToast();
  const { user } = useUserSession();
  const { parseServerDate } = useDateFormatter();

  interface SessionUser {
    role?: string | null;
    permissions?: string[] | null;
  }

  interface AffiliateWithdrawal {
    id: number;
    userId: number;
    username?: string;
    email?: string;
    withdrawalCode: string;
    amount: number;
    method: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
    status: string;
    note?: string;
    adminNote?: string;
    reviewedAt?: string;
    completedAt?: string;
    createdAt: string;
  }

  const { data: response, refresh } = await useFetch<{
    withdrawals: AffiliateWithdrawal[];
    stats: {
      totalWithdrawals: number;
      pendingAmount: number;
      approvedAmount: number;
      completedAmount: number;
    };
  }>("/api/admin/affiliate/withdrawals", {
    key: "admin-affiliate-withdrawals",
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

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(val || 0);

  const formatDate = (value?: string | null) => {
    const date = parseServerDate(value);
    if (!date) return "---";

    return date.toLocaleDateString("vi-VN");
  };

  const formatDateTime = (value?: string | null) => {
    const date = parseServerDate(value);
    if (!date) return "---";

    return date.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, "success" | "info" | "warning" | "slate"> =
      {
        pending: "warning",
        approved: "info",
        completed: "success",
        rejected: "slate",
      };
    return statusMap[status] || "slate";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Chờ duyệt",
      approved: "Đã duyệt",
      completed: "Hoàn tất",
      rejected: "Từ chối",
    };
    return labels[status] || status;
  };

  const getMethodLabel = (method: string) =>
    method === "wallet" ? "Ví điện tử" : "Chuyển khoản ngân hàng";

  const withdrawals = computed(() => {
    if (!response.value?.withdrawals) return [];

    return response.value.withdrawals.map((item) => ({
      ...item,
      createdDateTime: formatDateTime(item.createdAt),
    }));
  });

  const stats = computed(
    () =>
      response.value?.stats || {
        totalWithdrawals: 0,
        pendingAmount: 0,
        approvedAmount: 0,
        completedAmount: 0,
      }
  );

  const statusOptions = [
    { label: "Tất cả trạng thái", value: "all" },
    { label: "Chờ duyệt", value: "pending" },
    { label: "Đã duyệt", value: "approved" },
    { label: "Hoàn tất", value: "completed" },
    { label: "Từ chối", value: "rejected" },
  ];

  const searchQuery = ref("");
  const selectedStatus = ref("all");

  const filteredWithdrawals = computed(() => {
    return withdrawals.value.filter((item) => {
      const keyword = searchQuery.value.trim().toLowerCase();
      const matchesSearch =
        !keyword ||
        item.username?.toLowerCase().includes(keyword) ||
        item.email?.toLowerCase().includes(keyword) ||
        item.withdrawalCode?.toLowerCase().includes(keyword) ||
        item.bankName?.toLowerCase().includes(keyword);

      const matchesStatus =
        selectedStatus.value === "all" || item.status === selectedStatus.value;

      return matchesSearch && matchesStatus;
    });
  });

  const pageSize = ref(10);
  const currentPage = ref(1);

  const paginatedWithdrawals = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredWithdrawals.value.slice(start, start + pageSize.value);
  });

  watch([searchQuery, selectedStatus], () => {
    currentPage.value = 1;
  });

  watch(pageSize, () => {
    currentPage.value = 1;
  });

  const showDetailModal = ref(false);
  const selectedWithdrawal = ref<
    | (AffiliateWithdrawal & {
        createdDateTime?: string;
      })
    | null
  >(null);

  const handleViewDetail = (
    item: AffiliateWithdrawal & { createdDateTime?: string }
  ) => {
    selectedWithdrawal.value = item;
    showDetailModal.value = true;
  };

  const handleApproveWithdrawal = async (withdrawal: AffiliateWithdrawal) => {
    if (!canManageAffiliates.value) {
      toast.error("Từ chối", "Bạn không có quyền quản lý affiliate");
      return;
    }

    const loading = toast.loading(
      "Duyệt yêu cầu rút tiền...",
      `Đang duyệt yêu cầu của ${withdrawal.username}`
    );

    try {
      await $fetch(`/api/admin/affiliate/withdrawals/${withdrawal.id}`, {
        method: "PATCH",
        body: { status: "approved" },
      });

      toast.remove(loading);
      toast.success(
        "Duyệt thành công",
        `Yêu cầu của ${withdrawal.username} đã được duyệt`
      );
      showDetailModal.value = false;
      refresh();
    } catch {
      toast.remove(loading);
      toast.error("Thao tác thất bại", "Có lỗi xảy ra khi duyệt yêu cầu");
    }
  };

  const handleRejectWithdrawal = async (withdrawal: AffiliateWithdrawal) => {
    if (!canManageAffiliates.value) {
      toast.error("Từ chối", "Bạn không có quyền quản lý affiliate");
      return;
    }

    const loading = toast.loading(
      "Từ chối yêu cầu...",
      `Đang từ chối yêu cầu của ${withdrawal.username}`
    );

    try {
      await $fetch(`/api/admin/affiliate/withdrawals/${withdrawal.id}`, {
        method: "PATCH",
        body: { status: "rejected" },
      });

      toast.remove(loading);
      toast.success(
        "Từ chối thành công",
        `Yêu cầu của ${withdrawal.username} đã bị từ chối`
      );
      showDetailModal.value = false;
      refresh();
    } catch {
      toast.remove(loading);
      toast.error("Thao tác thất bại", "Có lỗi xảy ra khi từ chối yêu cầu");
    }
  };

  const handleCompleteWithdrawal = async (withdrawal: AffiliateWithdrawal) => {
    if (!canManageAffiliates.value) {
      toast.error("Từ chối", "Bạn không có quyền quản lý affiliate");
      return;
    }

    const loading = toast.loading(
      "Đánh dấu hoàn tất...",
      `Đang xác nhận hoàn tất yêu cầu của ${withdrawal.username}`
    );

    try {
      await $fetch(`/api/admin/affiliate/withdrawals/${withdrawal.id}`, {
        method: "PATCH",
        body: { status: "completed" },
      });

      toast.remove(loading);
      toast.success(
        "Hoàn tất thành công",
        `Yêu cầu của ${withdrawal.username} đã được hoàn tất`
      );
      showDetailModal.value = false;
      refresh();
    } catch {
      toast.remove(loading);
      toast.error("Thao tác thất bại", "Có lỗi xảy ra khi cập nhật trạng thái");
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
            name="solar:arrow-up-line-duotone"
            class="text-primary"
            size="16"
          />
          Hệ thống Affiliate
        </div>
        <h1
          class="text-xl font-semibold tracking-tight text-slate-900 dark:text-white"
        >
          Quản lý rút tiền
        </h1>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div
        v-for="stat in [
          {
            label: 'Tổng rút tiền',
            val: formatCurrency(stats.totalWithdrawals),
            icon: 'solar:arrow-up-line-duotone',
            color: 'text-primary bg-primary/10',
          },
          {
            label: 'Chờ duyệt',
            val: formatCurrency(stats.pendingAmount),
            icon: 'solar:hourglass-line-duotone',
            color: 'text-orange-500 bg-orange-50',
          },
          {
            label: 'Đã duyệt',
            val: formatCurrency(stats.approvedAmount),
            icon: 'solar:check-circle-bold-duotone',
            color: 'text-sky-500 bg-sky-50',
          },
          {
            label: 'Hoàn tất',
            val: formatCurrency(stats.completedAmount),
            icon: 'solar:check-circle-bold-duotone',
            color: 'text-emerald-500 bg-emerald-50',
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
            class="mb-1 text-[12px] font-semibold leading-none tracking-tighter text-slate-400"
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
        { key: 'user', label: 'Người dùng' },
        { key: 'code', label: 'Mã yêu cầu', width: '160px' },
        { key: 'amount', label: 'Số tiền', width: '140px' },
        { key: 'method', label: 'Phương thức', width: '160px' },
        { key: 'status', label: 'Trạng thái', width: '120px' },
        { key: 'date', label: 'Ngày yêu cầu', width: '130px' },
        { key: 'actions', label: 'Hành động', align: 'right', width: '210px' },
      ]"
      :items="paginatedWithdrawals"
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
              Danh sách yêu cầu rút tiền
            </p>
          </div>

          <div class="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div class="w-full sm:min-w-[300px]">
              <UiInput
                v-model="searchQuery"
                placeholder="Tìm theo user, email, mã yêu cầu, ngân hàng..."
                class="h-10 rounded-[14px] border-slate-200 bg-white shadow-sm focus:bg-white"
              >
                <template #left-icon>
                  <Icon name="solar:magnifer-line-duotone" size="18" />
                </template>
              </UiInput>
            </div>
            <div class="w-full shrink-0 sm:w-[200px]">
              <UiDropdown v-model="selectedStatus" :options="statusOptions" />
            </div>
          </div>
        </div>
      </template>

      <template #cell(user)="{ item }">
        <div class="flex min-w-0 items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary"
          >
            {{ item.username?.charAt(0).toUpperCase() || "U" }}
          </div>
          <div class="relative z-[1] min-w-0">
            <p
              class="max-w-[180px] truncate text-sm font-semibold leading-5 text-slate-800 dark:text-slate-100"
            >
              {{ item.username || "---" }}
            </p>
            <p
              class="mt-0.5 truncate text-[11px] font-medium leading-5 text-slate-500 dark:text-slate-400"
            >
              {{ item.email || "---" }}
            </p>
          </div>
        </div>
      </template>

      <template #cell(code)="{ item }">
        <div class="space-y-1">
          <p
            class="font-mono text-[13px] font-bold text-slate-800 dark:text-slate-200"
          >
            {{ item.withdrawalCode }}
          </p>
        </div>
      </template>

      <template #cell(amount)="{ item }">
        <span
          class="whitespace-nowrap font-mono text-[13px] font-bold text-emerald-600 dark:text-emerald-400"
        >
          {{ formatCurrency(item.amount) }}
        </span>
      </template>

      <template #cell(method)="{ item }">
        <div class="space-y-1">
          <UiBadge
            :variant="item.method === 'wallet' ? 'info' : 'warning'"
            :label="item.method === 'wallet' ? 'Ví' : 'Ngân hàng'"
            rounded
          />
        </div>
      </template>

      <template #cell(status)="{ item }">
        <UiBadge
          :variant="getStatusBadge(item.status)"
          :label="getStatusLabel(item.status)"
          rounded
        />
      </template>

      <template #cell(date)="{ item }">
        <div class="space-y-1 text-right">
          <p
            class="text-[12px] font-semibold text-slate-700 dark:text-slate-200"
          >
            {{ item.createdDateTime }}
          </p>
        </div>
      </template>

      <template #cell(actions)="{ item }">
        <div
          v-if="canManageAffiliates"
          class="flex items-center justify-end gap-1.5 whitespace-nowrap"
        >
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
            @click="handleViewDetail(item)"
            title="Xem chi tiết"
          >
            <Icon name="solar:eye-line-duotone" size="16" />
          </button>

          <button
            v-if="item.status === 'pending'"
            type="button"
            class="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-500 px-2.5 text-[11px] font-bold text-white transition hover:bg-emerald-600"
            @click="handleApproveWithdrawal(item)"
            title="Duyệt yêu cầu"
          >
            <Icon name="solar:check-circle-line-duotone" size="14" />
            Duyệt
          </button>

          <button
            v-if="item.status === 'approved'"
            type="button"
            class="inline-flex h-8 items-center gap-1 rounded-lg bg-sky-500 px-2.5 text-[11px] font-bold text-white transition hover:bg-sky-600"
            @click="handleCompleteWithdrawal(item)"
            title="Đánh dấu hoàn tất"
          >
            <Icon name="solar:verified-check-line-duotone" size="14" />
            Xong
          </button>

          <button
            v-if="item.status !== 'completed' && item.status !== 'rejected'"
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20"
            @click="handleRejectWithdrawal(item)"
            title="Từ chối"
          >
            <Icon name="solar:close-circle-line-duotone" size="16" />
          </button>
        </div>
        <span v-else class="text-xs font-medium text-slate-400">---</span>
      </template>

      <template #empty>
        <div class="py-8 text-center">
          <div
            class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"
          >
            <Icon name="solar:box-minimalistic-line-duotone" size="24" />
          </div>
          <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Không có yêu cầu rút tiền
          </p>
        </div>
      </template>

      <template #footer>
        <UiPagination
          :total="filteredWithdrawals.length"
          v-model:pageSize="pageSize"
          v-model:currentPage="currentPage"
        />
      </template>
    </UiTable>

    <UiModal
      v-model="showDetailModal"
      title="Chi tiết yêu cầu rút tiền"
      size="2xl"
    >
      <div v-if="selectedWithdrawal" class="space-y-5">
        <div
          class="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50 p-5 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900"
        >
          <div
            class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
          >
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="rounded-full bg-white px-3 py-1 font-mono text-[12px] font-bold text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200"
                >
                  {{ selectedWithdrawal.withdrawalCode }}
                </span>
                <UiBadge
                  :variant="getStatusBadge(selectedWithdrawal.status)"
                  :label="getStatusLabel(selectedWithdrawal.status)"
                  rounded
                />
              </div>
              <p
                class="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400"
              >
                Số tiền rút
              </p>
              <p
                class="mt-1 text-3xl font-semibold text-emerald-600 dark:text-emerald-400"
              >
                {{ formatCurrency(selectedWithdrawal.amount) }}
              </p>
            </div>

            <div class="grid grid-cols-2 gap-3 lg:min-w-[280px]">
              <div
                class="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
              >
                <p
                  class="text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                >
                  Ngày gửi
                </p>
                <p
                  class="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  {{ formatDateTime(selectedWithdrawal.createdAt) }}
                </p>
              </div>
              <div
                class="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
              >
                <p
                  class="text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                >
                  Phương thức
                </p>
                <p
                  class="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  {{ getMethodLabel(selectedWithdrawal.method) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div class="space-y-5 xl:col-span-5">
            <section
              class="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div class="mb-4 flex items-center gap-3">
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"
                >
                  <Icon name="solar:user-line-duotone" size="20" />
                </div>
                <div>
                  <p class="text-base font-bold text-slate-900 dark:text-white">
                    Người gửi yêu cầu
                  </p>
                  <p class="text-xs text-slate-400">
                    Thông tin tài khoản affiliate
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-3">
                <div class="rounded-2xl bg-white px-4 py-3 dark:bg-slate-950">
                  <p
                    class="text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Tên người dùng
                  </p>
                  <p
                    class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100"
                  >
                    {{ selectedWithdrawal.username || "---" }}
                  </p>
                </div>
                <div class="rounded-2xl bg-white px-4 py-3 dark:bg-slate-950">
                  <p
                    class="text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Email
                  </p>
                  <p
                    class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100"
                  >
                    {{ selectedWithdrawal.email || "---" }}
                  </p>
                </div>
              </div>
            </section>

            <section
              v-if="selectedWithdrawal.note || selectedWithdrawal.adminNote"
              class="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div class="mb-4 flex items-center gap-3">
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 dark:bg-amber-900/20"
                >
                  <Icon name="solar:document-text-line-duotone" size="20" />
                </div>
                <div>
                  <p class="text-base font-bold text-slate-900 dark:text-white">
                    Ghi chú
                  </p>
                  <p class="text-xs text-slate-400">
                    Nội dung từ user và admin
                  </p>
                </div>
              </div>

              <div class="space-y-3">
                <div
                  v-if="selectedWithdrawal.note"
                  class="rounded-2xl bg-white px-4 py-3 dark:bg-slate-950"
                >
                  <p
                    class="text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Người dùng
                  </p>
                  <p
                    class="mt-1 text-[13px] leading-6 text-slate-700 dark:text-slate-300"
                  >
                    {{ selectedWithdrawal.note }}
                  </p>
                </div>

                <div
                  v-if="selectedWithdrawal.adminNote"
                  class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-900/10"
                >
                  <p
                    class="text-[11px] font-semibold uppercase tracking-wider text-amber-600/80"
                  >
                    Admin
                  </p>
                  <p
                    class="mt-1 text-[13px] leading-6 text-amber-700 dark:text-amber-200"
                  >
                    {{ selectedWithdrawal.adminNote }}
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div class="space-y-5 xl:col-span-7">
            <section
              class="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div class="mb-4 flex items-center gap-3">
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-500 dark:bg-sky-900/20"
                >
                  <Icon name="solar:card-send-line-duotone" size="20" />
                </div>
                <div>
                  <p class="text-base font-bold text-slate-900 dark:text-white">
                    Thông tin nhận tiền
                  </p>
                  <p class="text-xs text-slate-400">
                    Chi tiết tài khoản ngân hàng người nhận
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div class="rounded-2xl bg-white px-4 py-3 dark:bg-slate-950">
                  <p
                    class="text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Ngân hàng
                  </p>
                  <p
                    class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100"
                  >
                    {{ selectedWithdrawal.bankName || "---" }}
                  </p>
                </div>
                <div class="rounded-2xl bg-white px-4 py-3 dark:bg-slate-950">
                  <p
                    class="text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Số tài khoản
                  </p>
                  <p
                    class="mt-1 font-mono text-sm font-semibold text-slate-800 dark:text-slate-100"
                  >
                    {{ selectedWithdrawal.bankAccountNumber || "---" }}
                  </p>
                </div>
                <div
                  class="rounded-2xl bg-white px-4 py-3 dark:bg-slate-950 md:col-span-2"
                >
                  <p
                    class="text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Chủ tài khoản
                  </p>
                  <p
                    class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100"
                  >
                    {{ selectedWithdrawal.bankAccountName || "---" }}
                  </p>
                </div>
              </div>
            </section>

            <section
              class="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div class="mb-4 flex items-center gap-3">
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20"
                >
                  <Icon name="solar:clock-circle-line-duotone" size="20" />
                </div>
                <div>
                  <p class="text-base font-bold text-slate-900 dark:text-white">
                    Trạng thái xử lý
                  </p>
                  <p class="text-xs text-slate-400">
                    Các mốc thời gian liên quan đến yêu cầu
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div class="rounded-2xl bg-white px-4 py-3 dark:bg-slate-950">
                  <p
                    class="text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Trạng thái hiện tại
                  </p>
                  <div class="mt-2">
                    <UiBadge
                      :variant="getStatusBadge(selectedWithdrawal.status)"
                      :label="getStatusLabel(selectedWithdrawal.status)"
                      rounded
                    />
                  </div>
                </div>
                <div class="rounded-2xl bg-white px-4 py-3 dark:bg-slate-950">
                  <p
                    class="text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Đã duyệt lúc
                  </p>
                  <p
                    class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100"
                  >
                    {{ formatDateTime(selectedWithdrawal.reviewedAt) }}
                  </p>
                </div>
                <div
                  class="rounded-2xl bg-white px-4 py-3 dark:bg-slate-950 md:col-span-2"
                >
                  <p
                    class="text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Hoàn tất lúc
                  </p>
                  <p
                    class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100"
                  >
                    {{ formatDateTime(selectedWithdrawal.completedAt) }}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <template #footer>
        <div
          v-if="selectedWithdrawal"
          class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <button
            type="button"
            class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            @click="showDetailModal = false"
          >
            Đóng
          </button>

          <div
            v-if="canManageAffiliates"
            class="flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <button
              v-if="selectedWithdrawal.status === 'pending'"
              type="button"
              class="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 text-sm font-bold text-white transition hover:bg-emerald-600"
              @click="handleApproveWithdrawal(selectedWithdrawal)"
            >
              <Icon name="solar:check-circle-line-duotone" size="18" />
              Duyệt yêu cầu
            </button>

            <button
              v-if="selectedWithdrawal.status === 'approved'"
              type="button"
              class="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 text-sm font-bold text-white transition hover:bg-sky-600"
              @click="handleCompleteWithdrawal(selectedWithdrawal)"
            >
              <Icon name="solar:check-circle-line-duotone" size="18" />
              Đánh dấu hoàn tất
            </button>

            <button
              v-if="
                selectedWithdrawal.status !== 'completed' &&
                selectedWithdrawal.status !== 'rejected'
              "
              type="button"
              class="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 text-sm font-bold text-white transition hover:bg-rose-600"
              @click="handleRejectWithdrawal(selectedWithdrawal)"
            >
              <Icon name="solar:trash-bin-line-duotone" size="18" />
              Từ chối
            </button>
          </div>
        </div>
      </template>
    </UiModal>
  </div>
</template>
