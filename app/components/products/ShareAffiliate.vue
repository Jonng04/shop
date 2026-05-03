<template>
  <UiModal v-model="open" size="md" :show-close="false">
    <!-- Custom header slot workaround: content lives inside modal body -->
    <div class="-m-6">
      <div
        class="flex items-center justify-between border-b border-slate-100 px-5 pb-4 pt-5 dark:border-slate-800"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10"
          >
            <Icon
              name="solar:hand-money-bold-duotone"
              size="20"
              class="text-primary"
            />
          </div>
          <div>
            <p
              class="mb-0.5 text-[10px] font-bold uppercase leading-none tracking-[0.12em] text-slate-400"
            >
              Affiliate
            </p>
            <h2
              class="text-[15px] font-bold leading-tight text-slate-800 dark:text-white"
            >
              Chia sẻ & Kiếm tiền
            </h2>
          </div>
        </div>
        <button
          @click="close"
          class="group flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20"
        >
          <Icon
            name="solar:close-circle-bold"
            size="20"
            class="transition-transform duration-300 group-hover:rotate-90"
          />
        </button>
      </div>

      <div
        class="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 dark:divide-slate-800 dark:border-slate-800"
      >
        <div class="flex flex-col items-center gap-0.5 py-3.5">
          <p class="text-base font-bold text-slate-800 dark:text-white">
            {{ commissionRate }}%
          </p>
          <p class="text-[10px] font-medium text-slate-400">Hoa hồng</p>
        </div>
        <div class="flex flex-col items-center gap-0.5 py-3.5">
          <p class="text-base font-bold text-slate-800 dark:text-white">
            30 ngày
          </p>
          <p class="text-[10px] font-medium text-slate-400">Cookie</p>
        </div>
        <div class="flex flex-col items-center gap-0.5 py-3.5">
          <p class="text-base font-bold text-slate-800 dark:text-white">
            Tức thì
          </p>
          <p class="text-[10px] font-medium text-slate-400">Thanh toán</p>
        </div>
      </div>

      <div class="space-y-4 p-5">
        <div class="space-y-1.5">
          <p
            class="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"
          >
            Link chia sẻ của bạn
          </p>
          <div
            class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60"
          >
            <Icon
              name="solar:link-bold-duotone"
              size="15"
              class="shrink-0 text-slate-400"
            />
            <p
              class="min-w-0 flex-1 truncate font-mono text-[12px] text-slate-600 dark:text-slate-300"
            >
              {{ shareUrl }}
            </p>
            <button
              @click="copyLink"
              class="shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all active:scale-95"
              :class="
                copied
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
              "
            >
              <Icon
                :name="copied ? 'solar:check-circle-bold' : 'solar:copy-bold'"
                size="13"
              />
              {{ copied ? "Đã chép!" : "Sao chép" }}
            </button>
          </div>
        </div>

        <div
          class="overflow-hidden rounded-xl border border-slate-100 bg-slate-50 divide-y divide-slate-100 dark:border-slate-800 dark:bg-[#20232a] dark:divide-slate-800"
        >
          <div
            v-for="(step, i) in steps"
            :key="i"
            class="flex items-start gap-3 px-4 py-3"
          >
            <div
              class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
              :class="step.color"
            >
              {{ i + 1 }}
            </div>
            <p
              class="text-[12px] leading-relaxed text-slate-500 dark:text-slate-400"
            >
              {{ step.text }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <button
            @click="shareVia('facebook')"
            class="group flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-white py-3 transition-all active:scale-95 hover:border-[#1877f2]/30 hover:bg-[#1877f2]/5 dark:border-slate-800 dark:bg-[#20232a]"
          >
            <Icon name="logos:facebook" size="18" />
            <span
              class="text-[10px] font-semibold text-slate-500 group-hover:text-[#1877f2] dark:text-slate-400"
            >
              Facebook
            </span>
          </button>
          <button
            @click="shareVia('zalo')"
            class="group flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-white py-3 transition-all active:scale-95 hover:border-blue-300/30 hover:bg-blue-50/50 dark:border-slate-800 dark:bg-[#20232a] dark:hover:bg-blue-900/10"
          >
            <div
              class="flex h-[18px] w-[18px] items-center justify-center rounded bg-blue-500 text-[9px] font-bold leading-none text-white"
            >
              Z
            </div>
            <span
              class="text-[10px] font-semibold text-slate-500 group-hover:text-blue-500 dark:text-slate-400"
            >
              Zalo
            </span>
          </button>
          <button
            @click="copyLink"
            class="group flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-white py-3 transition-all active:scale-95 hover:border-primary/30 hover:bg-primary/5 dark:border-slate-800 dark:bg-[#20232a]"
          >
            <Icon
              name="solar:copy-bold-duotone"
              size="18"
              class="text-slate-400 transition-colors group-hover:text-primary"
            />
            <span
              class="text-[10px] font-semibold text-slate-500 group-hover:text-primary dark:text-slate-400"
            >
              Copy link
            </span>
          </button>
        </div>
      </div>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
  const props = defineProps<{
    open: boolean;
    productSlug?: string | null;
    planSlug?: string | null;
    commissionRate?: number;
  }>();

  const emit = defineEmits<{
    "update:open": [value: boolean];
  }>();

  const toast = useToast();
  const { loggedIn } = useUserSession();

  const open = computed({
    get: () => props.open,
    set: (val) => emit("update:open", val),
  });

  function close() {
    emit("update:open", false);
  }

  const copied = ref(false);
  const affiliateRefCode = ref<string | null>(null);
  const loadingAffiliateLink = ref(false);
  let copyTimer: ReturnType<typeof setTimeout> | null = null;

  const ensureAffiliateRefCode = async () => {
    if (!import.meta.client || !loggedIn.value) {
      affiliateRefCode.value = null;
      return null;
    }

    if (affiliateRefCode.value || loadingAffiliateLink.value) {
      return affiliateRefCode.value;
    }

    loadingAffiliateLink.value = true;

    try {
      const response = await $fetch<{
        data?: {
          refCode?: string | null;
        };
      }>("/api/affiliate/create", {
        method: "POST",
      });

      affiliateRefCode.value =
        String(response?.data?.refCode || "").trim() || null;

      return affiliateRefCode.value;
    } catch (error: any) {
      affiliateRefCode.value = null;

      toast.error(
        "Không thể tạo link affiliate",
        error?.data?.message || "Vui lòng thử lại sau"
      );

      return null;
    } finally {
      loadingAffiliateLink.value = false;
    }
  };

  const shareUrl = computed(() => {
    if (import.meta.server) return "";

    const base = window.location.origin;
    const searchParams = new URLSearchParams();
    let path = "/";

    if (props.productSlug) {
      path = `/products/${props.productSlug}`;

      if (props.planSlug) {
        searchParams.set("plan", props.planSlug);
      }
    }

    if (affiliateRefCode.value) {
      searchParams.set("ref", affiliateRefCode.value);
    }

    const queryString = searchParams.toString();

    return `${base}${path}${queryString ? `?${queryString}` : ""}`;
  });

  async function copyLink() {
    await ensureAffiliateRefCode();

    try {
      await navigator.clipboard.writeText(shareUrl.value);
    } catch {
      const el = document.createElement("textarea");
      el.value = shareUrl.value;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }

    copied.value = true;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => (copied.value = false), 2500);
  }

  async function shareVia(channel: "facebook" | "zalo") {
    await ensureAffiliateRefCode();

    const url = encodeURIComponent(shareUrl.value);

    if (channel === "facebook") {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        "_blank",
        "width=600,height=440"
      );
    } else {
      window.open(
        `https://zalo.me/share?url=${url}`,
        "_blank",
        "width=600,height=440"
      );
    }
  }

  const steps = [
    {
      text: `Chia sẻ link của bạn cho bạn bè, mạng xã hội hoặc nhóm chat`,
      color: "bg-primary/10 text-primary",
    },
    {
      text: `Họ click vào link và mua hàng -> bạn nhận ${props.commissionRate ?? 10}% hoa hồng trên giá trị đơn`,
      color:
        "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
    },
    {
      text: `Hoa hồng được ghi nhận vào ví ngay khi đơn hàng hoàn thành`,
      color:
        "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    },
  ];

  watch(
    () => props.open,
    (isOpen) => {
      if (!isOpen) return;
      ensureAffiliateRefCode();
    },
    { immediate: true }
  );

  onUnmounted(() => {
    if (copyTimer) clearTimeout(copyTimer);
  });
</script>
