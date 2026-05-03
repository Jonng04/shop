<script setup lang="ts">
  interface HomeProduct {
    id: number;
    name: string;
    slug: string | null;
    image: string | null;
    categoryId: number | null;
    deliveryType: string | null;
    minPrice: number | null;
  }

  const props = defineProps<{
    products: HomeProduct[];
  }>();

  const featuredProducts = computed(() => props.products.slice(0, 10));

  const formatPrice = (value: number | null) => {
    if (value === null || Number.isNaN(Number(value))) return "Liên hệ";
    return `${Number(value).toLocaleString("vi-VN")}đ`;
  };
</script>

<template>
  <section>
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p
          class="text-[11px] font-bold uppercase tracking-[0.13em] text-primary"
        >
          New Collection
        </p>
        <h2 class="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
          Lựa chọn nổi bật trong tuần
        </h2>
      </div>
      <UiButton variant="outline" class="!h-10 !rounded-xl">
        Xem tất cả
        <template #suffix>
          <Icon name="solar:alt-arrow-right-line-duotone" size="16" />
        </template>
      </UiButton>
    </div>

    <div
      class="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5"
    >
      <NuxtLink
        v-for="p in featuredProducts"
        :key="p.id"
        :to="`/products/${p.slug || p.id}`"
        class="group flex flex-col transition-transform duration-300 hover:-translate-y-1"
      >
        <div class="relative mb-3">
          <img
            v-if="p.image"
            :src="p.image"
            :alt="p.name"
            class="w-full rounded-xl transition-opacity duration-300 group-hover:opacity-90"
          />
          <div
            v-else
            class="flex aspect-[16/9] w-full items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800"
          >
            <Icon
              name="solar:box-bold-duotone"
              size="34"
              class="text-slate-300 dark:text-slate-600"
            />
          </div>
        </div>

        <div class="px-0.5">
          <h3
            class="line-clamp-2 text-sm font-semibold leading-snug text-slate-800 transition-colors group-hover:text-primary dark:text-slate-100"
          >
            {{ p.name }}
          </h3>
          <div class="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              class="text-[13px] font-mono font-bold leading-none text-slate-900 dark:text-white"
            >
              {{ formatPrice(p.minPrice) }}
            </span>
          </div>
        </div>
      </NuxtLink>
    </div>
  </section>
</template>
