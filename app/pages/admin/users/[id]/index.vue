<script setup lang="ts">
  // Page Config
  definePageMeta({ layout: "admin" });
  const route = useRoute();
  const id = route.params.id;
  useHead({ title: `Chỉnh sửa người dùng #${id}` });

  const toast = useToast();
  const { formatDate, formatDateTime } = useDateFormatter();
  const submitting = ref(false);
  const activeTab = ref("info");

  // 1. Types & Interfaces
  interface User {
    id: number;
    username: string;
    email: string;
    role: string;
    balance: number;
    totalBalance: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    lastLoginAt: string;
    lastIp?: string;
    device?: string;
  }

  // 2. Fetch User Data
  const { data: user, refresh } = await useFetch<User>(
    `/api/admin/users/${id}`
  );
  const { data: adminRoles } =
    await useFetch<Array<{ id: number; name: string }>>("/api/admin/roles");

  // 3. Form State
  const form = reactive({
    username: "",
    email: "",
    role: "user",
    status: "active",
    balance: 0,
    totalBalance: 0,
  });

  // Sync data
  watchEffect(() => {
    if (user.value) {
      form.username = user.value.username;
      form.email = user.value.email;
      form.role = user.value.role;
      form.status = user.value.status;
      form.balance = user.value.balance;
      form.totalBalance = user.value.totalBalance;
    }
  });

  // 4. Options
  const roleOptions = computed(() => {
    const adminRoleOptions = (adminRoles.value || []).map((role) => ({
      label: role.name,
      value: role.name,
    }));

    return [{ label: "Khách hàng", value: "user" }, ...adminRoleOptions];
  });

  const currentRoleLabel = computed(() => {
    return (
      roleOptions.value.find((option) => option.value === user.value?.role)
        ?.label ||
      user.value?.role ||
      "Khách hàng"
    );
  });

  const statusOptions = [
    { label: "Đang hoạt động", value: "active" },
    { label: "Đã bị khóa", value: "banned" },
  ];

  // 5. Submit Action
  const handleUpdate = async () => {
    submitting.value = true;
    try {
      await $fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        body: form,
      });
      toast.success("Thành công", "Đã cập nhật thông tin người dùng");
      refresh();
    } catch (err: any) {
      toast.error("Lỗi", "Có lỗi xảy ra khi cập nhật");
    } finally {
      submitting.value = false;
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(val);
  };

  const formatDateSafe = (value?: string | null) => formatDate(value);
  const formatDateTimeSafe = (value?: string | null) => formatDateTime(value);

  // 6. Security Actions
  const newPassword = ref("");
  const updatingPassword = ref(false);

  const handleChangePassword = async () => {
    if (!newPassword.value.trim()) {
      return toast.error("Lỗi", "Vui lòng nhập mật khẩu mới");
    }

    if (newPassword.value.length < 6) {
      return toast.error("Lỗi", "Mật khẩu phải từ 6 ký tự trở lên");
    }

    updatingPassword.value = true;
    try {
      await $fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        body: { password: newPassword.value },
      });
      toast.success("Thành công", "Đã cập nhật mật khẩu mới!");
      newPassword.value = "";
    } catch (err: any) {
      const errorMsg = err.data?.message || "Không thể cập nhật mật khẩu";
      toast.error("Lỗi", errorMsg);
    } finally {
      updatingPassword.value = false;
    }
  };
</script>

