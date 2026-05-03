<script setup lang="ts">
  definePageMeta({ layout: "admin" });
  useHead({ title: "Quản lý đơn hàng - Admin Panel" });

  const router = useRouter();
  const { formatDateTime } = useDateFormatter();

  interface OrderItemRow {
    id: number;
    orderCode: string;
    userId: number | null;
    username: string | null;
    email: string | null;
    status: string | null;
    fulfillmentStatus: string | null;
    paymentType: string | null;
    paymentStatus: string | null;
    paymentAmount: number;
    orderType: string | null;
    totalAmount: number;
    createdAt: string | null;
    updatedAt: string | null;
    itemCount: number;
  }

  interface OrdersResponse {
    items: OrderItemRow[];
    stats: {
      pendingCount: number;
      completedCount: number;
      monthlyRevenue: number;
      cancelledCount: number;
    };
    pagination: {
      total: number;
      page: number;
      pageSize: number;
    };
  }

  const searchQuery = ref("");
  const selectedStatus = ref("all");
  const selectedPaymentType = ref("all");
  const pageSize = ref(10);
  const currentPage = ref(1);

  const statusOptions = [
    { label: "Tất cả trạng thái", value: "all" },
    { label: "Đang chờ", value: "pending" },
    { label: "Đang xử lý", value: "processing" },
    { label: "Hoàn thành", value: "completed" },
    { label: "Đã hủy", value: "cancelled" },
    { label: "Hoàn tiền", value: "refunded" },
    { label: "Thất bại", value: "failed" },
  ];

  const paymentTypeOptions = [
    { label: "Tất cả thanh toán", value: "all" },
    { label: "Số dư tài khoản", value: "balance" },
    { label: "Hóa đơn thanh toán", value: "payment" },
  ];

  const queryParams = computed(() => ({
    search: searchQuery.value || undefined,
    status: selectedStatus.value,
    paymentType: selectedPaymentType.value,
    page: currentPage.value,
    pageSize: pageSize.value,
  }));

  const {
    data: ordersData,
    pending,
    error,
    refresh,
  } = await useFetch<OrdersResponse>("/api/admin/orders", {
    key: "admin-orders-list",
    query: queryParams,
    default: () => ({
      items: [],
      stats: {
        pendingCount: 0,
        completedCount: 0,
        monthlyRevenue: 0,
        cancelledCount: 0,
      },
      pagination: {
        total: 0,
        page: 1,
        pageSize: 10,
      },
    }),
  });

  const orders = computed(() => ordersData.value?.items || []);
  const stats = computed(
    () =>
      ordersData.value?.stats || {
        pendingCount: 0,
        completedCount: 0,
        monthlyRevenue: 0,
        cancelledCount: 0,
      }
  );
  const totalOrders = computed(() => ordersData.value?.pagination?.total || 0);
  const fetchErrorMessage = computed(
    () =>
      (error.value?.data as { message?: string } | undefined)?.message ||
      error.value?.message ||
      ""
  );

  watch([searchQuery, selectedStatus, selectedPaymentType], () => {
    currentPage.value = 1;
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(val || 0);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "completed":
        return { variant: "success", label: "Hoàn thành" };
      case "processing":
        return { variant: "info", label: "Đang xử lý" };
      case "pending":
        return { variant: "warning", label: "Chờ duyệt" };
      case "cancelled":
        return { variant: "error", label: "Đã hủy" };
      case "refunded":
        return { variant: "slate", label: "Hoàn tiền" };
      case "failed":
        return { variant: "error", label: "Thất bại" };
      default:
        return { variant: "slate", label: status || "Không rõ" };
    }
  };

  const getFulfillmentBadge = (status: string | null) => {
    switch (status) {
      case "delivered":
        return { variant: "success", label: "Đã giao" };
      case "processing":
        return { variant: "info", label: "Đang giao" };
      case "pending":
        return { variant: "warning", label: "Chờ giao" };
      case "partially_delivered":
        return { variant: "warning", label: "Giao một phần" };
      case "cancelled":
        return { variant: "error", label: "Đã hủy" };
      case "failed":
        return { variant: "error", label: "Thất bại" };
      default:
        return { variant: "slate", label: status || "---" };
    }
  };

  const getPaymentMeta = (paymentType: string | null) => {
    const label = paymentType === "balance" ? "Số dư" : "Hóa đơn";
    const icon =
      paymentType === "balance"
        ? "solar:wallet-money-line-duotone"
        : "solar:card-transfer-line-duotone";

    return {
      label,
      icon,
    };
  };

  const getPaymentStatusBadge = (
    paymentType: string | null,
    paymentStatus: string | null
  ) => {
    const status = paymentStatus || (paymentType === "balance" ? "paid" : "");

    const map: Record<string, { variant: string; label: string }> = {
      paid: { variant: "success", label: "Đã thanh toán" },
      pending: { variant: "warning", label: "Chờ thanh toán" },
      failed: { variant: "error", label: "Thất bại" },
      cancelled: { variant: "error", label: "Đã hủy" },
      expired: { variant: "slate", label: "Hết hạn" },
      refunded: { variant: "slate", label: "Đã hoàn tiền" },
    };

    return map[status] || { variant: "slate", label: "---" };
  };

  const handleViewDetails = (orderCode: string) => {
    router.push(`/admin/orders/${orderCode}`);
  };

  const getOrderTypeLabel = (orderType: string | null) => {
    switch (orderType) {
      case "instant":
        return "Giao ngay";
      case "manual_order":
        return "Đặt hàng";
      case "preorder":
        return "Đặt trước";
      default:
        return orderType || "---";
    }
  };

  const getOrderTypeIcon = (orderType: string | null) => {
    switch (orderType) {
      case "instant":
        return "solar:lightning-line-duotone";
      case "manual_order":
        return "solar:box-line-duotone";
      case "preorder":
        return "solar:calendar-line-duotone";
      default:
        return "solar:box-line-duotone";
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
            name="solar:cart-large-bold-duotone"
            class="text-primary"
            size="16"
          />
          Quản lý bán hàng
        </div>
        <h1
          class="text-xl font-semibold tracking-tight text-slate-900 dark:text-white"
        >
          Lịch sử đơn hàng
        </h1>
      </div>
      <UiButton variant="outline" @click="refresh()">
        <template #prefix>
          <Icon name="solar:refresh-line-duotone" size="18" />
        </template>
        Làm mới dữ liệu
      </UiButton>
    </div>

    <UiAlert
      v-if="fetchErrorMessage"
      type="error"
      title="Không tải được danh sách đơn hàng"
    >
      {{ fetchErrorMessage }}
    </UiAlert>

    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div
        v-for="stat in [
          {
            label: 'Đơn chờ duyệt',
            val: stats.pendingCount.toLocaleString(),
            icon: 'solar:clock-circle-bold-duotone',
            color: 'text-amber-500 bg-amber-50',
          },
          {
            label: 'Đã hoàn thành',
            val: stats.completedCount.toLocaleString(),
            icon: 'solar:check-circle-bold-duotone',
            color: 'text-primary bg-primary/10',
          },
          {
            label: 'Doanh thu tháng',
            val: formatCurrency(stats.monthlyRevenue),
            icon: 'solar:wallet-money-bold-duotone',
            color: 'text-sky-500 bg-sky-50',
          },
          {
            label: 'Đơn đã hủy',
            val: stats.cancelledCount.toLocaleString(),
            icon: 'solar:close-circle-bold-duotone',
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
            class="text-lg font-extrabold leading-none text-slate-800 dark:text-white"
          >
            {{ stat.val }}
          </p>
        </div>
      </div>
    </div>

    <UiTable
      :headers="[
        { key: 'orderCode', label: 'Mã đơn hàng', width: '150px' },
        { key: 'customer', label: 'Khách hàng' },
        { key: 'payment', label: 'Thanh toán', width: '160px' },
        { key: 'delivery', label: 'Giao hàng', width: '155px' },
        { key: 'amount', label: 'Tổng tiền', width: '150px' },
        { key: 'createdAt', label: 'Ngày tạo', width: '165px' },
        { key: 'status', label: 'Trạng thái', width: '150px' },
        { key: 'actions', label: 'Hành động', align: 'right', width: '90px' },
      ]"
      :items="orders"
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
            <p class="text-base font-bold text-slate-800 dark:text-white">
              Danh sách đơn hàng
            </p>
          </div>

          <div class="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div class="w-full sm:min-w-[280px]">
              <UiInput
                v-model="searchQuery"
                placeholder="Tìm theo mã đơn, username, email..."
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
            <div class="w-full shrink-0 sm:w-[190px]">
              <UiDropdown
                v-model="selectedPaymentType"
                :options="paymentTypeOptions"
              />
            </div>
          </div>
        </div>
      </template>

      <template #cell(orderCode)="{ item }">
        <div class="flex min-w-0 flex-col">
          <span class="font-mono text-xs font-bold text-primary">
            {{ item.orderCode }}
          </span>
          <span class="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">
            #{{ item.id }}
          </span>
        </div>
      </template>

      <template #cell(customer)="{ item }">
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-bold text-primary"
          >
            {{ (item.username || "?").charAt(0).toUpperCase() }}
          </div>
          <div class="min-w-0">
            <p
              class="truncate text-sm font-bold leading-tight text-slate-800 dark:text-slate-100"
            >
              {{ item.username || "Không rõ khách hàng" }}
            </p>
            <p
              class="mt-1 truncate text-[11px] font-medium leading-none text-slate-400"
            >
              {{ item.email || `User #${item.userId || "---"}` }}
            </p>
          </div>
        </div>
      </template>

      <template #cell(payment)="{ item }">
        <div class="flex flex-col items-center justify-center gap-1 text-center">
          <div class="inline-flex items-center justify-center gap-1.5">
            <Icon
              :name="getPaymentMeta(item.paymentType).icon"
              size="16"
              class="text-slate-400"
            />
            <p class="text-xs font-semibold leading-none text-slate-700 dark:text-slate-200">
              {{ getPaymentMeta(item.paymentType).label }}
            </p>
          </div>
          <UiBadge
            size="sm"
            :variant="
              getPaymentStatusBadge(item.paymentType, item.paymentStatus)
                .variant as any
            "
            :label="
              getPaymentStatusBadge(item.paymentType, item.paymentStatus)
                .label
            "
            rounded
          />
        </div>
      </template>

      <template #cell(delivery)="{ item }">
        <div class="flex min-w-0 flex-col items-center justify-center gap-1 text-center">
          <div class="inline-flex items-center justify-center gap-1.5">
            <Icon
              :name="getOrderTypeIcon(item.orderType)"
              size="16"
              class="text-slate-400"
            />
            <span class="text-xs font-semibold leading-none text-slate-700 dark:text-slate-200">
              {{ getOrderTypeLabel(item.orderType) }}
            </span>
          </div>
          <UiBadge
            size="sm"
            :variant="getFulfillmentBadge(item.fulfillmentStatus).variant as any"
            :label="getFulfillmentBadge(item.fulfillmentStatus).label"
            rounded
          />
        </div>
      </template>

      <template #cell(amount)="{ item }">
        <div class="flex flex-col">
          <span
            class="font-mono text-[13px] font-bold text-slate-900 dark:text-white"
          >
            {{ formatCurrency(item.totalAmount) }}
          </span>
          <span class="mt-1 text-[10px] font-medium text-slate-400">
            {{ item.itemCount }} sản phẩm
          </span>
        </div>
      </template>

      <template #cell(createdAt)="{ item }">
        <div class="flex flex-col">
          <span class="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
            {{ formatDateTime(item.createdAt) }}
          </span>
          <span class="mt-1 text-[10px] font-medium text-slate-400">
            Cập nhật: {{ formatDateTime(item.updatedAt) }}
          </span>
        </div>
      </template>

      <template #cell(status)="{ item }">
        <div class="flex flex-col gap-1">
          <UiBadge
            :variant="getStatusBadge(item.status).variant as any"
            :label="getStatusBadge(item.status).label"
            rounded
          />
        </div>
      </template>

      <template #cell(actions)="{ item }">
        <div class="flex items-center justify-end gap-1">
          <button
            @click="handleViewDetails(item.orderCode)"
            class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800"
          >
            <Icon name="solar:eye-bold" size="18" />
          </button>
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
            Không có đơn hàng
          </p>
        </div>
      </template>

      <template #footer>
        <UiPagination
          :total="totalOrders"
          v-model:pageSize="pageSize"
          v-model:currentPage="currentPage"
        />
      </template>
    </UiTable>

    <UiAlert type="info" title="Mẹo quản lý đơn">
      Bạn có thể nhấp vào biểu tượng <b>Con mắt</b> để xem chi tiết đơn hàng,
      item trong đơn và thông tin thanh toán liên quan.
    </UiAlert>
  </div>
</template>
