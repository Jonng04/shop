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
        <NuxtLink to="/orders" class="hover:text-primary transition-colors"
          >Đơn hàng</NuxtLink
        >
        <Icon name="solar:alt-arrow-right-linear" size="13" />
        <span
          class="text-slate-700 dark:text-slate-300 font-medium font-mono"
          >{{ route.params.code }}</span
        >
      </div>

      <!-- Skeleton -->
      <div v-if="loading" class="space-y-4 animate-pulse">
        <div
          class="bg-white dark:bg-[#181a1f] border border-slate-200 dark:border-slate-800 rounded-2xl p-6"
        >
          <div
            class="h-5 w-48 rounded-lg bg-slate-200 dark:bg-slate-700 mb-3"
          />
          <div class="h-3 w-32 rounded bg-slate-200 dark:bg-slate-700 mb-5" />
          <div class="grid grid-cols-3 gap-4">
            <div
              v-for="i in 3"
              :key="i"
              class="h-16 rounded-xl bg-slate-200 dark:bg-slate-700"
            />
          </div>
        </div>
        <div
          class="bg-white dark:bg-[#181a1f] border border-slate-200 dark:border-slate-800 rounded-2xl p-6"
        >
          <div
            class="h-4 w-32 rounded-lg bg-slate-200 dark:bg-slate-700 mb-4"
          />
          <div
            v-for="i in 2"
            :key="i"
            class="flex gap-4 py-3 border-b border-slate-100 dark:border-slate-800"
          >
            <div
              class="w-14 h-14 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0"
            />
            <div class="flex-1 space-y-2">
              <div class="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
              <div class="h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        </div>
      </div>

      <!-- Not found -->
      <div
        v-else-if="!order"
        class="bg-white dark:bg-[#181a1f] border border-slate-200 dark:border-slate-800 rounded-2xl p-16 flex flex-col items-center text-center"
      >
        <Icon
          name="solar:bag-cross-bold-duotone"
          size="48"
          class="text-slate-300 dark:text-slate-600 mb-4"
        />
        <h3 class="text-[16px] font-bold text-slate-800 dark:text-white mb-2">
          Không tìm thấy đơn hàng
        </h3>
        <p class="text-slate-400 text-[13px] mb-5">
          Đơn hàng không tồn tại hoặc không thuộc về bạn.
        </p>
        <UiButton
          variant="outline"
          @click="$router.push('/orders')"
          class="!rounded-xl"
        >
          <template #prefix>
            <Icon name="solar:arrow-left-linear" size="15" />
          </template>
          Quay lại
        </UiButton>
      </div>

      <template v-else>
        <!-- Order header card -->
        <div
          class="bg-white dark:bg-[#181a1f] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden mb-5"
        >
          <!-- Top bar -->
          <div
            class="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"
              >
                <Icon
                  name="solar:bag-bold-duotone"
                  size="17"
                  class="text-primary"
                />
              </div>
              <div>
                <p
                  class="font-mono font-bold text-slate-800 dark:text-white text-[14px]"
                >
                  {{ order.orderCode }}
                </p>
                <p class="text-[11px] text-slate-400 mt-0.5">
                  {{ formatDate(order.createdAt) }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span
                class="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full"
                :class="statusClass(order.status)"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-current" />
                {{ statusLabel(order.status) }}
              </span>
            </div>
          </div>

          <!-- Stats grid -->
          <div
            class="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-slate-100 dark:divide-slate-800"
          >
            <div class="px-5 py-4">
              <p class="text-[11px] text-slate-400 font-medium mb-1">
                Tổng thanh toán
              </p>
              <p class="text-[17px] font-bold text-primary">
                {{ Number(order.totalAmount).toLocaleString() }}đ
              </p>
            </div>
            <div class="px-5 py-4">
              <p class="text-[11px] text-slate-400 font-medium mb-1">
                Giao hàng
              </p>
              <span
                class="inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-0.5 rounded-full"
                :class="fulfillmentClass(order.fulfillmentStatus)"
              >
                {{ fulfillmentLabel(order.fulfillmentStatus) }}
              </span>
            </div>
            <div class="px-5 py-4">
              <p class="text-[11px] text-slate-400 font-medium mb-1">
                Phương thức
              </p>
              <p
                class="text-[13px] font-bold text-slate-700 dark:text-slate-200"
              >
                {{
                  order.paymentType === "balance"
                    ? "Số dư tài khoản"
                    : "Thanh toán"
                }}
              </p>
            </div>
            <div class="px-5 py-4">
              <p class="text-[11px] text-slate-400 font-medium mb-1">
                Loại đơn
              </p>
              <p
                class="text-[13px] font-bold text-slate-700 dark:text-slate-200"
              >
                {{
                  order.orderType === "instant" ? "Giao tức thì" : "Đặt trước"
                }}
              </p>
            </div>
          </div>
        </div>

        <!-- Order items -->
        <div
          class="bg-white dark:bg-[#181a1f] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden mb-5"
        >
          <div
            class="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800"
          >
            <Icon
              name="solar:box-bold-duotone"
              size="16"
              class="text-primary"
            />
            <p class="text-[13px] font-bold text-slate-800 dark:text-white">
              Sản phẩm ({{ order.items.length }})
            </p>
          </div>

          <div class="divide-y divide-slate-100 dark:divide-slate-800">
            <div v-for="item in order.items" :key="item.id" class="p-5">
              <div class="flex items-start gap-4">
                <!-- Icon placeholder (no image in orderItems) -->
                <div
                  class="w-12 h-12 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0"
                >
                  <Icon
                    name="solar:box-bold-duotone"
                    size="20"
                    class="text-primary/60"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p
                        class="text-[14px] font-bold text-slate-800 dark:text-white"
                      >
                        {{ item.productName }}
                      </p>
                      <span
                        class="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md"
                      >
                        <Icon name="solar:tag-linear" size="10" />{{
                          item.planName
                        }}
                      </span>
                    </div>
                    <div class="text-right shrink-0">
                      <p class="text-[14px] font-bold text-primary">
                        {{ Number(item.totalAmount).toLocaleString() }}đ
                      </p>
                      <p class="text-[11px] text-slate-400 mt-0.5">
                        x{{ item.quantity }} ·
                        {{ Number(item.unitPrice).toLocaleString() }}đ/cái
                      </p>
                    </div>
                  </div>

                  <!-- Item status + delivered content -->
                  <div class="mt-3 flex items-center gap-2">
                    <span
                      class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      :class="itemStatusClass(item.status)"
                    >
                      <Icon
                        :name="
                          item.status === 'delivered'
                            ? 'solar:check-circle-bold'
                            : 'solar:clock-circle-bold'
                        "
                        size="11"
                      />
                      {{ itemStatusLabel(item.status) }}
                    </span>
                    <span
                      v-if="item.deliveredAt"
                      class="text-[11px] text-slate-400"
                    >
                      {{ formatDate(item.deliveredAt) }}
                    </span>
                  </div>

                  <!-- Delivered content box -->
                  <div
                    v-if="item.deliveredContent"
                    class="mt-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3"
                  >
                    <div class="flex items-center justify-between gap-2 mb-2">
                      <p
                        class="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1"
                      >
                        <Icon name="solar:key-bold-duotone" size="13" />
                        Nội dung nhận được
                      </p>
                      <button
                        @click="copyContent(item.deliveredContent!)"
                        class="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                      >
                        <Icon name="solar:copy-linear" size="13" />
                        Sao chép
                      </button>
                    </div>
                    <pre
                      class="text-[13px] text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-all font-mono leading-relaxed"
                      >{{ item.deliveredContent }}</pre
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Total footer -->
          <div
            class="flex justify-between items-center px-5 py-4 bg-primary/5 dark:bg-primary/10 border-t border-slate-100 dark:border-slate-800"
          >
            <span
              class="text-[13px] font-bold text-slate-700 dark:text-slate-200"
              >Tổng thanh toán</span
            >
            <span class="text-xl font-bold text-primary"
              >{{ Number(order.totalAmount).toLocaleString() }}đ</span
            >
          </div>
        </div>

        <!-- Note -->
        <div
          v-if="order.customerNote"
          class="bg-white dark:bg-[#181a1f] border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 mb-5"
        >
          <p
            class="text-[12px] font-bold text-slate-400 uppercase tracking-wide mb-1"
          >
            Ghi chú
          </p>
          <p class="text-[13px] text-slate-700 dark:text-slate-200">
            {{ order.customerNote }}
          </p>
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
          <UiButton
            variant="outline"
            class="!rounded-xl"
            @click="$router.push('/orders')"
          >
            <template #prefix
              ><Icon name="solar:arrow-left-linear" size="15"
            /></template>
            Đơn hàng của tôi
          </UiButton>
          <UiButton class="!rounded-xl" @click="$router.push('/support')">
            <template #prefix
              ><Icon name="solar:chat-line-bold-duotone" size="15"
            /></template>
            Liên hệ hỗ trợ
          </UiButton>
        </div>
      </template>
    </main>

    <LayoutFooter />
  </div>
</template>

<script setup lang="ts">
  const route = useRoute();
  const toast = useToast();
  const { formatDateTime } = useDateFormatter();

  useSeoHead({
    title: `Đơn hàng ${route.params.code} `,
    description: `Chi tiết đơn hàng ${route.params.code}`,
  });

  interface OrderItem {
    id: number;
    productId: number;
    planId: number;
    productName: string;
    planName: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    status: string;
    deliveredContent: string | null;
    deliveredAt: string | null;
  }

  interface Order {
    id: number;
    orderCode: string;
    status: string;
    fulfillmentStatus: string;
    orderType: string;
    paymentType: string;
    totalAmount: number;
    subtotalAmount: number;
    discountAmount: number;
    customerNote: string | null;
    createdAt: string;
    items: OrderItem[];
  }

  const loading = ref(true);
  const order = ref<Order | null>(null);

  async function fetchOrder() {
    loading.value = true;
    try {
      const result = await $fetch<Order>(`/api/orders/${route.params.code}`);
      order.value = result;
    } catch {
      order.value = null;
    } finally {
      loading.value = false;
    }
  }

  onMounted(fetchOrder);

  async function copyContent(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Đã sao chép!");
    } catch {
      toast.error("Sao chép thất bại");
    }
  }

  function statusLabel(status: string) {
    const map: Record<string, string> = {
      pending: "Chờ xử lý",
      processing: "Đang xử lý",
      completed: "Hoàn tất",
      cancelled: "Đã hủy",
      refunded: "Hoàn tiền",
      failed: "Thất bại",
    };
    return map[status] ?? status;
  }

  function statusClass(status: string) {
    const map: Record<string, string> = {
      pending:
        "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
      processing:
        "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
      completed:
        "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
      cancelled:
        "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400",
      refunded:
        "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400",
      failed: "bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400",
    };
    return map[status] ?? "bg-slate-100 text-slate-500";
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

  function fulfillmentClass(status: string) {
    const map: Record<string, string> = {
      pending:
        "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
      processing:
        "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
      partially_delivered:
        "bg-orange-50 dark:bg-orange-900/20 text-orange-500 dark:text-orange-400",
      delivered:
        "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
      cancelled: "bg-slate-100 dark:bg-slate-800 text-slate-400",
      failed: "bg-rose-50 dark:bg-rose-900/20 text-rose-500",
    };
    return map[status] ?? "bg-slate-100 text-slate-500";
  }

  function itemStatusLabel(status: string) {
    const map: Record<string, string> = {
      pending: "Chờ giao",
      processing: "Đang xử lý",
      delivered: "Đã giao",
      cancelled: "Đã hủy",
      failed: "Thất bại",
    };
    return map[status] ?? status;
  }

  function itemStatusClass(status: string) {
    const map: Record<string, string> = {
      pending:
        "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
      processing:
        "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
      delivered:
        "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
      cancelled: "bg-slate-100 dark:bg-slate-800 text-slate-400",
      failed: "bg-rose-50 dark:bg-rose-900/20 text-rose-500",
    };
    return map[status] ?? "bg-slate-100 text-slate-500";
  }

  function formatDate(date: string | Date | null) {
    if (!date) return "";
    return formatDateTime(date, "vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>
