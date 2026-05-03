<script setup lang="ts">
  definePageMeta({ layout: "admin" });
  useHead({ title: "Quản lý người dùng - Admin Panel" });
  const { formatDate } = useDateFormatter();

  const toast = useToast();
  const { user } = useUserSession();

  interface SessionUser {
    role?: string | null;
    permissions?: string[] | null;
  }

  interface User {
    id: number;
    username: string;
    email: string;
    role: string;
    balance: number;
    status: string;
    createdAt: string;
    lastIp?: string;
    device?: string;
  }

  const { data: response, refresh } = await useFetch<{
    users: User[];
    stats: any;
  }>("/api/admin/users", {
    key: "admin-users-list",
    lazy: true,
  });

  const sessionUser = computed(() => user.value as SessionUser | null);

  const hasPermission = (permission: string) => {
    const role = String(sessionUser.value?.role || "").trim();
    if (role === "admin") return true;

    const permissions = sessionUser.value?.permissions || [];
    return permissions.includes("*") || permissions.includes(permission);
  };

  const canEditUsers = computed(() => hasPermission("edit_users"));

  const users = computed(() => {
    if (!response.value?.users) return [];
    return response.value.users.map((user: User) => ({
      ...user,
      joined: formatDate(user.createdAt),
    }));
  });

  const stats = computed(
    () =>
      response.value?.stats || {
        total: 0,
        newToday: 0,
        totalBalance: 0,
        banned: 0,
      }
  );

  const roleOptions = [
    { label: "Tất cả vai trò", value: "all" },
    { label: "Người quản trị", value: "admin" },
    { label: "Khách hàng", value: "user" },
  ];

  const statusOptions = [
    { label: "Tất cả trạng thái", value: "all" },
    { label: "Đang hoạt động", value: "active" },
    { label: "Đã bị khóa", value: "banned" },
  ];

  const searchQuery = ref("");
  const selectedRole = ref("all");
  const selectedStatus = ref("all");

  const filteredUsers = computed(() => {
    return users.value.filter((user) => {
      const keyword = searchQuery.value.trim().toLowerCase();
      const matchesSearch =
        !keyword ||
        user.username?.toLowerCase().includes(keyword) ||
        user.email?.toLowerCase().includes(keyword) ||
        user.lastIp?.toLowerCase().includes(keyword);

      const matchesRole =
        selectedRole.value === "all" || user.role === selectedRole.value;

      const matchesStatus =
        selectedStatus.value === "all" || user.status === selectedStatus.value;

      return matchesSearch && matchesRole && matchesStatus;
    });
  });

  const pageSize = ref(10);
  const currentPage = ref(1);

  const paginatedUsers = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredUsers.value.slice(start, start + pageSize.value);
  });

  watch([searchQuery, selectedRole, selectedStatus], () => {
    currentPage.value = 1;
  });

  watch(pageSize, () => {
    currentPage.value = 1;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(val);
  };

  const handleBanUser = async (user: any) => {
    if (!canEditUsers.value) {
      toast.error("Từ chối", "Bạn không có quyền khóa hoặc mở khóa tài khoản");
      return;
    }

    const isBanned = user.status === "banned";
    const newStatus = isBanned ? "active" : "banned";
    const action = isBanned ? "Mở khóa" : "Khóa";

    const loading = toast.loading(
      `${action} tài khoản...`,
      `Đang thực hiện ${action.toLowerCase()} người dùng ${user.username}`
    );

    try {
      await $fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: { status: newStatus },
      });

      toast.remove(loading);
      toast.success(
        `${action} thành công!`,
        `Tài khoản ${user.username} hiện đang ở trạng thái ${
          newStatus === "active" ? "Hoạt động" : "Bị khóa"
        }.`
      );
      refresh();
    } catch {
      toast.remove(loading);
      toast.error("Thao tác thất bại", "Có lỗi xảy ra khi cập nhật trạng thái");
    }
  };

  const handleEdit = (user: any) => {
    if (!canEditUsers.value) {
      toast.error("Từ chối", "Bạn không có quyền chỉnh sửa người dùng");
      return;
    }

    navigateTo(`/admin/users/${user.id}`);
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
            name="solar:users-group-rounded-bold-duotone"
            class="text-primary"
            size="16"
          />
          Hệ thống người dùng
        </div>
        <h1
          class="text-xl font-semibold tracking-tight text-slate-900 dark:text-white"
        >
          Quản lý thành viên
        </h1>
      </div>
      <button
        v-if="canEditUsers"
        class="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_4px_12px_rgba(6,95,70,0.25)] transition hover:bg-primary/90 hover:-translate-y-0.5"
      >
        <Icon name="solar:user-plus-bold" size="20" />
        Thêm thành viên
      </button>
    </div>

    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div
        v-for="stat in [
          {
            label: 'Tổng thành viên',
            val: stats.total.toLocaleString(),
            icon: 'solar:users-group-rounded-bold-duotone',
            color: 'text-primary bg-primary/10',
          },
          {
            label: 'Thành viên mới',
            val: '+' + stats.newToday,
            icon: 'solar:user-plus-bold-duotone',
            color: 'text-sky-500 bg-sky-50',
          },
          {
            label: 'Tổng số dư',
            val: formatCurrency(stats.totalBalance),
            icon: 'solar:wallet-bold-duotone',
            color: 'text-emerald-500 bg-emerald-50',
          },
          {
            label: 'Bị khóa',
            val: stats.banned.toString(),
            icon: 'solar:user-block-bold-duotone',
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
            class="mb-1 text-[11px] font-bold uppercase tracking-tighter leading-none text-slate-400"
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
        { key: 'user', label: 'Người dùng' },
        { key: 'role', label: 'Vai trò', width: '130px' },
        { key: 'balance', label: 'Số dư ví', width: '140px' },
        { key: 'device', label: 'IP / Thiết bị', width: '220px' },
        { key: 'status', label: 'Trạng thái', width: '120px' },
        { key: 'actions', label: 'Hành động', align: 'right', width: '100px' },
      ]"
      :items="paginatedUsers"
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
            <div>
              <p class="text-base font-bold text-slate-800 dark:text-white">
                Danh sách thành viên
              </p>
            </div>
          </div>

          <div class="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div class="w-full sm:min-w-[280px]">
              <UiInput
                v-model="searchQuery"
                placeholder="Tìm kiếm..."
                class="h-10 rounded-[14px] border-slate-200 bg-white shadow-sm focus:bg-white"
              >
                <template #left-icon>
                  <Icon name="solar:magnifer-line-duotone" size="18" />
                </template>
              </UiInput>
            </div>
            <div class="w-full shrink-0 sm:w-[190px]">
              <UiDropdown v-model="selectedRole" :options="roleOptions" />
            </div>
            <div class="w-full shrink-0 sm:w-[190px]">
              <UiDropdown v-model="selectedStatus" :options="statusOptions" />
            </div>
          </div>
        </div>
      </template>

      <template #cell(user)="{ item }">
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-bold text-primary"
          >
            {{ item.username?.charAt(0).toUpperCase() }}
          </div>
          <div class="min-w-0">
            <p
              class="max-w-[150px] truncate text-sm font-bold leading-tight text-slate-800 dark:text-slate-100"
            >
              {{ item.username }}
            </p>
            <p
              class="mt-1 truncate text-[11px] font-medium leading-none text-slate-400"
            >
              {{ item.email }}
            </p>
          </div>
        </div>
      </template>

      <template #cell(role)="{ item }">
        <UiBadge
          :variant="item.role === 'admin' ? 'primary' : 'slate'"
          :label="item.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'"
        />
      </template>

      <template #cell(balance)="{ item }">
        <div class="flex flex-col leading-none">
          <span
            class="font-mono text-[13px] font-bold text-emerald-600 dark:text-emerald-400"
          >
            {{ formatCurrency(item.balance) }}
          </span>
          <span class="mt-1 text-[10px] font-medium text-slate-400">
            Tham gia: {{ item.joined }}
          </span>
        </div>
      </template>

      <template #cell(device)="{ item }">
        <div class="flex flex-col gap-1">
          <span
            class="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400"
          >
            {{ item.lastIp || "N/A" }}
          </span>
          <div class="flex items-center gap-1.5 opacity-70">
            <Icon name="solar:monitor-linear" size="12" />
            <span class="max-w-[160px] truncate text-[10px] font-medium">
              {{ item.device }}
            </span>
          </div>
        </div>
      </template>

      <template #cell(status)="{ item }">
        <UiBadge
          :variant="item.status === 'active' ? 'success' : 'error'"
          :label="item.status === 'active' ? 'Hoạt động' : 'Bị khóa'"
          rounded
        />
      </template>

      <template #cell(actions)="{ item }">
        <div v-if="canEditUsers" class="flex items-center justify-end gap-1">
          <button
            @click="handleEdit(item)"
            class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800"
          >
            <Icon name="solar:pen-bold" size="18" />
          </button>
          <button
            @click="handleBanUser(item)"
            class="rounded-lg p-2 transition-colors"
            :class="
              item.status === 'active'
                ? 'text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20'
                : 'text-rose-500 hover:bg-emerald-50 hover:text-emerald-500 dark:hover:bg-emerald-900/20'
            "
            :title="
              item.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'
            "
          >
            <Icon
              :name="
                item.status === 'active'
                  ? 'solar:user-block-bold'
                  : 'solar:user-check-bold'
              "
              size="18"
            />
          </button>
        </div>
        <span v-else class="text-xs font-medium text-slate-400">---</span>
      </template>

      <template #empty>
        <div class="py-5 text-center">
          <div
            class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"
          >
            <Icon name="solar:box-minimalistic-line-duotone" size="24" />
          </div>
          <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Không có thành viên
          </p>
        </div>
      </template>
      <template #footer>
        <UiPagination
          :total="filteredUsers.length"
          v-model:pageSize="pageSize"
          v-model:currentPage="currentPage"
        />
      </template>
    </UiTable>

    <UiAlert type="warning" title="Lưu ý quan trọng">
      Khi tài khoản bị <b>Khóa</b>, người dùng sẽ không thể đăng nhập hoặc nạp
      tiền vào hệ thống. Hãy thực hiện cẩn trọng!
    </UiAlert>
  </div>
</template>
