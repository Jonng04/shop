<script setup lang="ts">
  const { user } = useUserSession();
  const toast = useToast();
  const { balance, fetchBalance } = useUserBalance();

  interface BankItem {
    id: number;
    bankName: string;
    bankCode: string | null;
    accountNumber: string;
    accountName: string;
    status: "active" | "inactive";
  }

  interface DepositConfig {
    depositMinAmount: number;
    depositMaxAmount: number;
    depositBonusRules: string;
  }

  interface BonusRule {
    amount: number;
    percent: number;
  }

  interface TopupHistoryItem {
    id: number;
    paymentCode: string;
    status:
      | "pending"
      | "paid"
      | "failed"
      | "cancelled"
      | "expired"
      | "refunded";
    amount: number;
    receivedAmount: number;
    transferContent: string | null;
    referenceCode: string | null;
    createdAt: string | null;
    paidAt: string | null;
    expiredAt: string | null;
  }

  const username = computed(() => {
    const sessionUser = user.value as { username?: string } | null;
    return sessionUser?.username || "user";
  });

  const presetAmounts = [100000, 200000, 500000, 1000000, 2000000, 5000000];
  const selectedPreset = ref<number>(100000);
  const customAmount = ref("");
  const selectedBankId = ref("");

  const pageSize = ref(10);
  const currentPage = ref(1);
  const searchPaymentCode = ref("");
  const searchTransferContent = ref("");
  const selectedStatus = ref("all");
  const selectedDateRange = ref("all");

  const statusOptions = [
    { label: "Tất cả trạng thái", value: "all" },
    { label: "Đã thanh toán", value: "paid" },
    { label: "Chờ thanh toán", value: "pending" },
    { label: "Thất bại", value: "failed" },
    { label: "Đã hủy", value: "cancelled" },
    { label: "Hết hạn", value: "expired" },
    { label: "Hoàn tiền", value: "refunded" },
  ];

  const dateRangeOptions = [
    { label: "Tất cả thời gian", value: "all" },
    { label: "Hôm nay", value: "today" },
    { label: "7 ngày qua", value: "7d" },
    { label: "Tháng này", value: "month" },
  ];

  const { data: banksData, pending: banksPending } = await useFetch<BankItem[]>(
    "/api/banks",
    {
      key: "wallet-deposit-banks",
      default: () => [],
    }
  );

  const { data: depositConfigData } = await useFetch<DepositConfig>(
    "/api/deposits/config",
    {
      key: "wallet-deposit-config",
      default: () => ({
        depositMinAmount: 10000,
        depositMaxAmount: 5000000,
        depositBonusRules: "100000|5\n1000000|10\n10000000|15",
      }),
    }
  );

  const {
    data: topupHistoryData,
    pending: topupHistoryPending,
    refresh: refreshTopupHistory,
  } = await useFetch<TopupHistoryItem[]>("/api/payments/topup-history", {
    key: "wallet-topup-history",
    query: {
      limit: 100,
    },
    default: () => [],
  });

  const banks = computed(() => banksData.value || []);
  const topupHistory = computed(() => topupHistoryData.value || []);

  const depositMinAmount = computed(() =>
    Number(depositConfigData.value?.depositMinAmount || 10000)
  );

  const depositMaxAmount = computed(() =>
    Number(depositConfigData.value?.depositMaxAmount || 5000000)
  );

  const bonusRules = computed<BonusRule[]>(() => {
    const raw = String(depositConfigData.value?.depositBonusRules || "").trim();

    if (!raw) return [];

    return raw
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [amountPart, percentPart] = line.split("|");

        return {
          amount: Number(amountPart || 0),
          percent: Number(percentPart || 0),
        };
      })
      .filter((rule) => rule.amount > 0 && rule.percent > 0)
      .sort((a, b) => a.amount - b.amount);
  });

  const selectedBank = computed(
    () =>
      banks.value.find((bank) => String(bank.id) === selectedBankId.value) ||
      null
  );

  const effectiveAmount = computed(() => {
    const custom = Number(customAmount.value || 0);

    if (custom > 0) return Math.floor(custom);
    return Math.floor(selectedPreset.value || 0);
  });

  const activeBonusRule = computed(() => {
    const amount = effectiveAmount.value;

    return (
      [...bonusRules.value].reverse().find((rule) => amount >= rule.amount) ||
      null
    );
  });

  const bonusAmount = computed(() => {
    if (!activeBonusRule.value) return 0;

    return Math.floor(
      (effectiveAmount.value * activeBonusRule.value.percent) / 100
    );
  });

  const estimatedReceivedAmount = computed(
    () => effectiveAmount.value + bonusAmount.value
  );

  const canSubmit = computed(
    () =>
      effectiveAmount.value >= depositMinAmount.value &&
      effectiveAmount.value <= depositMaxAmount.value &&
      !!selectedBank.value
  );

  const bankOptions = computed(() =>
    banks.value.map((bank) => ({
      label: `${bank.bankName} - ${bank.accountNumber}`,
      value: String(bank.id),
    }))
  );

  const currentPromotionText = computed(() => {
    if (!activeBonusRule.value) return "Chưa có khuyến mãi cho mức nạp này";

    return `Tặng ${activeBonusRule.value.percent}% tương đương ${formatCurrency(
      bonusAmount.value
    )}`;
  });

  watch(
    banks,
    (items) => {
      if (!items.length) {
        selectedBankId.value = "";
        return;
      }

      if (!selectedBankId.value) {
        selectedBankId.value = String(items[0]!.id);
      }
    },
    { immediate: true }
  );

  watch(
    [
      searchPaymentCode,
      searchTransferContent,
      selectedStatus,
      selectedDateRange,
    ],
    () => {
      currentPage.value = 1;
    }
  );

  watch(pageSize, () => {
    currentPage.value = 1;
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value || 0);

  const formatPreset = (value: number) => {
    if (value >= 1000000) return `${value / 1000000}M`;
    return `${value / 1000}K`;
  };

  const formatDateTime = (value: string | null) => {
    if (!value) return "---";

    return new Date(value).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getStatusMeta = (status: TopupHistoryItem["status"]) => {
    switch (status) {
      case "paid":
        return {
          label: "Đã thanh toán",
          variant: "success",
          className:
            "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300",
        };
      case "pending":
        return {
          label: "Chờ thanh toán",
          variant: "warning",
          className:
            "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300",
        };
      case "failed":
        return {
          label: "Thất bại",
          variant: "error",
          className:
            "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300",
        };
      case "cancelled":
        return {
          label: "Đã hủy",
          variant: "slate",
          className:
            "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
        };
      case "expired":
        return {
          label: "Hết hạn",
          variant: "slate",
          className:
            "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
        };
      case "refunded":
        return {
          label: "Hoàn tiền",
          variant: "info",
          className:
            "bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-300",
        };
      default:
        return {
          label: status,
          variant: "slate",
          className:
            "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
        };
    }
  };

  const receivedAmountClass = (item: TopupHistoryItem) => {
    if (item.receivedAmount === 0) return "text-slate-400 dark:text-slate-500";
    if (item.receivedAmount < item.amount)
      return "text-amber-600 dark:text-amber-400";
    if (item.receivedAmount > item.amount)
      return "text-sky-600 dark:text-sky-400";
    return "text-emerald-600 dark:text-emerald-400";
  };

  const filteredTopupHistory = computed(() => {
    const paymentCodeKeyword = searchPaymentCode.value.trim().toLowerCase();
    const transferContentKeyword = searchTransferContent.value
      .trim()
      .toLowerCase();
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    return topupHistory.value.filter((item) => {
      if (
        paymentCodeKeyword &&
        !String(item.paymentCode || "")
          .toLowerCase()
          .includes(paymentCodeKeyword)
      ) {
        return false;
      }

      if (
        transferContentKeyword &&
        !String(item.transferContent || "")
          .toLowerCase()
          .includes(transferContentKeyword)
      ) {
        return false;
      }

      if (
        selectedStatus.value !== "all" &&
        item.status !== selectedStatus.value
      ) {
        return false;
      }

      const createdAt = item.createdAt ? new Date(item.createdAt) : null;

      if (selectedDateRange.value === "today") {
        if (!createdAt || createdAt < startOfToday) return false;
      }

      if (selectedDateRange.value === "7d") {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        if (!createdAt || createdAt < sevenDaysAgo || createdAt > now)
          return false;
      }

      if (selectedDateRange.value === "month") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        if (!createdAt || createdAt < startOfMonth || createdAt > now)
          return false;
      }

      return true;
    });
  });

  const paginatedTopupHistory = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredTopupHistory.value.slice(start, start + pageSize.value);
  });

  const selectPreset = (amount: number) => {
    selectedPreset.value = amount;
    customAmount.value = "";
  };

  const onCustomInput = () => {
    selectedPreset.value = 0;
  };

  const creatingInvoice = ref(false);

  const copyText = async (value: string, label = "Thông tin") => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Thành công", `Đã sao chép ${label.toLowerCase()}`);
    } catch {
      toast.error("Thất bại", "Không thể sao chép");
    }
  };

  const openInvoice = async (item: TopupHistoryItem) => {
    await navigateTo(`/payments?code=${encodeURIComponent(item.paymentCode)}`);
  };

  const handleContinue = async () => {
    if (creatingInvoice.value || !canSubmit.value || !selectedBank.value)
      return;

    creatingInvoice.value = true;

    try {
      const result = await $fetch<{ redirectUrl: string }>(
        "/api/payments/topup",
        {
          method: "POST",
          body: {
            amount: effectiveAmount.value,
            bankId: selectedBank.value.id,
          },
        }
      );

      await refreshTopupHistory();
      await navigateTo(result.redirectUrl);
    } catch (error: any) {
      toast.error(
        "Tạo hóa đơn thất bại",
        error?.data?.message || "Không thể tạo hóa đơn nạp tiền"
      );
    } finally {
      creatingInvoice.value = false;
    }
  };

  await fetchBalance();
