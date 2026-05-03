<script setup lang="ts">
  definePageMeta({ layout: "admin" });
  useHead({ title: "Nhật ký hệ thống - Admin Panel" });
  const { formatDateTime } = useDateFormatter();

  interface ActivityLogApiItem {
    id: number;
    actorUserId: number | null;
    actorName: string;
    actorEmail: string | null;
    actorRole: "admin" | "system";
    action: string;
    module: string;
    target: string;
    description: string | null;
    level: "info" | "warning" | "success" | "critical";
    ip: string | null;
    device: string | null;
    metadata: Record<string, string>;
    createdAt: string | null;
  }

  interface ActivityLogItem {
    id: number;
    actor: {
      name: string;
      email: string;
      role: "admin" | "system";
    };
    action: string;
    module: string;
    target: string;
    description: string;
    level: "info" | "warning" | "success" | "critical";
    ip: string;
    device: string;
    createdAt: string;
    meta: Record<string, string>;
  }

  const searchQuery = ref("");
  const selectedLevel = ref("all");
  const selectedModule = ref("all");
  const selectedActor = ref("all");
  const currentPage = ref(1);
  const pageSize = ref(10);
  const selectedLogId = ref<number | null>(null);
  const isDetailModalOpen = ref(false);

  const levelOptions = [
    { label: "Tất cả mức độ", value: "all" },
    { label: "Thông tin", value: "info" },
    { label: "Cảnh báo", value: "warning" },
    { label: "Thành công", value: "success" },
    { label: "Nghiêm trọng", value: "critical" },
  ];

  const moduleOptions = [
    { label: "Tất cả module", value: "all" },
    { label: "Đơn hàng", value: "Đơn hàng" },
    { label: "Giao dịch", value: "Giao dịch" },
    { label: "Kho hàng", value: "Kho hàng" },
    { label: "Khuyến mãi", value: "Khuyến mãi" },
    { label: "Khách hàng", value: "Khách hàng" },
    { label: "Bảo mật", value: "Bảo mật" },
    { label: "Hệ thống", value: "Hệ thống" },
  ];

  const actorOptions = [
    { label: "Tất cả nguồn", value: "all" },
    { label: "Admin", value: "admin" },
    { label: "System", value: "system" },
  ];

  const {
    data: response,
    pending,
    refresh,
  } = await useFetch<{
    logs: ActivityLogApiItem[];
    stats: {
      total: number;
      critical: number;
      warnings: number;
      today: number;
    };
  }>("/api/admin/activity-logs", {
    key: "admin-activity-logs",
    lazy: true,
    query: computed(() => ({
      q: searchQuery.value || undefined,
      level: selectedLevel.value,
      module: selectedModule.value,
      actorRole: selectedActor.value,
    })),
  });

  const logs = computed<ActivityLogItem[]>(() => {
    return (response.value?.logs || []).map((item) => ({
      id: item.id,
      actor: {
        name: item.actorName,
        email: item.actorEmail || "---",
        role: item.actorRole || "admin",
      },
      action: item.action,
      module: item.module,
      target: item.target,
      description: item.description || "Không có mô tả",
      level: item.level,
      ip: item.ip || "---",
      device: item.device || "---",
      createdAt: item.createdAt || "",
      meta: item.metadata || {},
    }));
  });

  const paginatedLogs = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return logs.value.slice(start, start + pageSize.value);
  });

  const selectedLog = computed(
    () => logs.value.find((item) => item.id === selectedLogId.value) || null
  );

  watch([searchQuery, selectedLevel, selectedModule, selectedActor], () => {
    currentPage.value = 1;
  });

  watch(
    logs,
    (items) => {
      if (!items.length) {
        selectedLogId.value = null;
        isDetailModalOpen.value = false;
        return;
      }

      if (!items.find((item) => item.id === selectedLogId.value)) {
        const firstItem = items[0];
        if (firstItem) {
          selectedLogId.value = firstItem.id;
        }
      }
    },
    { immediate: true }
  );

  watch(pageSize, () => {
    currentPage.value = 1;
  });

  const stats = computed(() => {
    return (
      response.value?.stats || {
        total: 0,
        critical: 0,
        warnings: 0,
        today: 0,
      }
    );
  });

  const getLevelMeta = (level: ActivityLogItem["level"]) => {
    switch (level) {
      case "success":
        return {
          label: "Thành công",
          variant: "success",
          dot: "bg-emerald-500",
        };
      case "warning":
        return { label: "Cảnh báo", variant: "warning", dot: "bg-amber-500" };
      case "critical":
        return { label: "Nghiêm trọng", variant: "error", dot: "bg-rose-500" };
      default:
        return { label: "Thông tin", variant: "info", dot: "bg-sky-500" };
    }
  };

  const openDetail = (id: number) => {
    selectedLogId.value = id;
    isDetailModalOpen.value = true;
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
            name="solar:document-text-line-duotone"
            class="text-primary"
            size="16"
          />
          Nhật ký vận hành
        </div>
        <h1
          class="text-xl font-semibold tracking-tight text-slate-900 dark:text-white"
        >
          Nhật ký hệ thống
        </h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Theo dõi toàn bộ thao tác của admin và hệ thống để audit và debug.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UiButton variant="outline" @click="refresh()" :loading="pending">
          <template #prefix>
            <Icon name="solar:refresh-line-duotone" size="18" />
          </template>
          Làm mới
        </UiButton>
        <UiButton variant="outline">
          <template #prefix>
            <Icon name="solar:download-line-duotone" size="18" />
          </template>
          Xuất log
        </UiButton>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <div
        v-for="stat in [
          {
            label: 'Tổng bản ghi',
            val: stats.total.toString(),
            icon: 'solar:document-text-bold-duotone',
            color: 'text-primary bg-primary/10',
          },
          {
            label: 'Nghiêm trọng',
            val: stats.critical.toString(),
            icon: 'solar:danger-bold-duotone',
            color: 'text-rose-500 bg-rose-50',
          },
          {
            label: 'Cảnh báo',
            val: stats.warnings.toString(),
            icon: 'solar:shield-warning-bold-duotone',
            color: 'text-amber-500 bg-amber-50',
          },
          {
            label: 'Hôm nay',
            val: stats.today.toString(),
            icon: 'solar:calendar-bold-duotone',
            color: 'text-sky-500 bg-sky-50',
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

    <UiTable
      :headers="[
        { key: 'record', label: 'Bản ghi', width: '360px' },
        { key: 'module', label: 'Module', width: '140px' },
        { key: 'level', label: 'Mức độ', width: '120px' },
        { key: 'ip', label: 'IP / Thiết bị', width: '220px' },
        { key: 'createdAt', label: 'Thời gian', width: '180px' },
        { key: 'actions', label: '', align: 'right', width: '72px' },
      ]"
      :items="paginatedLogs"
      striped
    >
      <template #top>
        <div
          class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div class="relative w-full lg:max-w-sm">
            <Icon
              name="solar:magnifer-line-duotone"
              size="18"
              class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <UiInput
              v-model="searchQuery"
              placeholder="Tìm theo actor, action, target..."
              class="pl-10"
            />
          </div>

          <div class="grid w-full grid-cols-1 gap-3 md:grid-cols-3 lg:w-auto">
            <UiDropdown v-model="selectedLevel" :options="levelOptions" />
            <UiDropdown v-model="selectedModule" :options="moduleOptions" />
            <UiDropdown v-model="selectedActor" :options="actorOptions" />
          </div>
        </div>
      </template>

      <template #cell(record)="{ item }">
        <div class="min-w-0 text-left">
          <p class="text-sm font-bold text-slate-800 dark:text-slate-100">
            {{ item.action }}
          </p>
          <p
            class="mt-0.5 text-[12px] font-medium text-slate-500 dark:text-slate-400"
          >
            {{ item.actor.name }} — {{ item.target }}
          </p>
          <p class="mt-1 line-clamp-2 text-[12px] text-slate-400">
            {{ item.description }}
          </p>
        </div>
      </template>

      <template #cell(module)="{ item }">
        <div class="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {{ item.module }}
        </div>
      </template>

      <template #cell(level)="{ item }">
        <UiBadge
          :variant="getLevelMeta(item.level).variant as any"
          :label="getLevelMeta(item.level).label"
        />
      </template>

      <template #cell(ip)="{ item }">
        <div class="min-w-0">
          <p
            class="font-mono text-xs font-bold text-slate-700 dark:text-slate-200"
          >
            {{ item.ip }}
          </p>
          <p class="truncate text-[11px] text-slate-400">
            {{ item.device }}
          </p>
        </div>
      </template>

      <template #cell(createdAt)="{ item }">
        <span class="text-xs font-medium text-slate-500">
          {{ formatDateTime(item.createdAt) }}
        </span>
      </template>

      <template #cell(actions)="{ item }">
        <div class="flex justify-end">
          <UiButton
            variant="ghost"
            class="!h-9 !w-9 !rounded-xl !p-0"
            title="Xem chi tiết"
            @click="openDetail(item.id)"
          >
            <Icon name="solar:eye-bold" size="18" />
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
            Không có nhật ký hoạt động
          </p>
        </div>
      </template>
      <template #footer>
        <UiPagination
          :total="logs.length"
          v-model:pageSize="pageSize"
          v-model:currentPage="currentPage"
        />
      </template>
    </UiTable>

    <UiAlert type="info" title="Gợi ý sử dụng">
      Dùng trang này để truy vết thao tác nhạy cảm như đổi trạng thái đơn, sửa
      tên kho, cập nhật cài đặt hoặc hành vi bất thường của hệ thống.
    </UiAlert>

    <UiModal v-model="isDetailModalOpen" title="Chi tiết nhật ký" size="xl">
      <template v-if="selectedLog">
        <div class="space-y-6">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-lg font-bold text-slate-900 dark:text-white">
                {{ selectedLog.action }}
              </h2>
              <UiBadge
                :variant="getLevelMeta(selectedLog.level).variant as any"
                :label="getLevelMeta(selectedLog.level).label"
                rounded
              />
            </div>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {{ selectedLog.description }}
            </p>
          </div>

          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div
              class="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
            >
              <p
                class="text-[11px] font-bold uppercase tracking-wider text-slate-400"
              >
                Actor
              </p>
              <p
                class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100"
              >
                {{ selectedLog.actor.name }}
              </p>
              <p class="mt-1 text-xs text-slate-400">
                {{ selectedLog.actor.email }}
              </p>
            </div>
            <div
              class="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
            >
              <p
                class="text-[11px] font-bold uppercase tracking-wider text-slate-400"
              >
                Module
              </p>
              <p
                class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100"
              >
                {{ selectedLog.module }}
              </p>
            </div>
            <div
              class="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
            >
              <p
                class="text-[11px] font-bold uppercase tracking-wider text-slate-400"
              >
                Target
              </p>
              <p
                class="mt-1 font-mono text-sm font-semibold text-slate-800 dark:text-slate-100"
              >
                {{ selectedLog.target }}
              </p>
            </div>
            <div
              class="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
            >
              <p
                class="text-[11px] font-bold uppercase tracking-wider text-slate-400"
              >
                Thời gian
              </p>
              <p
                class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100"
              >
                {{ formatDateTime(selectedLog.createdAt) }}
              </p>
            </div>
            <div
              class="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
            >
              <p
                class="text-[11px] font-bold uppercase tracking-wider text-slate-400"
              >
                IP
              </p>
              <p
                class="mt-1 font-mono text-sm font-semibold text-slate-800 dark:text-slate-100"
              >
                {{ selectedLog.ip }}
              </p>
            </div>
            <div
              class="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
            >
              <p
                class="text-[11px] font-bold uppercase tracking-wider text-slate-400"
              >
                Thiết bị
              </p>
              <p
                class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100"
              >
                {{ selectedLog.device }}
              </p>
            </div>
          </div>

          <div>
            <div class="mb-3 flex items-center gap-2">
              <span
                :class="[
                  'block h-2.5 w-2.5 rounded-full',
                  getLevelMeta(selectedLog.level).dot,
                ]"
              ></span>
              <h3 class="text-base font-bold text-slate-900 dark:text-white">
                Metadata thay đổi
              </h3>
            </div>

            <div
              v-if="Object.keys(selectedLog.meta).length"
              class="grid grid-cols-1 gap-3 md:grid-cols-2"
            >
              <div
                v-for="(value, key) in selectedLog.meta"
                :key="key"
                class="rounded-2xl border border-slate-200 p-3 dark:border-slate-800"
              >
                <p
                  class="text-[11px] font-bold uppercase tracking-wider text-slate-400"
                >
                  {{ key }}
                </p>
                <p
                  class="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  {{ value }}
                </p>
              </div>
            </div>
            <p v-else class="text-sm text-slate-500 dark:text-slate-400">
              Không có metadata bổ sung.
            </p>
          </div>
        </div>
      </template>
    </UiModal>
  </div>
</template>
