<script setup lang="ts">
  definePageMeta({ layout: "admin" });
  useHead({ title: "Cấu hình Affiliate - Admin Panel" });

  const toast = useToast();
  const { user } = useUserSession();

  interface SessionUser {
    role?: string | null;
    permissions?: string[] | null;
  }

  const { data: settingsData, refresh: refreshSettings } = await useFetch<
    Record<string, string | null>
  >("/api/admin/settings", {
    key: "admin-affiliate-config-settings",
    lazy: true,
  });

  const sessionUser = computed(() => user.value as SessionUser | null);

  const hasPermission = (permission: string) => {
    const role = String(sessionUser.value?.role || "").trim();
    if (role === "admin") return true;

    const permissions = sessionUser.value?.permissions || [];
    return permissions.includes("*") || permissions.includes(permission);
  };

  const canManageSettings = computed(() => hasPermission("manage_settings"));

  const settingsForm = reactive({
    affiliateEnabled: "true",
    affiliateCommissionRate: 10,
    affiliateMinWithdrawalAmount: 100,
    affiliateAutoCreateLink: "true",
    affiliateRequireActiveLink: "true",
  });

  const yesNoOptions = [
    { label: "Bật", value: "true" },
    { label: "Tắt", value: "false" },
  ];

  watch(
    settingsData,
    (value) => {
      if (!value) return;

      settingsForm.affiliateEnabled = String(value.affiliateEnabled || "true");
      settingsForm.affiliateCommissionRate = Number(
        value.affiliateCommissionRate || 10
      );
      settingsForm.affiliateMinWithdrawalAmount = Number(
        value.affiliateMinWithdrawalAmount || 100
      );
      settingsForm.affiliateAutoCreateLink = String(
        value.affiliateAutoCreateLink || "true"
      );
      settingsForm.affiliateRequireActiveLink = String(
        value.affiliateRequireActiveLink || "true"
      );
    },
    { immediate: true }
  );

  const savingSettings = ref(false);

  const saveSettings = async () => {
    if (!canManageSettings.value) {
      toast.error("Từ chối", "Bạn không có quyền lưu cấu hình");
      return;
    }

    const rate = Number(settingsForm.affiliateCommissionRate || 0);
    const minWithdrawal = Number(
      settingsForm.affiliateMinWithdrawalAmount || 0
    );

    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      toast.error("Thất bại", "Phần trăm hoa hồng phải trong khoảng 0 - 100");
      return;
    }

    if (!Number.isFinite(minWithdrawal) || minWithdrawal < 0) {
      toast.error("Thất bại", "Số tiền rút tối thiểu không hợp lệ");
      return;
    }

    savingSettings.value = true;
    try {
      await $fetch("/api/admin/settings", {
        method: "POST",
        body: {
          affiliateEnabled: settingsForm.affiliateEnabled,
          affiliateCommissionRate: Math.floor(rate),
          affiliateMinWithdrawalAmount: Math.floor(minWithdrawal),
          affiliateAutoCreateLink: settingsForm.affiliateAutoCreateLink,
          affiliateRequireActiveLink: settingsForm.affiliateRequireActiveLink,
        },
      });

      await refreshSettings();
      toast.success("Thành công", "Đã lưu cấu hình affiliate");
    } catch (error: any) {
      toast.error(
        "Thất bại",
        error?.data?.message || "Không thể lưu cấu hình affiliate"
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
          Cấu hình Affiliate
        </div>
        <h1
          class="text-xl font-semibold tracking-tight text-slate-900 dark:text-white"
        >
          Cấu hình chung
        </h1>
      </div>

      <div class="flex items-center gap-2">
        <NuxtLink to="/admin/affiliate">
          <UiButton variant="outline">
            <template #prefix>
              <Icon name="solar:alt-arrow-left-line-duotone" size="18" />
            </template>
            Quay lại Affiliate
          </UiButton>
        </NuxtLink>
      </div>
    </div>

    <div
      class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div class="mb-5 flex items-center gap-3">
        <span
          class="h-7 w-1.5 rounded-full bg-gradient-to-b from-sky-300 via-primary to-violet-400"
        ></span>
        <p class="text-base font-semibold text-slate-800 dark:text-white">
          Thiết lập Affiliate
        </p>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Bật/Tắt Affiliate
          </label>
          <UiDropdown
            v-model="settingsForm.affiliateEnabled"
            :options="yesNoOptions"
          />
        </div>

        <div>
          <label
            class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            % Hoa hồng mặc định
          </label>
          <UiInput
            v-model="settingsForm.affiliateCommissionRate"
            type="number"
            min="0"
            max="100"
            placeholder="VD: 10"
          />
        </div>

        <div>
          <label
            class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Số tiền rút tối thiểu (VND)
          </label>
          <UiInput
            v-model="settingsForm.affiliateMinWithdrawalAmount"
            type="number"
            min="0"
            placeholder="VD: 100000"
          />
        </div>

        <div>
          <label
            class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Tự tạo link affiliate khi đăng ký
          </label>
          <UiDropdown
            v-model="settingsForm.affiliateAutoCreateLink"
            :options="yesNoOptions"
          />
        </div>

        <div>
          <label
            class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Chỉ tính khi link đang active
          </label>
          <UiDropdown
            v-model="settingsForm.affiliateRequireActiveLink"
            :options="yesNoOptions"
          />
        </div>
      </div>

      <div class="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
        <UiButton
          :loading="savingSettings"
          :disabled="!canManageSettings"
          @click="saveSettings"
        >
          <template #prefix>
            <Icon name="solar:diskette-line-duotone" size="18" />
          </template>
          Lưu cấu hình
        </UiButton>
      </div>
    </div>
  </div>
</template>