</script>

<template>
  <div
    class="min-h-screen bg-[#fafafa] text-slate-800 dark:bg-[#0f1115] dark:text-slate-200"
  >
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
            name="solar:wallet-money-bold-duotone"
            size="15"
            class="text-slate-400"
          />
          Nạp tiền
        </span>
      </div>

      <section
        class="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_360px]"
      >
        <div
          class="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#181a1f]"
        >
          <div
            class="border-b border-slate-200 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-[#20232a]"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"
              >
                <Icon name="solar:wallet-money-line-duotone" size="18" />
              </div>
              <div>
                <h1
                  class="text-[18px] font-bold tracking-tight text-slate-900 dark:text-white"
                >
                  Nạp tiền qua ngân hàng
                </h1>
                <p
                  class="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400"
                >
                  Chọn số tiền cần nạp và ngân hàng nhận tiền để tiếp tục.
                </p>
              </div>
            </div>
          </div>

          <div class="space-y-4 px-5 py-4 lg:px-5 lg:py-5">
            <div
              class="rounded-[18px] border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-[#20232a]"
            >
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p
                    class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400"
                  >
                    Số dư hiện tại
                  </p>
                  <p
                    class="mt-1 text-[22px] font-bold text-slate-900 dark:text-white"
                  >
                    {{ formatCurrency(balance) }}
                  </p>
                  <p class="mt-1.5 text-[12px] text-slate-400">
                    Tài khoản:
                    <span
                      class="font-semibold text-slate-600 dark:text-slate-300"
                    >
                      {{ username }}
                    </span>
                  </p>
                </div>
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"
                >
                  <Icon name="solar:wallet-money-bold-duotone" size="20" />
                </div>
              </div>
            </div>

            <div>
              <label
                class="mb-2.5 flex items-center gap-2 text-[14px] font-bold text-slate-800 dark:text-white"
              >
                <Icon
                  name="solar:bill-list-line-duotone"
                  size="18"
                  class="text-primary"
                />
                Số tiền nạp
                <span class="text-rose-500">*</span>
              </label>

              <UiInput
                v-model="customAmount"
                type="number"
                placeholder="Nhập số tiền cần nạp"
                class="!h-11"
                @input="onCustomInput"
              >
                <template #left-icon>
                  <Icon name="solar:bill-list-line-duotone" size="18" />
                </template>
              </UiInput>

              <div
                class="mt-3 rounded-[16px] border border-slate-200 bg-slate-50 px-3.5 py-3 dark:border-slate-800 dark:bg-[#20232a]"
              >
                <div class="flex items-start gap-3">
                  <div
                    class="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary"
                  >
                    <Icon name="solar:info-circle-line-duotone" size="12" />
                  </div>
                  <div
                    class="space-y-1 text-[12px] text-slate-600 dark:text-slate-300"
                  >
                    <p>
                      Số tiền tối thiểu:
                      <span class="font-bold text-rose-500">
                        {{ formatCurrency(depositMinAmount) }}
                      </span>
                    </p>
                    <p>
                      Số tiền tối đa:
                      <span
                        class="font-semibold text-slate-700 dark:text-slate-200"
                      >
                        {{ formatCurrency(depositMaxAmount) }}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div class="mt-3 flex flex-wrap gap-1.5">
                <button
                  v-for="amount in presetAmounts"
                  :key="amount"
                  type="button"
                  class="rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors"
                  :class="
                    selectedPreset === amount && !customAmount
                      ? 'border-primary bg-primary text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-primary/30 hover:text-primary dark:border-slate-700 dark:bg-[#181a1f] dark:text-slate-300'
                  "
                  @click="selectPreset(amount)"
                >
                  {{ formatPreset(amount) }}
                </button>
              </div>
            </div>

            <div>
              <label
                class="mb-2.5 flex items-center gap-2 text-[14px] font-bold text-slate-800 dark:text-white"
              >
                <Icon
                  name="solar:card-2-line-duotone"
                  size="18"
                  class="text-primary"
                />
                Chọn ngân hàng
                <span class="text-rose-500">*</span>
              </label>

              <div
                v-if="banksPending"
                class="h-12 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800"
              />

              <UiDropdown
                v-else
                v-model="selectedBankId"
                :options="bankOptions"
                height-class="h-11"
                placeholder="Chọn ngân hàng nhận tiền"
              />
            </div>

            <div
              class="rounded-[18px] border border-emerald-200 bg-emerald-50/60 px-4 py-4 dark:border-emerald-900/30 dark:bg-emerald-900/10"
            >
              <div class="text-center">
                <div
                  class="flex items-center justify-center gap-2 text-[13px] font-bold text-emerald-700 dark:text-emerald-300"
                >
                  <Icon name="solar:money-bag-smile-line-duotone" size="16" />
                  Số tiền thực nhận ước tính
                </div>
                <p
                  class="mt-2.5 text-[26px] font-bold leading-none text-emerald-700 dark:text-emerald-300"
                >
                  {{ formatCurrency(estimatedReceivedAmount) }}
                </p>
                <p class="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
                  {{ currentPromotionText }}
                </p>
              </div>
            </div>

            <div
              v-if="selectedBank"
              class="rounded-[18px] border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-[#20232a]"
            >
              <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <p
                    class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400"
                  >
                    Ngân hàng
                  </p>
                  <p
                    class="mt-1 text-sm font-bold text-slate-800 dark:text-white"
                  >
                    {{ selectedBank.bankName }}
                  </p>
                </div>
                <div>
                  <p
                    class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400"
                  >
                    Số tài khoản
                  </p>
                  <button
                    type="button"
                    class="mt-1 text-left text-sm font-bold text-primary"
                    @click="
                      copyText(selectedBank.accountNumber, 'Số tài khoản')
                    "
                  >
                    {{ selectedBank.accountNumber }}
                  </button>
                </div>
                <div>
                  <p
                    class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400"
                  >
                    Chủ tài khoản
                  </p>
                  <button
                    type="button"
                    class="mt-1 text-left text-sm font-bold text-slate-800 dark:text-white"
                    @click="copyText(selectedBank.accountName, 'Chủ tài khoản')"
                  >
                    {{ selectedBank.accountName }}
                  </button>
                </div>
              </div>
            </div>

            <UiButton
              class="w-full !h-10 !rounded-xl text-sm font-bold"
              :loading="creatingInvoice"
              :disabled="!canSubmit || creatingInvoice"
              @click="handleContinue"
            >
              <template #prefix>
                <Icon name="solar:shield-check-bold" size="18" />
              </template>
              Tạo hóa đơn nạp tiền
            </UiButton>
          </div>
        </div>

        <div class="space-y-6">
          <div
            class="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#181a1f]"
          >
            <div
              class="border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-[#20232a]"
            >
              <div class="flex items-center gap-3">
                <Icon
                  name="solar:ticket-sale-line-duotone"
                  size="20"
                  class="text-primary"
                />
                <p class="text-[16px] font-bold text-slate-900 dark:text-white">
                  Khuyến mãi
                </p>
              </div>
            </div>

            <div class="p-4">
              <div
                class="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800"
              >
                <table class="min-w-full text-sm">
                  <thead class="bg-slate-50 dark:bg-[#20232a]">
                    <tr class="border-b border-slate-200 dark:border-slate-800">
                      <th
                        class="px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-200"
                      >
                        Số tiền nạp
                      </th>
                      <th
                        class="px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-200"
                      >
                        Khuyến mãi
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white dark:bg-[#181a1f]">
                    <tr
                      v-for="rule in bonusRules"
                      :key="`${rule.amount}-${rule.percent}`"
                      class="border-b border-slate-200 last:border-b-0 dark:border-slate-800"
                    >
                      <td
                        class="px-4 py-4 font-bold text-[#1d39ff] dark:text-sky-300"
                      >
                        >= {{ formatCurrency(rule.amount) }}
                      </td>
                      <td
                        class="px-4 py-4 font-bold text-emerald-600 dark:text-emerald-400"
                      >
                        +{{ rule.percent }}%
                      </td>
                    </tr>
                    <tr v-if="!bonusRules.length">
                      <td
                        colspan="2"
                        class="px-4 py-5 text-center text-[13px] text-slate-400"
                      >
                        Chưa có cấu hình khuyến mãi nạp tiền.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div
            class="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#181a1f]"
          >
            <div
              class="border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-[#20232a]"
            >
              <div class="flex items-center gap-3">
                <Icon
                  name="solar:document-text-line-duotone"
                  size="20"
                  class="text-primary"
                />
                <p class="text-[16px] font-bold text-slate-900 dark:text-white">
                  Lưu ý
                </p>
              </div>
            </div>

            <div
              class="space-y-3 px-5 py-5 text-[14px] leading-7 text-slate-700 dark:text-slate-300"
            >
              <p>
                Vui lòng chuyển khoản đúng số tiền và đúng nội dung để hệ thống
                tự động đối soát nhanh hơn.
              </p>
              <p>
                Sau khi chuyển khoản thành công, giao dịch thường được xử lý
                trong khoảng 1 đến 5 phút.
              </p>
              <p>
                Nếu quá thời gian mà ví chưa được cộng tiền, bạn hãy liên hệ hỗ
                trợ để được kiểm tra giao dịch.
              </p>
            </div>
          </div>
        </div>
      </section>

      <UiTable
        class="mt-6"
        :headers="[
          { key: 'paymentCode', label: 'Mã hóa đơn', width: '170px' },
          { key: 'status', label: 'Trạng thái', width: '150px' },
          { key: 'amount', label: 'Số tiền nạp', width: '150px' },
          { key: 'receivedAmount', label: 'Thực nhận', width: '150px' },
          { key: 'transferContent', label: 'Nội dung CK', width: '180px' },
          { key: 'createdAt', label: 'Thời gian tạo', width: '180px' },
          { key: 'actions', label: 'Thao tác', width: '140px' },
        ]"
        :items="paginatedTopupHistory"
        :loading="topupHistoryPending"
        striped
      >
        <template #top>
          <div class="space-y-5">
            <div class="flex items-center gap-3">
              <span
                class="h-7 w-1.5 rounded-full bg-gradient-to-b from-sky-300 via-primary to-emerald-400"
              ></span>
              <p class="text-base font-semibold text-slate-800 dark:text-white">
                Lịch sử hóa đơn nạp tiền
              </p>
            </div>

            <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <UiInput
                v-model="searchPaymentCode"
                placeholder="Mã hóa đơn"
                class="rounded-[14px] border-slate-200 bg-white"
              />
              <UiInput
                v-model="searchTransferContent"
                placeholder="Nội dung chuyển khoản"
                class="rounded-[14px] border-slate-200 bg-white"
              />
              <UiDropdown v-model="selectedStatus" :options="statusOptions" />
              <UiDropdown
                v-model="selectedDateRange"
                :options="dateRangeOptions"
              />
              <UiButton variant="outline" @click="refreshTopupHistory()">
                <template #prefix>
                  <Icon name="solar:refresh-line-duotone" size="18" />
                </template>
                Làm mới
              </UiButton>
            </div>
          </div>
        </template>

        <template #cell(paymentCode)="{ item }">
          <div class="min-w-0">
            <p class="font-mono text-[13px] font-semibold text-primary">
              {{ item.paymentCode }}
            </p>
            <p class="mt-1 text-[11px] font-medium text-slate-400">
              {{ item.referenceCode || "Chưa có mã đối soát" }}
            </p>
          </div>
        </template>

        <template #cell(status)="{ item }">
          <UiBadge
            :variant="getStatusMeta(item.status).variant as any"
            :label="getStatusMeta(item.status).label"
            rounded
          />
        </template>

        <template #cell(amount)="{ item }">
          <span
            class="font-mono text-[13px] font-semibold text-slate-800 dark:text-white"
          >
            {{ formatCurrency(item.amount) }}
          </span>
        </template>

        <template #cell(receivedAmount)="{ item }">
          <span
            class="font-mono text-[13px] font-semibold"
            :class="receivedAmountClass(item)"
          >
            {{ formatCurrency(item.receivedAmount) }}
          </span>
        </template>

        <template #cell(transferContent)="{ item }">
          <div class="min-w-0">
            <button
              v-if="item.transferContent"
              type="button"
              class="font-mono text-[13px] font-semibold text-primary"
              @click="copyText(item.transferContent, 'Nội dung chuyển khoản')"
            >
              {{ item.transferContent }}
            </button>
            <span v-else class="text-[13px] text-slate-400">---</span>
          </div>
        </template>

        <template #cell(createdAt)="{ item }">
          <span class="text-xs font-medium text-slate-500">
            {{ formatDateTime(item.createdAt) }}
          </span>
        </template>

        <template #cell(actions)="{ item }">
          <UiButton
            v-if="item.status === 'pending'"
            variant="outline"
            size="sm"
            class="!h-8 !rounded-lg !px-3"
            @click="openInvoice(item)"
          >
            Xem hóa đơn
          </UiButton>
          <span v-else class="text-xs font-medium text-slate-400">---</span>
        </template>

        <template #empty>
          <div class="py-6 text-center">
            <div
              class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"
            >
              <Icon name="solar:wallet-money-line-duotone" size="24" />
            </div>
            <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Chưa có lịch sử nạp tiền
            </p>
          </div>
        </template>

        <template #footer>
          <UiPagination
            :total="filteredTopupHistory.length"
            v-model:pageSize="pageSize"
            v-model:currentPage="currentPage"
          />
        </template>
      </UiTable>
    </main>

    <LayoutFooter />
  </div>
</template>

<style scoped>
  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    appearance: none;
    margin: 0;
  }

  input[type="number"] {
    -moz-appearance: textfield;
    appearance: textfield;
  }
</style>
