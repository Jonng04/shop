<script setup lang="ts">
  definePageMeta({ layout: "admin" });
  useHead({ title: "Cấu hình nạp tiền - Admin Panel" });
  const { formatDateTime } = useDateFormatter();

  const toast = useToast();
  const { user } = useUserSession();

  interface SessionUser {
    role?: string | null;
    permissions?: string[] | null;
  }

  interface BankItem {
    id: number;
    bankName: string;
    bankCode: string | null;
    accountNumber: string;
    accountName: string;
    status: "active" | "inactive";
    createdAt: string | null;
  }

  const {
    data: banksData,
    refresh: refreshBanks,
    pending: banksPending,
  } = await useFetch<BankItem[]>("/api/admin/banks", {
    key: "admin-banks-list",
    lazy: true,
  });

  const { data: settingsData, refresh: refreshSettings } = await useFetch<
    Record<string, string | null>
  >("/api/admin/settings", {
    key: "admin-deposit-config-settings",
    lazy: true,
  });

  const banks = computed(() => banksData.value || []);
  const sessionUser = computed(() => user.value as SessionUser | null);

  const hasPermission = (permission: string) => {
    const role = String(sessionUser.value?.role || "").trim();
    if (role === "admin") return true;

    const permissions = sessionUser.value?.permissions || [];
    return permissions.includes("*") || permissions.includes(permission);
  };

  const canManageBanks = computed(() => hasPermission("manage_banks"));
  const canManageSettings = computed(() => hasPermission("manage_settings"));

  const settingsForm = reactive({
    depositInvoiceExpiryMinutes: 15,
    depositMinAmount: 10000,
    depositMaxAmount: 5000000,
    depositRandomType: "alphanumeric",
    depositRandomLength: 8,
    depositBonusRules: "",
    sepayApiKey: "",
    cronSecretKey: "",
  });

  const randomTypeOptions = [
    { label: "Chữ + số", value: "alphanumeric" },
    { label: "Chữ số", value: "numeric" },
    { label: "Chữ in hoa", value: "alpha_upper" },
  ];

  const vietQrBanks = [
    { label: "Vietcombank", value: "970436", name: "Ngân hàng TMCP Ngoại thương Việt Nam" },
    { label: "VietinBank", value: "970415", name: "Ngân hàng TMCP Công thương Việt Nam" },
    { label: "BIDV", value: "970418", name: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam" },
    { label: "Agribank", value: "970405", name: "Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam" },
    { label: "Techcombank", value: "970407", name: "Ngân hàng TMCP Kỹ thương Việt Nam" },
    { label: "MBBank", value: "970422", name: "Ngân hàng TMCP Quân đội" },
    { label: "ACB", value: "970416", name: "Ngân hàng TMCP Á Châu" },
    { label: "VPBank", value: "970432", name: "Ngân hàng TMCP Việt Nam Thịnh Vượng" },
    { label: "TPBank", value: "970423", name: "Ngân hàng TMCP Tiên Phong" },
    { label: "Sacombank", value: "970403", name: "Ngân hàng TMCP Sài Gòn Thương Tín" },
    { label: "HDBank", value: "970437", name: "Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh" },
    { label: "VIB", value: "970441", name: "Ngân hàng TMCP Quốc tế Việt Nam" },
    { label: "OCB", value: "970448", name: "Ngân hàng TMCP Phương Đông" },
    { label: "MSB", value: "970426", name: "Ngân hàng TMCP Hàng Hải Việt Nam" },
    { label: "Eximbank", value: "970431", name: "Ngân hàng TMCP Xuất Nhập khẩu Việt Nam" },
    { label: "SHB", value: "970443", name: "Ngân hàng TMCP Sài Gòn - Hà Nội" },
    { label: "SeABank", value: "970440", name: "Ngân hàng TMCP Đông Nam Á" },
    { label: "ABBANK", value: "970425", name: "Ngân hàng TMCP An Bình" },
    { label: "VietABank", value: "970427", name: "Ngân hàng TMCP Việt Á" },
    { label: "VietBank", value: "970433", name: "Ngân hàng TMCP Việt Nam Thương Tín" },
  ];

  watch(
    settingsData,
    (value) => {
      if (!value) return;
      settingsForm.depositInvoiceExpiryMinutes = Number(
        value.depositInvoiceExpiryMinutes || 15
      );
      settingsForm.depositMinAmount = Number(value.depositMinAmount || 10000);
      settingsForm.depositMaxAmount = Number(value.depositMaxAmount || 5000000);
      settingsForm.depositRandomType = String(
        value.depositRandomType || "alphanumeric"
      );
      settingsForm.depositRandomLength = Number(value.depositRandomLength || 8);
      settingsForm.depositBonusRules = String(value.depositBonusRules || "");
      settingsForm.sepayApiKey = String(value.sepayApiKey || "");
      settingsForm.cronSecretKey = String(value.cronSecretKey || "");
    },
    { immediate: true }
  );

  const modalOpen = ref(false);
  const confirmOpen = ref(false);
  const savingBank = ref(false);
  const savingSettings = ref(false);
  const deletingId = ref<number | null>(null);
  const editingId = ref<number | null>(null);
  const bankToDelete = ref<BankItem | null>(null);

  const bankForm = reactive({
    bankName: "",
    bankCode: "",
    accountNumber: "",
    accountName: "",
    status: "active" as "active" | "inactive",
  });

  const bankOptions = computed(() => {
    const options = vietQrBanks.map((bank) => ({
      label: bank.label,
      value: bank.value,
    }));

    if (
      editingId.value &&
      bankForm.bankCode &&
      !options.some((item) => item.value === bankForm.bankCode)
    ) {
      options.unshift({
        label: bankForm.bankName || `Mã ${bankForm.bankCode}`,
        value: bankForm.bankCode,
      });
    }

    return options;
  });

  watch(
    () => bankForm.bankCode,
    (value) => {
      const selected = vietQrBanks.find((bank) => bank.value === value);

      if (selected) {
        bankForm.bankName = selected.name;
      } else if (!value && !editingId.value) {
        bankForm.bankName = "";
      }
    },
  );

  const resetBankForm = () => {
    editingId.value = null;
    bankForm.bankName = "";
    bankForm.bankCode = "";
    bankForm.accountNumber = "";
    bankForm.accountName = "";
    bankForm.status = "active";
  };

  const openAddModal = () => {
    if (!canManageBanks.value) {
      toast.error("Từ chối", "Bạn không có quyền thêm ngân hàng");
      return;
    }

    resetBankForm();
    modalOpen.value = true;
  };

  const openEditModal = (item: BankItem) => {
    if (!canManageBanks.value) {
      toast.error("Từ chối", "Bạn không có quyền cập nhật ngân hàng");
      return;
    }

    editingId.value = item.id;
    bankForm.bankName = item.bankName;
    bankForm.bankCode = item.bankCode || "";
    bankForm.accountNumber = item.accountNumber;
    bankForm.accountName = item.accountName;
    bankForm.status = item.status;
    modalOpen.value = true;
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value || 0);

  const saveBank = async () => {
    if (!canManageBanks.value) {
      toast.error("Từ chối", "Bạn không có quyền lưu ngân hàng");
      return;
    }

    if (!bankForm.bankCode.trim()) {
      toast.error("Thất bại", "Vui lòng chọn ngân hàng");
      return;
    }

    savingBank.value = true;

    try {
      const selectedBank = vietQrBanks.find(
        (bank) => bank.value === bankForm.bankCode.trim(),
      );
      const body = {
        bankName: String(selectedBank?.name || bankForm.bankName || "").trim(),
        bankCode: bankForm.bankCode.trim().toUpperCase(),
        accountNumber: bankForm.accountNumber.trim(),
        accountName: bankForm.accountName.trim(),
        status: bankForm.status,
      };

      if (editingId.value) {
        await $fetch(`/api/admin/banks/${editingId.value}`, {
          method: "PATCH",
          body,
        });
        toast.success("Thành công", "Đã cập nhật ngân hàng");
      } else {
        await $fetch("/api/admin/banks", {
          method: "POST",
          body,
        });
        toast.success("Thành công", "Đã thêm ngân hàng mới");
      }

      modalOpen.value = false;
      resetBankForm();
      await refreshBanks();
    } catch (error: any) {
      toast.error(
        "Thất bại",
        error?.data?.message || "Không thể lưu ngân hàng"
      );
    } finally {
      savingBank.value = false;
    }
  };

  const openDeleteConfirm = (item: BankItem) => {
    if (!canManageBanks.value) {
      toast.error("Từ chối", "Bạn không có quyền xóa ngân hàng");
      return;
    }

    bankToDelete.value = item;
    confirmOpen.value = true;
  };

  const confirmDelete = async () => {
    if (!canManageBanks.value) {
      toast.error("Từ chối", "Bạn không có quyền xóa ngân hàng");
      return;
    }

    if (!bankToDelete.value) return;

    deletingId.value = bankToDelete.value.id;
    try {
      await $fetch(`/api/admin/banks/${bankToDelete.value.id}`, {
        method: "DELETE",
      });
      toast.success("Thành công", "Đã xóa ngân hàng");
      confirmOpen.value = false;
      bankToDelete.value = null;
      await refreshBanks();
    } catch (error: any) {
      toast.error(
        "Thất bại",
        error?.data?.message || "Không thể xóa ngân hàng"
      );
    } finally {
      deletingId.value = null;
    }
  };

  const saveSettings = async () => {
    if (!canManageSettings.value) {
      toast.error("Từ chối", "Bạn không có quyền lưu cấu hình");
      return;
    }

    savingSettings.value = true;
    try {
      await $fetch("/api/admin/settings", {
        method: "POST",
        body: {
          depositInvoiceExpiryMinutes: settingsForm.depositInvoiceExpiryMinutes,
          depositMinAmount: settingsForm.depositMinAmount,
          depositMaxAmount: settingsForm.depositMaxAmount,
          depositRandomType: settingsForm.depositRandomType,
          depositRandomLength: settingsForm.depositRandomLength,
          depositBonusRules: settingsForm.depositBonusRules,
          sepayApiKey: settingsForm.sepayApiKey,
          cronSecretKey: settingsForm.cronSecretKey,
        },
      });

      await refreshSettings();
      toast.success("Thành công", "Đã lưu cấu hình nạp tiền");
    } catch (error: any) {
      toast.error(
        "Thất bại",
        error?.data?.message || "Không thể lưu cấu hình nạp tiền"
      );
    } finally {
      savingSettings.value = false;
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
            name="solar:settings-line-duotone"
            class="text-primary"
            size="16"
          />
          Cấu hình nạp tiền
        </div>
        <h1
          class="text-xl font-semibold tracking-tight text-slate-900 dark:text-white"
        >
          Ngân hàng & cấu hình chung
        </h1>
      </div>

      <div class="flex items-center gap-2">
        <NuxtLink to="/admin/deposits">
          <UiButton variant="outline">
            <template #prefix>
              <Icon name="solar:alt-arrow-left-line-duotone" size="18" />
            </template>
            Quay lại hóa đơn
          </UiButton>
        </NuxtLink>

        <UiButton v-if="canManageBanks" @click="openAddModal">
          <template #prefix>
            <Icon name="solar:add-circle-line-duotone" size="18" />
          </template>
          Thêm ngân hàng
        </UiButton>
      </div>
    </div>

    <UiTable
      :headers="[
        { key: 'bank', label: 'Ngân hàng', width: '220px' },
        { key: 'accountNumber', label: 'Số tài khoản', width: '180px' },
        { key: 'accountName', label: 'Chủ tài khoản', width: '220px' },
        { key: 'status', label: 'Trạng thái', width: '140px' },
        { key: 'createdAt', label: 'Tạo lúc', width: '180px' },
        { key: 'actions', label: 'Thao tác', width: '120px' },
      ]"
      :items="banks"
      :loading="banksPending"
      striped
    >
      <template #top>
        <div class="flex items-center gap-3">
          <span
            class="h-7 w-1.5 rounded-full bg-gradient-to-b from-sky-300 via-primary to-violet-400"
          ></span>
          <div>
            <p class="text-base font-semibold text-slate-800 dark:text-white">
              Danh sách ngân hàng
            </p>
            <p class="mt-1 text-xs text-slate-400">
              Thông tin này sẽ hiển thị ở trang nạp tiền để người dùng chuyển
              khoản hoặc quết mã.
            </p>
          </div>
        </div>
      </template>

      <template #cell(bank)="{ item }">
        <div class="min-w-0">
          <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {{ item.bankName }}
          </p>
          <p class="mt-1 text-[11px] font-medium text-slate-400">
            {{ item.bankCode || "Không có mã viết tắt" }}
          </p>
        </div>
      </template>

      <template #cell(accountNumber)="{ item }">
        <span class="font-mono text-[13px] font-semibold text-primary">
          {{ item.accountNumber }}
        </span>
      </template>

      <template #cell(accountName)="{ item }">
        <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {{ item.accountName }}
        </span>
      </template>

      <template #cell(status)="{ item }">
        <UiBadge
          :variant="item.status === 'active' ? 'success' : 'slate'"
          :label="item.status === 'active' ? 'Đang hoạt động' : 'Tạm ẩn'"
          rounded
        />
      </template>

      <template #cell(createdAt)="{ item }">
        <span class="text-xs font-medium text-slate-500">
          {{ formatDateTime(item.createdAt) }}
        </span>
      </template>

      <template #cell(actions)="{ item }">
        <div v-if="canManageBanks" class="flex items-center gap-1.5">
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
            <Icon name="solar:box-minimalistic-line-duotone" size="24" />
          </div>
          <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Không có ngân hàng
          </p>
        </div>
      </template>
    </UiTable>

    <div
      class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div class="mb-5">
        <div class="flex items-center gap-3">
          <span
            class="h-7 w-1.5 rounded-full bg-gradient-to-b from-sky-300 via-primary to-violet-400"
          ></span>
          <div>
            <p class="text-base font-semibold text-slate-800 dark:text-white">
              Cấu hình chung
            </p>
            <p class="mt-1 text-xs text-slate-400">
              Mã hóa đơn cưng sẽ là mã chuyển khoản để hệ thống đối soát nạp
              tiền.
            </p>
          </div>
        </div>
      </div>

      <div
        class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        :class="!canManageSettings && 'opacity-70'"
      >
        <div>
          <label
            class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Thời gian hết hạn hóa đơn
          </label>
          <UiInput
            v-model="settingsForm.depositInvoiceExpiryMinutes"
            type="number"
            placeholder="15"
            :disabled="!canManageSettings"
          />
          <p class="mt-1 text-[11px] text-slate-400">Mã ghi chú phút</p>
        </div>

        <div>
          <label
            class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Số tiền nạp tối thiểu
          </label>
          <UiInput
            v-model="settingsForm.depositMinAmount"
            type="number"
            placeholder="10000"
            :disabled="!canManageSettings"
          />
          <p class="mt-1 text-[11px] text-slate-400">
            Hiện tại: {{ formatCurrency(settingsForm.depositMinAmount) }}
          </p>
        </div>

        <div>
          <label
            class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Số tiền nạp tối đa
          </label>
          <UiInput
            v-model="settingsForm.depositMaxAmount"
            type="number"
            placeholder="5000000"
            :disabled="!canManageSettings"
          />
          <p class="mt-1 text-[11px] text-slate-400">
            Hiện tại: {{ formatCurrency(settingsForm.depositMaxAmount) }}
          </p>
        </div>

        <div>
          <label
            class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Loại nội dung Random
          </label>
          <UiDropdown
            v-model="settingsForm.depositRandomType"
            :options="randomTypeOptions"
            :disabled="!canManageSettings"
          />
        </div>

        <div>
          <label
            class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Số ký tự Random
          </label>
          <UiInput
            v-model="settingsForm.depositRandomLength"
            type="number"
            placeholder="8"
            :disabled="!canManageSettings"
          />
        </div>

        <div>
          <label
            class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            SePay API key
          </label>
          <UiInput
            v-model="settingsForm.sepayApiKey"
            type="password"
            placeholder="Nhập API key của SePay..."
            :disabled="!canManageSettings"
          />
          <p class="mt-1 text-[11px] text-slate-400">
            Dùng để kết nối SePay khi đối soát nạp tiền từ giao dịch ngân hàng.
          </p>
        </div>

        <div>
          <label
            class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Khuyến mãi nạp tiền nếu có
          </label>
          <UiTextarea
            v-model="settingsForm.depositBonusRules"
            :rows="5"
            placeholder="100000|5&#10;1000000|10&#10;10000000|15"
            :disabled="!canManageSettings"
          />
          <p class="mt-1 text-[11px] text-slate-400">
            Nhập mục nạp khuyến mãi nạp tiền nếu có, mỗi dòng là một mục nạp.
          </p>
          <p
            class="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400"
          >
            Định dạng: SO_TIEN|PHAN_TRAM_KHUYEN_MAI
          </p>
        </div>

        <div>
          <label
            class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Cron secret key
          </label>
          <UiInput
            v-model="settingsForm.cronSecretKey"
            type="text"
            placeholder="Nhập secret key cho cronjob..."
            :disabled="!canManageSettings"
          />
          <p class="mt-1 text-[11px] text-slate-400">
            Link chạy cron nạp tiền:
            <span class="font-mono">/api/cron/deposits/process?secret={{ settingsForm.cronSecretKey || 'xxx' }}</span>
          </p>
        </div>
      </div>

      <p
        v-if="!canManageSettings"
        class="mt-4 text-xs font-medium text-slate-400"
      >
        Bạn chỉ có quyền xem cấu hình, không thể chỉnh sửa.
      </p>

      <div v-if="canManageSettings" class="mt-6 flex justify-end">
        <UiButton :loading="savingSettings" @click="saveSettings">
          <template #prefix>
            <Icon name="solar:diskette-line-duotone" size="18" />
          </template>
          Lưu cấu hình chung
        </UiButton>
      </div>
    </div>

    <UiModal
      v-model="modalOpen"
      :title="editingId ? 'Cập nhật ngân hàng' : 'Thêm ngân hàng'"
      size="lg"
    >
      <div class="space-y-4">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Ngân hàng
            </label>
            <UiDropdown v-model="bankForm.bankCode" :options="bankOptions" />
            <p class="mt-1 text-[11px] text-slate-400">
              Chọn ngân hàng theo danh sách VietQR, mã ngân hàng sẽ tự điền.
            </p>
          </div>

          <div>
            <label
              class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Trạng thái
            </label>
            <UiDropdown
              v-model="bankForm.status"
              :options="[
                { label: 'Đang hoạt động', value: 'active' },
                { label: 'Tạm ẩn', value: 'inactive' },
              ]"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Mã ngân hàng (VietQR)
            </label>
            <UiInput
              :model-value="bankForm.bankCode"
              disabled
              placeholder="Ví dụ: 970432"
            />
          </div>

          <div>
            <label
              class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Tên ngân hàng đầy đủ
            </label>
            <UiInput
              :model-value="bankForm.bankName"
              disabled
              placeholder="Tự động theo ngân hàng đã chọn"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Số tài khoản
            </label>
            <UiInput
              v-model="bankForm.accountNumber"
              placeholder="Nhập số tài khoản..."
            />
          </div>

          <div>
            <label
              class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Tên chủ tài khoản
            </label>
            <UiInput
              v-model="bankForm.accountName"
              placeholder="Ví dụ: CONG TY ABC"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex gap-3">
          <UiButton variant="outline" class="flex-1" @click="modalOpen = false">
            Hủy
          </UiButton>
          <UiButton
            v-if="canManageBanks"
            class="flex-1"
            :loading="savingBank"
            @click="saveBank"
          >
            {{ editingId ? "Lưu cập nhật" : "Thêm ngân hàng" }}
          </UiButton>
        </div>
      </template>
    </UiModal>

    <UiConfirm
      v-model="confirmOpen"
      title="Xóa ngân hàng"
      :message="`Bạn có chắc muốn xóa ngân hàng ${bankToDelete?.bankName || ''}?`"
      confirm-label="Xóa ngay"
      :loading="deletingId !== null"
      @confirm="confirmDelete"
    />
  </div>
</template>




