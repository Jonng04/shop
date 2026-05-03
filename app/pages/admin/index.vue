<script setup lang="ts">
  definePageMeta({ layout: "admin" });
  useHead({ title: "Tổng quan - Admin Panel" });
  const { formatDateTime } = useDateFormatter();

  interface DashboardStat {
    label: string;
    value: number;
    valueText?: string;
    trendValue: string;
    isUp: boolean;
    icon: string;
  }

  interface DashboardOrder {
    id: string;
    customer: string;
    amount: number;
    status: string;
    createdAt: string | Date | null;
  }

  interface DashboardChartItem {
    label: string;
    revenue: number;
  }

  interface DashboardTopProduct {
    name: string;
    soldCount: number;
    revenue: number;
  }

  interface DashboardResponse {
    stats: {
      revenue: DashboardStat;
      orders: DashboardStat;
      users: DashboardStat;
      conversion: DashboardStat;
    };
    recentOrders: DashboardOrder[];
    revenueChart: DashboardChartItem[];
    topProducts: DashboardTopProduct[];
  }

  const { data, pending } = await useFetch<DashboardResponse>(
    "/api/admin/dashboard",
    {
      key: "admin-dashboard-overview",
      default: () => ({
        stats: {
          revenue: {
            label: "Doanh thu hôm nay",
            value: 0,
            trendValue: "0%",
            isUp: true,
            icon: "solar:wallet-money-bold-duotone",
          },
          orders: {
            label: "Đơn hàng mới",
            value: 0,
            trendValue: "0%",
            isUp: true,
            icon: "solar:cart-large-bold-duotone",
          },
          users: {
            label: "Khách hàng mới",
            value: 0,
            trendValue: "0%",
            isUp: true,
            icon: "solar:users-group-rounded-bold-duotone",
          },
          conversion: {
            label: "Tỷ lệ chuyển đổi",
            value: 0,
            trendValue: "0%",
            isUp: true,
            icon: "solar:chart-square-bold-duotone",
          },
        },
        recentOrders: [],
        revenueChart: [],
        topProducts: [],
      }),
    }
  );

  const statCards = computed(() => {
    const stats = data.value?.stats;
    if (!stats) return [];

    return [
      {
        id: "revenue",
        name: stats.revenue.label,
        value: `${Number(stats.revenue.value || 0).toLocaleString("vi-VN")} đ`,
        trend: stats.revenue.trendValue,
        isUp: stats.revenue.isUp,
        icon: stats.revenue.icon,
      },
      {
        id: "orders",
        name: stats.orders.label,
        value: Number(stats.orders.value || 0).toLocaleString("vi-VN"),
        trend: stats.orders.trendValue,
        isUp: stats.orders.isUp,
        icon: stats.orders.icon,
      },
      {
        id: "users",
        name: stats.users.label,
        value: Number(stats.users.value || 0).toLocaleString("vi-VN"),
        trend: stats.users.trendValue,
        isUp: stats.users.isUp,
        icon: stats.users.icon,
      },
      {
        id: "conversion",
        name: stats.conversion.label,
        value: `${Number(stats.conversion.value || 0).toLocaleString("vi-VN")}%`,
        trend: stats.conversion.trendValue,
        isUp: stats.conversion.isUp,
        icon: stats.conversion.icon,
      },
    ];
  });

  const revenueChart = computed(() => data.value?.revenueChart || []);
  const chartMax = computed(() =>
    Math.max(...revenueChart.value.map((item) => Number(item.revenue || 0)), 1)
  );

  const topProducts = computed(() => data.value?.topProducts || []);
  const recentOrders = computed(() => data.value?.recentOrders || []);

  const getStatusColor = (status: string) => {
    if (status === "completed") return "bg-primary/10 text-primary";
    if (status === "processing" || status === "pending") {
      return "bg-amber-100 text-amber-700";
    }
    if (status === "cancelled" || status === "failed") {
      return "bg-rose-100 text-rose-700";
    }
    return "bg-slate-100 text-slate-700";
  };

  const getStatusLabel = (status: string) => {
    if (status === "completed") return "Hoàn thành";
    if (status === "processing") return "Đang xử lý";
    if (status === "pending") return "Chờ xử lý";
    if (status === "cancelled") return "Đã hủy";
    if (status === "failed") return "Thất bại";
    if (status === "refunded") return "Đã hoàn tiền";
    return status;
  };

  const formatOrderTime = (value: string | Date | null) => {
    if (!value) return "--";
    const formatted = formatDateTime(value, "vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
    return formatted === "---" ? "--" : formatted;
  };
</script>

<template>
  <div class="space-y-6">
    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h1
          class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
        >
          Tổng quan
        </h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Dữ liệu dashboard đang được lấy trực tiếp từ hệ thống.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <div
          class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
        >
          <Icon
            name="solar:calendar-line-duotone"
            size="18"
            class="text-slate-400"
          />
          Hôm nay
        </div>
        <NuxtLink
          to="/admin/orders"
          class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-primary/90"
        >
          <Icon name="solar:bag-line-duotone" size="18" />
          Xem đơn
        </NuxtLink>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="stat in statCards"
        :key="stat.id"
        class="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
      >
        <div class="flex items-center justify-between">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-xl"
            :class="{
              'bg-primary/10 text-primary': stat.id === 'revenue',
              'bg-sky-50 text-sky-500': stat.id === 'orders',
              'bg-amber-50 text-amber-500': stat.id === 'users',
              'bg-purple-50 text-purple-500': stat.id === 'conversion',
            }"
          >
            <Icon :name="stat.icon" size="24" />
          </div>
          <div
            :class="[
              stat.isUp
                ? 'text-primary bg-primary/10'
                : 'text-rose-600 bg-rose-50',
              'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold',
            ]"
          >
            <Icon
              :name="
                stat.isUp
                  ? 'solar:arrow-right-up-linear'
                  : 'solar:arrow-right-down-linear'
              "
              size="14"
            />
            {{ stat.trend }}
          </div>
        </div>
        <div class="mt-4">
          <h3 class="text-sm font-medium text-slate-500">{{ stat.name }}</h3>
          <p
            class="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 font-mono"
          >
            {{ stat.value }}
          </p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div
        class="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col"
      >
        <div class="mb-8 flex items-center justify-between">
          <h3 class="text-base font-bold text-slate-900">
            Doanh thu 12 ngày gần đây
          </h3>
          <NuxtLink
            to="/admin/orders"
            class="text-sm font-semibold text-primary hover:text-primary/80 transition"
          >
            Xem đơn hàng
          </NuxtLink>
        </div>

        <div class="flex h-48 flex-1 items-end gap-3 px-2 sm:gap-4">
          <div
            v-for="item in revenueChart"
            :key="item.label"
            class="group relative flex h-full w-full flex-1 cursor-pointer flex-col justify-end"
          >
            <div
              class="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[10px] font-bold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
            >
              {{ Number(item.revenue || 0).toLocaleString("vi-VN") }} đ
            </div>
            <div
              class="w-full rounded-t bg-primary/20 transition-all duration-300 group-hover:bg-primary"
              :style="{
                height: `${Math.max((Number(item.revenue || 0) / chartMax) * 100, 8)}%`,
              }"
            />
            <p class="mt-2 text-center text-[11px] font-bold text-slate-400">
              {{ item.label }}
            </p>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 class="mb-6 text-base font-bold text-slate-900">
          Sản phẩm bán chạy
        </h3>
        <div v-if="topProducts.length" class="space-y-5">
          <div
            v-for="item in topProducts"
            :key="item.name"
            class="flex items-center gap-4"
          >
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100"
            >
              <Icon
                name="solar:box-minimalistic-bold-duotone"
                size="20"
                class="text-slate-400"
              />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-bold text-slate-900">
                {{ item.name }}
              </p>
              <p class="truncate text-xs font-medium text-slate-500">
                Đã bán:
                {{ Number(item.soldCount || 0).toLocaleString("vi-VN") }}
              </p>
            </div>
            <div class="text-right">
              <p class="font-mono text-sm font-bold text-slate-900">
                {{ Number(item.revenue || 0).toLocaleString("vi-VN") }} đ
              </p>
            </div>
          </div>
        </div>
        <div
          v-else
          class="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400"
        >
          Chưa có dữ liệu sản phẩm.
        </div>
      </div>
    </div>

    <div
      class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div
        class="flex items-center justify-between border-b border-slate-200 px-5 py-4"
      >
        <h3 class="text-base font-bold text-slate-900">Đơn hàng gần đây</h3>
        <NuxtLink
          to="/admin/orders"
          class="text-sm font-semibold text-primary hover:text-primary/80 transition"
        >
          Xem tất cả
        </NuxtLink>
      </div>

      <div v-if="pending" class="px-5 py-10 text-sm text-slate-500">
        Đang tải dữ liệu dashboard...
      </div>

      <div v-else-if="recentOrders.length" class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-600">
          <thead
            class="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500"
          >
            <tr>
              <th scope="col" class="px-5 py-3.5">Mã ĐH</th>
              <th scope="col" class="px-5 py-3.5">Khách hàng</th>
              <th scope="col" class="px-5 py-3.5">Số tiền</th>
              <th scope="col" class="px-5 py-3.5">Trạng thái</th>
              <th scope="col" class="px-5 py-3.5">Thời gian</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 bg-white">
            <tr
              v-for="order in recentOrders"
              :key="order.id"
              class="transition hover:bg-slate-50/50"
            >
              <td
                class="whitespace-nowrap px-5 py-4 font-mono text-xs font-semibold text-primary"
              >
                {{ order.id }}
              </td>
              <td class="whitespace-nowrap px-5 py-4">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[10px] font-extrabold text-slate-500"
                  >
                    {{ order.customer.substring(0, 2).toUpperCase() }}
                  </div>
                  <span class="font-bold text-slate-900">{{
                    order.customer
                  }}</span>
                </div>
              </td>
              <td
                class="whitespace-nowrap px-5 py-4 font-mono font-bold text-slate-900"
              >
                {{ Number(order.amount || 0).toLocaleString("vi-VN") }} đ
              </td>
              <td class="whitespace-nowrap px-5 py-4">
                <span
                  :class="[
                    'inline-flex rounded px-2.5 py-1 text-[11px] font-bold',
                    getStatusColor(order.status),
                  ]"
                >
                  {{ getStatusLabel(order.status) }}
                </span>
              </td>
              <td class="whitespace-nowrap px-5 py-4 text-xs font-medium">
                {{ formatOrderTime(order.createdAt) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="px-5 py-10 text-sm text-slate-500">
        Chưa có dữ liệu đơn hàng.
      </div>
    </div>
  </div>
</template>