<template>
  <div class="space-y-6">
    <!-- Breadcrumbs -->
    <div
      class="flex items-center gap-2 text-[12px] font-semibold text-slate-400"
    >
      <NuxtLink
        to="/admin/users"
        class="hover:text-primary transition-colors flex items-center gap-1.5 font-semibold"
      >
        <Icon name="solar:users-group-rounded-line-duotone" size="14" />
        Người dùng
      </NuxtLink>
      <Icon name="solar:alt-arrow-right-linear" size="12" />
      <span class="text-slate-900 dark:text-white font-semibold"
        >Chỉnh sửa</span
      >
      <Icon name="solar:alt-arrow-right-linear" size="12" />
      <span class="text-primary font-semibold">#{{ id }}</span>
    </div>

    <!-- Header: Pro Profile -->
    <div
      class="relative bg-white dark:bg-[#181a1f] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden"
    >
      <div
        class="h-24 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent"
      ></div>
      <div
        class="px-8 pb-8 -mt-8 flex flex-col md:flex-row items-end justify-between gap-6"
      >
        <div class="flex flex-col md:flex-row items-end gap-6">
          <div class="relative group">
            <div
              class="h-24 w-24 rounded-2xl bg-white dark:bg-slate-800 p-1 border border-slate-100 dark:border-slate-700 shadow-sm"
            >
              <div
                class="h-full w-full rounded-xl bg-primary/5 flex items-center justify-center text-3xl font-semibold text-primary"
              >
                {{ user?.username?.charAt(0).toUpperCase() }}
              </div>
            </div>
            <div
              class="absolute -bottom-1 -right-1 h-6 w-6 bg-emerald-500 text-white rounded-md flex items-center justify-center border-2 border-white dark:border-slate-900"
            >
              <Icon name="solar:check-read-line-duotone" size="14" />
            </div>
          </div>

          <div class="flex-1 pb-1">
            <div class="flex items-center gap-3 mb-1">
              <h1 class="text-2xl font-semibold text-slate-900 dark:text-white">
                {{ user?.username }}
              </h1>
              <UiBadge
                :variant="user?.status === 'active' ? 'success' : 'error'"
                :label="user?.status === 'active' ? 'Hoạt động' : 'Đã khóa'"
                rounded
              />
            </div>
            <div
              class="flex flex-wrap items-center gap-4 text-[13px] font-semibold text-slate-400"
            >
              <div class="flex items-center gap-1.5">
                <Icon name="solar:letter-line-duotone" size="16" />
                {{ user?.email }}
              </div>
              <div class="flex items-center gap-1.5">
                <Icon name="solar:shield-user-line-duotone" size="16" />
                {{ currentRoleLabel }}
              </div>
              <div class="flex items-center gap-1.5">
                <Icon name="solar:calendar-date-line-duotone" size="16" /> Tham
                gia:
                {{ formatDateSafe(user?.createdAt) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="stat in [
          {
            label: 'Số dư hiện tại',
            val: formatCurrency(user?.balance || 0),
            icon: 'solar:wallet-line-duotone',
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
          },
          {
            label: 'Tổng tiền nạp',
            val: formatCurrency(user?.totalBalance || 0),
            icon: 'solar:hand-stars-line-duotone',
            color: 'text-sky-500',
            bg: 'bg-sky-500/10',
          },
          {
            label: 'Tổng đã chi',
            val: formatCurrency(0),
            icon: 'solar:cart-check-line-duotone',
            color: 'text-orange-500',
            bg: 'bg-orange-500/10',
          },
          {
            label: 'Số tiền nợ',
            val: formatCurrency(0),
            icon: 'solar:bill-list-line-duotone',
            color: 'text-rose-500',
            bg: 'bg-rose-500/10',
          },
        ]"
        :key="stat.label"
        class="p-5 bg-white dark:bg-[#181a1f] rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4"
      >
        <div
          :class="[
            'h-11 w-11 flex items-center justify-center rounded-xl shrink-0',
            stat.bg,
          ]"
        >
          <Icon :name="stat.icon" :class="stat.color" size="22" />
        </div>
        <div>
          <p class="text-[12px] font-semibold text-slate-400 mb-1">
            {{ stat.label }}
          </p>
          <p
            class="text-lg text-slate-900 dark:text-white leading-tight font-semibold"
          >
            {{ stat.val }}
          </p>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Sidebar -->
      <div class="lg:col-span-4 space-y-6">
        <div
          class="bg-white dark:bg-[#181a1f] rounded-3xl border border-slate-200 dark:border-slate-800 p-6"
        >
          <h3
            class="font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2 text-[13px]"
          >
            <Icon
              name="solar:info-square-line-duotone"
              size="20"
              class="text-primary"
            />
            Thông tin hệ thống
          </h3>
          <div class="space-y-4">
            <div
              v-for="info in [
                {
                  label: 'ID Người dùng',
                  val: '#' + id,
                  icon: 'solar:hashtag-square-linear',
                },
                {
                  label: 'Lần đăng nhập cuối',
                  val: user?.lastLoginAt
                    ? formatDateTimeSafe(user.lastLoginAt)
                    : 'Chưa có',
                  icon: 'solar:clock-circle-linear',
                },
                {
                  label: 'IP đăng nhập gần nhất',
                  val: user?.lastIp || 'N/A',
                  icon: 'solar:map-point-wave-linear',
                },
                {
                  label: 'Thiết bị gần nhất',
                  val: user?.device,
                  icon: 'solar:monitor-linear',
                },
                {
                  label: 'Cập nhật cuối',
                  val: user?.updatedAt
                    ? formatDateTimeSafe(user.updatedAt)
                    : '---',
                  icon: 'solar:refresh-linear',
                },
              ]"
              :key="info.label"
              class="flex items-start gap-4"
            >
              <div
                class="h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0"
              >
                <Icon :name="info.icon" size="18" class="text-slate-400" />
              </div>
              <div class="min-w-0">
                <p class="text-[11px] font-semibold text-slate-400 mb-0.5">
                  {{ info.label }}
                </p>
                <p
                  class="text-[13px] font-semibold text-slate-700 dark:text-slate-300 truncate"
                >
                  {{ info.val }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          class="bg-gradient-to-br from-indigo-500 to-primary rounded-3xl p-6 text-white relative overflow-hidden group"
        >
          <Icon
            name="solar:medal-star-line-duotone"
            size="100"
            class="absolute -right-4 -bottom-4 text-white/10"
          />
          <h4 class="text-lg font-semibold italic mb-1">Hạng thành viên</h4>
          <p
            class="text-white/70 text-[12px] font-semibold leading-relaxed mb-4"
          >
            Thành viên nạp tiền và mua hàng thường xuyên.
          </p>
          <div
            class="inline-flex items-center px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-lg text-xs font-semibold italic"
          >
            Kim Cương
          </div>
        </div>
      </div>

      <!-- Main Form Area -->
      <div class="lg:col-span-8 flex flex-col gap-6">
        <div
          class="bg-white dark:bg-[#181a1f] rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col min-h-[500px]"
        >
          <!-- Tabs Navigation -->
          <div
            class="flex items-center px-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/10"
          >
            <button
              v-for="t in [
                {
                  id: 'info',
                  label: 'Thông tin chính',
                  icon: 'solar:user-id-line-duotone',
                },
                {
                  id: 'security',
                  label: 'Bảo mật & API',
                  icon: 'solar:shield-keyhole-line-duotone',
                },
                {
                  id: 'history',
                  label: 'Giao dịch',
                  icon: 'solar:history-line-duotone',
                },
              ]"
              :key="t.id"
              @click="activeTab = t.id"
              class="px-6 py-4 flex items-center gap-2 text-[13px] font-semibold relative transition-colors"
              :class="
                activeTab === t.id
                  ? 'text-primary'
                  : 'text-slate-400 hover:text-slate-600'
              "
            >
              <Icon :name="t.icon" size="18" />
              {{ t.label }}
              <div
                v-if="activeTab === t.id"
                class="absolute bottom-0 left-6 right-6 h-1 bg-primary rounded-t-full"
              ></div>
            </button>
          </div>

          <div class="p-8 space-y-6 flex-1">
            <!-- Information Tab -->
            <div v-if="activeTab === 'info'" class="space-y-6">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label class="text-[12px] font-semibold text-slate-400 ml-1"
                    >Tên tài khoản</label
                  >
                  <UiInput
                    v-model="form.username"
                    placeholder="Nhập username..."
                    class="h-11 rounded-xl text-sm font-semibold"
                  />
                </div>
                <div class="space-y-2">
                  <label class="text-[12px] font-semibold text-slate-400 ml-1"
                    >Địa chỉ Email</label
                  >
                  <UiInput
                    v-model="form.email"
                    type="email"
                    placeholder="email@example.com"
                    class="h-11 rounded-xl text-sm font-semibold"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label class="text-[12px] font-semibold text-slate-400 ml-1"
                    >Vai trò</label
                  >
                  <UiDropdown
                    v-model="form.role"
                    :options="roleOptions"
                    class="h-11 rounded-xl"
                  />
                </div>
                <div class="space-y-2">
                  <label class="text-[12px] font-semibold text-slate-400 ml-1"
                    >Trạng thái</label
                  >
                  <UiDropdown
                    v-model="form.status"
                    :options="statusOptions"
                    class="h-11 rounded-xl"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                <div
                  class="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 font-semibold"
                >
                  <div class="flex items-center gap-3 mb-4">
                    <div
                      class="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500"
                    >
                      <Icon name="solar:wallet-line-duotone" size="20" />
                    </div>
                    <span
                      class="text-[12px] font-semibold text-slate-800 dark:text-slate-200"
                      >Số dư ví</span
                    >
                  </div>
                  <UiInput
                    v-model.number="form.balance"
                    type="number"
                    class="h-11 rounded-xl text-lg font-semibold text-emerald-600 bg-white dark:bg-[#1c1f26]"
                  />
                </div>
                <div
                  class="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 font-semibold"
                >
                  <div class="flex items-center gap-3 mb-4">
                    <div
                      class="h-9 w-9 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500"
                    >
                      <Icon name="solar:cloud-upload-line-duotone" size="20" />
                    </div>
                    <span
                      class="text-[12px] font-semibold text-slate-800 dark:text-slate-200"
                      >Tổng nạp</span
                    >
                  </div>
                  <UiInput
                    v-model.number="form.totalBalance"
                    type="number"
                    class="h-11 rounded-xl text-lg font-semibold text-sky-600 bg-white dark:bg-[#1c1f26]"
                  />
                </div>
              </div>
            </div>

            <!-- Security Tab -->
            <div v-if="activeTab === 'security'" class="space-y-6">
              <div class="space-y-6">
                <div
                  class="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 font-semibold"
                >
                  <h4
                    class="text-[13px] font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2"
                  >
                    <Icon
                      name="solar:lock-password-line-duotone"
                      size="18"
                      class="text-primary"
                    />
                    Thay đổi mật khẩu
                  </h4>
                  <div class="space-y-4">
                    <UiInput
                      v-model="newPassword"
                      type="password"
                      placeholder="Nhập mật khẩu mới..."
                      class="rounded-xl"
                    />
                    <UiButton
                      class="px-8 font-semibold text-[11px]"
                      :loading="updatingPassword"
                      @click="handleChangePassword"
                    >
                      Cập nhật mật khẩu
                    </UiButton>
                  </div>
                </div>
              </div>
            </div>

            <!-- History Tab -->
            <div
              v-if="activeTab === 'history'"
              class="py-12 flex flex-col items-center justify-center text-slate-400"
            >
              <Icon
                name="solar:ghost-line-duotone"
                size="48"
                class="mb-3 opacity-20"
              />
              <p class="text-sm font-semibold italic">
                Không có dữ liệu giao dịch
              </p>
            </div>
          </div>

          <!-- Form Footer -->
          <div
            class="px-8 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 flex items-center justify-between"
          >
            <p class="text-[11px] font-semibold text-slate-400 italic">
              Lưu ý: Mọi thay đổi sẽ có hiệu lực ngay lập tức.
            </p>
            <div class="flex items-center gap-3">
              <NuxtLink to="/admin/users">
                <UiButton variant="ghost" class="px-6 font-semibold text-sm"
                  >Hủy bỏ</UiButton
                >
              </NuxtLink>
              <UiButton
                class="px-10 rounded-xl font-semibold text-sm"
                :loading="submitting"
                @click="handleUpdate"
              >
                Lưu thay đổi
              </UiButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
