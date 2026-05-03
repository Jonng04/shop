<script setup lang="ts">
  definePageMeta({ layout: "admin" });

  const route = useRoute();
  const router = useRouter();
  const toast = useToast();

  const planId = computed(() => route.query.plan_id as string | undefined);
  const hasPlanId = computed(() => !!planId.value);

  const { data: planData, error: planError } = await useFetch<{
    id: number;
    name: string;
    productName: string;
    [key: string]: any;
  }>(() => `/api/admin/plans/${planId.value || 0}`, {
    immediate: hasPlanId.value,
  });

  const isNotFound = computed(
    () =>
      !hasPlanId.value ||
      (hasPlanId.value && !planData.value && !!planError.value)
  );

  useHead({
    title: computed(() => `Kho hàng - ${planData.value?.name || "..."}`),
  });
  const { formatDateTime } = useDateFormatter();

  const search = ref("");
  const status = ref("all");
  const pageSize = ref(20);
  const currentPage = ref(1);

  const { data: stocksData, refresh } = await useFetch<{
    stocks: any[];
    stats: { total: number; available: number; sold: number };
  }>("/api/admin/stocks", {
    query: computed(() => ({
      planId: planId.value,
      search: search.value || undefined,
      status: status.value === "all" ? undefined : status.value,
    })),
    immediate: hasPlanId.value,
    watch: [search, status],
  });

  const stocks = computed(() => stocksData.value?.stocks || []);
  const paginatedStocks = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return stocks.value.slice(start, start + pageSize.value);
  });
  const statsData = computed(
    () => stocksData.value?.stats || { total: 0, available: 0, sold: 0 }
  );

  const stats = computed(() => [
    {
      label: "Tổng số lượng",
      value: statsData.value.total,
      icon: "solar:layers-bold-duotone",
      color: "bg-blue-500/10 text-blue-600",
    },
    {
      label: "Còn hàng (Khả dụng)",
      value: statsData.value.available,
      icon: "solar:check-circle-bold-duotone",
      color: "bg-emerald-500/10 text-emerald-600",
    },
    {
      label: "Đã giao khách",
      value: statsData.value.sold,
      icon: "solar:user-check-bold-duotone",
      color: "bg-orange-500/10 text-orange-600",
    },
  ]);

  const statusOptions = [
    { label: "Tất cả trạng thái", value: "all" },
    { label: "Sẵn sàng", value: "available" },
    { label: "Đã bán", value: "sold" },
  ];

  watch([search, status], () => {
    currentPage.value = 1;
  });

  watch(pageSize, () => {
    currentPage.value = 1;
  });

  const isImportOpen = ref(false);
  const bulkText = ref("");
  const isImporting = ref(false);

  const handleBulkImport = async () => {
    if (!bulkText.value.trim()) {
      return toast.error("Lỗi", "Vui lòng nhập nội dung.");
    }

    const lines = bulkText.value.split("\n").filter((l: string) => l.trim());
    isImporting.value = true;
    try {
      await $fetch("/api/admin/stocks", {
        method: "POST",
        body: { planId: planId.value, contentLines: lines },
      });
      toast.success("Thành công", `Đã thêm ${lines.length} dòng hàng vào kho.`);
      bulkText.value = "";
      isImportOpen.value = false;
      refresh();
    } catch (err: any) {
      toast.error("Lỗi", err.data?.message || "Không thể nhập hàng.");
    } finally {
      isImporting.value = false;
    }
  };

  const handleExportTxt = () => {
    if (stocks.value.length === 0) {
      return toast.error("Lỗi", "Kho hàng đang trống.");
    }

    const content = stocks.value.map((s: any) => s.content).join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-plan-${planId.value}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    if (stocks.value.length === 0) {
      return toast.error("Lỗi", "Kho hàng đang trống.");
    }

    const header = "id,content,status,createdAt";
    const rows = stocks.value.map(
      (s: any) => `${s.id},"${s.content}",${s.status},${s.createdAt}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-plan-${planId.value}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const isExportOpen = ref(false);

  const txtFileInput = ref<HTMLInputElement | null>(null);
  const csvFileInput = ref<HTMLInputElement | null>(null);
  const isImportingFile = ref(false);

  const triggerTxtImport = () => txtFileInput.value?.click();
  const triggerCsvImport = () => csvFileInput.value?.click();

  const handleTxtFile = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    isImportingFile.value = true;
    try {
      const text = await file.text();
      const lines = text.split("\n").filter((l: string) => l.trim());
      if (lines.length === 0) return toast.error("Lỗi", "File trống.");

      await $fetch("/api/admin/stocks", {
        method: "POST",
        body: { planId: planId.value, contentLines: lines },
      });
      toast.success("Thành công", `Đã nhập ${lines.length} dòng từ file TXT.`);
      refresh();
    } catch (err: any) {
      toast.error("Lỗi", err.data?.message || "Không thể nhập file TXT.");
    } finally {
      isImportingFile.value = false;
      if (txtFileInput.value) txtFileInput.value.value = "";
    }
  };

  const handleCsvFile = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    isImportingFile.value = true;
    try {
      const text = await file.text();
      const allLines = text.split("\n").filter((l: string) => l.trim());
      const hasHeader =
        isNaN(Number(allLines[0]?.split(",")[0]?.trim())) &&
        allLines[0]?.toLowerCase().includes("content");
      const dataLines = hasHeader ? allLines.slice(1) : allLines;

      const contents = dataLines
        .map((line: string) => {
          const cols = line.split(",");
          if (cols.length >= 2 && !isNaN(Number(cols[0]?.trim()))) {
            return cols.slice(1).join(",").replace(/^"|"$/g, "").trim();
          }
          return line.replace(/^"|"$/g, "").trim();
        })
        .filter(Boolean);

      if (contents.length === 0) {
        return toast.error("Lỗi", "Không tìm thấy dữ liệu hợp lệ.");
      }

      await $fetch("/api/admin/stocks", {
        method: "POST",
        body: { planId: planId.value, contentLines: contents },
      });
      toast.success(
        "Thành công",
        `Đã nhập ${contents.length} dòng từ file CSV.`
      );
      refresh();
    } catch (err: any) {
      toast.error("Lỗi", err.data?.message || "Không thể nhập file CSV.");
    } finally {
      isImportingFile.value = false;
      if (csvFileInput.value) csvFileInput.value.value = "";
    }
  };

  const isDeleteSingleOpen = ref(false);
  const stockToDelete = ref<number | null>(null);
  const isDeletingSingle = ref(false);

  const handleDeleteRequest = (id: number) => {
    stockToDelete.value = id;
    isDeleteSingleOpen.value = true;
  };

  const confirmDeleteSingle = async () => {
    if (!stockToDelete.value) return;

    isDeletingSingle.value = true;
    try {
      await $fetch("/api/admin/stocks", {
        method: "DELETE",
        query: { id: stockToDelete.value },
      });
      toast.success("Đã xóa", "Đã xóa dòng hàng.");
      refresh();
    } catch {
      toast.error("Lỗi", "Không thể xóa.");
    } finally {
      isDeletingSingle.value = false;
      isDeleteSingleOpen.value = false;
      stockToDelete.value = null;
    }
  };

  const isDeleteAllOpen = ref(false);
  const isDeletingAll = ref(false);

  const handleDeleteAll = async () => {
    isDeletingAll.value = true;
    try {
      await $fetch("/api/admin/stocks", {
        method: "DELETE",
        query: { planId: planId.value },
      });
      toast.success("Thành công", "Đã dọn sạch kho hàng.");
      refresh();
    } catch {
      toast.error("Lỗi", "Không thể xóa kho hàng.");
    } finally {
      isDeletingAll.value = false;
      isDeleteAllOpen.value = false;
    }
  };

  const goBack = () => router.back();
</script>

<template>
  <div
    v-if="isNotFound"
    class="flex flex-col items-center justify-center py-24 text-center"
  >
    <div
      class="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-slate-100 text-slate-300 dark:bg-slate-800"
    >
      <Icon name="solar:folder-error-bold-duotone" size="56" />
    </div>
    <h1 class="mb-2 text-xl font-semibold text-slate-800 dark:text-white">
      Gói sản phẩm không tồn tại
    </h1>
    <p class="mb-8 max-w-sm text-sm font-semibold text-slate-400">
      <template v-if="!hasPlanId">
        Đường dẫn thiếu thông tin
        <code
          class="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 dark:bg-slate-800"
          >plan_id</code
        >.
      </template>
      <template v-else>
        Gói có ID
        <code
          class="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 dark:bg-slate-800"
          >#{{ planId }}</code
        >
        không tồn tại hoặc đã bị xóa.
      </template>
      Vui lòng quay lại trang quản lý gói sản phẩm.
    </p>
    <button
      @click="router.push('/admin/plans')"
      class="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary/90"
    >
      <Icon name="solar:alt-arrow-left-line-duotone" size="18" />
      Quay lại danh sách gói
    </button>
  </div>

  <div v-else class="space-y-6">
    <div
      class="flex flex-col gap-4 py-2 lg:flex-row lg:items-center lg:justify-between"
    >
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800"
        >
          <Icon name="solar:archive-bold-duotone" size="22" />
        </div>
        <div>
          <h1
            class="mb-1 text-[11px] font-semibold uppercase tracking-widest leading-none text-slate-400"
          >
            Quản lý kho hàng
            <span v-if="planData?.productName" class="text-primary">
              Ở {{ planData.productName }}
            </span>
          </h1>
          <p class="text-sm font-semibold text-slate-900 dark:text-white">
            <span class="text-primary">{{
              planData?.name || "Đang tải..."
            }}</span>
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-1.5">
        <button
          @click="isImportOpen = true"
          class="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-[10px] font-semibold uppercase text-white shadow-sm transition-all hover:bg-emerald-600"
        >
          <Icon name="solar:upload-line-duotone" size="14" />
          Nhập hàng loạt
        </button>
        <button
          @click="triggerCsvImport"
          :disabled="isImportingFile"
          class="flex items-center gap-1.5 rounded-lg bg-purple-500 px-3 py-2 text-[10px] font-semibold uppercase text-white shadow-sm transition-all hover:bg-purple-600 disabled:opacity-60"
        >
          <Icon name="solar:file-text-line-duotone" size="14" />
          Nhập từ CSV
        </button>
        <button
          @click="triggerTxtImport"
          :disabled="isImportingFile"
          class="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-[10px] font-semibold uppercase text-white shadow-sm transition-all hover:bg-sky-600 disabled:opacity-60"
        >
          <Icon name="solar:notes-line-duotone" size="14" />
          Nhập từ TXT
        </button>
        <div class="relative">
          <button
            @click="isExportOpen = !isExportOpen"
            class="flex items-center gap-1.5 rounded-lg bg-orange-400 px-3 py-2 text-[10px] font-semibold uppercase text-white shadow-sm transition-all hover:bg-orange-500"
          >
            <Icon name="solar:export-line-duotone" size="14" />
            Xuất kho hàng
            <Icon name="solar:alt-arrow-down-line-duotone" size="12" />
          </button>
          <div
            v-if="isExportOpen"
            v-click-outside="() => (isExportOpen = false)"
            class="absolute right-0 top-full z-10 mt-1 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            <button
              @click="
                handleExportTxt();
                isExportOpen = false;
              "
              class="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Icon
                name="solar:notes-line-duotone"
                size="14"
                class="text-sky-500"
              />
              Xuất file TXT
            </button>
            <button
              @click="
                handleExportCsv();
                isExportOpen = false;
              "
              class="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Icon
                name="solar:file-text-line-duotone"
                size="14"
                class="text-purple-500"
              />
              Xuất file CSV
            </button>
          </div>
        </div>
        <button
          @click="isDeleteAllOpen = true"
          class="flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-2 text-[10px] font-semibold uppercase text-white shadow-sm transition-all hover:bg-rose-600"
        >
          <Icon name="solar:trash-bin-2-line-duotone" size="14" />
          Xóa toàn bộ
        </button>
        <button
          @click="goBack"
          class="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-[10px] font-semibold uppercase text-white shadow-sm transition-all hover:bg-black"
        >
          <Icon name="solar:alt-arrow-left-line-duotone" size="14" />
          Quay lại
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div
        v-for="stat in stats"
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
            class="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400"
          >
            {{ stat.label }}
          </p>
          <p class="text-xl font-semibold text-slate-800 dark:text-white">
            {{ stat.value }}
          </p>
        </div>
      </div>
    </div>

    <UiTable
      v-if="stocks.length > 0"
      :headers="[
        { key: 'content', label: 'N\u1ed9i dung d\u1eef li\u1ec7u' },
        { key: 'status', label: 'Tr\u1ea1ng th\u00e1i' },
        { key: 'createdAt', label: 'Ng\u00e0y nh\u1eadp' },
        { key: 'actions', label: 'Thao t\u00e1c', align: 'right' },
      ]"
      :items="paginatedStocks"
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
                Danh sách mã hàng
              </p>
            </div>
          </div>

          <div class="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div class="w-full sm:min-w-[280px]">
              <UiInput
                v-model="search"
                placeholder="Tìm kiếm..."
                class="h-10 rounded-[14px] border-slate-200 bg-white shadow-sm focus:bg-white"
              >
                <template #left-icon>
                  <Icon name="solar:magnifer-line-duotone" size="18" />
                </template>
              </UiInput>
            </div>
            <div class="w-full shrink-0 sm:w-[190px]">
              <UiDropdown v-model="status" :options="statusOptions" />
            </div>
          </div>
        </div>
      </template>

      <template #cell(content)="{ item }">
        <code
          class="block max-w-sm truncate rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          {{ item.content }}
        </code>
      </template>

      <template #cell(status)="{ item }">
        <UiBadge
          :variant="item.status === 'available' ? 'success' : 'slate'"
          :label="item.status === 'available' ? 'Sẵn sàng' : 'Đã bán'"
          rounded
        />
      </template>

      <template #cell(createdAt)="{ item }">
        <span class="text-xs font-semibold text-slate-500">
          {{ formatDateTime(item.createdAt) }}
        </span>
      </template>

      <template #cell(actions)="{ item }">
        <div class="flex items-center justify-end">
          <button
            @click="handleDeleteRequest(item.id)"
            class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-500"
          >
            <Icon name="solar:trash-bin-minimalistic-bold" size="18" />
          </button>
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
            Không có kho hàng
          </p>
        </div>
      </template>
      <template #footer>
        <UiPagination
          :total="stocks.length"
          v-model:pageSize="pageSize"
          v-model:currentPage="currentPage"
        />
      </template>
    </UiTable>

    <div
      v-if="stocks.length === 0"
      class="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-20 text-center dark:border-slate-800 dark:bg-slate-900"
    >
      <div
        class="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-slate-200 dark:border-slate-700 dark:bg-slate-800"
      >
        <Icon name="solar:box-minimalistic-bold-duotone" size="48" />
      </div>
      <h3
        class="text-base font-semibold uppercase tracking-widest text-slate-800 dark:text-white"
      >
        Kho hàng trống
      </h3>
      <p class="mt-1 max-w-xs text-sm font-semibold italic text-slate-400">
        Sản phẩm này hiện chưa có mã hàng nào trong kho. Hãy bấm "Nhập hàng
        loạt" để bắt đầu.
      </p>
    </div>

    <UiModal v-model="isImportOpen" title="Nhập hàng loạt" size="lg">
      <div class="space-y-4">
        <div
          class="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-[11px] font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
        >
          <Icon
            name="solar:info-circle-bold"
            size="18"
            class="mt-0.5 shrink-0"
          />
          <p>
            Mỗi dòng là một mã hàng/tài khoản. Hệ thống sẽ tự động tách thành
            từng item riêng biệt.
          </p>
        </div>
        <textarea
          v-model="bulkText"
          rows="12"
          class="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-semibold outline-none transition-all focus:border-primary/50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          placeholder="user1|pass1|key1&#10;user2|pass2|key2&#10;user3|pass3|key3"
        ></textarea>
        <div class="flex justify-end gap-3">
          <UiButton variant="outline" @click="isImportOpen = false">
            Hủy
          </UiButton>
          <UiButton
            variant="primary"
            :loading="isImporting"
            @click="handleBulkImport"
          >
            Xác nhận nhập kho
          </UiButton>
        </div>
      </div>
    </UiModal>

    <input
      ref="csvFileInput"
      type="file"
      accept=".csv"
      class="hidden"
      @change="handleCsvFile"
    />
    <input
      ref="txtFileInput"
      type="file"
      accept=".txt"
      class="hidden"
      @change="handleTxtFile"
    />

    <UiConfirm
      v-model="isDeleteSingleOpen"
      title="Xóa dòng hàng"
      message="Bạn có chắc chắn muốn xóa dòng hàng này không? Hành động này không thể hoàn tác."
      variant="danger"
      :loading="isDeletingSingle"
      @confirm="confirmDeleteSingle"
    />

    <UiConfirm
      v-model="isDeleteAllOpen"
      title="Dọn sạch kho hàng"
      message="Bạn có chắc chắn muốn xóa TOÀN BỘ mã hàng trong kho của gói này? Hành động này không thể hoàn tác."
      variant="danger"
      :loading="isDeletingAll"
      @confirm="handleDeleteAll"
    />
  </div>
</template>
