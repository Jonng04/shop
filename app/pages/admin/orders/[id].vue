<script setup lang="ts">
  definePageMeta({ layout: "admin" });

  const route = useRoute();
  const toast = useToast();
  const { formatDateTime } = useDateFormatter();
  const orderCode = computed(() => String(route.params.id || ""));

  interface OrderItem {
    id: number;
    productId: number | null;
    planId: number | null;
    productName: string | null;
    planName: string | null;
    quantity: number;
    unitPrice: number;
    subtotalAmount: number;
    discountAmount: number;
    totalAmount: number;
    status: string | null;
    reason: string | null;
    deliveredContent: string | null;
    deliveryType: string | null;
    deliveredAt: string | null;
    createdAt: string | null;
  }

  interface TransactionItem {
    id: number;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    type: string;
    description: string | null;
    createdAt: string | null;
  }

  interface OrderDetail {
    id: number;
    orderCode: string;
    userId: number | null;
    username: string | null;
    email: string | null;
    userStatus: string | null;
    lastIp: string | null;
    status: string | null;
    fulfillmentStatus: string | null;
    orderType: string | null;
    paymentType: string | null;
    paymentStatus: string | null;
    paymentCode: string | null;
    paymentAmount: number;
    referenceCode: string | null;
    transferContent: string | null;
    paidAt: string | null;
    subtotalAmount: number;
    discountAmount: number;
    totalAmount: number;
    customerNote: string | null;
    adminNote: string | null;
    reason: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    processingAt: string | null;
    deliveredAt: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
    refundedAt: string | null;
    items: OrderItem[];
    transactions: TransactionItem[];
  }

  const {
    data: order,
    pending,
    error,
    refresh,
  } = await useFetch<OrderDetail>(`/api/admin/orders/${orderCode.value}`, {
    key: `admin-order-${orderCode.value}`,
  });

  const savingItemId = ref<number | null>(null);
  const deliveryContents = reactive<Record<number, string>>({});

  watch(
    () => order.value?.items,
    (items) => {
      if (!items?.length) return;

      for (const item of items) {
        if (deliveryContents[item.id] === undefined) {
          deliveryContents[item.id] = item.deliveredContent || "";
        }
      }
    },
    { immediate: true }
  );

  useHead(() => ({
    title: order.value
      ? `Đơn hàng ${order.value.orderCode} - Admin Panel`
      : "Chi tiết đơn hàng - Admin Panel",
  }));

  const errorMessage = computed(
    () =>
      (error.value?.data as { message?: string } | undefined)?.message ||
      error.value?.message ||
      "Không thể tải chi tiết đơn hàng"
  );

  const timeline = computed(() => {
    const value = order.value;
    if (!value) return [];

    const entries = [
      {
        key: "created",
        title: "Đơn hàng được tạo",
        time: value.createdAt,
        tone: "primary",
      },
      {
        key: "paid",
        title: "Thanh toán xác nhận",
        time: value.paidAt,
        tone: "success",
      },
      {
        key: "processing",
        title: "Bắt đầu xử lý",
        time: value.processingAt,
        tone: "warning",
      },
      {
        key: "delivered",
        title: "Đã giao hàng",
        time: value.deliveredAt,
        tone: "success",
      },
      {
        key: "completed",
        title: "Hoàn tất đơn hàng",
        time: value.completedAt,
        tone: "success",
      },
      {
        key: "cancelled",
        title: "Đơn hàng bị hủy",
        time: value.cancelledAt,
        tone: "error",
      },
      {
        key: "refunded",
        title: "Đã hoàn tiền",
        time: value.refundedAt,
        tone: "error",
      },
    ];

    return entries.filter((item) => item.time);
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value || 0);

  const getStatusBadge = (status: string | null) => {
    const map: Record<string, { variant: string; label: string }> = {
      pending: { variant: "warning", label: "Chờ xử lý" },
      processing: { variant: "info", label: "Đang xử lý" },
      completed: { variant: "success", label: "Hoàn thành" },
      cancelled: { variant: "error", label: "Đã hủy" },
      refunded: { variant: "slate", label: "Hoàn tiền" },
      failed: { variant: "error", label: "Thất bại" },
    };

    return map[status || ""] ?? { variant: "slate", label: status || "---" };
  };

  const getPaymentBadge = (status: string | null) => {
    const map: Record<string, { variant: string; label: string }> = {
      paid: { variant: "success", label: "Đã thanh toán" },
      pending: { variant: "warning", label: "Chờ thanh toán" },
      failed: { variant: "error", label: "Thất bại" },
      cancelled: { variant: "error", label: "Đã hủy" },
      expired: { variant: "slate", label: "Hết hạn" },
      refunded: { variant: "slate", label: "Đã hoàn tiền" },
    };

    return map[status || ""] ?? { variant: "slate", label: status || "---" };
  };

  const getTimelineTone = (tone: string) => {
    if (tone === "success") return "bg-emerald-500";
    if (tone === "warning") return "bg-amber-500";
    if (tone === "error") return "bg-rose-500";
    return "bg-primary";
  };

  const getOrderTypeLabel = (value: string | null) => {
    const map: Record<string, string> = {
      instant: "Giao ngay",
      manual_order: "Đặt hàng",
      preorder: "Đặt trước",
    };

    return map[value || ""] || value || "---";
  };

  const getPaymentTypeLabel = (value: string | null) => {
    return value === "balance" ? "Số dư tài khoản" : "Hóa đơn thanh toán";
  };

  const copyOrderCode = async () => {
    if (!order.value?.orderCode) return;

    try {
      await navigator.clipboard.writeText(order.value.orderCode);
      toast.success("Đã sao chép", `Mã đơn ${order.value.orderCode} đã được sao chép`);
    } catch {
      toast.error("Không thể sao chép");
    }
  };

  const isManualDeliveryItem = (item: OrderItem) =>
    item.deliveryType !== "instant";

  const canSaveDeliveredContent = (item: OrderItem) => {
    if (item.status === "cancelled" || item.status === "failed") {
      return false;
    }

    return Boolean(String(deliveryContents[item.id] || "").trim());
  };

  const saveDeliveredContent = async (item: OrderItem) => {
    const deliveredContent = String(deliveryContents[item.id] || "").trim();
    if (!deliveredContent || savingItemId.value === item.id) return;

    savingItemId.value = item.id;

    try {
      await $fetch(`/api/admin/orders/${orderCode.value}/items/${item.id}`, {
        method: "PATCH",
        body: { deliveredContent },
      });

      toast.success("Đã cập nhật nội dung đơn hàng");
      await refresh();
    } catch (err: any) {
      toast.error(
        "Không thể cập nhật",
        err?.data?.message || "Vui lòng thử lại"
      );
    } finally {
      savingItemId.value = null;
    }
  };
</script>

<template>
  <div class="space-y-6">
    <div
      class="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-slate-400"
    >
      <NuxtLink
        to="/admin/orders"
        class="flex items-center gap-1.5 transition-colors hover:text-primary"
      >
        <Icon name="solar:cart-large-line-duotone" size="14" />
        Đơn hàng
      </NuxtLink>
      <Icon name="solar:alt-arrow-right-linear" size="12" />
      <span class="text-slate-900 dark:text-white">Chi tiết</span>
      <Icon name="solar:alt-arrow-right-linear" size="12" />
      <span class="text-primary">{{ orderCode }}</span>
    </div>

    <div v-if="pending" class="space-y-4 animate-pulse">
      <div class="h-32 rounded-3xl bg-slate-100 dark:bg-slate-800" />
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="i in 4"
          :key="i"
          class="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800"
        />
      </div>
      <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div class="h-80 rounded-3xl bg-slate-100 dark:bg-slate-800" />
        <div class="h-80 rounded-3xl bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>

    <div
      v-else-if="error || !order"
      class="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900"
    >
      <div
        class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800"
      >
        <Icon name="solar:file-corrupted-line-duotone" size="28" />
      </div>
      <h1 class="text-xl font-bold text-slate-900 dark:text-white">
        Không tải được đơn hàng
      </h1>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {{ errorMessage }}
      </p>
      <div class="mt-5">
        <NuxtLink to="/admin/orders">
          <UiButton>Quay lại danh sách đơn</UiButton>
        </NuxtLink>
      </div>
    </div>

    <template v-else>
      <div
        class="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#181a1f]"
      >
        <div
          class="h-24 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent"
        />
        <div
          class="-mt-10 flex flex-col gap-5 px-5 pb-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between"
        >
          <div class="flex min-w-0 items-end gap-4">
            <div
              class="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white bg-white text-2xl font-bold text-primary dark:border-slate-700 dark:bg-slate-800"
            >
              {{ (order.username || "?").charAt(0).toUpperCase() }}
            </div>

            <div class="min-w-0 pb-1">
              <div class="mb-2 flex flex-wrap items-center gap-2">
                <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
                  {{ order.orderCode }}
                </h1>
                <UiBadge
                  :variant="getStatusBadge(order.status).variant as any"
                  :label="getStatusBadge(order.status).label"
                  rounded
                />
                <UiBadge
                  :variant="getPaymentBadge(order.paymentStatus).variant as any"
                  :label="getPaymentBadge(order.paymentStatus).label"
                  rounded
                />
              </div>

              <div
                class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-medium text-slate-500 dark:text-slate-400"
              >
                <div class="flex items-center gap-1.5">
                  <Icon name="solar:user-circle-line-duotone" size="16" />
                  {{ order.username || `User #${order.userId || "---"}` }}
                </div>
                <div class="flex items-center gap-1.5">
                  <Icon name="solar:calendar-date-line-duotone" size="16" />
                  Tạo lúc {{ formatDateTime(order.createdAt) }}
                </div>
                <div class="flex items-center gap-1.5">
                  <Icon name="solar:wallet-money-line-duotone" size="16" />
                  {{ getPaymentTypeLabel(order.paymentType) }}
                </div>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <UiButton variant="outline" @click="copyOrderCode">
              <Icon name="solar:copy-line-duotone" size="16" />
              Sao chép mã đơn
            </UiButton>
            <NuxtLink to="/admin/orders">
              <UiButton variant="outline">
                <Icon name="solar:arrow-left-linear" size="16" />
                Quay lại
              </UiButton>
            </NuxtLink>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="stat in [
            {
              label: 'Tổng thanh toán',
              value: formatCurrency(order.totalAmount),
              icon: 'solar:wallet-money-bold-duotone',
              color: 'text-emerald-500',
              bg: 'bg-emerald-500/10',
            },
            {
              label: 'Số item',
              value: `${order.items.length} mục`,
              icon: 'solar:box-bold-duotone',
              color: 'text-sky-500',
              bg: 'bg-sky-500/10',
            },
            {
              label: 'Loại đơn',
              value: getOrderTypeLabel(order.orderType),
              icon: 'solar:layers-bold-duotone',
              color: 'text-violet-500',
              bg: 'bg-violet-500/10',
            },
            {
              label: 'Cập nhật cuối',
              value: formatDateTime(order.updatedAt),
              icon: 'solar:clock-circle-bold-duotone',
              color: 'text-amber-500',
              bg: 'bg-amber-500/10',
            },
          ]"
          :key="stat.label"
          class="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
        >
          <div
            :class="[
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
              stat.bg,
            ]"
          >
            <Icon :name="stat.icon" :class="stat.color" size="22" />
          </div>
          <div class="min-w-0">
            <p class="mb-1 text-[12px] font-semibold text-slate-400">
              {{ stat.label }}
            </p>
            <p class="truncate text-sm font-bold text-slate-900 dark:text-white">
              {{ stat.value }}
            </p>
          </div>
        </div>
      </div>

      <div
        class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]"
      >
        <div class="space-y-6">
          <section
            class="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <div class="mb-5">
              <h2 class="text-lg font-bold text-slate-900 dark:text-white">
                Sản phẩm trong đơn
              </h2>
              <p class="text-sm text-slate-500 dark:text-slate-400">
                Danh sách item thực tế đã tạo trong đơn hàng.
              </p>
            </div>

            <div class="space-y-4">
              <article
                v-for="item in order.items"
                :key="item.id"
                class="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <div class="flex flex-col gap-4">
                  <div class="min-w-0">
                    <div class="mb-2 flex flex-wrap items-center gap-2">
                      <h3 class="text-base font-bold text-slate-900 dark:text-white">
                        {{ item.productName || "---" }}
                      </h3>
                      <span
                        class="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      >
                        {{ item.planName || "Không có gói" }}
                      </span>
                      <UiBadge
                        :variant="getStatusBadge(item.status).variant as any"
                        :label="getStatusBadge(item.status).label"
                        rounded
                      />
                    </div>
                    <div
                      class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-medium text-slate-500 dark:text-slate-400"
                    >
                      <span>Plan ID: #{{ item.planId || "---" }}</span>
                      <span>Số lượng: {{ item.quantity }}</span>
                      <span>{{ formatDateTime(item.createdAt) }}</span>
                    </div>

                    <div
                      v-if="item.deliveredContent"
                      class="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30"
                    >
                      <p
                        class="mb-2 text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400"
                      >
                        Nội dung đã giao
                      </p>
                      <pre
                        class="whitespace-pre-wrap break-all font-mono text-[12px] leading-relaxed text-slate-700 dark:text-slate-200"
                      >{{ item.deliveredContent }}</pre>
                    </div>

                    <div
                      v-if="isManualDeliveryItem(item)"
                      class="mt-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <p
                        class="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                      >
                        Nhập nội dung giao thủ công
                      </p>

                      <UiTextarea
                        v-model="deliveryContents[item.id]"
                        :rows="4"
                        :placeholder="`Nhập nội dung giao cho ${item.planName || 'gói này'}`"
                        :disabled="
                          savingItemId === item.id ||
                          item.status === 'cancelled' ||
                          item.status === 'failed'
                        "
                        class="border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-[#20232a]"
                      />

                      <div
                        class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <p class="text-[11px] text-slate-400">
                          {{ String(deliveryContents[item.id] || "").trim().length }} ky tu
                        </p>
                        <UiButton
                          size="sm"
                          :loading="savingItemId === item.id"
                          :disabled="!canSaveDeliveredContent(item)"
                          @click="saveDeliveredContent(item)"
                        >
                          {{ item.deliveredContent ? "Cập nhật nội dung" : "Lưu và giao hàng" }}
                        </UiButton>
                      </div>
                    </div>

                    <p
                      v-if="item.reason"
                      class="mt-3 text-sm text-rose-500 dark:text-rose-400"
                    >
                      {{ item.reason }}
                    </p>
                  </div>

                </div>
              </article>
            </div>
          </section>

          <section
            class="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <div class="mb-4">
              <h2 class="text-lg font-bold text-slate-900 dark:text-white">
                Timeline xử lý
              </h2>
              <p class="text-sm text-slate-500 dark:text-slate-400">
                Các mốc thời gian quan trọng của đơn hàng.
              </p>
            </div>

            <div v-if="timeline.length > 0" class="space-y-5">
              <div
                v-for="(entry, index) in timeline"
                :key="entry.key"
                class="flex gap-4"
              >
                <div class="flex flex-col items-center">
                  <span
                    :class="[
                      'block h-3.5 w-3.5 rounded-full ring-4 ring-white dark:ring-slate-900',
                      getTimelineTone(entry.tone),
                    ]"
                  />
                  <span
                    v-if="index < timeline.length - 1"
                    class="mt-1 block w-px flex-1 bg-slate-200 dark:bg-slate-800"
                  />
                </div>

                <div class="pb-5">
                  <h3 class="font-semibold text-slate-900 dark:text-white">
                    {{ entry.title }}
                  </h3>
                  <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {{ formatDateTime(entry.time) }}
                  </p>
                </div>
              </div>
            </div>
            <div v-else class="text-sm text-slate-400">
              Chưa có mốc xử lý bổ sung cho đơn hàng này.
            </div>
          </section>
        </div>

        <div class="space-y-6">
          <section
            class="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">
              Thông tin khách hàng
            </h2>
            <div class="mt-4 space-y-3 text-sm">
              <div class="flex items-start justify-between gap-3">
                <span class="text-slate-400">Username</span>
                <span class="text-right font-semibold text-slate-700 dark:text-slate-200">
                  {{ order.username || "---" }}
                </span>
              </div>
              <div class="flex items-start justify-between gap-3">
                <span class="text-slate-400">Email</span>
                <span class="text-right font-semibold text-slate-700 dark:text-slate-200">
                  {{ order.email || "---" }}
                </span>
              </div>
              <div class="flex items-start justify-between gap-3">
                <span class="text-slate-400">User ID</span>
                <span class="text-right font-semibold text-slate-700 dark:text-slate-200">
                  #{{ order.userId || "---" }}
                </span>
              </div>
              <div class="flex items-start justify-between gap-3">
                <span class="text-slate-400">IP gần nhất</span>
                <span class="text-right font-mono font-semibold text-slate-700 dark:text-slate-200">
                  {{ order.lastIp || "---" }}
                </span>
              </div>
            </div>
          </section>

          <section
            class="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">
              Thanh toán
            </h2>
            <div class="mt-4 space-y-3 text-sm">
              <div class="flex items-start justify-between gap-3">
                <span class="text-slate-400">Phương thức</span>
                <span class="text-right font-semibold text-slate-700 dark:text-slate-200">
                  {{ getPaymentTypeLabel(order.paymentType) }}
                </span>
              </div>
              <div class="flex items-start justify-between gap-3">
                <span class="text-slate-400">Trạng thái</span>
                <span class="text-right font-semibold text-slate-700 dark:text-slate-200">
                  {{ getPaymentBadge(order.paymentStatus).label }}
                </span>
              </div>
              <div class="flex items-start justify-between gap-3">
                <span class="text-slate-400">Mã thanh toán</span>
                <span class="text-right font-mono font-semibold text-slate-700 dark:text-slate-200">
                  {{ order.paymentCode || "---" }}
                </span>
              </div>
              <div class="flex items-start justify-between gap-3">
                <span class="text-slate-400">Mã tham chiếu</span>
                <span class="text-right font-mono font-semibold text-slate-700 dark:text-slate-200">
                  {{ order.referenceCode || "---" }}
                </span>
              </div>
              <div class="flex items-start justify-between gap-3">
                <span class="text-slate-400">Xác nhận lúc</span>
                <span class="text-right font-semibold text-slate-700 dark:text-slate-200">
                  {{ formatDateTime(order.paidAt) }}
                </span>
              </div>
            </div>
          </section>

          <section
            class="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">
              Giao dịch số dư
            </h2>
            <div v-if="order.transactions.length > 0" class="mt-4 space-y-3">
              <div
                v-for="transaction in order.transactions"
                :key="transaction.id"
                class="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-sm font-bold text-slate-800 dark:text-white">
                      {{ transaction.description || transaction.type }}
                    </p>
                    <p class="mt-1 text-[12px] text-slate-400">
                      {{ formatDateTime(transaction.createdAt) }}
                    </p>
                  </div>
                  <p class="font-mono text-sm font-bold text-primary">
                    {{ formatCurrency(transaction.amount) }}
                  </p>
                </div>
              </div>
            </div>
            <div v-else class="mt-4 text-sm text-slate-400">
              Chưa có bản ghi giao dịch liên kết.
            </div>
          </section>

          <section
            class="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">
              Tổng tiền đơn hàng
            </h2>
            <div class="mt-4 space-y-3 text-sm">
              <div class="flex items-center justify-between gap-3">
                <span class="text-slate-400">Tạm tính</span>
                <span class="font-semibold text-slate-700 dark:text-slate-200">
                  {{ formatCurrency(order.subtotalAmount) }}
                </span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-slate-400">Giảm giá</span>
                <span class="font-semibold text-emerald-600">
                  -{{ formatCurrency(order.discountAmount) }}
                </span>
              </div>
              <div class="border-t border-dashed border-slate-200 pt-3 dark:border-slate-800">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-sm font-bold text-slate-900 dark:text-white">
                    Tổng thanh toán
                  </span>
                  <span class="text-lg font-extrabold text-primary">
                    {{ formatCurrency(order.totalAmount) }}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <UiAlert type="info" title="Ghi chú đơn hàng">
            <div class="space-y-2 text-sm leading-6">
              <p><b>Khách ghi chú:</b> {{ order.customerNote || "---" }}</p>
              <p><b>Nội bộ:</b> {{ order.adminNote || "---" }}</p>
              <p v-if="order.reason"><b>Lý do:</b> {{ order.reason }}</p>
            </div>
          </UiAlert>
        </div>
      </div>
    </template>
  </div>
</template>
