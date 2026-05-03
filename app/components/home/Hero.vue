<script setup lang="ts">
  const props = defineProps<{
    leftBanners: Array<{ image: string; href: string }>;
    heroSlides: string[];
    promoBanners: Array<{
      label: string;
      title: string;
      description: string;
      icon: string;
      href: string;
    }>;
  }>();

  const heroIndex = ref(0);
  const heroDragging = ref(false);
  const heroPointerId = ref<number | null>(null);
  const heroStartX = ref(0);
  const heroDistance = ref(0);
  const heroRef = ref<HTMLElement | null>(null);

  const promoBannerStyles = [
    {
      card: "border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-100 dark:border-slate-800 dark:from-emerald-900/20 dark:via-[#181a1f] dark:to-emerald-900/10",
      label: "text-emerald-600 dark:text-emerald-300",
      icon: "text-emerald-200 dark:text-emerald-800",
    },
    {
      card: "border-slate-200 bg-gradient-to-br from-sky-50 via-white to-sky-100 dark:border-slate-800 dark:from-sky-900/20 dark:via-[#181a1f] dark:to-sky-900/10",
      label: "text-sky-600 dark:text-sky-300",
      icon: "text-sky-200 dark:text-sky-800",
    },
  ];

  const hasLeftBanners = computed(() => props.leftBanners.length > 0);
  const hasRightBanners = computed(() => props.promoBanners.length > 0);
  const heroColSpanClass = computed(() => {
    if (hasLeftBanners.value && hasRightBanners.value) return "lg:col-span-6";
    if (hasLeftBanners.value || hasRightBanners.value) return "lg:col-span-9";
    return "lg:col-span-12";
  });

  const nextHero = () => {
    if (heroIndex.value >= props.heroSlides.length - 1) return;
    heroIndex.value += 1;
  };

  const prevHero = () => {
    if (heroIndex.value <= 0) return;
    heroIndex.value -= 1;
  };

  const goHero = (index: number) => {
    heroIndex.value = Math.max(0, Math.min(index, props.heroSlides.length - 1));
  };

  const onHeroDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    heroPointerId.value = event.pointerId;
    heroRef.value?.setPointerCapture(event.pointerId);
    heroDragging.value = true;
    heroStartX.value = event.clientX;
    heroDistance.value = 0;
  };

  const onHeroMove = (event: PointerEvent) => {
    if (!heroDragging.value || heroPointerId.value !== event.pointerId) return;
    heroDistance.value = event.clientX - heroStartX.value;
  };

  const onHeroUp = (event: PointerEvent) => {
    if (heroPointerId.value !== event.pointerId) return;
    if (heroDistance.value > 60) prevHero();
    if (heroDistance.value < -60) nextHero();
    heroDragging.value = false;
    heroDistance.value = 0;
    heroRef.value?.releasePointerCapture(event.pointerId);
    heroPointerId.value = null;
  };

  const heroStyle = computed(() => ({
    transform: `translate3d(calc(-${heroIndex.value * 100}% + ${heroDistance.value}px), 0, 0)`,
  }));

  watch(
    () => props.heroSlides,
    (slides) => {
      if (!slides.length) {
        heroIndex.value = 0;
        heroDragging.value = false;
        heroDistance.value = 0;
        return;
      }

      if (heroIndex.value > slides.length - 1) {
        heroIndex.value = slides.length - 1;
      }
    },
    { immediate: true, deep: true }
  );
</script>

<template>
  <section class="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
    <div v-if="leftBanners.length" class="space-y-4 lg:col-span-3">
      <component
        v-for="(banner, idx) in leftBanners.slice(0, 3)"
        :key="`left-banner-${idx}`"
        :is="banner.href ? 'NuxtLink' : 'div'"
        :to="banner.href || undefined"
        class="block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-[#181a1f]"
      >
        <img
          :src="banner.image"
          :alt="`Banner trái ${idx + 1}`"
          class="h-[109px] w-full object-cover sm:h-[140px] lg:h-[112px]"
        />
      </component>
    </div>

    <article
      v-if="heroSlides.length"
      ref="heroRef"
      class="relative h-[260px] select-none overflow-hidden rounded-3xl border border-slate-200 bg-white cursor-grab touch-pan-y active:cursor-grabbing dark:border-slate-800 dark:bg-[#181a1f] sm:h-[320px] lg:h-[360px]"
      :class="heroColSpanClass"
      @pointerdown="onHeroDown"
      @pointermove="onHeroMove"
      @pointerup="onHeroUp"
      @pointercancel="onHeroUp"
    >
      <div
        class="absolute inset-0 flex ease-out"
        :class="
          heroDragging ? 'transition-none' : 'transition-transform duration-500'
        "
        :style="heroStyle"
      >
        <img
          v-for="(slide, idx) in heroSlides"
          :key="`${slide}-${idx}`"
          :src="slide"
          draggable="false"
          class="h-full w-full shrink-0 object-cover opacity-85"
        />
      </div>

      <div class="relative z-10 h-full" />

      <div class="absolute inset-x-0 bottom-4 z-20 flex justify-center gap-1.5">
        <button
          v-for="(_, idx) in heroSlides"
          :key="idx"
          type="button"
          class="h-2 rounded-full transition-all"
          :class="idx === heroIndex ? 'w-6 bg-white' : 'w-2 bg-white/45'"
          @click.stop="goHero(idx)"
        />
      </div>
    </article>

    <div
      v-if="promoBanners.length"
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:col-span-3"
    >
      <component
        v-for="(banner, idx) in promoBanners.slice(0, 2)"
        :key="`${banner.title}-${idx}`"
        :is="banner.href ? 'NuxtLink' : 'div'"
        :to="banner.href || undefined"
        class="relative overflow-hidden rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-md"
        :class="promoBannerStyles[idx]?.card"
      >
        <div class="min-w-0">
          <p
            v-if="banner.label"
            class="text-[11px] font-bold uppercase tracking-[0.13em]"
            :class="promoBannerStyles[idx]?.label"
          >
            {{ banner.label }}
          </p>
          <h3
            v-if="banner.title"
            class="mt-2 text-xl font-bold text-slate-900 dark:text-white"
          >
            {{ banner.title }}
          </h3>
          <p
            v-if="banner.description"
            class="mt-1 text-[12px] text-slate-500 dark:text-slate-400"
          >
            {{ banner.description }}
          </p>
        </div>
        <Icon
          v-if="banner.icon"
          :name="banner.icon"
          size="58"
          class="absolute -bottom-1 -right-1"
          :class="promoBannerStyles[idx]?.icon"
        />
      </component>
    </div>
  </section>
</template>
