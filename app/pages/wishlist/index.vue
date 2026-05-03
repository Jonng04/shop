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
        <span
          class="text-slate-800 dark:text-slate-200 font-medium flex items-center gap-1.5"
        >
          <Icon
            name="solar:heart-bold-duotone"
            size="15"
            class="text-rose-500"
          />
          Yêu thích
        </span>
      </div>

      <!-- Heading -->
      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center shrink-0"
          >
            <Icon
              name="solar:heart-bold-duotone"
              size="20"
              class="text-rose-500"
            />
          </div>
          <div>
            <p
              class="text-[10px] font-bold uppercase tracking-widest text-slate-400"
            >
              Danh sách
            </p>
            <h1
              class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white"
            >
              Sản phẩm yêu thích
            </h1>
          </div>
        </div>
        <span
          v-if="wishlist.length > 0"
          class="text-sm text-slate-500 font-medium"
        >
          {{ wishlist.length }} sản phẩm
        </span>
      </div>

      <!-- Not logged in -->
      <div v-if="!loggedIn" class="py-24 text-center">
        <Icon
          name="solar:heart-broken-bold-duotone"
          size="56"
          class="mx-auto mb-4 text-slate-300 dark:text-slate-600"
        />
        <p class="text-slate-500 font-medium mb-4">
          Bạn cần đăng nhập để xem danh sách yêu thích
        </p>
        <NuxtLink to="/auth/login">
          <UiButton variant="primary">Đăng nhập ngay</UiButton>
        </NuxtLink>
      </div>

      <!-- Loading -->
      <div
        v-else-if="pending"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div
          v-for="i in 8"
          :key="i"
          class="animate-pulse rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181a1f] overflow-hidden"
        >
          <div class="p-[10px]">
            <div
              class="w-full aspect-[4/3] rounded-xl bg-slate-200 dark:bg-slate-800"
            />
          </div>
          <div class="p-4 space-y-2">
            <div class="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
            <div class="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="wishlist.length === 0" class="py-24 text-center">
        <Icon
          name="solar:heart-bold-duotone"
          size="56"
          class="mx-auto mb-4 text-slate-300 dark:text-slate-600"
        />
        <p class="text-slate-500 font-medium mb-4">
          Bạn chưa thêm sản phẩm nào vào danh sách yêu thích
        </p>
        <NuxtLink to="/categories">
          <UiButton variant="primary">Khám phá sản phẩm</UiButton>
        </NuxtLink>
      </div>

      <!-- Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="item in wishlist"
          :key="item.wishlistId"
          class="group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181a1f] overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all"
        >
          <!-- Remove (heart) button -->
          <button
            class="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 dark:bg-[#1e2128]/90 backdrop-blur-sm flex items-center justify-center shadow hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
            :disabled="removingId === item.wishlistId"
            @click="removeFromWishlist(item)"
          >
            <Icon
              v-if="removingId === item.wishlistId"
              name="solar:spinner-bold"
              size="15"
              class="text-slate-400 animate-spin"
            />
            <Icon
              v-else
              name="solar:heart-bold"
              size="15"
              class="text-rose-500"
            />
          </button>

          <NuxtLink :to="`/products/${item.product?.slug || item.product?.id}`">
            <!-- Image -->
            <div class="p-[10px]">
              <img
                v-if="item.product?.image"
                :src="item.product.image"
                :alt="item.product.name"
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
            </div>

            <!-- Info -->
            <div class="px-4 pb-4">
              <h3
                class="text-sm font-semibold text-slate-800 dark:text-white line-clamp-2 group-hover:text-primary transition-colors"
              >
                {{ item.product?.name }}
              </h3>
              <p
                v-if="item.product?.minPrice != null"
                class="mt-2 text-sm font-bold text-primary"
              >
                {{ item.product.minPrice.toLocaleString("vi-VN") }}đ
              </p>
            </div>
          </NuxtLink>
        </div>
      </div>
    </main>

    <LayoutFooter />
  </div>
</template>

<script setup lang="ts">
  const { loggedIn } = useUserSession();
  const { setWishlistCount } = useWishlist();

  const { data, pending, refresh } = await useFetch("/api/wishlist", {
    immediate: loggedIn.value,
  });

  const wishlist = computed(() => (data.value as any[]) || []);

  watch(
    () => wishlist.value.length,
    (count) => {
      if (loggedIn.value) {
        setWishlistCount(count);
      }
    },
    { immediate: true }
  );

  const removingId = ref<number | null>(null);

  async function removeFromWishlist(item: any) {
    if (!item.product?.id) return;
    removingId.value = item.wishlistId;
    try {
      const res = await $fetch<{ wishlisted: boolean; count?: number }>(
        `/api/wishlist/${item.product.id}`,
        {
          method: "DELETE",
        }
      );

      if (typeof res.count === "number") {
        setWishlistCount(res.count);
      }

      await refresh();
    } finally {
      removingId.value = null;
    }
  }

  useSeoHead({
    title: "Yêu thích",
    description: "Danh sách các sản phẩm yêu thích của bạn",
  });
</script>
