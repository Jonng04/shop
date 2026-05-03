<script setup lang="ts">
  const { loggedIn } = useUserSession();
  const { formatDateTime } = useDateFormatter();
  const toast = useToast();

  if (!loggedIn.value) {
    await navigateTo("/auth/login");
  }

  useSeoHead({
    title: "API Keys ",
    description: "Quản lý API keys của bạn",
  });

  interface ApiKeyItem {
    id: number;
    name: string | null;
    apiKey: string;
    status: "active" | "revoked" | "expired";
    lastUsedAt: string | null;
    expiresAt: string | null;
    revokedAt: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  }

  interface ApiKeysResponse {
    items: ApiKeyItem[];
    stats: {
      total: number;
      active: number;
      inactive: number;
    };
  }

  const { data, pending, refresh } = await useFetch<ApiKeysResponse>(
    "/api/user/api-keys",
    {
      key: "user-api-keys-list",
      default: () => ({
        items: [],
        stats: { total: 0, active: 0, inactive: 0 },
      }),
    }
  );

  const items = computed(() => data.value?.items || []);
  const stats = computed(
    () => data.value?.stats || { total: 0, active: 0, inactive: 0 }
  );
  const canCreateMoreKeys = computed(() => Number(stats.value.active || 0) < 5);

  const createModalOpen = ref(false);
  const deleteConfirmOpen = ref(false);
  const creating = ref(false);
  const deleting = ref(false);
  const regeneratingId = ref<number | null>(null);
  const selectedKey = ref<ApiKeyItem | null>(null);
  const createdCredential = ref<{
    apiKey: string;
    apiSecret: string;
    expiresAt: string | null;
  } | null>(null);

  const form = reactive({
    name: "",
    expiresDays: 0,
  });

  const expiryOptions = [
    { label: "Không hết hạn", value: 0 },
    { label: "7 ngày", value: 7 },
    { label: "30 ngày", value: 30 },
    { label: "90 ngày", value: 90 },
    { label: "365 ngày", value: 365 },
  ];

  const getStatusMeta = (status: ApiKeyItem["status"]) => {
    if (status === "active") {
      return { label: "Hoạt động", variant: "success" };
    }
    if (status === "expired") {
      return { label: "Hết hạn", variant: "warning" };
    }
    return { label: "Đã xóa", variant: "slate" };
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "---";
    return formatDateTime(value, "vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Đã sao chép", `${label} đã được sao chép vào clipboard`);
    } catch {
      toast.error("Không thể sao chép", "Trình duyệt không hỗ trợ clipboard");
    }
  };

  const openCreateModal = () => {
    form.name = "";
    form.expiresDays = 0;
    createModalOpen.value = true;
  };

  const createApiKey = async () => {
    creating.value = true;
    try {
      const response = await $fetch<{
        success: boolean;
        data: {
          apiKey: string;
          apiSecret: string;
          expiresAt: string | null;
        };
      }>("/api/user/api-keys", {
        method: "POST",
        body: {
          name: form.name.trim(),
          expiresDays: Number(form.expiresDays || 0),
        },
      });

      createdCredential.value = {
        apiKey: response.data.apiKey,
        apiSecret: response.data.apiSecret,
        expiresAt: response.data.expiresAt,
      };
      createModalOpen.value = false;
      await refresh();
      toast.success("Thành công", "Đã tạo API key mới");
    } catch (error: any) {
      toast.error("Thất bại", error?.data?.message || "Không thể tạo API key");
    } finally {
      creating.value = false;
    }
  };

  const openDeleteConfirm = (item: ApiKeyItem) => {
    selectedKey.value = item;
    deleteConfirmOpen.value = true;
  };

  const deleteApiKey = async () => {
    if (!selectedKey.value) return;
    deleting.value = true;
    try {
      await $fetch(`/api/user/api-keys/${selectedKey.value.id}`, {
        method: "DELETE",
      });
      toast.success("Thành công", "Đã xóa API key");
      deleteConfirmOpen.value = false;
      selectedKey.value = null;
      await refresh();
    } catch (error: any) {
      toast.error("Thất bại", error?.data?.message || "Không thể xóa API key");
    } finally {
      deleting.value = false;
    }
  };

  const regenerateSecret = async (item: ApiKeyItem) => {
    regeneratingId.value = item.id;
    try {
      const response = await $fetch<{
        success: boolean;
        data: {
          apiKey: string;
          apiSecret: string;
          expiresAt: string | null;
        };
      }>(`/api/user/api-keys/${item.id}`, {
        method: "PATCH",
        body: { regenerateSecret: true },
      });

      createdCredential.value = {
        apiKey: response.data.apiKey,
        apiSecret: response.data.apiSecret,
        expiresAt: response.data.expiresAt,
      };
      await refresh();
      toast.success("Thành công", "Đã tạo lại API secret");
    } catch (error: any) {
      toast.error(
        "Thất bại",
        error?.data?.message || "Không thể tạo lại API secret"
      );
    } finally {
      regeneratingId.value = null;
    }
  };
</script>

