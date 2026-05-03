<script setup lang="ts">
  useSeoHead({
    title: "Tìm kiếm sản phẩm",
    description: "Tìm kiếm các sản phẩm mà bạn yêu thích",
  });

  interface SearchProduct {
    id: number;
    name: string;
    slug: string | null;
    image: string | null;
    minPrice: number | null;
  }

  const route = useRoute();
  const router = useRouter();

  const keyword = computed(() => String(route.query.q || "").trim());

  const sortOptions = [
    { label: "Liên quan", value: "relevance" },
    { label: "Giá thấp đến cao", value: "price_asc" },
    { label: "Giá cao đến thấp", value: "price_desc" },
    { label: "Tên A-Z", value: "name_asc" },
  ] as const;

  const priceOptions = [
    { label: "Mọi mức giá", value: "all" },
    { label: "Dưới 100.000đ", value: "lt_100k" },
    { label: "100.000đ - 500.000đ", value: "100k_500k" },
    { label: "Trên 500.000đ", value: "gt_500k" },
  ] as const;

  const isSortValue = (value: string) =>
    sortOptions.some((item) => item.value === value);
  const isPriceValue = (value: string) =>
    priceOptions.some((item) => item.value === value);

  const inputKeyword = ref(keyword.value);
  const sortBy = ref(
    isSortValue(String(route.query.s || ""))
      ? String(route.query.s)
      : "relevance"
  );
  const priceFilter = ref(
    isPriceValue(String(route.query.p || "")) ? String(route.query.p) : "all"
  );

  watch(keyword, (value) => {
    inputKeyword.value = value;
  });

  watch(
    () => route.query,
    (query) => {
      const nextSort = String(query.s || "");
      const nextPrice = String(query.p || "");
      sortBy.value = isSortValue(nextSort) ? nextSort : "relevance";
      priceFilter.value = isPriceValue(nextPrice) ? nextPrice : "all";
    }
  );

  const applyFilters = async () => {
    const q = inputKeyword.value.trim();
    await router.push({
      path: "/search",
      query: {
        q: q || undefined,
        s: sortBy.value !== "relevance" ? sortBy.value : undefined,
        p: priceFilter.value !== "all" ? priceFilter.value : undefined,
      },
    });
  };

  const resetFilters = async () => {
    inputKeyword.value = "";
    sortBy.value = "relevance";
    priceFilter.value = "all";
    await router.push({ path: "/search" });
  };

  const { data, pending } = await useFetch<{ items: SearchProduct[] }>(
    "/api/products",
    {
      query: computed(() => ({
        search: keyword.value || undefined,
        limit: 36,
      })),
      default: () => ({ items: [] }),
    }
  );

  const items = computed(() => data.value?.items || []);

  const filteredItems = computed(() => {
    let list = [...items.value];

    const localKeyword = inputKeyword.value.trim().toLowerCase();
    if (localKeyword) {
      list = list.filter((item) =>
        item.name.toLowerCase().includes(localKeyword)
      );
    }

    if (priceFilter.value === "lt_100k") {
      list = list.filter((item) => Number(item.minPrice || 0) < 100000);
    } else if (priceFilter.value === "100k_500k") {
      list = list.filter((item) => {
        const price = Number(item.minPrice || 0);
        return price >= 100000 && price <= 500000;
      });
    } else if (priceFilter.value === "gt_500k") {
      list = list.filter((item) => Number(item.minPrice || 0) > 500000);
    }

    if (sortBy.value === "price_asc") {
      list.sort((a, b) => Number(a.minPrice || 0) - Number(b.minPrice || 0));
    } else if (sortBy.value === "price_desc") {
      list.sort((a, b) => Number(b.minPrice || 0) - Number(a.minPrice || 0));
    } else if (sortBy.value === "name_asc") {
      list.sort((a, b) => a.name.localeCompare(b.name, "vi"));
    }

    return list;
  });

  const formatPrice = (value: number | null) => {
    if (value === null || Number.isNaN(Number(value))) return "Liên hệ";
    return `${Number(value).toLocaleString("vi-VN")}đ`;
  };
