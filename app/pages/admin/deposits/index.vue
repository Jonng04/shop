<script setup lang="ts">
  definePageMeta({ layout: "admin" });
  useHead({ title: "Quản lý hóa đơn nạp - Admin Panel" });
  const { formatDateTime } = useDateFormatter();

  interface DepositInvoice {
    id: number;
    paymentCode: string;
    username: string | null;
    userId: number;
    email: string | null;
    status:
      | "pending"
      | "paid"
      | "failed"
      | "cancelled"
      | "expired"
      | "refunded";
    amount: number;
    receivedAmount: number;
    referenceCode: string | null;
    transferContent: string | null;
    note: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    paidAt: string | null;
  }

  interface DepositStats {
    totalAmount: number;
    monthlyAmount: number;
    weeklyAmount: number;
    todayAmount: number;
  }

  interface DepositChartPoint {
    day: string;
    amount: number;
  }

  interface DepositsResponse {
    items: DepositInvoice[];
    stats: DepositStats;
    chart: DepositChartPoint[];
  }

  const pageSize = ref(10);
  const currentPage = ref(1);
  const selectedInvoiceId = ref<number | null>(null);
  const isDetailModalOpen = ref(false);
  const searchUsername = ref("");
  const searchPaymentCode = ref("");
  const searchTransferContent = ref("");
  const selectedStatus = ref("all");
  const selectedDateRange = ref("all");

  const statusOptions = [
    { label: "Tất cả trạng thái", value: "all" },
    { label: "Đã thanh toán", value: "paid" },
    { label: "Đang chờ", value: "pending" },
    { label: "Thất bại", value: "failed" },
    { label: "Đã hủy", value: "cancelled" },
    { label: "Hết hạn", value: "expired" },
    { label: "Đã hoàn tiền", value: "refunded" },
  ];

  const dateRangeOptions = [
    { label: "Tất cả thời gian", value: "all" },
    { label: "Hôm nay", value: "today" },
    { label: "7 ngày qua", value: "7d" },
    { label: "Tháng này", value: "month" },
  ];

  const queryParams = computed(() => ({
    username: searchUsername.value || undefined,
    paymentCode: searchPaymentCode.value || undefined,
    transferContent: searchTransferContent.value || undefined,
    status: selectedStatus.value,
    dateRange: selectedDateRange.value,
  }));

  const {
    data: depositsData,
    pending,
    refresh,
  } = await useFetch<DepositsResponse>("/api/admin/deposits", {
    key: "admin-deposits-list",
    query: queryParams,
    default: () => ({
      items: [],
      stats: {
        totalAmount: 0,
        monthlyAmount: 0,
        weeklyAmount: 0,
        todayAmount: 0,
      },
      chart: [],
    }),
  });

  const depositInvoices = computed(() => depositsData.value?.items || []);
  const stats = computed(
    () =>
      depositsData.value?.stats || {
        totalAmount: 0,
        monthlyAmount: 0,
        weeklyAmount: 0,
        todayAmount: 0,
      }
  );
  const chartPoints = computed(() => depositsData.value?.chart || []);
  const selectedInvoice = computed(
    () =>
      depositInvoices.value.find(
        (item) => item.id === selectedInvoiceId.value
      ) || null
  );

  const paginatedInvoices = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return depositInvoices.value.slice(start, start + pageSize.value);
  });

  watch(
    [
      searchUsername,
      searchPaymentCode,
      searchTransferContent,
      selectedStatus,
      selectedDateRange,
    ],
    () => {
      currentPage.value = 1;
    }
  );

  watch(pageSize, () => {
    currentPage.value = 1;
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value || 0);

  const currentMonthLabel = computed(() => {
    return new Intl.DateTimeFormat("vi-VN", {
      month: "2-digit",
      year: "numeric",
    }).format(Date.now());
  });

  const maxChartValue = computed(() =>
    Math.max(...chartPoints.value.map((point) => point.amount), 1)
  );

  const chartCoordinates = computed(() => {
    const width = 760;
    const height = 240;
    const paddingX = 20;
    const paddingY = 18;

    return chartPoints.value.map((point, index) => {
      const x =
        paddingX +
        (index * (width - paddingX * 2)) /
          Math.max(chartPoints.value.length - 1, 1);
      const y =
        height -
        paddingY -
        (point.amount / maxChartValue.value) * (height - paddingY * 2);

      return { ...point, x, y };
    });
  });

  const chartPath = computed(() =>
    chartCoordinates.value
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ")
  );

  const areaPath = computed(() => {
    const points = chartCoordinates.value;
    if (!points.length) return "";

    const first = points[0]!;
    const last = points[points.length - 1]!;
    return `${chartPath.value} L ${last.x} 222 L ${first.x} 222 Z`;
  });

  const getStatusMeta = (status: DepositInvoice["status"]) => {
    switch (status) {
      case "paid":
        return { label: "Đã thanh toán", variant: "success" };
      case "pending":
        return { label: "Chờ thanh toán", variant: "warning" };
      case "failed":
        return { label: "Thất bại", variant: "error" };
      case "cancelled":
        return { label: "Đã hủy", variant: "slate" };
      case "expired":
        return { label: "Hết hạn", variant: "slate" };
      case "refunded":
        return { label: "Đã hoàn tiền", variant: "info" };
      default:
        return { label: status, variant: "slate" };
    }
  };

  const receivedAmountClass = (item: DepositInvoice) => {
    if (item.receivedAmount === 0) return "text-slate-400 dark:text-slate-500";
    if (item.receivedAmount < item.amount)
      return "text-amber-600 dark:text-amber-400";
    if (item.receivedAmount > item.amount)
      return "text-sky-600 dark:text-sky-400";
    return "text-emerald-600 dark:text-emerald-400";
  };

  const openDetail = (item: DepositInvoice) => {
    selectedInvoiceId.value = item.id;
    isDetailModalOpen.value = true;
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
            name="solar:wallet-money-bold-duotone"
            class="text-primary"
            size="16"
          />
          Quản lý nạp tiền
        </div>
        <h1
          class="text-xl font-semibold tracking-tight text-slate-900 dark:text-white"
        >
          Hóa đơn nạp tiền
        </h1>
      </div>

      <div class="flex items-center gap-2">
        <UiButton variant="outline" @click="refresh()">
          <template #prefix>
            <Icon name="solar:refresh-line-duotone" size="18" />
          </template>
          Làm mới
        </UiButton>

        <NuxtLink to="/admin/deposits/config">
          <UiButton variant="outline">
            <template #prefix>
              <Icon name="solar:settings-line-duotone" size="18" />
            </template>
            Cấu hình
          </UiButton>
        </NuxtLink>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <div
          v-for="card in [
            {
              label: 'Toàn thời gian',
              value: formatCurrency(stats.totalAmount),
              icon: 'solar:wallet-money-bold-duotone',
              color: 'text-primary bg-primary/10',
            },
            {
              label: `Tháng ${currentMonthLabel}`,
              value: formatCurrency(stats.monthlyAmount),
              icon: 'solar:calendar-mark-bold-duotone',
              color: 'text-sky-500 bg-sky-50',
            },
            {
              label: 'Trong tuần',
              value: formatCurrency(stats.weeklyAmount),
              icon: 'solar:clock-circle-bold-duotone',
              color: 'text-amber-500 bg-amber-50',
            },
            {
              label: 'Hôm nay',
              value: formatCurrency(stats.todayAmount),
              icon: 'solar:bill-list-bold-duotone',
              color: 'text-violet-500 bg-violet-50',
            },
          ]"
          :key="card.label"
          class="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <div
            :class="[
              'flex h-10 w-10 items-center justify-center rounded-xl',
              card.color,
            ]"
          >
            <Icon :name="card.icon" size="20" />
          </div>

          <div>
            <p
              class="mb-1 text-[11px] font-medium uppercase tracking-wider leading-none text-slate-400"
            >
              {{ card.label }}
            </p>
            <p
              class="text-lg font-semibold leading-none text-slate-800 dark:text-white"
            >
              {{ card.value }}
            </p>
          </div>
        </div>
      </div>

      <div
        class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <span
              class="h-7 w-1.5 rounded-full bg-gradient-to-b from-sky-300 via-primary to-violet-400"
            ></span>
            <div>
              <p class="text-base font-semibold text-slate-800 dark:text-white">
                Thống kê nạp tiền tháng {{ currentMonthLabel }}
              </p>
              <p class="mt-1 text-xs font-medium text-slate-400">
                Dữ liệu lấy từ các hóa đơn nạp tiền của hệ thống
              </p>
            </div>
          </div>
        </div>

        <div class="px-4 py-4 sm:px-5">
          <div
            class="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/30"
          >
            <div class="mb-4 flex items-center justify-end">
              <div
                class="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-600 dark:border-violet-900/60 dark:bg-slate-900 dark:text-violet-300"
              >
                <span class="h-2.5 w-2.5 rounded-full bg-violet-500"></span>
                Nạp tiền tự động
              </div>
            </div>

            <svg viewBox="0 0 760 240" class="h-[260px] w-full">
              <defs>
                <linearGradient id="deposit-area" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.16" />
                  <stop
                    offset="100%"
                    stop-color="#8b5cf6"
                    stop-opacity="0.02"
                  />
                </linearGradient>
              </defs>

              <g v-for="line in 5" :key="line">
                <line
                  x1="20"
                  :y1="18 + line * 40"
                  x2="740"
                  :y2="18 + line * 40"
                  stroke="#e2e8f0"
                  stroke-width="1"
                  stroke-dasharray="4 6"
                />
              </g>

              <template v-if="chartPoints.length">
                <path :d="areaPath" fill="url(#deposit-area)" />
                <path
                  :d="chartPath"
                  fill="none"
                  stroke="#8b5cf6"
                  stroke-width="3.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />

                <g v-for="point in chartCoordinates" :key="`${point.day}-dot`">
                  <circle
                    :cx="point.x"
                    :cy="point.y"
                    r="4.5"
                    fill="#fff"
                    stroke="#8b5cf6"
                    stroke-width="3"
                  />
                </g>
              </template>
            </svg>

            <div
              v-if="chartPoints.length"
              class="mt-4 grid grid-cols-4 gap-2 text-center text-[11px] font-medium text-slate-400 sm:grid-cols-6 xl:grid-cols-12"
            >
              <span v-for="point in chartPoints" :key="`${point.day}-label`">
                {{ point.day }}
              </span>
            </div>
            <div
              v-else
              class="flex h-16 items-center justify-center text-sm font-medium text-slate-400"
            >
              Chưa có dữ liệu nạp tiền trong tháng này
            </div>
          </div>
        </div>
      </div>
    </div>

    <UiTable
      :headers="[
        { key: 'actions', label: 'Thao tác', width: '112px' },
        { key: 'username', label: 'Thành viên', width: '180px' },
        { key: 'paymentCode', label: 'Mã hóa đơn', width: '170px' },
        { key: 'status', label: 'Trạng thái', width: '150px' },
        { key: 'amount', label: 'Số tiền nạp', width: '150px' },
        { key: 'receivedAmount', label: 'Thực nhận', width: '150px' },
        { key: 'transferContent', label: 'Nội dung CK', width: '180px' },
        { key: 'createdAt', label: 'Thời gian tạo', width: '180px' },
        { key: 'paidAt', label: 'Thanh toán lúc', width: '180px' },
      ]"
      :items="paginatedInvoices"
      :loading="pending"
      striped
    >
      <template #top>
        <div class="space-y-5">
          <div class="flex items-center gap-3">
            <span
              class="h-7 w-1.5 rounded-full bg-gradient-to-b from-sky-300 via-primary to-violet-400"
            ></span>
            <p class="text-base font-semibold text-slate-800 dark:text-white">
              Lịch sử hóa đơn nạp tiền
            </p>
          </div>

          <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            <UiInput
              v-model="searchUsername"
              placeholder="Tìm username"
              class="rounded-[14px] border-slate-200 bg-white"
            />
            <UiInput
              v-model="searchPaymentCode"
              placeholder="Mã hóa đơn"
              class="rounded-[14px] border-slate-200 bg-white"
            />
            <UiInput
              v-model="searchTransferContent"
              placeholder="Nội dung chuyển khoản"
              class="rounded-[14px] border-slate-200 bg-white"
            />
            <UiDropdown v-model="selectedStatus" :options="statusOptions" />
            <UiDropdown
              v-model="selectedDateRange"
              :options="dateRangeOptions"
            />
          </div>
        </div>
      </template>

      <template #cell(actions)="{ item }">
        <div class="flex items-center gap-1.5">
          <UiButton
            variant="ghost"
            size="sm"
            class="rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-primary/30 !hover:bg-primary/10 hover:text-primary dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary/20 dark:!hover:bg-primary/10"
            @click="openDetail(item)"
          >
            <Icon name="solar:eye-line-duotone" size="16" />
          </UiButton>
        </div>
      </template>

      <template #cell(username)="{ item }">
        <div class="min-w-0">
          <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {{ item.username || "Không rõ" }}
          </p>
          <p class="mt-1 text-[11px] font-medium text-slate-400">
            ID: #{{ item.userId }}
          </p>
        </div>
      </template>

      <template #cell(paymentCode)="{ item }">
        <div class="min-w-0">
          <p class="font-mono text-[13px] font-semibold text-primary">
            {{ item.paymentCode }}
          </p>
          <p class="mt-1 text-[11px] font-medium text-slate-400">
            {{ item.note || item.referenceCode || "Chưa có ghi chú" }}
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

      <template #cell(amount)="{ item }">
        <span
          class="font-mono text-[13px] font-semibold text-slate-800 dark:text-white"
        >
          {{ formatCurrency(item.amount) }}
        </span>
      </template>

      <template #cell(receivedAmount)="{ item }">
        <span
          class="font-mono text-[13px] font-semibold"
          :class="receivedAmountClass(item)"
        >
          {{ formatCurrency(item.receivedAmount) }}
        </span>
      </template>

      <template #cell(transferContent)="{ item }">
        <div class="min-w-0">
          <p
            class="font-mono text-[13px] font-semibold text-slate-700 dark:text-slate-200"
          >
            {{ item.transferContent || "---" }}
          </p>
          <p class="mt-1 text-[11px] font-medium text-slate-400">
            {{ item.referenceCode || "Chưa có mã đối soát" }}
          </p>
        </div>
      </template>

      <template #cell(createdAt)="{ item }">
        <span class="text-xs font-medium text-slate-500">
          {{ formatDateTime(item.createdAt) }}
        </span>
      </template>

      <template #cell(paidAt)="{ item }">
        <span class="text-xs font-medium text-slate-500">
          {{ formatDateTime(item.paidAt) }}
        </span>
      </template>

      <template #empty>
        <div class="py-5 text-center">
          <div
            class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"
          >
            <Icon name="solar:box-minimalistic-line-duotone" size="24" />
          </div>
          <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Không có hóa đơn nạp
          </p>
        </div>
      </template>
      <template #footer>
        <UiPagination
          :total="depositInvoices.length"
          v-model:pageSize="pageSize"
          v-model:currentPage="currentPage"
        />
      </template>
    </UiTable>

    <UiModal
      v-model="isDetailModalOpen"
      title="Chi tiết hóa đơn nạp tiền"
      size="xl"
    >
      <template v-if="selectedInvoice">
        <div class="space-y-6">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">
              {{ selectedInvoice.paymentCode }}
            </h2>
            <UiBadge
              :variant="getStatusMeta(selectedInvoice.status).variant as any"
              :label="getStatusMeta(selectedInvoice.status).label"
              rounded
            />
          </div>

          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div
              class="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
            >
              <p
                class="text-[11px] font-bold uppercase tracking-wider text-slate-400"
              >
                Thành viên
              </p>
              <p
                class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100"
              >
                {{ selectedInvoice.username || "Không rõ" }}
              </p>
              <p class="mt-1 text-xs text-slate-400">
                {{ selectedInvoice.email || `ID: #${selectedInvoice.userId}` }}
              </p>
            </div>

            <div
              class="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
            >
              <p
                class="text-[11px] font-bold uppercase tracking-wider text-slate-400"
              >
                Số tiền nạp
              </p>
              <p
                class="mt-1 font-mono text-sm font-semibold text-slate-800 dark:text-slate-100"
              >
                {{ formatCurrency(selectedInvoice.amount) }}
              </p>
            </div>

            <div
              class="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
            >
              <p
                class="text-[11px] font-bold uppercase tracking-wider text-slate-400"
              >
                Thực nhận
              </p>
              <p
                class="mt-1 font-mono text-sm font-semibold"
                :class="receivedAmountClass(selectedInvoice)"
              >
                {{ formatCurrency(selectedInvoice.receivedAmount) }}
              </p>
            </div>

            <div
              class="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
            >
              <p
                class="text-[11px] font-bold uppercase tracking-wider text-slate-400"
              >
                Mã đối soát
              </p>
              <p
                class="mt-1 font-mono text-sm font-semibold text-slate-800 dark:text-slate-100"
              >
                {{ selectedInvoice.referenceCode || "---" }}
              </p>
            </div>

            <div
              class="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 md:col-span-2"
            >
              <p
                class="text-[11px] font-bold uppercase tracking-wider text-slate-400"
              >
                Nội dung chuyển khoản
              </p>
              <p class="mt-1 font-mono text-sm font-semibold text-primary">
                {{ selectedInvoice.transferContent || "---" }}
              </p>
            </div>

            <div
              class="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
            >
              <p
                class="text-[11px] font-bold uppercase tracking-wider text-slate-400"
              >
                Thời gian tạo
              </p>
              <p
                class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100"
              >
                {{ formatDateTime(selectedInvoice.createdAt) }}
              </p>
            </div>

            <div
              class="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
            >
              <p
                class="text-[11px] font-bold uppercase tracking-wider text-slate-400"
              >
                Thanh toán lúc
              </p>
              <p
                class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100"
              >
                {{ formatDateTime(selectedInvoice.paidAt) }}
              </p>
            </div>

            <div
              class="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 md:col-span-2"
            >
              <p
                class="text-[11px] font-bold uppercase tracking-wider text-slate-400"
              >
                Ghi chú
              </p>
              <p
                class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100"
              >
                {{ selectedInvoice.note || "Không có ghi chú" }}
              </p>
            </div>
          </div>
        </div>
      </template>
    </UiModal>
  </div>
</template>
