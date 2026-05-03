<template>
  <div
    class="min-h-screen bg-[#f1f5f9] dark:bg-[#0f1115] font-sans flex flex-col"
  >
    <header
      class="bg-white dark:bg-[#181a1f] border-b border-slate-200 dark:border-slate-800 h-14 flex items-center px-5 shrink-0"
    >
      <NuxtLink
        to="/wallet/deposit"
        class="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors text-[13px] font-bold"
      >
        <Icon name="solar:alt-arrow-left-line-duotone" size="20" />
        Quay lại
      </NuxtLink>
      <div class="flex-1 flex justify-center">
        <NuxtLink
          to="/"
          class="text-xl font-bold text-slate-800 dark:text-white tracking-tighter"
        >
          Nuxt<span class="text-primary">Js</span>
        </NuxtLink>
      </div>
      <div class="w-[96px] shrink-0"></div>
    </header>

    <div class="flex-1 flex items-start justify-center py-8 px-4">
      <div class="w-full max-w-[1100px]">
        <div
          :class="[
            'rounded-xl px-5 py-3 flex items-center gap-3 mb-6 text-[13px] font-bold',
            statusConfig.bg,
          ]"
        >
          <Icon
            :name="statusConfig.icon"
            size="20"
            :class="statusConfig.text"
          />
          <span :class="statusConfig.text">{{ statusConfig.label }}</span>
          <div
            v-if="status === 'pending'"
            class="ml-auto flex items-center gap-1.5 text-[12px] font-medium opacity-70"
          >
            <span
              class="w-2 h-2 rounded-full bg-amber-500 animate-pulse inline-block"
            ></span>
            Hệ thống đang lắng nghe thanh toán tự động...
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            class="bg-white dark:bg-[#181a1f] rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center"
          >
            <div
              class="w-full flex items-center justify-between mb-5 pb-5 border-b border-slate-100 dark:border-slate-800/80"
            >
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span
                    class="w-2 h-2 rounded-full bg-emerald-500 inline-block"
                  ></span>
                  <p
                    class="font-bold text-[14px] text-slate-800 dark:text-white tracking-tight"
                  >
                    {{ bank?.bankName || "Ngân hàng" }}
                  </p>
                </div>
                <p
                  class="text-[11px] font-bold text-slate-400 uppercase tracking-widest"
                >
                  Chuyển khoản ngân hàng
                </p>
              </div>
              <div class="text-right">
                <p
                  class="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1"
                >
                  Số tiền cần nạp
                </p>
                <p class="font-bold text-2xl text-primary leading-none">
                  {{ formatAmount(amount) }}<span class="text-lg">đ</span>
                </p>
              </div>
            </div>

            <div class="relative mb-5">
              <div class="qr-outer">
                <span class="corner corner-tl"></span>
                <span class="corner corner-tr"></span>
                <span class="corner corner-bl"></span>
                <span class="corner corner-br"></span>

                <div class="qr-inner relative" style="background: #ffffff">
                  <img
                    :src="qrImageUrl"
                    alt="QR Code Chuyển khoản"
                    class="w-full h-full object-contain block"
                    style="background: #ffffff"
                  />

                  <div v-if="status === 'pending'" class="scan-line"></div>

                  <transition name="scale-fade">
                    <div
                      v-if="status === 'success'"
                      class="absolute inset-0 flex flex-col items-center justify-center bg-white/95 z-30"
                    >
                      <div
                        class="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mb-2 shadow-lg shadow-emerald-500/30"
                      >
                        <Icon
                          name="solar:check-circle-bold"
                          size="36"
                          class="text-white"
                        />
                      </div>
                      <p class="font-bold text-emerald-600 text-[15px]">
                        Đã nhận tiền!
                      </p>
                    </div>
                  </transition>
                </div>
              </div>
            </div>

            <p
              class="text-[12px] font-bold text-slate-400 text-center leading-relaxed max-w-[200px]"
            >
              Dùng app ngân hàng quét mã QR hoặc chuyển khoản thủ công bên dưới
            </p>

            <div class="flex gap-2 mt-4 w-full">
              <UiButton
                variant="outline"
                size="sm"
                class="flex-1 !h-9 !rounded-[8px] !text-[12px]"
              >
                <template #prefix>
                  <Icon
                    name="solar:download-minimalistic-line-duotone"
                    size="16"
                  />
                </template>
                Lưu QR
              </UiButton>
              <UiButton
                variant="outline"
                size="sm"
                class="flex-1 !h-9 !rounded-[8px] !text-[12px]"
              >
                <template #prefix>
                  <Icon name="solar:share-circle-line-duotone" size="16" />
                </template>
                Chia sẻ
              </UiButton>
            </div>

            <div
              class="mt-4 w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900/30 dark:bg-rose-900/10"
            >
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p
                    class="text-[11px] font-bold uppercase tracking-widest text-rose-400 dark:text-rose-300"
                  >
                    Thời gian hóa đơn
                  </p>
                  <p
                    class="mt-1 text-[12px] font-medium text-rose-600 dark:text-rose-300"
                  >
                    Hết hạn sau
                  </p>
                </div>

                <div class="flex items-center gap-2">
                  <div
                    class="min-w-[56px] rounded-lg border border-rose-200 bg-white px-3 py-2 text-center dark:border-rose-900/40 dark:bg-[#181a1f]"
                  >
                    <p
                      class="text-[18px] font-bold text-rose-600 dark:text-rose-300"
                    >
                      {{ countdownParts.minutes }}
                    </p>
                    <p
                      class="text-[10px] font-semibold uppercase tracking-wide text-rose-400 dark:text-rose-300"
                    >
                      Phút
                    </p>
                  </div>
                  <div
                    class="min-w-[56px] rounded-lg border border-rose-200 bg-white px-3 py-2 text-center dark:border-rose-900/40 dark:bg-[#181a1f]"
                  >
                    <p
                      class="text-[18px] font-bold"
                      :class="
                        timeLeft <= 60
                          ? 'text-rose-500'
                          : 'text-rose-600 dark:text-rose-300'
                      "
                    >
                      {{ countdownParts.seconds }}
                    </p>
                    <p
                      class="text-[10px] font-semibold uppercase tracking-wide text-rose-400 dark:text-rose-300"
                    >
                      Giây
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-4">
            <div
              class="bg-white dark:bg-[#181a1f] rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm"
            >
              <p
                class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4"
              >
                Thông tin chuyển khoản
              </p>
              <div class="space-y-3">
                <div
                  v-for="row in bankRows"
                  :key="row.label"
                  class="flex items-center justify-between gap-3"
                >
                  <span class="text-[12px] font-bold text-slate-400 shrink-0">
                    {{ row.label }}
                  </span>
                  <div class="flex items-center gap-2 min-w-0">
                    <span
                      :class="[
                        'font-bold text-[13px] truncate',
                        row.highlight
                          ? 'text-primary'
                          : 'text-slate-800 dark:text-white',
                      ]"
                    >
                      {{ row.value }}
                    </span>
                    <button
                      v-if="row.copy"
                      @click="copy(row.value, row.label)"
                      :class="[
                        'transition-colors shrink-0',
                        copied === row.label
                          ? 'text-emerald-500'
                          : 'text-slate-300 hover:text-primary',
                      ]"
                    >
                      <Icon
                        :name="
                          copied === row.label
                            ? 'solar:check-circle-bold'
                            : 'solar:copy-line-duotone'
                        "
                        size="16"
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div
              class="bg-white dark:bg-[#181a1f] rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm"
            >
              <p
                class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4"
              >
                Hướng dẫn thanh toán
              </p>
              <ol class="space-y-3.5">
                <li
                  v-for="(step, i) in steps"
                  :key="i"
                  class="flex items-start gap-3"
                >
                  <span
                    class="w-5 h-5 bg-primary/10 dark:bg-primary/20 text-primary text-[11px] font-bold rounded-full flex items-center justify-center shrink-0 mt-px"
                  >
                    {{ i + 1 }}
                  </span>
                  <p
                    class="text-[13px] font-medium text-slate-600 dark:text-slate-300 leading-relaxed"
                  >
                    {{ step }}
                  </p>
                </li>
              </ol>
            </div>

            <div
              class="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4 flex gap-3"
            >
              <Icon
                name="solar:danger-triangle-bold-duotone"
                size="18"
                class="text-amber-500 shrink-0 mt-px"
              />
              <p
                class="text-[12px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed"
              >
                Nhập <strong>đúng nội dung chuyển khoản</strong> để hệ thống tự
                động cộng tiền. Nếu sai nội dung, giao dịch có thể phải xử lý
                thủ công.
              </p>
            </div>
          </div>
        </div>

        <p class="text-center text-[12px] font-bold text-slate-400 mt-6">
          Mã đơn:
          <span class="text-slate-600 dark:text-slate-300">{{
            paymentCode
          }}</span>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { SOCKET_EVENTS } from "~~/shared/socket";
  const { parseServerDate } = useDateFormatter();

  definePageMeta({ layout: false });

  interface PaymentBank {
    id: number;
    bankName: string;
    bankCode: string | null;
    accountNumber: string;
    accountName: string;
  }

  interface PaymentDetail {
    id: number;
    paymentCode: string;
    status: string;
    amount: number;
    receivedAmount: number;
    referenceCode: string | null;
    transferContent: string | null;
    note: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    expiredAt: string | null;
    paidAt: string | null;
    bank: PaymentBank | null;
  }

  const toast = useToast();
  const route = useRoute();
  const socket = useSocket();

  const paymentCode = computed(() => String(route.query.code || "").trim());
  const bankId = computed(() => Number(route.query.bankId || 0));

  if (!paymentCode.value) {
    throw createError({
      statusCode: 400,
      message: "Thiếu mã hóa đơn nạp tiền",
    });
  }

  const { data: paymentData, refresh: refreshPayment } =
    await useFetch<PaymentDetail>(`/api/payments/${paymentCode.value}`, {
      query: {
        bankId: bankId.value || undefined,
      },
      key: `payment-detail-${paymentCode.value}-${bankId.value || 0}`,
    });

  const payment = computed(() => paymentData.value || null);
  const bank = computed(() => payment.value?.bank || null);
  const amount = computed(() => Number(payment.value?.amount || 0));

  const formatAmount = (value: number) => value.toLocaleString("vi-VN");

  const timeLeft = ref(0);
  let countdownTimer: ReturnType<typeof setInterval> | null = null;
  let pollingTimer: ReturnType<typeof setInterval> | null = null;
  let successRedirectTimer: ReturnType<typeof setTimeout> | null = null;

  const syncTimeLeft = () => {
    const expiredAt = payment.value?.expiredAt;

    if (!expiredAt) {
      timeLeft.value = 0;
      return;
    }

    const expiredDate = parseServerDate(expiredAt);
    if (!expiredDate) {
      timeLeft.value = 0;
      return;
    }

    const diff = expiredDate.getTime() - Date.now();
    timeLeft.value = Math.max(0, Math.floor(diff / 1000));
  };

  watch(
    () => payment.value?.expiredAt,
    () => {
      syncTimeLeft();
    },
    { immediate: true }
  );

  const status = computed<"pending" | "success" | "expired">(() => {
    const currentStatus = String(
      payment.value?.status || "pending"
    ).toLowerCase();

    if (currentStatus === "paid") return "success";
    if (
      currentStatus === "expired" ||
      (currentStatus === "pending" &&
        !!payment.value?.expiredAt &&
        timeLeft.value <= 0)
    ) {
      return "expired";
    }

    return "pending";
  });

  watch(
    status,
    (value) => {
      if (successRedirectTimer) {
        clearTimeout(successRedirectTimer);
        successRedirectTimer = null;
      }

      if (value === "success") {
        successRedirectTimer = setTimeout(async () => {
          await navigateTo("/wallet/deposit");
        }, 3000);
      }
    },
    { immediate: true }
  );

  onMounted(() => {
    countdownTimer = setInterval(() => {
      syncTimeLeft();
    }, 1000);

    pollingTimer = setInterval(async () => {
      if (status.value !== "pending") return;
      await refreshPayment();
    }, 15000);

    socket.on(SOCKET_EVENTS.paymentUpdated, handleSocketPaymentUpdated);
  });

  onUnmounted(() => {
    if (countdownTimer) clearInterval(countdownTimer);
    if (pollingTimer) clearInterval(pollingTimer);
    if (successRedirectTimer) clearTimeout(successRedirectTimer);
    socket.off(SOCKET_EVENTS.paymentUpdated, handleSocketPaymentUpdated);
  });

  const formatTime = (seconds: number) =>
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  const countdownParts = computed(() => ({
    minutes: String(Math.floor(timeLeft.value / 60)).padStart(2, "0"),
    seconds: String(timeLeft.value % 60).padStart(2, "0"),
  }));

  const statusConfig = computed(() => {
    if (status.value === "success")
      return {
        bg: "bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-200 dark:border-emerald-900/40",
        icon: "solar:check-circle-bold-duotone",
        text: "text-emerald-600",
        label: "Thanh toán thành công! Số dư đã được cộng vào tài khoản.",
      };
    if (status.value === "expired")
      return {
        bg: "bg-rose-50 dark:bg-rose-900/15 border border-rose-200 dark:border-rose-900/40",
        icon: "solar:close-circle-bold-duotone",
        text: "text-rose-500",
        label: "Giao dịch đã hết hạn. Vui lòng tạo lại lệnh nạp tiền.",
      };
    return {
      bg: "bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-900/40",
      icon: "solar:clock-circle-bold-duotone",
      text: "text-amber-600",
      label: "Đang chờ thanh toán - Quét mã QR hoặc chuyển khoản thủ công",
    };
  });

  const qrImageUrl = computed(() => {
    if (!bank.value?.bankCode || !bank.value.accountNumber) {
      return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        `${bank.value?.bankName || "BANK"}|${bank.value?.accountNumber || ""}|${amount.value}|${payment.value?.transferContent || ""}`
      )}`;
    }

    const base = `https://api.vietqr.io/image/${bank.value.bankCode}-${bank.value.accountNumber}-evoVqKY.jpg`;
    const params = new URLSearchParams({
      amount: String(amount.value),
      addInfo: String(payment.value?.transferContent || ""),
      accountName: String(bank.value.accountName || ""),
    });

    return `${base}?${params.toString()}`;
  });

  const bankRows = computed(() => [
    {
      label: "Ngân hàng",
      value: bank.value?.bankName || "---",
      copy: false,
      highlight: false,
    },
    {
      label: "Số TK",
      value: bank.value?.accountNumber || "---",
      copy: !!bank.value?.accountNumber,
      highlight: false,
    },
    {
      label: "Chủ TK",
      value: bank.value?.accountName || "---",
      copy: !!bank.value?.accountName,
      highlight: false,
    },
    {
      label: "Nội dung CK",
      value: payment.value?.transferContent || "---",
      copy: !!payment.value?.transferContent,
      highlight: true,
    },
    {
      label: "Số tiền",
      value: `${formatAmount(amount.value)}đ`,
      copy: amount.value > 0,
      highlight: true,
    },
  ]);

  const steps = computed(() => [
    "Mở <strong>app ngân hàng</strong> hoặc ví điện tử trên điện thoại.",
    "Chọn <strong>Quét mã QR</strong> và quét mã bên trái.",
    `Kiểm tra số tiền <strong>${formatAmount(amount.value)}đ</strong> và nội dung <strong>${payment.value?.transferContent || "---"}</strong>.`,
    "Xác nhận chuyển khoản. Hệ thống sẽ tự động kiểm tra khi giao dịch vào tài khoản.",
  ]);

  const copied = ref("");
  const hasShownRealtimeSuccess = ref(false);

  const handleSocketPaymentUpdated = async (payload: any) => {
    const incomingPaymentCode = String(payload?.paymentCode || "").trim();

    if (!incomingPaymentCode || incomingPaymentCode !== paymentCode.value) {
      return;
    }

    await refreshPayment();

    if (
      !hasShownRealtimeSuccess.value &&
      String(payload?.status || "") === "paid"
    ) {
      hasShownRealtimeSuccess.value = true;
      toast.success("Nạp tiền thành công");
    }
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(
        label === "Số tiền"
          ? text.replace(/[^\d]/g, "")
          : text.replace(/\s/g, "")
      );
      copied.value = label;
      toast.success(`Đã sao chép ${label}`);
      setTimeout(() => {
        copied.value = "";
      }, 2000);
    } catch {
      toast.error("Không thể sao chép");
    }
  };
