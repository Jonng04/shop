<script setup lang="ts">
  definePageMeta({ layout: "admin" });
  useHead({ title: "Quản lý chặn IP - Admin Panel" });
  const { formatDateTime } = useDateFormatter();

  const toast = useToast();

  interface BlockIpItem {
    id: number;
    ip: string;
    username: string | null;
    country: string;
    reason: string;
    hitCount: number;
    status: "active" | "expired" | "released";
    blockType: "manual" | "auto";
    blockedAt: string;
    expiresAt: string | null;
    lastSeenAt: string;
  }

  const searchQuery = ref("");
  const selectedStatus = ref("all");
  const selectedType = ref("all");
  const pageSize = ref(10);
  const currentPage = ref(1);
  const isAddModalOpen = ref(false);
  const isConfirmModalOpen = ref(false);
  const submitting = ref(false);
  const deletingId = ref<number | null>(null);
  const releasingId = ref<number | null>(null);
  const pendingAction = ref<{
    type: "release" | "delete";
    item: BlockIpItem;
  } | null>(null);

  const form = reactive({
    ip: "",
    reason: "",
    country: "VN",
    blockType: "manual" as "manual" | "auto",
    duration: "24h" as "24h" | "7d" | "permanent",
  });

  const statusOptions = [
    { label: "Tất cả trạng thái", value: "all" },
    { label: "Đang chặn", value: "active" },
    { label: "Đã hết hạn", value: "expired" },
    { label: "Đã mở chặn", value: "released" },
  ];

  const typeOptions = [
    { label: "Tất cả loại", value: "all" },
    { label: "Tự động", value: "auto" },
    { label: "Thủ công", value: "manual" },
  ];

  const blockTypeFormOptions = [
    { label: "Thủ công", value: "manual" },
    { label: "Tự động", value: "auto" },
  ];

  const durationOptions = [
    { label: "24 giờ", value: "24h" },
    { label: "7 ngày", value: "7d" },
    { label: "Vĩnh viễn", value: "permanent" },
  ];

  const {
    data: response,
    pending,
    refresh,
  } = await useFetch<{
    items: BlockIpItem[];
    stats: {
      total: number;
      active: number;
      auto: number;
      today: number;
    };
  }>("/api/admin/block-ip", {
    key: "admin-block-ip",
    lazy: true,
    query: computed(() => ({
      q: searchQuery.value || undefined,
      status: selectedStatus.value,
      blockType: selectedType.value,
    })),
  });

  const blockIps = computed(() => response.value?.items || []);

  const paginatedBlockIps = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return blockIps.value.slice(start, start + pageSize.value);
  });

  watch([searchQuery, selectedStatus, selectedType], () => {
    currentPage.value = 1;
  });

  watch(pageSize, () => {
    currentPage.value = 1;
  });

  const stats = computed(() => {
    return (
      response.value?.stats || {
        total: 0,
        active: 0,
        auto: 0,
        today: 0,
      }
    );
  });

  const getStatusMeta = (status: BlockIpItem["status"]) => {
    switch (status) {
      case "active":
        return { label: "Đang chặn", variant: "error" };
      case "expired":
        return { label: "Đã hết hạn", variant: "warning" };
      case "released":
        return { label: "Đã mở chặn", variant: "success" };
      default:
        return { label: status, variant: "slate" };
    }
  };

  const getTypeMeta = (type: BlockIpItem["blockType"]) => {
    switch (type) {
      case "auto":
        return { label: "Tự động", icon: "solar:shield-warning-line-duotone" };
      case "manual":
        return { label: "Thủ công", icon: "solar:user-block-line-duotone" };
      default:
        return { label: type, icon: "solar:shield-line-duotone" };
    }
  };

  const resetForm = () => {
    form.ip = "";
    form.reason = "";
    form.country = "VN";
    form.blockType = "manual";
    form.duration = "24h";
  };

  const handleOpenAddModal = () => {
    resetForm();
    isAddModalOpen.value = true;
  };

  const handleAddBlockedIp = async () => {
    if (!form.ip.trim() || !form.reason.trim()) {
      toast.error("Thiếu thông tin", "Vui lòng nhập IP và lý do chặn");
      return;
    }

    submitting.value = true;
    try {
      await $fetch("/api/admin/block-ip", {
        method: "POST",
        body: {
          ip: form.ip.trim(),
          reason: form.reason.trim(),
          country: form.country.trim().toUpperCase() || "VN",
          blockType: form.blockType,
          duration: form.duration,
        },
      });

      isAddModalOpen.value = false;
      resetForm();
      await refresh();
      toast.success("Thành công", "Đã thêm IP vào danh sách chặn");
    } catch (error: any) {
      toast.error("Thất bại", error?.data?.message || "Không thể thêm IP chặn");
    } finally {
      submitting.value = false;
    }
  };

  const handleRefresh = async () => {
    await refresh();
  };

  const openConfirmModal = (type: "release" | "delete", item: BlockIpItem) => {
    pendingAction.value = { type, item };
    isConfirmModalOpen.value = true;
  };

  const closeConfirmModal = () => {
    isConfirmModalOpen.value = false;
    pendingAction.value = null;
  };

  const handleRelease = async (item: BlockIpItem) => {
    if (item.status !== "active") return;

    releasingId.value = item.id;
    try {
      await $fetch(`/api/admin/block-ip/${item.id}`, {
        method: "PATCH",
        body: {
          status: "released",
        },
      });

      await refresh();
      toast.success("Thành công", `Đã mở chặn IP ${item.ip}`);
    } catch (error: any) {
      toast.error("Thất bại", error?.data?.message || "Không thể mở chặn IP");
    } finally {
      releasingId.value = null;
    }
  };

  const handleDelete = async (item: BlockIpItem) => {
    deletingId.value = item.id;
    try {
      await $fetch(`/api/admin/block-ip/${item.id}`, {
        method: "DELETE",
      });

      await refresh();
      toast.success("Thành công", `Đã xóa bản ghi IP ${item.ip}`);
    } catch (error: any) {
      toast.error(
        "Thất bại",
        error?.data?.message || "Không thể xóa bản ghi IP"
      );
    } finally {
      deletingId.value = null;
    }
  };

  const confirmAction = async () => {
    const action = pendingAction.value;
    if (!action) return;

    if (action.type === "release") {
      await handleRelease(action.item);
    } else {
      await handleDelete(action.item);
    }

    closeConfirmModal();
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
            name="solar:shield-cross-bold-duotone"
            class="text-primary"
            size="16"
          />
          Bảo mật hệ thống
        </div>
        <h1
          class="text-xl font-semibold tracking-tight text-slate-900 dark:text-white"
        >
          Quản lý Block IP
        </h1>
      </div>

      <UiButton variant="primary" @click="handleOpenAddModal">
        <template #prefix>
          <Icon name="solar:add-circle-line-duotone" size="18" />
        </template>
        Thêm IP chặn
      </UiButton>
    </div>

    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div
        v-for="stat in [
          {
            label: 'Tổng IP đã ghi nhận',
            val: stats.total.toString(),
            icon: 'solar:shield-keyhole-bold-duotone',
            color: 'text-primary bg-primary/10',
          },
          {
            label: 'Đang chặn',
            val: stats.active.toString(),
            icon: 'solar:shield-cross-bold-duotone',
            color: 'text-rose-500 bg-rose-50',
          },
          {
            label: 'Block tự động',
            val: stats.auto.toString(),
            icon: 'solar:shield-warning-bold-duotone',
            color: 'text-amber-500 bg-amber-50',
          },
          {
            label: 'Thêm mới hôm nay',
            val: stats.today.toString(),
            icon: 'solar:calendar-bold-duotone',
            color: 'text-sky-500 bg-sky-50',
          },
        ]"
        :key="stat.label"
        class="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
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
            class="mb-1 text-[11px] font-medium uppercase tracking-wider text-slate-400"
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

    <UiTable
      :headers="[
        { key: 'ip', label: 'Địa chỉ IP', width: '160px' },
        { key: 'source', label: 'Nguồn', width: '170px' },
        { key: 'reason', label: 'Lý do', width: '260px' },
        { key: 'type', label: 'Loại block', width: '140px' },
        { key: 'status', label: 'Trạng thái', width: '140px' },
        { key: 'lastSeenAt', label: 'Lần cuối truy cập', width: '170px' },
        { key: 'expiresAt', label: 'Hết hạn', width: '170px' },
        { key: 'actions', label: 'Thao tác', width: '120px' },
      ]"
      :items="paginatedBlockIps"
      striped
    >
      <template #top>
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <span
              class="h-7 w-1.5 rounded-full bg-gradient-to-b from-sky-300 via-primary to-violet-400"
            ></span>
            <p class="text-base font-semibold text-slate-800 dark:text-white">
              Danh sách IP chặn
            </p>
          </div>

          <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <UiInput
              v-model="searchQuery"
              placeholder="Tìm IP, user, quốc gia..."
              class="h-10 rounded-[14px] border-slate-200 bg-white"
            >
              <template #left-icon>
                <Icon name="solar:magnifer-line-duotone" size="18" />
              </template>
            </UiInput>

            <UiDropdown v-model="selectedStatus" :options="statusOptions" />
            <UiDropdown v-model="selectedType" :options="typeOptions" />

            <UiButton
              variant="outline"
              :loading="pending"
              @click="handleRefresh"
            >
              <template #prefix>
                <Icon name="solar:refresh-line-duotone" size="16" />
              </template>
              Làm mới danh sách
            </UiButton>
          </div>
        </div>
      </template>

      <template #cell(ip)="{ item }">
        <div class="min-w-0">
          <p class="font-mono text-[13px] font-semibold text-primary">
            {{ item.ip }}
          </p>
          <p class="mt-1 text-[11px] font-medium text-slate-400">
            {{ item.country }}
          </p>
        </div>
      </template>

      <template #cell(source)="{ item }">
        <div class="min-w-0">
          <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {{ item.username || "Không có tài khoản" }}
          </p>
          <p class="mt-1 text-[11px] font-medium text-slate-400">
            Hits: {{ item.hitCount }}
          </p>
        </div>
      </template>

      <template #cell(reason)="{ item }">
        <p
          class="line-clamp-2 text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          {{ item.reason }}
        </p>
      </template>

      <template #cell(type)="{ item }">
        <div class="flex items-center gap-2">
          <Icon
            :name="getTypeMeta(item.blockType).icon"
            size="16"
            class="text-slate-400"
          />
          <span
            class="text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            {{ getTypeMeta(item.blockType).label }}
          </span>
        </div>
      </template>

      <template #cell(status)="{ item }">
        <UiBadge
          :variant="getStatusMeta(item.status).variant as any"
          :label="getStatusMeta(item.status).label"
          rounded
        />
      </template>

      <template #cell(lastSeenAt)="{ item }">
        <span class="text-xs font-medium text-slate-500">
          {{ formatDateTime(item.lastSeenAt) }}
        </span>
      </template>

      <template #cell(expiresAt)="{ item }">
        <span class="text-xs font-medium text-slate-500">
          {{ formatDateTime(item.expiresAt) }}
        </span>
      </template>

      <template #cell(actions)="{ item }">
        <div class="flex items-center gap-1.5">
          <UiButton
            variant="ghost"
            size="sm"
            :disabled="item.status !== 'active'"
            :loading="releasingId === item.id"
            @click="openConfirmModal('release', item)"
            class="rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-primary/30 !hover:bg-primary/10 hover:text-primary dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary/20 dark:!hover:bg-primary/10"
          >
            <Icon name="solar:restart-line-duotone" size="16" />
          </UiButton>

          <UiButton
            variant="ghost"
            size="sm"
            :loading="deletingId === item.id"
            @click="openConfirmModal('delete', item)"
            class="rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-rose-200 !hover:bg-rose-50 hover:text-rose-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-rose-900/30 dark:!hover:bg-rose-900/20"
          >
            <Icon name="solar:trash-bin-trash-bold" size="16" />
          </UiButton>
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
            Không có IP bị chặn
          </p>
        </div>
      </template>
      <template #footer>
        <UiPagination
          :total="blockIps.length"
          v-model:pageSize="pageSize"
          v-model:currentPage="currentPage"
        />
      </template>
    </UiTable>

    <UiModal v-model="isAddModalOpen" title="Thêm IP chặn" size="lg">
      <div class="space-y-4">
        <div>
          <label
            class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Địa chỉ IP
          </label>
          <UiInput v-model="form.ip" placeholder="Ví dụ: 103.166.12.44" />
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Loại block
            </label>
            <UiDropdown
              v-model="form.blockType"
              :options="blockTypeFormOptions"
            />
          </div>
          <div>
            <label
              class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Thời hạn
            </label>
            <UiDropdown v-model="form.duration" :options="durationOptions" />
          </div>
        </div>

        <div>
          <label
            class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Quốc gia (tùy chọn)
          </label>
          <UiInput v-model="form.country" placeholder="VN, US, SG..." />
        </div>

        <div>
          <label
            class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Lý do chặn
          </label>
          <UiInput v-model="form.reason" placeholder="Nhập lý do chặn IP..." />
        </div>
      </div>

      <template #empty>
        <div class="py-5 text-center">
          <div
            class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"
          >
            <Icon name="solar:box-minimalistic-line-duotone" size="24" />
          </div>
          <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Không có IP bị chặn
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex gap-3">
          <UiButton
            variant="outline"
            class="flex-1"
            @click="isAddModalOpen = false"
          >
            Hủy
          </UiButton>
          <UiButton
            class="flex-1"
            :loading="submitting"
            @click="handleAddBlockedIp"
          >
            Thêm IP
          </UiButton>
        </div>
      </template>
    </UiModal>

    <UiModal
      v-model="isConfirmModalOpen"
      :title="
        pendingAction?.type === 'delete' ? 'Xóa bản ghi block IP' : 'Mở chặn IP'
      "
      size="lg"
    >
      <div v-if="pendingAction" class="space-y-5">
        <div class="flex items-start gap-4">
          <div
            :class="[
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1',
              pendingAction.type === 'delete'
                ? 'bg-rose-50 text-rose-600 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-900/40'
                : 'bg-amber-50 text-amber-600 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-900/40',
            ]"
          >
            <Icon
              :name="
                pendingAction.type === 'delete'
                  ? 'solar:trash-bin-trash-bold'
                  : 'solar:restart-line-duotone'
              "
              size="22"
            />
          </div>

          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-slate-900 dark:text-white">
              {{
                pendingAction.type === "delete"
                  ? "Bản ghi sẽ bị xóa vinh viễn khỏi danh sách theo dõi."
                  : "IP này sẽ duờc chuyển sang trạng thái dã mở chặn."
              }}
            </p>
            <p
              class="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400"
            >
              {{
                pendingAction.type === "delete"
                  ? "Sau khi xóa, admin sẽ không còn thấy lại bản ghi này trong bảng block IP. Nhật ký thao tác vẫn duờc giữ ở activity logs."
                  : "Thao tác này giữ lại lịch sử bản ghi nhưng IP sẽ không còn nằm trong trạng thái chặn hoạt động nữa."
              }}
            </p>
          </div>
        </div>

        <div
          :class="[
            'rounded-2xl border p-4',
            pendingAction.type === 'delete'
              ? 'border-rose-200 bg-rose-50/70 dark:border-rose-900/40 dark:bg-rose-950/20'
              : 'border-amber-200 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20',
          ]"
        >
          <p
            :class="[
              'text-xs font-bold uppercase tracking-[0.18em]',
              pendingAction.type === 'delete'
                ? 'text-rose-500 dark:text-rose-300'
                : 'text-amber-500 dark:text-amber-300',
            ]"
          >
            {{
              pendingAction.type === "delete" ? "Cảnh báo" : "Xác nhận thao tác"
            }}
          </p>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {{
              pendingAction.type === "delete"
                ? "Hãy chắc chắn bạn chỉ xóa khi không cần giữ bản ghi trong danh sách quản trị nữa."
                : "Nếu đây là IP đang bị chặn nhầm, bạn có thể tiếp tục mở chặn ngay bây giờ."
            }}
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <div
            class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <p
              class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400"
            >
              Địa chỉ IP
            </p>
            <p class="mt-2 font-mono text-sm font-semibold text-primary">
              {{ pendingAction.item.ip }}
            </p>
          </div>

          <div
            class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <p
              class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400"
            >
              Trạng thái hiện tại
            </p>
            <p
              class="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100"
            >
              {{ getStatusMeta(pendingAction.item.status).label }}
            </p>
          </div>
        </div>

        <div
          class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40"
        >
          <p
            class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400"
          >
            Lý do chặn
          </p>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {{ pendingAction.item.reason }}
          </p>
        </div>
      </div>

      <template #empty>
        <div class="py-5 text-center">
          <div
            class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"
          >
            <Icon name="solar:box-minimalistic-line-duotone" size="24" />
          </div>
          <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Không có IP bị chặn
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <UiButton
            variant="outline"
            class="sm:min-w-[120px]"
            @click="closeConfirmModal"
          >
            Hủy
          </UiButton>
          <UiButton
            :variant="pendingAction?.type === 'delete' ? 'danger' : 'primary'"
            class="sm:min-w-[180px]"
            :loading="
              (pendingAction?.type === 'delete' &&
                pendingAction?.item &&
                deletingId === pendingAction.item.id) ||
              (pendingAction?.type === 'release' &&
                pendingAction?.item &&
                releasingId === pendingAction.item.id)
            "
            @click="confirmAction"
          >
            {{
              pendingAction?.type === "delete"
                ? "Xóa bản ghi ngay"
                : "Xác nhận mở chặn"
            }}
          </UiButton>
        </div>
      </template>
    </UiModal>
  </div>
</template>