</script>

<template>
  <div
    class="min-h-screen bg-[#fafafa] font-sans text-slate-800 dark:bg-[#0f1115] dark:text-slate-200"
  >
    <LayoutHeader />
    <LayoutNavbar />

    <main class="mx-auto max-w-[1400px] px-4 pb-16 pt-8 lg:px-6">
      <div class="mb-5">
        <p
          class="text-[12px] font-semibold uppercase tracking-[0.12em] text-primary"
        >
          Search
        </p>
        <h1 class="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
          Kết quả cho: "{{ keyword || "..." }}"
        </h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {{ filteredItems.length }} sản phẩm phù hợp
        </p>
      </div>

      <section
        class="mb-8 rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-[#181a1f]"
      >
        <div class="grid grid-cols-1 gap-2 lg:grid-cols-12 lg:items-center">
          <div class="lg:col-span-6">
            <UiInput
              v-model="inputKeyword"
              placeholder="Nhập từ khóa sản phẩm..."
              class="h-10"
              @keydown.enter.prevent="applyFilters"
            >
              <template #left-icon>
                <Icon name="solar:magnifer-line-duotone" size="18" />
              </template>
            </UiInput>
          </div>
          <div class="lg:col-span-2">
            <UiDropdown
              v-model="sortBy"
              :options="sortOptions as any"
              placeholder="Sắp xếp"
            />
          </div>
          <div class="lg:col-span-2">
            <UiDropdown
              v-model="priceFilter"
              :options="priceOptions as any"
              placeholder="Mức giá"
            />
          </div>
          <div class="flex items-center gap-2 lg:col-span-2 lg:justify-end">
            <UiButton size="sm" @click="applyFilters">
              <template #prefix>
                <Icon name="solar:magnifer-line-duotone" size="14" />
              </template>
              Tìm kiếm
            </UiButton>
            <UiButton size="sm" variant="outline" @click="resetFilters">
              Đặt lại
            </UiButton>
          </div>
        </div>
      </section>

      <div
        v-if="pending"
        class="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5"
      >
        <div v-for="i in 10" :key="i" class="animate-pulse">
          <div
            class="mb-3 aspect-[4/3] w-full rounded-xl bg-slate-200 dark:bg-slate-800"
          />
          <div class="mb-2 h-4 w-4/5 rounded bg-slate-200 dark:bg-slate-800" />
          <div class="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>

      <div
        v-else-if="!keyword || !filteredItems.length"
        class="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center dark:border-slate-800 dark:bg-[#181a1f]"
      >
        <Icon
          name="solar:magnifer-zoom-in-line-duotone"
          size="46"
          class="mx-auto mb-3 text-slate-300 dark:text-slate-600"
        />
        <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Không tìm thấy sản phẩm phù hợp
        </p>
      </div>

      <div
        v-else
        class="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5"
      >
        <NuxtLink
          v-for="p in filteredItems"
          :key="p.id"
          :to="`/products/${p.slug || p.id}`"
          class="group flex flex-col"
        >
          <img
            v-if="p.image"
            :src="p.image"
            :alt="p.name"
            class="w-full rounded-xl transition-opacity duration-300 group-hover:opacity-90"
          />
          <div
            v-else
            class="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800"
          >
            <Icon
              name="solar:box-bold-duotone"
              size="34"
              class="text-slate-300 dark:text-slate-600"
            />
          </div>
          <p
            class="mt-2.5 line-clamp-2 text-sm font-semibold leading-snug text-slate-800 transition-colors group-hover:text-primary dark:text-slate-100"
          >
            {{ p.name }}
          </p>
          <span
            class="mt-1.5 text-[13px] font-mono font-bold text-slate-900 dark:text-white"
          >
            {{ formatPrice(p.minPrice) }}
          </span>
        </NuxtLink>
      </div>
    </main>

    <LayoutFooter />
  </div>
</template>