</script>

<style scoped>
  .scale-fade-enter-active {
    transition: all 0.3s ease;
  }
  .scale-fade-enter-from {
    opacity: 0;
    transform: scale(0.8);
  }

  .qr-outer {
    position: relative;
    padding: 14px;
    border-radius: 16px;
  }

  .corner {
    position: absolute;
    width: 20px;
    height: 20px;
    z-index: 10;
  }
  .corner-tl {
    top: 0;
    left: 0;
    border-top: 3px solid #065f46;
    border-left: 3px solid #065f46;
    border-radius: 6px 0 0 0;
  }
  .corner-tr {
    top: 0;
    right: 0;
    border-top: 3px solid #065f46;
    border-right: 3px solid #065f46;
    border-radius: 0 6px 0 0;
  }
  .corner-bl {
    bottom: 0;
    left: 0;
    border-bottom: 3px solid #065f46;
    border-left: 3px solid #065f46;
    border-radius: 0 0 0 6px;
  }
  .corner-br {
    bottom: 0;
    right: 0;
    border-bottom: 3px solid #065f46;
    border-right: 3px solid #065f46;
    border-radius: 0 0 6px 0;
  }

  .qr-inner {
    width: 220px;
    height: 220px;
    background: #ffffff !important;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
    position: relative;
  }

  .scan-line {
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      #065f46 25%,
      #34d399 50%,
      #065f46 75%,
      transparent 100%
    );
    box-shadow: 0 0 10px 2px rgba(52, 211, 153, 0.5);
    animation: scan 2.2s ease-in-out infinite;
    z-index: 20;
    top: 0;
  }
  @keyframes scan {
    0% {
      top: 0;
      opacity: 1;
    }
    49% {
      opacity: 1;
    }
    50% {
      top: calc(100% - 2px);
      opacity: 0.7;
    }
    51% {
      opacity: 1;
    }
    100% {
      top: 0;
      opacity: 1;
    }
  }
</style>
