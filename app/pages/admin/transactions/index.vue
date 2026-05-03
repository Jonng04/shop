<script setup lang="ts">
  definePageMeta({ layout: "admin" });
  useHead({ title: "Quản lý giao dịch - Admin Panel" });
  const { formatDateTime } = useDateFormatter();

  interface TransactionItem {
    id: number;
    userId: number | null;
    orderId: number | null;
    balanceBefore: number;
    amount: number;
    balanceAfter: number;
    type: string;
    status: string | null;
    description: string | null;
    createdAt: string | null;
    username: string | null;
    email: string | null;
    orderTotalAmount: number;
    orderStatus: string | null;
  }

  const {
    data: response,
    refresh,
    pending,
    error,
  } = await useFetch<{
    transactions: TransactionItem[];
    stats: {
      total: number;
      depositAmount: number;
      purchaseAmount: number;
      todayCount: number;
    };
  }>("/api/admin/transactions", {
    key: "admin-transactions-list",
    lazy: true,
  });

  const transactionsList = computed(() => response.value?.transactions || []);
  const stats = computed(
    () =>
      response.value?.stats || {
        total: 0,
        depositAmount: 0,
        purchaseAmount: 0,
        todayCount: 0,
      }
  );

  const searchQuery = ref("");
  const selectedType = ref("all");
  const selectedStatus = ref("all");
  const pageSize = ref(10);
  const currentPage = ref(1);

  const typeOptions = [
    { label: "Tất cả loại giao dịch", value: "all" },
    { label: "Nạp tiền", value: "deposit" },
    { label: "Mua hàng", value: "purchase" },
    { label: "Hoàn tiền", value: "refund" },
    { label: "Điều chỉnh", value: "adjustment" },
  ];

  const statusOptions = [
    { label: "Tất cả trạng thái", value: "all" },
    { label: "Hoàn thành", value: "completed" },
    { label: "Thành công", value: "paid" },
    { label: "Đang chờ", value: "pending" },
    { label: "Thất bại", value: "failed" },
    { label: "Đã hủy", value: "cancelled" },
  ];

  const filteredTransactions = computed(() => {
    const keyword = searchQuery.value.trim().toLowerCase();

    return transactionsList.value.filter((transaction) => {
      const matchesSearch =
        !keyword ||
        transaction.id.toString().includes(keyword) ||
        transaction.orderId?.toString().includes(keyword) ||
        transaction.username?.toLowerCase().includes(keyword) ||
        transaction.email?.toLowerCase().includes(keyword) ||
        transaction.description?.toLowerCase().includes(keyword);

      const matchesType =
        selectedType.value === "all" || transaction.type === selectedType.value;

      const matchesStatus =
        selectedStatus.value === "all" ||
        transaction.status === selectedStatus.value;

      return matchesSearch && matchesType && matchesStatus;
    });
  });

  const paginatedTransactions = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredTransactions.value.slice(start, start + pageSize.value);
  });

  watch([searchQuery, selectedType, selectedStatus], () => {
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

  const getTypeMeta = (type: string) => {
    switch (type) {
      case "deposit":
        return {
          label: "Nạp tiền",
          variant: "info",
          icon: "solar:wallet-money-line-duotone",
        };
      case "purchase":
        return {
          label: "Mua hàng",
          variant: "warning",
          icon: "solar:cart-large-line-duotone",
        };
      case "refund":
        return {
          label: "Hoàn tiền",
          variant: "success",
          icon: "solar:refresh-circle-line-duotone",
        };
      case "adjustment":
        return {
          label: "Điều chỉnh",
          variant: "primary",
          icon: "solar:tuning-2-line-duotone",
        };
      default:
        return {
          label: type || "Khác",
          variant: "slate",
          icon: "solar:card-line-duotone",
        };
    }
  };

  const getStatusMeta = (status: string | null) => {
    switch (status) {
      case "completed":
        return { label: "Hoàn thành", variant: "success" };
      case "paid":
        return { label: "Thành công", variant: "success" };
      case "pending":
        return { label: "Đang chờ", variant: "warning" };
      case "failed":
        return { label: "Thất bại", variant: "error" };
      case "cancelled":
        return { label: "Đã hủy", variant: "slate" };
      default:
        return { label: status || "Không rõ", variant: "slate" };
    }
  };

  const amountClass = (amount: number) => {
    if (amount > 0) return "text-emerald-600 dark:text-emerald-400";
    if (amount < 0) return "text-rose-600 dark:text-rose-400";
    return "text-slate-500 dark:text-slate-400";
  };

  const amountLabel = (amount: number) => {
    if (amount > 0) return `+${formatCurrency(amount)}`;
    if (amount < 0) return `-${formatCurrency(Math.abs(amount))}`;
    return formatCurrency(0);
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
            name="solar:card-transfer-bold-duotone"
            class="text-primary"
            size="16"
          />
          Quản lý tài chính
        </div>
        <h1
          class="text-xl font-semibold tracking-tight text-slate-900 dark:text-white"
        >
          Lịch sử giao dịch
        </h1>
      </div>

      <UiButton variant="outline" @click="refresh()">
        <template #prefix>
          <Icon name="solar:refresh-line-duotone" size="18" />
        </template>
        Làm mới dữ liệu
      </UiButton>
    </div>

    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div
        v-for="stat in [
          {
            label: 'Tổng giao dịch',
            val: stats.total.toLocaleString(),
            icon: 'solar:card-transfer-bold-duotone',
            color: 'text-primary bg-primary/10',
          },
          {
            label: 'Tổng nạp tiền',
            val: formatCurrency(stats.depositAmount),
            icon: 'solar:wallet-money-bold-duotone',
            color: 'text-sky-500 bg-sky-50',
          },
          {
            label: 'Tổng mua hàng',
            val: formatCurrency(stats.purchaseAmount),
            icon: 'solar:cart-large-bold-duotone',
            color: 'text-amber-500 bg-amber-50',
          },
          {
            label: 'Hôm nay',
            val: stats.todayCount.toString(),
            icon: 'solar:calendar-bold-duotone',
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
            class="mb-1 text-[11px] font-semibold uppercase tracking-tighter leading-none text-slate-400"
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

    <div
      v-if="error"
      class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 dark:border-rose-900/40 dark:bg-rose-900/10 dark:text-rose-300"
    >
      {{
        error.data?.message ||
        error.message ||
        "Không thể tải danh sách giao dịch"
      }}
    </div>

    <UiTable
      :headers="[
        { key: 'transaction', label: 'Giao dịch', width: '260px' },
        { key: 'type', label: 'Loại', width: '150px' },
        { key: 'balanceBefore', label: 'Trước GD', width: '150px' },
        { key: 'amount', label: 'Biến động', width: '150px' },
        { key: 'balanceAfter', label: 'Sau GD', width: '150px' },
        { key: 'status', label: 'Trạng thái', width: '130px' },
        { key: 'createdAt', label: 'Thời gian', width: '180px' },
      ]"
      :items="paginatedTransactions"
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
              Danh sách giao dịch
            </p>
          </div>

          <div class="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div class="w-full sm:min-w-[280px]">
              <UiInput
                v-model="searchQuery"
                placeholder="Tìm theo mã GD, mã đơn, user..."
                class="h-10 rounded-[14px] border-slate-200 bg-white shadow-sm focus:bg-white"
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

      <template #cell(transaction)="{ item }">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-mono text-xs font-semibold text-primary">
              #TX{{ item.id }}
            </span>
            <span
              v-if="item.orderId"
              class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            >
              Đơn #{{ item.orderId }}
            </span>
          </div>
          <p
            class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100"
          >
            {{ item.username || "Không rõ người dùng" }}
          </p>
          <p class="mt-1 truncate text-[11px] text-slate-400">
            {{ item.email || item.description || "Không có mô tả" }}
          </p>
        </div>
      </template>

      <template #cell(type)="{ item }">
        <div class="flex items-center gap-2">
          <div
            class="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
          >
            <Icon :name="getTypeMeta(item.type).icon" size="16" />
          </div>
          <UiBadge
            :variant="getTypeMeta(item.type).variant as any"
            :label="getTypeMeta(item.type).label"
            rounded
          />
        </div>
      </template>

      <template #cell(balanceBefore)="{ item }">
        <span
          class="font-mono text-[13px] font-semibold text-slate-600 dark:text-slate-300"
        >
          {{ formatCurrency(item.balanceBefore) }}
        </span>
      </template>

      <template #cell(amount)="{ item }">
        <div class="flex flex-col">
          <span
            class="font-mono text-[13px] font-semibold"
            :class="amountClass(item.amount)"
          >
            {{ amountLabel(item.amount) }}
          </span>
          <span
            v-if="item.orderTotalAmount"
            class="mt-1 text-[10px] font-semibold text-slate-400"
          >
            Đơn hàng: {{ formatCurrency(item.orderTotalAmount) }}
          </span>
        </div>
      </template>

      <template #cell(balanceAfter)="{ item }">
        <span class="font-mono text-[13px] font-semibold text-primary">
          {{ formatCurrency(item.balanceAfter) }}
        </span>
      </template>

      <template #cell(status)="{ item }">
        <UiBadge
          :variant="getStatusMeta(item.status).variant as any"
          :label="getStatusMeta(item.status).label"
          rounded
        />
      </template>

      <template #cell(createdAt)="{ item }">
        <span class="text-xs font-semibold text-slate-500">
          {{ formatDateTime(item.createdAt) }}
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
            Không có giao dịch
          </p>
        </div>
      </template>
      <template #footer>
        <UiPagination
          :total="filteredTransactions.length"
          v-model:pageSize="pageSize"
          v-model:currentPage="currentPage"
        />
      </template>
    </UiTable>
  </div>
</template>
