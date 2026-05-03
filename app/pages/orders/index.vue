<template>
  <div class="min-h-screen bg-[#fafafa] dark:bg-[#0f1115] font-sans">
    <LayoutHeader />
    <LayoutNavbar />

    <main class="max-w-[1400px] mx-auto px-4 lg:px-6 py-8 pb-20">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-[13px] text-slate-500 mb-6">
        <NuxtLink
          to="/"
          class="hover:text-primary transition-colors flex items-center gap-1.5"
        >
          <Icon name="solar:home-smile-linear" size="15" /> Trang chủ
        </NuxtLink>
        <Icon name="solar:alt-arrow-right-linear" size="13" />
        <span
          class="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5"
        >
          <Icon
            name="solar:bag-bold-duotone"
            size="15"
            class="text-slate-400"
          />
          Đơn hàng của tôi
        </span>
      </div>

      <!-- Page header -->
      <div
        class="relative bg-white dark:bg-[#181a1f] border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-5 mb-6 overflow-hidden"
      >
        <div class="absolute inset-0 pointer-events-none">
          <div
            class="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-primary/5 dark:bg-primary/10"
          />
          <div
            class="absolute -bottom-6 right-20 w-24 h-24 rounded-full bg-primary/5 dark:bg-primary/10"
          />
        </div>
        <div class="relative flex items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0"
            >
              <Icon
                name="solar:bag-bold-duotone"
                size="24"
                class="text-primary"
              />
            </div>
            <div>
              <h1
                class="text-xl font-bold text-slate-900 dark:text-white leading-tight"
              >
                Đơn hàng của tôi
              </h1>
              <p class="text-[13px] text-slate-400 mt-0.5">
                Theo dõi và quản lý các đơn hàng
              </p>
            </div>
          </div>
          <NuxtLink to="/" class="hidden sm:flex">
            <UiButton variant="outline" size="sm" class="!rounded-xl">
              <template #prefix
                ><Icon name="solar:shop-2-bold-duotone" size="15"
              /></template>
              Mua thêm
            </UiButton>
          </NuxtLink>
        </div>
      </div>

      <!-- Table -->
      <UiTable
        :headers="[
          { key: 'orderCode', label: 'Mã đơn hàng', width: '160px' },
          { key: 'payment', label: 'Thanh toán', width: '120px' },
          { key: 'amount', label: 'Tổng tiền', width: '140px' },
          { key: 'status', label: 'Trạng thái', width: '100px' },
          { key: 'createdAt', label: 'Thời gian', width: '140px' },
          { key: 'actions', label: '', align: 'right', width: '60px' },
        ]"
        :items="orders"
        :loading="loading"
        striped
      >
        <!-- Top slot -->
        <template #top>
          <div
            class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
          >
            <div class="flex items-center gap-3">
              <span
                class="h-7 w-1.5 rounded-full bg-gradient-to-b from-sky-300 via-primary to-violet-400"
              />
              <p class="text-base font-bold text-slate-800 dark:text-white">
                Danh sách đơn hàng
              </p>
            </div>
            <div class="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <div class="w-full sm:w-64">
                <UiInput
                  v-model="search"
                  placeholder="Tìm theo mã đơn hàng..."
                  class="h-10"
                  @keydown.enter="fetchOrders"
                >
                  <template #left-icon>
                    <Icon name="solar:magnifer-line-duotone" size="18" />
                  </template>
                </UiInput>
              </div>
              <div class="w-full shrink-0 sm:w-[180px]">
                <UiDropdown v-model="selectedStatus" :options="statusOptions" />
              </div>
            </div>
          </div>
        </template>

        <!-- Mã đơn -->
        <template #cell(orderCode)="{ item }">
          <div class="flex min-w-0 flex-col">
            <span class="font-mono text-xs font-bold text-primary">{{
              item.orderCode
            }}</span>
            <span class="mt-0.5 text-[11px] font-medium text-slate-400">{{
              getOrderTypeLabel(item.orderType)
            }}</span>
          </div>
        </template>

        <!-- Thanh toán -->
        <template #cell(payment)="{ item }">
          <div class="flex items-center gap-1.5">
            <Icon
              :name="
                item.paymentType === 'balance'
                  ? 'solar:wallet-money-line-duotone'
                  : 'solar:card-transfer-line-duotone'
              "
              size="14"
              class="text-slate-400 shrink-0"
            />
            <span
              class="text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              {{ item.paymentType === "balance" ? "Số dư" : "Hóa đơn" }}
            </span>
          </div>
        </template>

        <!-- Tổng tiền -->
        <template #cell(amount)="{ item }">
          <div class="flex flex-col leading-none">
            <span
              class="font-mono text-[13px] font-bold text-slate-900 dark:text-white"
              >{{ Number(item.totalAmount).toLocaleString() }}đ</span
            >
            <span class="mt-0.5 text-[10px] font-medium text-slate-400">
              {{ item.itemCount }} sản phẩm
            </span>
          </div>
        </template>

        <!-- Trạng thái -->
        <template #cell(status)="{ item }">
          <UiBadge
            :variant="getStatusBadge(item.status).variant as any"
            :label="getStatusBadge(item.status).label"
            rounded
          />
        </template>

        <!-- Thời gian -->
        <template #cell(createdAt)="{ item }">
          <span
            class="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap"
            >{{ formatDate(item.createdAt) }}</span
          >
        </template>

        <!-- Hành động -->
        <template #cell(actions)="{ item }">
          <div class="flex items-center justify-end">
            <NuxtLink :to="`/orders/${item.orderCode}`">
              <button
                class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800"
              >
                <Icon name="solar:eye-bold" size="18" />
              </button>
            </NuxtLink>
          </div>
        </template>

        <!-- Empty state -->
        <template #empty>
          <div class="py-5 text-center">
            <div
              class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"
            >
              <Icon name="solar:bag-bold-duotone" size="24" />
            </div>
            <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Chưa có đơn hàng
            </p>
            <p class="text-xs text-slate-400 mt-1 mb-3">
              Hãy khám phá và mua sắm ngay!
            </p>
            <UiButton size="sm" @click="$router.push('/')" class="!rounded-xl">
              <template #prefix
                ><Icon name="solar:shop-2-bold-duotone" size="15"
              /></template>
              Mua sắm ngay
            </UiButton>
          </div>
        </template>

        <!-- Footer -->
        <template #footer>
          <UiPagination
            :total="pagination.total"
            v-model:pageSize="pageSize"
            v-model:currentPage="currentPage"
          />
        </template>
      </UiTable>
    </main>

    <LayoutFooter />
  </div>
