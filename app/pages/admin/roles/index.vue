<script setup lang="ts">
  definePageMeta({ layout: "admin" });
  useHead({ title: "Vai trò admin - Admin Panel" });
  const { formatDateTime } = useDateFormatter();

  const toast = useToast();
  const { user } = useUserSession();

  interface SessionUser {
    role?: string | null;
    permissions?: string[] | null;
  }

  interface AdminRoleItem {
    id: number;
    name: string;
    role: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  }

  const { data, refresh, pending } = await useFetch<AdminRoleItem[]>(
    "/api/admin/roles",
    {
      key: "admin-roles-list",
      lazy: true,
    }
  );

  const items = computed(() => data.value || []);
  const sessionUser = computed(() => user.value as SessionUser | null);

  const hasPermission = (permission: string) => {
    const role = String(sessionUser.value?.role || "").trim();
    if (role === "admin") return true;
    const permissions = sessionUser.value?.permissions || [];
    return permissions.includes("*") || permissions.includes(permission);
  };

  const canManageRoles = computed(() => hasPermission("manage_roles"));

  const modalOpen = ref(false);
  const confirmOpen = ref(false);
  const saving = ref(false);
  const deletingId = ref<number | null>(null);
  const editingId = ref<number | null>(null);
  const selectedItem = ref<AdminRoleItem | null>(null);

  const form = reactive({
    name: "",
    selectedPermissions: [] as string[],
  });

  const parsePermissions = (value?: string | null) =>
    String(value || "")
      .split(/[\r\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);

  const permissionGroups = [
    {
      label: "Tổng quan",
      items: [{ value: "view_dashboard", label: "Xem dashboard" }],
    },
    {
      label: "Đơn hàng",
      items: [
        { value: "view_orders", label: "Xem đơn hàng" },
        { value: "manage_orders", label: "Xử lý đơn hàng" },
      ],
    },
    {
      label: "Nạp tiền và giao dịch",
      items: [
        { value: "view_deposits", label: "Xem hóa đơn nạp tiền" },
        { value: "manage_deposits", label: "Xử lý nạp tiền" },
        { value: "manage_deposit_config", label: "Cấu hình nạp tiền" },
        { value: "manage_banks", label: "Quản lý ngân hàng nhận tiền" },
        { value: "view_transactions", label: "Xem giao dịch" },
      ],
    },
    {
      label: "Người dùng và hỗ trợ",
      items: [
        { value: "view_users", label: "Xem người dùng" },
        { value: "edit_users", label: "Chỉnh sửa người dùng" },
        { value: "view_messages", label: "Xem tin nhắn hỗ trợ" },
        { value: "manage_messages", label: "Trả lời tin nhắn hỗ trợ" },
      ],
    },
    {
      label: "Sản phẩm",
      items: [
        { value: "view_categories", label: "Xem danh mục" },
        { value: "manage_categories", label: "Quản lý danh mục" },
        { value: "view_products", label: "Xem sản phẩm" },
        { value: "manage_products", label: "Quản lý sản phẩm" },
        { value: "view_plans", label: "Xem gói sản phẩm" },
        { value: "manage_plans", label: "Quản lý gói sản phẩm" },
        { value: "view_stocks", label: "Xem kho hàng" },
        { value: "manage_stocks", label: "Quản lý kho hàng" },
      ],
    },
    {
      label: "Marketing và khuyến mãi",
      items: [
        { value: "view_coupons", label: "Xem mã giảm giá" },
        { value: "manage_coupons", label: "Quản lý mã giảm giá" },
        { value: "view_flash_sales", label: "Xem flash sale" },
        { value: "manage_flash_sales", label: "Quản lý flash sale" },
      ],
    },
    {
      label: "Bảo mật và hệ thống",
      items: [
        { value: "view_logs", label: "Xem nhật ký hệ thống" },
        { value: "view_block_ips", label: "Xem danh sách block IP" },
        { value: "manage_block_ips", label: "Quản lý block IP" },
        { value: "view_roles", label: "Xem vai trò admin" },
        { value: "manage_roles", label: "Quản lý vai trò admin" },
        { value: "manage_settings", label: "Quản lý cài đặt hệ thống" },
      ],
    },
  ];

  const allPermissions = computed(() =>
    permissionGroups.flatMap((group) => group.items.map((item) => item.value))
  );

  const isAllPermissionsChecked = computed(
    () =>
      allPermissions.value.length > 0 &&
      allPermissions.value.every((permission) =>
        form.selectedPermissions.includes(permission)
      )
  );

  const rolePayload = computed(() => form.selectedPermissions.join(","));

  const resetForm = () => {
    editingId.value = null;
    form.name = "";
    form.selectedPermissions = [];
  };

  const openAddModal = () => {
    if (!canManageRoles.value) {
      toast.error("Từ chối", "Bạn không có quyền thêm vai trò");
      return;
    }

    resetForm();
    modalOpen.value = true;
  };

  const openEditModal = (item: AdminRoleItem) => {
    if (!canManageRoles.value) {
      toast.error("Từ chối", "Bạn không có quyền cập nhật vai trò");
      return;
    }

    editingId.value = item.id;
    form.name = item.name;
    form.selectedPermissions = parsePermissions(item.role);
    modalOpen.value = true;
  };

  const isPermissionChecked = (permission: string) =>
    form.selectedPermissions.includes(permission);

  const togglePermission = (permission: string, checked: boolean) => {
    if (checked) {
      if (!form.selectedPermissions.includes(permission)) {
        form.selectedPermissions = [...form.selectedPermissions, permission];
      }
      return;
    }

    form.selectedPermissions = form.selectedPermissions.filter(
      (item) => item !== permission
    );
  };

  const toggleAllPermissions = (checked: boolean) => {
    form.selectedPermissions = checked ? [...allPermissions.value] : [];
  };

  const saveRole = async () => {
    if (!canManageRoles.value) {
      toast.error("Từ chối", "Bạn không có quyền lưu vai trò");
      return;
    }

    saving.value = true;

    try {
      const body = {
        name: form.name.trim(),
        role: rolePayload.value,
      };

      if (editingId.value) {
        await $fetch(`/api/admin/roles/${editingId.value}`, {
          method: "PATCH",
          body,
        });
        toast.success("Thành công", "Đã cập nhật vai trò admin");
      } else {
        await $fetch("/api/admin/roles", {
          method: "POST",
          body,
        });
        toast.success("Thành công", "Đã thêm vai trò admin mới");
      }

      modalOpen.value = false;
      resetForm();
      await refresh();
    } catch (error: any) {
      toast.error(
        "Thất bại",
        error?.data?.message || "Không thể lưu vai trò admin"
      );
    } finally {
      saving.value = false;
    }
  };

  const openDeleteConfirm = (item: AdminRoleItem) => {
    if (!canManageRoles.value) {
      toast.error("Từ chối", "Bạn không có quyền xóa vai trò");
      return;
    }

    selectedItem.value = item;
    confirmOpen.value = true;
  };

  const confirmDelete = async () => {
    if (!canManageRoles.value) {
      toast.error("Từ chối", "Bạn không có quyền xóa vai trò");
      return;
    }

    if (!selectedItem.value) return;

    deletingId.value = selectedItem.value.id;
    try {
      await $fetch(`/api/admin/roles/${selectedItem.value.id}`, {
        method: "DELETE",
      });
      toast.success("Thành công", "Đã xóa vai trò admin");
      confirmOpen.value = false;
      selectedItem.value = null;
      await refresh();
    } catch (error: any) {
      toast.error(
        "Thất bại",
        error?.data?.message || "Không thể xóa vai trò admin"
      );
    } finally {
      deletingId.value = null;
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
            name="solar:shield-user-line-duotone"
            class="text-primary"
            size="16"
          />
          Phân quyền admin
        </div>
        <h1
          class="text-xl font-semibold tracking-tight text-slate-900 dark:text-white"
        >
          Vai trò quản trị
        </h1>
      </div>

      <div class="flex items-center gap-2">
        <UiButton variant="outline" @click="refresh()">
          <template #prefix>
            <Icon name="solar:refresh-line-duotone" size="18" />
          </template>
          Làm mới dữ liệu
        </UiButton>

        <UiButton v-if="canManageRoles" @click="openAddModal">
          <template #prefix>
            <Icon name="solar:add-circle-line-duotone" size="18" />
          </template>
          Thêm vai trò
        </UiButton>
      </div>
    </div>

    <UiTable
      :headers="[
        { key: 'name', label: 'Vai trò', width: '240px' },
        { key: 'permissions', label: 'Quyền truy cập' },
        { key: 'updatedAt', label: 'Cập nhật', width: '180px' },
        { key: 'actions', label: 'Thao tác', width: '120px' },
      ]"
      :items="items"
      :loading="pending"
      striped
    >
      <template #top>
        <div class="flex items-center gap-3">
          <span
            class="h-7 w-1.5 rounded-full bg-gradient-to-b from-sky-300 via-primary to-violet-400"
          ></span>
          <div>
            <p class="text-base font-semibold text-slate-800 dark:text-white">
              Danh sách vai trò admin
            </p>
            <p class="mt-1 text-xs text-slate-400">
              Mỗi vai trò lưu tên hiển thị và danh sách hành động như
              <span class="font-mono">view_orders</span>,
              <span class="font-mono">edit_users</span>.
            </p>
          </div>
        </div>
      </template>

      <template #cell(name)="{ item }">
        <div class="min-w-0">
          <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {{ item.name }}
          </p>
          <p class="mt-1 text-[11px] font-medium text-slate-400">
            {{ parsePermissions(item.role).length }} quyền
          </p>
        </div>
      </template>

      <template #cell(permissions)="{ item }">
        <div class="flex flex-wrap gap-1.5">
          <template v-if="parsePermissions(item.role).length">
            <span
              v-for="permission in parsePermissions(item.role).slice(0, 6)"
              :key="permission"
              class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {{ permission }}
            </span>
            <span
              v-if="parsePermissions(item.role).length > 6"
              class="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary"
            >
              +{{ parsePermissions(item.role).length - 6 }} quyền
            </span>
          </template>
          <span v-else class="text-xs font-medium text-slate-400">
            Chưa cấu hình quyền
          </span>
        </div>
      </template>

      <template #cell(updatedAt)="{ item }">
        <span class="text-xs font-medium text-slate-500">
          {{ formatDateTime(item.updatedAt || item.createdAt) }}
        </span>
      </template>

      <template #cell(actions)="{ item }">
        <div v-if="canManageRoles" class="flex items-center gap-1.5">
          <UiButton
            variant="ghost"
            size="sm"
            class="rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-primary/30 !hover:bg-primary/10 hover:text-primary dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary/20 dark:!hover:bg-primary/10"
            @click="openEditModal(item)"
          >
            <Icon name="solar:pen-new-square-bold" size="16" />
          </UiButton>
          <UiButton
            variant="ghost"
            size="sm"
            class="rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-rose-200 !hover:bg-rose-50 hover:text-rose-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-rose-900/30 dark:!hover:bg-rose-900/20"
            @click="openDeleteConfirm(item)"
          >
            <Icon name="solar:trash-bin-trash-bold" size="16" />
          </UiButton>
        </div>
        <span v-else class="text-xs font-medium text-slate-400">---</span>
      </template>

      <template #empty>
        <div class="py-5 text-center">
          <div
            class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"
          >
            <Icon name="solar:shield-user-line-duotone" size="24" />
          </div>
          <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Chưa có vai trò admin
          </p>
        </div>
      </template>
    </UiTable>

    <UiModal
      v-model="modalOpen"
      :title="editingId ? 'Cập nhật vai trò admin' : 'Thêm vai trò admin'"
      size="xl"
    >
      <div class="space-y-4">
        <div>
          <label
            class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Tên vai trò
          </label>
          <UiInput v-model="form.name" placeholder="Ví dụ: Hỗ trợ khách hàng" />
        </div>

        <div>
          <label
            class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Danh sách quyền
          </label>
          <div
            class="mb-4 rounded-2xl border border-primary/15 bg-primary/5 p-4 dark:border-primary/20 dark:bg-primary/10"
          >
            <button
              type="button"
              class="flex cursor-pointer select-none items-center gap-2"
              @click="toggleAllPermissions(!isAllPermissionsChecked)"
            >
              <div
                class="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-2 transition-all duration-150"
                :class="
                  isAllPermissionsChecked
                    ? 'border-primary bg-primary'
                    : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                "
              >
                <svg
                  v-if="isAllPermissionsChecked"
                  class="h-2.5 w-2.5 text-white"
                  viewBox="0 0 12 10"
                  fill="none"
                >
                  <path
                    d="M1 5L4.5 8.5L11 1.5"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
              <span
                class="text-xs font-semibold transition-colors duration-150"
                :class="
                  isAllPermissionsChecked
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400'
                "
              >
                Chọn tất cả quyền
              </span>
            </button>
          </div>
          <div class="space-y-4">
            <div
              v-for="group in permissionGroups"
              :key="group.label"
              class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50"
            >
              <p
                class="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400"
              >
                {{ group.label }}
              </p>
              <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                <button
                  v-for="permission in group.items"
                  :key="permission.value"
                  type="button"
                  class="flex cursor-pointer select-none items-center gap-2"
                  @click="
                    togglePermission(
                      permission.value,
                      !isPermissionChecked(permission.value)
                    )
                  "
                >
                  <div
                    class="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-2 transition-all duration-150"
                    :class="
                      isPermissionChecked(permission.value)
                        ? 'border-primary bg-primary'
                        : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                    "
                  >
                    <svg
                      v-if="isPermissionChecked(permission.value)"
                      class="h-2.5 w-2.5 text-white"
                      viewBox="0 0 12 10"
                      fill="none"
                    >
                      <path
                        d="M1 5L4.5 8.5L11 1.5"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </div>
                  <span
                    class="text-xs font-semibold transition-colors duration-150"
                    :class="
                      isPermissionChecked(permission.value)
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-500 dark:text-slate-400'
                    "
                  >
                    {{ permission.label }}
                  </span>
                </button>
              </div>
            </div>
          </div>
          <p class="mt-3 text-[11px] text-slate-400">
            Quyền duợc lưu tự động theo danh sách đã chọn.
          </p>
          <div class="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
            <p class="text-[11px] font-semibold tracking-widest text-slate-400">
              Role đã chọn
            </p>
            <p
              class="mt-1 whitespace-pre-wrap break-words font-mono text-xs text-slate-600 dark:text-slate-300"
            >
              {{ rolePayload }}
            </p>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex gap-3">
          <UiButton variant="outline" class="flex-1" @click="modalOpen = false">
            Hủy
          </UiButton>
          <UiButton class="flex-1" :loading="saving" @click="saveRole">
            {{ editingId ? "Lưu cập nhật" : "Thêm vai trò" }}
          </UiButton>
        </div>
      </template>
    </UiModal>

    <UiConfirm
      v-model="confirmOpen"
      title="Xóa vai trò admin"
      :message="`Bạn có chắc muốn xóa vai trò ${selectedItem?.name || ''}?`"
      confirm-label="Xóa ngay"
      :loading="deletingId !== null"
      @confirm="confirmDelete"
    />
  </div>
</template>
