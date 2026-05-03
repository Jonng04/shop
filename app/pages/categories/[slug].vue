<template>
  <div
    class="min-h-screen bg-[#fafafa] dark:bg-[#0f1115] text-slate-800 dark:text-slate-200 font-sans"
  >
    <LayoutHeader />
    <LayoutNavbar />

    <main class="max-w-[1400px] mx-auto px-4 lg:px-6 pt-8 pb-20">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-[13px] text-slate-500 mb-6">
        <NuxtLink
          to="/"
          class="hover:text-primary transition-colors flex items-center gap-1.5"
        >
          <Icon name="solar:home-smile-linear" size="16" /> Trang chủ
        </NuxtLink>
        <Icon name="solar:alt-arrow-right-linear" size="14" />
        <NuxtLink
          to="/categories"
          class="hover:text-primary transition-colors flex items-center gap-1.5"
        >
          <Icon
            name="solar:widget-bold-duotone"
            size="15"
            class="text-primary"
          />
          Danh mục
        </NuxtLink>
        <Icon name="solar:alt-arrow-right-linear" size="14" />
        <span
          class="text-slate-800 dark:text-slate-200 font-medium truncate max-w-[200px] flex items-center gap-1.5"
        >
          <Icon
            name="solar:tag-bold-duotone"
            size="15"
            class="text-slate-400"
          />
          {{ data?.category?.name ?? "..." }}
        </span>
      </div>

      <!-- Heading -->
      <div class="flex items-center gap-4 mb-10">
        <div
          class="w-14 h-14 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0"
        >
          <img
            v-if="data?.category?.image"
            :src="data.category.image"
            :alt="data.category.name"
            class="w-full h-full object-cover"
          />
          <Icon
            v-else
            name="solar:box-bold-duotone"
            size="26"
            class="text-primary"
          />
        </div>
        <div>
          <h1
            class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white"
          >
            {{ data?.category?.name }}
          </h1>
          <p class="text-sm text-slate-500 mt-0.5 font-medium">
            {{ data?.products?.length ?? 0 }} sản phẩm
          </p>
        </div>
      </div>

      <!-- Loading skeleton -->
      <div
        v-if="pending"
        class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8 sm:gap-x-6"
      >
        <div v-for="i in 10" :key="i" class="animate-pulse flex flex-col">
          <div
            class="aspect-[4/3] w-full rounded-xl bg-slate-200 dark:bg-slate-800 mb-3"
          />
          <div class="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800 mb-2" />
          <div class="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>

      <!-- Empty -->
      <div
        v-else-if="!data?.products?.length"
        class="py-24 text-center text-slate-400"
      >
        <Icon
          name="solar:box-minimalistic-line-duotone"
          size="48"
          class="mx-auto mb-3 opacity-40"
        />
        <p class="text-sm font-medium">Danh mục này chưa có sản phẩm nào</p>
      </div>

      <!-- Product grid: only image + name, no card, no background -->
      <div
        v-else
        class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8 sm:gap-x-6"
      >
        <NuxtLink
          v-for="product in data.products"
          :key="product.id"
          :to="`/products/${product.slug || product.id}`"
          class="group flex flex-col"
        >
          <!-- Image: full width, rounded, natural ratio, no background -->
          <img
            v-if="product.image"
            :src="product.image"
            :alt="product.name"
            class="w-full rounded-xl group-hover:opacity-90 transition-opacity duration-300"
          />
          <div
            v-else
            class="w-full aspect-[4/3] rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
          >
            <Icon
              name="solar:box-bold-duotone"
              size="40"
              class="text-slate-300 dark:text-slate-600"
            />
          </div>

          <!-- Name below image -->
          <p
            class="mt-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors line-clamp-2 leading-snug"
          >
            {{ product.name }}
          </p>
        </NuxtLink>
      </div>
    </main>

    <LayoutFooter />
  </div>
</template>

<script setup lang="ts">
  const route = useRoute();
  const slug = route.params.slug as string;

  interface Plan {
    id: number;
    name: string;
    price: number;
    status: string;
  }

  interface Product {
    id: number;
    name: string;
    slug: string | null;
    image: string | null;
    plans: Plan[];
  }

  interface Category {
    id: number;
    name: string;
    image: string | null;
  }

  interface CategoryResponse {
    category: Category;
    products: Product[];
  }

  const { data: _data, pending } = await useFetch<CategoryResponse>(
    `/api/categories/${slug}`
  );

  const data = computed(() => _data.value as CategoryResponse | null);

  // SEO setup for category pages
  watch(
    () => data.value?.category,
    (category) => {
      if (!category) return;

      useSeoHead({
        title: `${category.name}`,
        description: `Mua ${category.name.toLowerCase()} với giá tốt. Có ${data.value?.products?.length || 0} sản phẩm sẵn có`,
        image: category.image || undefined,
        type: "website",
        structuredData: {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: category.name,
          image: category.image || undefined,
          description: `Danh mục ${category.name}`,
        },
      });
    },
    { immediate: true }
  );
</script>
