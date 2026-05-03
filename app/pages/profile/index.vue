<script setup lang="ts">
  const { loggedIn } = useUserSession();
  const { formatDateTime } = useDateFormatter();

  if (!loggedIn.value) {
    await navigateTo("/auth/login");
  }

  useSeoHead({
    title: "Tài khoản của tôi",
    description: "Quản lý tài khoản, cập nhật thông tin cá nhân",
  });

  interface ProfileData {
    profile: {
      id: number;
      username: string;
      email: string;
      balance: number;
      totalBalance: number;
      role: string | null;
      status: string | null;
      createdAt: string | null;
    };
    stats: {
      totalOrders: number;
      completedOrders: number;
      wishlistCount: number;
      paidDeposits: number;
    };
    recentOrders: Array<{
      id: number;
      orderCode: string;
      status: string;
      fulfillmentStatus: string;
      totalAmount: number;
      createdAt: string | null;
    }>;
    recentDeposits: Array<{
      id: number;
      paymentCode: string;
      status: string;
      amount: number;
      receivedAmount: number;
      createdAt: string | null;
      paidAt: string | null;
    }>;
  }

  const { data, pending, refresh } = await useFetch<ProfileData>(
    "/api/user/profile",
    {
      key: "user-profile-page",
    }
  );

  const profile = computed(() => data.value?.profile ?? null);
  const stats = computed(() => data.value?.stats ?? null);
  const recentOrders = computed(() => data.value?.recentOrders ?? []);
  const recentDeposits = computed(() => data.value?.recentDeposits ?? []);

  const userInitial = computed(() =>
    String(profile.value?.username || "?")
      .trim()
      .charAt(0)
      .toUpperCase()
  );

  const quickLinks = [
    {
      title: "Nạp tiền",
      description: "Bổ sung số dư để mua hàng nhanh hơn",
      to: "/wallet/deposit",
      icon: "solar:wallet-money-line-duotone",
    },
    {
      title: "Đơn hàng",
      description: "Xem lịch sử mua hàng và trạng thái giao",
      to: "/orders",
      icon: "solar:bag-line-duotone",
    },
    {
      title: "Yêu thích",
      description: "Quản lý các sản phẩm bạn đã lưu",
      to: "/wishlist",
      icon: "solar:heart-line-duotone",
    },
    {
      title: "Hỗ trợ",
      description: "Trao đổi nhanh nếu cần trợ giúp",
      to: "/support",
      icon: "solar:chat-round-line-duotone",
    },
    {
      title: "API Keys",
      description: "Tạo key/secret để kết nối website khác",
      to: "/api-keys",
      icon: "solar:key-minimalistic-square-line-duotone",
    },
  ];

  const formatCurrency = (value: number) =>
    `${Number(value || 0).toLocaleString("vi-VN")}đ`;

  const formatDate = (value: string | null) => {
    if (!value) return "---";

    return formatDateTime(value, "vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getOrderStatusMeta = (status: string) => {
    const map: Record<string, { label: string; variant: string }> = {
      pending: { label: "Chờ xử lý", variant: "warning" },
      processing: { label: "Đang xử lý", variant: "info" },
      completed: { label: "Hoàn tất", variant: "success" },
      cancelled: { label: "Đã hủy", variant: "slate" },
      refunded: { label: "Hoàn tiền", variant: "slate" },
      failed: { label: "Thất bại", variant: "error" },
    };

    return map[status] || { label: status, variant: "slate" };
  };

  const getDepositStatusMeta = (status: string) => {
    const map: Record<string, { label: string; variant: string }> = {
      pending: { label: "Chờ thanh toán", variant: "warning" },
      paid: { label: "Thành công", variant: "success" },
      cancelled: { label: "Đã hủy", variant: "slate" },
      expired: { label: "Hết hạn", variant: "slate" },
      failed: { label: "Thất bại", variant: "error" },
      refunded: { label: "Hoàn tiền", variant: "slate" },
    };

    return map[status] || { label: status, variant: "slate" };
  };
</script>

<template>
  <div class="min-h-screen bg-[#fafafa] font-sans dark:bg-[#0f1115]">
    <LayoutHeader />
    <LayoutNavbar />

    <main class="mx-auto max-w-[1400px] px-4 pb-20 pt-8 lg:px-6">
      <div class="mb-6 flex items-center gap-2 text-[13px] text-slate-500">
        <NuxtLink
          to="/"
          class="flex items-center gap-1.5 transition-colors hover:text-primary"
        >
          <Icon name="solar:home-smile-linear" size="15" />
          Trang chủ
        </NuxtLink>
        <Icon name="solar:alt-arrow-right-linear" size="13" />
        <span
          class="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300"
        >
          <Icon
            name="solar:user-circle-line-duotone"
            size="15"
            class="text-primary"
          />
          Tài khoản của tôi
        </span>
      </div>

      <div
        class="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#181a1f]"
      >
        <div class="absolute inset-0 pointer-events-none">
          <div
            class="absolute -right-12 -top-10 h-40 w-40 rounded-full bg-primary/8"
          />
          <div
            class="absolute bottom-0 right-20 h-24 w-24 rounded-full bg-sky-500/8"
          />
        </div>

        <div
          class="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"
        >
          <div class="flex items-start gap-4">
            <div
              class="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br from-primary to-emerald-500 text-2xl font-bold text-white shadow-lg shadow-primary/20"
            >
              {{ userInitial }}
            </div>

            <div>
              <p
                class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400"
              >
                Hồ sơ tài khoản
              </p>
              <h1
                class="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
              >
                {{ profile?.username || "Đang tải..." }}
              </h1>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {{ profile?.email || "---" }}
              </p>

              <div class="mt-4 flex flex-wrap gap-2">
                <UiBadge
                  :label="
                    profile?.status === 'active'
                      ? 'Đang hoạt động'
                      : 'Tài khoản'
                  "
                  variant="success"
                  rounded
                />
                <UiBadge
                  :label="
                    profile?.role === 'admin' ? 'Quản trị viên' : 'Thành viên'
                  "
                  variant="slate"
                  rounded
                />
              </div>
            </div>
          </div>

          <div class="flex flex-wrap gap-3">
            <NuxtLink to="/wallet/deposit">
              <UiButton class="!rounded-xl">
                <template #prefix>
                  <Icon name="solar:wallet-money-line-duotone" size="16" />
                </template>
                Nạp tiền ngay
              </UiButton>
            </NuxtLink>
            <UiButton variant="outline" class="!rounded-xl" @click="refresh()">
              <template #prefix>
                <Icon name="solar:refresh-line-duotone" size="16" />
              </template>
              Làm mới
            </UiButton>
          </div>
        </div>
      </div>

      <div
        v-if="pending"
        class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <div
          v-for="i in 4"
          :key="i"
          class="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#181a1f]"
        />
      </div>

      <template v-else>
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div
            class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#181a1f]"
          >
            <div class="flex items-center justify-between">
              <p class="text-[12px] font-semibold text-slate-400">
                Số dư hiện tại
              </p>
              <Icon
                name="solar:wallet-money-bold-duotone"
                size="18"
                class="text-primary"
              />
            </div>
            <p class="mt-3 text-2xl font-bold text-primary">
              {{ formatCurrency(profile?.balance || 0) }}
            </p>
            <p class="mt-1 text-[12px] text-slate-400">
              Sẵn sàng dùng để thanh toán
            </p>
          </div>

          <div
            class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#181a1f]"
          >
            <div class="flex items-center justify-between">
              <p class="text-[12px] font-semibold text-slate-400">
                Tổng đã nạp
              </p>
              <Icon
                name="solar:card-transfer-bold-duotone"
                size="18"
                class="text-sky-500"
              />
            </div>
            <p class="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
              {{ formatCurrency(profile?.totalBalance || 0) }}
            </p>
            <p class="mt-1 text-[12px] text-slate-400">
              {{ stats?.paidDeposits || 0 }} giao dịch nạp thành công
            </p>
          </div>

          <div
            class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#181a1f]"
          >
            <div class="flex items-center justify-between">
              <p class="text-[12px] font-semibold text-slate-400">Đơn hàng</p>
              <Icon
                name="solar:bag-bold-duotone"
                size="18"
                class="text-amber-500"
              />
            </div>
            <p class="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
              {{ stats?.totalOrders || 0 }}
            </p>
            <p class="mt-1 text-[12px] text-slate-400">
              {{ stats?.completedOrders || 0 }} đơn đã hoàn tất
            </p>
          </div>

          <div
            class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#181a1f]"
          >
            <div class="flex items-center justify-between">
              <p class="text-[12px] font-semibold text-slate-400">Yêu thích</p>
              <Icon
                name="solar:heart-bold-duotone"
                size="18"
                class="text-rose-500"
              />
            </div>
            <p class="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
              {{ stats?.wishlistCount || 0 }}
            </p>
            <p class="mt-1 text-[12px] text-slate-400">Sản phẩm đang lưu lại</p>
          </div>
        </div>

        <div class="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div class="space-y-6">
            <div
              class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#181a1f]"
            >
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p
                    class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400"
                  >
                    Tổng quan
                  </p>
                  <h2
                    class="mt-1 text-lg font-bold text-slate-900 dark:text-white"
                  >
                    Thông tin tài khoản
                  </h2>
                </div>
              </div>

              <div class="mt-5 grid gap-4 sm:grid-cols-2">
                <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
                  <p
                    class="text-[11px] font-bold uppercase tracking-wide text-slate-400"
                  >
                    Tên đăng nhập
                  </p>
                  <p
                    class="mt-2 text-sm font-bold text-slate-800 dark:text-slate-100"
                  >
                    {{ profile?.username || "---" }}
                  </p>
                </div>
                <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
                  <p
                    class="text-[11px] font-bold uppercase tracking-wide text-slate-400"
                  >
                    Email
                  </p>
                  <p
                    class="mt-2 text-sm font-bold text-slate-800 dark:text-slate-100"
                  >
                    {{ profile?.email || "---" }}
                  </p>
                </div>
                <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
                  <p
                    class="text-[11px] font-bold uppercase tracking-wide text-slate-400"
                  >
                    Ngày tham gia
                  </p>
                  <p
                    class="mt-2 text-sm font-bold text-slate-800 dark:text-slate-100"
                  >
                    {{ formatDate(profile?.createdAt || null) }}
                  </p>
                </div>
                <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
                  <p
                    class="text-[11px] font-bold uppercase tracking-wide text-slate-400"
                  >
                    Trạng thái
                  </p>
                  <p
                    class="mt-2 text-sm font-bold text-slate-800 dark:text-slate-100"
                  >
                    {{
                      profile?.status === "active"
                        ? "Đang hoạt động"
                        : "Không xác định"
                    }}
                  </p>
                </div>
              </div>
            </div>

            <div
              class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#181a1f]"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p
                    class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400"
                  >
                    Đơn hàng gần đây
                  </p>
                  <h2
                    class="mt-1 text-lg font-bold text-slate-900 dark:text-white"
                  >
                    Hoạt động mua hàng
                  </h2>
                </div>

                <NuxtLink to="/orders">
                  <UiButton variant="outline" size="sm" class="!rounded-xl">
                    Xem tất cả
                  </UiButton>
                </NuxtLink>
              </div>

              <div v-if="recentOrders.length" class="mt-5 space-y-3">
                <NuxtLink
                  v-for="item in recentOrders"
                  :key="item.id"
                  :to="`/orders/${item.orderCode}`"
                  class="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/50"
                >
                  <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"
                  >
                    <Icon name="solar:bag-bold-duotone" size="18" />
                  </div>

                  <div class="min-w-0 flex-1">
                    <p
                      class="truncate text-sm font-bold text-slate-800 dark:text-slate-100"
                    >
                      {{ item.orderCode }}
                    </p>
                    <p class="mt-1 text-[12px] text-slate-400">
                      {{ formatDate(item.createdAt) }}
                    </p>
                  </div>

                  <div class="text-right">
                    <p
                      class="text-sm font-bold text-slate-800 dark:text-slate-100"
                    >
                      {{ formatCurrency(item.totalAmount) }}
                    </p>
                    <UiBadge
                      class="mt-1"
                      :label="getOrderStatusMeta(item.status).label"
                      :variant="getOrderStatusMeta(item.status).variant as any"
                      rounded
                    />
                  </div>
                </NuxtLink>
              </div>

              <div
                v-else
                class="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400 dark:border-slate-800"
              >
                Bạn chưa có đơn hàng nào.
              </div>
            </div>
          </div>

          <div class="space-y-6">
            <div
              class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#181a1f]"
            >
              <p
                class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400"
              >
                Truy cập nhanh
              </p>
              <h2 class="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                Công cụ dành cho bạn
              </h2>

              <div class="mt-5 grid gap-3">
                <NuxtLink
                  v-for="link in quickLinks"
                  :key="link.to"
                  :to="link.to"
                  class="group flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/50"
                >
                  <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <Icon :name="link.icon" size="18" />
                  </div>

                  <div class="min-w-0 flex-1">
                    <p
                      class="text-sm font-bold text-slate-800 group-hover:text-primary dark:text-slate-100"
                    >
                      {{ link.title }}
                    </p>
                    <p class="mt-1 text-[12px] text-slate-400">
                      {{ link.description }}
                    </p>
                  </div>

                  <Icon
                    name="solar:alt-arrow-right-linear"
                    size="15"
                    class="text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-primary dark:text-slate-600"
                  />
                </NuxtLink>
              </div>
            </div>

            <div
              class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#181a1f]"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p
                    class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400"
                  >
                    Nạp tiền gần đây
                  </p>
                  <h2
                    class="mt-1 text-lg font-bold text-slate-900 dark:text-white"
                  >
                    Lịch sử topup
                  </h2>
                </div>

                <NuxtLink to="/wallet/deposit">
                  <UiButton variant="outline" size="sm" class="!rounded-xl">
                    Mở ví
                  </UiButton>
                </NuxtLink>
              </div>

              <div v-if="recentDeposits.length" class="mt-5 space-y-3">
                <div
                  v-for="item in recentDeposits"
                  :key="item.id"
                  class="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p
                        class="text-sm font-bold text-slate-800 dark:text-slate-100"
                      >
                        {{ item.paymentCode }}
                      </p>
                      <p class="mt-1 text-[12px] text-slate-400">
                        {{ formatDate(item.createdAt) }}
                      </p>
                    </div>
                    <UiBadge
                      :label="getDepositStatusMeta(item.status).label"
                      :variant="
                        getDepositStatusMeta(item.status).variant as any
                      "
                      rounded
                    />
                  </div>

                  <div class="mt-3 grid grid-cols-2 gap-3">
                    <div
                      class="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900/60"
                    >
                      <p class="text-[11px] text-slate-400">Số tiền nạp</p>
                      <p
                        class="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100"
                      >
                        {{ formatCurrency(item.amount) }}
                      </p>
                    </div>
                    <div
                      class="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900/60"
                    >
                      <p class="text-[11px] text-slate-400">Thực nhận</p>
                      <p
                        class="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100"
                      >
                        {{ formatCurrency(item.receivedAmount || item.amount) }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-else
                class="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400 dark:border-slate-800"
              >
                Bạn chưa có giao dịch nạp tiền nào.
              </div>
            </div>
          </div>
        </div>
      </template>
    </main>

    <LayoutFooter />
  </div>
</template>
