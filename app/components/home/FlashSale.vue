<script setup lang="ts">
  interface FlashSaleItem {
    itemId: number;
    saleId: number;
    planId: number;
    productId: number;
    productName: string;
    productSlug: string | null;
    planName: string;
    image: string | null;
    originalPrice: number;
    salePrice: number;
    discountPercent: number;
    total: number;
    sold: number;
  }

  const props = defineProps<{
    endAt: string | null;
    items: FlashSaleItem[];
  }>();
  const { parseServerDate } = useDateFormatter();

  const emit = defineEmits<{ expired: [] }>();

  const flashCountdown = ref({ h: "00", m: "00", s: "00" });
  const expiredEmitted = ref(false);
  const isFlashActive = ref(false);
  let flashTimer: ReturnType<typeof setInterval> | null = null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const formatPrice = (value: number | null) => {
    if (value === null || Number.isNaN(Number(value))) return "Liên hệ";
    return `${Number(value).toLocaleString("vi-VN")}đ`;
  };

  const updateFlashCountdown = () => {
    if (!props.endAt) {
      flashCountdown.value = { h: "00", m: "00", s: "00" };
      isFlashActive.value = false;
      return;
    }

    const endDate = parseServerDate(props.endAt);
    if (!endDate) {
      flashCountdown.value = { h: "00", m: "00", s: "00" };
      isFlashActive.value = false;
      return;
    }

    const diff = endDate.getTime() - Date.now();
    if (diff <= 0) {
      flashCountdown.value = { h: "00", m: "00", s: "00" };
      isFlashActive.value = false;
      if (!expiredEmitted.value) {
        expiredEmitted.value = true;
        emit("expired");
      }
      return;
    }

    expiredEmitted.value = false;
    isFlashActive.value = true;

    const totalSec = Math.floor(diff / 1000);
    flashCountdown.value = {
      h: pad(Math.floor(totalSec / 3600)),
      m: pad(Math.floor((totalSec % 3600) / 60)),
      s: pad(totalSec % 60),
    };
  };

  updateFlashCountdown();
  onMounted(() => {
    flashTimer = setInterval(updateFlashCountdown, 1000);
  });
  onUnmounted(() => {
    if (flashTimer) clearInterval(flashTimer);
  });

  const hasFlashSale = computed(
    () => props.items.length > 0 && isFlashActive.value
  );
  const getSoldPercent = (item: FlashSaleItem) => {
    if (!item.total) return 0;
    return Math.min(100, Math.round((item.sold / item.total) * 100));
  };
</script>

<template>
  <section v-if="hasFlashSale" class="mb-10">
    <div
      class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-rose-500 via-orange-500 to-amber-400 px-5 py-4 shadow-lg shadow-orange-200/50 dark:shadow-orange-900/30"
    >
      <div class="flex items-center gap-3">
        <div
          class="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20"
        >
          <Icon name="solar:bolt-bold" size="20" class="text-white" />
        </div>
        <div>
          <p
            class="text-[10px] font-bold uppercase tracking-widest text-white/70"
          >
            Hôm nay
          </p>
          <h2 class="text-lg font-bold leading-none text-white">Flash Sale</h2>
        </div>
        <div class="ml-2 flex items-center gap-1">
          <div
            class="flex h-9 w-10 flex-col items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm"
          >
            <span
              class="font-mono text-base font-bold leading-none text-white"
              >{{ flashCountdown.h }}</span
            >
          </div>
          <span class="font-bold text-white/80">:</span>
          <div
            class="flex h-9 w-10 flex-col items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm"
          >
            <span
              class="font-mono text-base font-bold leading-none text-white"
              >{{ flashCountdown.m }}</span
            >
          </div>
          <span class="font-bold text-white/80">:</span>
          <div
            class="flex h-9 w-10 flex-col items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm"
          >
            <span
              class="font-mono text-base font-bold leading-none text-white"
              >{{ flashCountdown.s }}</span
            >
          </div>
        </div>
      </div>
    </div>

    <div
      class="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 lg:-mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0"
    >
      <NuxtLink
        v-for="item in items"
        :key="item.itemId"
        :to="`/products/${item.productSlug || item.productId}`"
        class="group relative flex w-[200px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 dark:border-slate-800 dark:bg-[#181a1f] lg:w-auto"
      >
        <div
          class="absolute left-2.5 top-2.5 z-10 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 px-2 py-0.5 text-[11px] font-bold text-white shadow"
        >
          -{{ item.discountPercent }}%
        </div>
        <div class="relative overflow-hidden p-2">
          <img
            :src="item.image || ''"
            :alt="item.productName"
            class="w-full rounded-xl transition-transform duration-500"
          />
          <div
            v-if="item.sold >= item.total"
            class="absolute inset-0 flex items-center justify-center bg-black/50"
          >
            <span
              class="rounded-lg bg-white/90 px-3 py-1 text-xs font-bold text-slate-800"
              >Đã hết
            </span>
          </div>
        </div>
        <div class="flex flex-1 flex-col p-3">
          <h3
            class="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-800 transition-colors group-hover:text-primary dark:text-slate-100"
          >
            {{ item.productName }} — {{ item.planName }}
          </h3>
          <div class="mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span class="font-mono text-base font-bold text-rose-500">
              {{ formatPrice(item.salePrice) }}
            </span>
            <span class="font-mono text-[11px] text-slate-400 line-through">
              {{ formatPrice(item.originalPrice) }}
            </span>
          </div>
          <div class="mt-2.5">
            <div class="mb-1 flex items-center justify-between">
              <span class="text-[10px] text-slate-400"
                >Đã bán {{ item.sold }}/{{ item.total }}</span
              >
              <span
                class="text-[10px] font-semibold"
                :class="
                  getSoldPercent(item) >= 80
                    ? 'text-rose-500'
                    : 'text-orange-500'
                "
              >
                {{
                  item.sold >= item.total
                    ? "Hết hàng"
                    : `Còn ${item.total - item.sold}`
                }}
              </span>
            </div>
            <div
              class="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
            >
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="
                  getSoldPercent(item) >= 80
                    ? 'bg-gradient-to-r from-rose-500 to-rose-400'
                    : 'bg-gradient-to-r from-orange-400 to-amber-400'
                "
                :style="{ width: `${getSoldPercent(item)}%` }"
              />
            </div>
          </div>
          <button
            type="button"
            class="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 py-2 text-[12px] font-bold text-white shadow-sm transition-all hover:from-rose-600 hover:to-orange-600 hover:shadow-md active:scale-95"
          >
            <Icon name="solar:cart-large-2-bold-duotone" size="14" />
            Mua ngay
          </button>
        </div>
      </NuxtLink>
    </div>
  </section>
</template>