</template>

<script setup lang="ts">
useSeoHead({
  title: "Đơn hàng của tôi ",
  description: "Xem lịch sử đơn hàng và chi tiết các giao dịch của bạn",
});

const { formatDateTime } = useDateFormatter();
const search = ref("");
const selectedStatus = ref("all");
const pageSize = ref(10);
const currentPage = ref(1);

const statusOptions = [
  { label: "Tất cả trạng thái", value: "all" },
  { label: "Chờ xử lý", value: "pending" },
  { label: "Đang xử lý", value: "processing" },
  { label: "Hoàn tất", value: "completed" },
  { label: "Đã hủy", value: "cancelled" },
  { label: "Hoàn tiền", value: "refunded" },
];

interface Order {
  id: number;
  orderCode: string;
  status: string;
  fulfillmentStatus: string;
  orderType: string;
  paymentType: string;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const loading = ref(true);
const orders = ref<Order[]>([]);
const pagination = ref<Pagination>({
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0,
});

async function fetchOrders() {
  loading.value = true;
  try {
    const result = await $fetch<{ data: Order[]; pagination: Pagination }>(
      "/api/orders",
      {
        query: {
          search: search.value || undefined,
          status:
            selectedStatus.value !== "all" ? selectedStatus.value : undefined,
          page: currentPage.value,
          pageSize: pageSize.value,
        },
      },
    );
    orders.value = result.data;
    pagination.value = result.pagination;
  } catch {
    orders.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(fetchOrders);

watch([selectedStatus, pageSize], () => {
  currentPage.value = 1;
  fetchOrders();
});
watch(currentPage, fetchOrders);

let searchTimer: ReturnType<typeof setTimeout>;
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentPage.value = 1;
    fetchOrders();
  }, 400);
});

function getOrderTypeLabel(orderType: string) {
  const map: Record<string, string> = {
    instant: "Giao ngay",
    manual_order: "Đặt hàng",
    preorder: "Đặt trước",
  };
  return map[orderType] ?? orderType ?? "---";
}

function getStatusBadge(status: string) {
  const map: Record<string, { variant: string; label: string }> = {
    pending: { variant: "warning", label: "Chờ xử lý" },
    processing: { variant: "info", label: "Đang xử lý" },
    completed: { variant: "success", label: "Hoàn tất" },
    cancelled: { variant: "slate", label: "Đã hủy" },
    refunded: { variant: "slate", label: "Hoàn tiền" },
    failed: { variant: "error", label: "Thất bại" },
  };
  return map[status] ?? { variant: "slate", label: status };
}

function fulfillmentLabel(status: string) {
  const map: Record<string, string> = {
    pending: "Chờ giao",
    processing: "Đang giao",
    partially_delivered: "Giao một phần",
    delivered: "Đã giao",
    cancelled: "Đã hủy",
    failed: "Thất bại",
  };
  return map[status] ?? status;
}

function formatDate(date: string | Date) {
  return formatDateTime(date, "vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
</script>