<template>
  <div class="min-h-screen bg-[#fafafa] font-sans dark:bg-[#0f1115]">
    <LayoutHeader />
    <LayoutNavbar />

    <main class="mx-auto max-w-[1400px] px-4 pb-20 pt-8 lg:px-6">
      <div class="mb-6 flex items-center justify-between gap-3">
        <div>
          <p
            class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400"
          >
            API Integration
          </p>
          <h1
            class="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
          >
            Quản lý API Keys
          </h1>
        </div>
        <UiButton :disabled="!canCreateMoreKeys" @click="openCreateModal">
          <template #prefix>
            <Icon name="solar:add-circle-line-duotone" size="18" />
          </template>
          Tạo API key
        </UiButton>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div
          class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#181a1f]"
        >
          <p class="text-[12px] font-semibold text-slate-400">Tổng số key</p>
          <p class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {{ stats.active }}/5
          </p>
        </div>
        <div
          class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#181a1f]"
        >
          <p class="text-[12px] font-semibold text-slate-400">Đang hoạt động</p>
          <p class="mt-2 text-2xl font-bold text-emerald-600">
            {{ stats.active }}
          </p>
        </div>
        <div
          class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#181a1f]"
        >
          <p class="text-[12px] font-semibold text-slate-400">
            Không hoạt động
          </p>
          <p class="mt-2 text-2xl font-bold text-slate-700 dark:text-slate-200">
            {{ stats.inactive }}
          </p>
        </div>
      </div>

      <p
        v-if="!canCreateMoreKeys"
        class="mt-3 text-xs font-medium text-amber-600 dark:text-amber-400"
      >
        Bạn đã đạt giới hạn 5 API key đang hoạt động. Hãy xóa key cũ để tạo key
        mới.
      </p>

      <UiAlert
        v-if="createdCredential"
        class="mt-5"
        type="warning"
        title="Lưu lại API Secret ngay"
      >
        <p class="mb-3 text-[13px]">
          Secret chỉ hiển thị một lần. Sau khi đóng khung này bạn sẽ không xem
          lại được.
        </p>
        <div
          class="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60"
        >
          <div class="flex items-center justify-between gap-2">
            <code class="truncate text-[12px] font-semibold">{{
              createdCredential.apiKey
            }}</code>
            <UiButton
              variant="outline"
              size="sm"
              @click="copyText(createdCredential.apiKey, 'API key')"
            >
              Sao chép key
            </UiButton>
          </div>
          <div class="flex items-center justify-between gap-2">
            <code class="truncate text-[12px] font-semibold">{{
              createdCredential.apiSecret
            }}</code>
            <UiButton
              variant="outline"
              size="sm"
              @click="copyText(createdCredential.apiSecret, 'API secret')"
            >
              Sao chép secret
            </UiButton>
          </div>
        </div>
      </UiAlert>

      <div class="mt-5 space-y-3">
        <div
          v-for="item in items"
          :key="item.id"
          class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#181a1f]"
        >
          <div
            class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <p
                  class="truncate text-sm font-bold text-slate-900 dark:text-slate-100"
                >
                  {{ item.name || `API Key #${item.id}` }}
                </p>
                <UiBadge
                  :label="getStatusMeta(item.status).label"
                  :variant="getStatusMeta(item.status).variant as any"
                  rounded
                />
              </div>
              <p
                class="mt-1 font-mono text-[12px] text-slate-600 dark:text-slate-300"
              >
                {{ item.apiKey }}
              </p>
              <p class="mt-1 text-[11px] text-slate-400">
                Tạo lúc: {{ formatDate(item.createdAt) }} | Hết hạn:
                {{ formatDate(item.expiresAt) }} | Dùng lần cuối:
                {{ formatDate(item.lastUsedAt) }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <UiButton
                variant="outline"
                size="sm"
                @click="copyText(item.apiKey, 'API key')"
              >
                Sao chép key
              </UiButton>
              <UiButton
                v-if="item.status === 'active'"
                variant="outline"
                size="sm"
                :loading="regeneratingId === item.id"
                @click="regenerateSecret(item)"
              >
                Tạo lại secret
              </UiButton>
              <UiButton
                variant="outline"
                size="sm"
                class="!border-rose-200 !text-rose-500 hover:!bg-rose-50"
                @click="openDeleteConfirm(item)"
              >
                Xóa
              </UiButton>
            </div>
          </div>
        </div>

        <div
          v-if="!pending && !items.length"
          class="rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-400 dark:border-slate-800"
        >
          Bạn chưa có API key nào.
        </div>
      </div>
    </main>

    <LayoutFooter />

    <UiModal v-model="createModalOpen" title="Tạo API key mới" size="md">
      <div class="space-y-4">
        <div>
          <label
            class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Tên key (tùy chọn)
          </label>
          <UiInput v-model="form.name" placeholder="Ví dụ: Website đối tác A" />
        </div>
        <div>
          <label
            class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Thời hạn
          </label>
          <UiDropdown v-model="form.expiresDays" :options="expiryOptions" />
        </div>
      </div>

      <template #footer>
        <div class="flex gap-3">
          <UiButton
            variant="outline"
            class="flex-1"
            @click="createModalOpen = false"
          >
            Hủy
          </UiButton>
          <UiButton class="flex-1" :loading="creating" @click="createApiKey">
            Tạo key
          </UiButton>
        </div>
      </template>
    </UiModal>

    <UiConfirm
      v-model="deleteConfirmOpen"
      title="Xóa API key"
      :message="`Bạn có chắc muốn xóa key ${selectedKey?.name || '#' + (selectedKey?.id || '')}?`"
      confirm-label="Xóa"
      :loading="deleting"
      @confirm="deleteApiKey"
    />
  </div>
</template>
