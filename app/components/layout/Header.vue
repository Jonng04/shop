<script setup lang="ts">
  const { loggedIn, user, clear } = useUserSession();
  const toast = useToast();
  const { totalItems } = useCart();
  const { wishlistCount, refreshWishlistCount } = useWishlist();
  const route = useRoute();

  const menuOpen = ref(false);
  const mobileSearchOpen = ref(false);
  const dropdownRef = ref<HTMLElement | null>(null);
  const searchBoxRef = ref<HTMLElement | null>(null);
  const mobileSearchInputRef = ref<HTMLInputElement | null>(null);
  const searchKeyword = ref("");
  const searchFocused = ref(false);
  const searchLoading = ref(false);
  const searchResults = ref<
    Array<{
      id: number;
      name: string;
      slug: string | null;
      image: string | null;
      minPrice: number | null;
    }>
  >([]);
  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  let lastSearchRequestId = 0;

  const handleLogout = async () => {
    menuOpen.value = false;
    await clear();
    toast.success("Đã đăng xuất");
    navigateTo("/auth/login");
  };

  const currentKeyword = computed(() => searchKeyword.value.trim());
  const canShowSearchPanel = computed(
    () => searchFocused.value && currentKeyword.value.length > 0
  );
  const canShowMobileSearchPanel = computed(
    () => mobileSearchOpen.value && currentKeyword.value.length > 0
  );

  const fetchSearchSuggestions = async (keyword: string) => {
    const requestId = ++lastSearchRequestId;
    searchLoading.value = true;
    try {
      const response = await $fetch<{
        items: Array<{
          id: number;
          name: string;
          slug: string | null;
          image: string | null;
          minPrice: number | null;
        }>;
      }>("/api/products", {
        query: { search: keyword, limit: 6 },
      });
      if (requestId !== lastSearchRequestId) return;
      searchResults.value = response.items || [];
    } catch {
      if (requestId !== lastSearchRequestId) return;
      searchResults.value = [];
    } finally {
      if (requestId === lastSearchRequestId) {
        searchLoading.value = false;
      }
    }
  };

  const submitSearch = async () => {
    const keyword = currentKeyword.value;
    if (!keyword) return;
    searchFocused.value = false;
    mobileSearchOpen.value = false;
    searchResults.value = [];
    await navigateTo({ path: "/search", query: { q: keyword } });
  };

  const openMobileSearch = async () => {
    mobileSearchOpen.value = true;
    await nextTick();
    mobileSearchInputRef.value?.focus();
  };

  const closeMobileSearch = () => {
    mobileSearchOpen.value = false;
    searchFocused.value = false;
  };

  const goToProduct = async (item: {
    id: number;
    slug: string | null;
    name: string;
  }) => {
    searchFocused.value = false;
    mobileSearchOpen.value = false;
    searchKeyword.value = item.name;
    searchResults.value = [];
    await navigateTo(`/products/${item.slug || item.id}`);
  };

  const formatPrice = (value: number | null) => {
    if (value === null || Number.isNaN(Number(value))) return "Liên hệ";
    return `${Number(value).toLocaleString("vi-VN")}đ`;
  };

  watch(searchKeyword, (value) => {
    if (searchTimer) clearTimeout(searchTimer);
    const keyword = value.trim();
    if (!keyword) {
      searchLoading.value = false;
      searchResults.value = [];
      return;
    }
    searchTimer = setTimeout(() => {
      fetchSearchSuggestions(keyword);
    }, 250);
  });

  watch(
    () => route.fullPath,
    () => {
      searchFocused.value = false;
      mobileSearchOpen.value = false;
      if (loggedIn.value) {
        refreshWishlistCount();
      }
      if (searchTimer) {
        clearTimeout(searchTimer);
        searchTimer = null;
      }
    }
  );

  watch(
    () => loggedIn.value,
    (isLoggedIn) => {
      if (isLoggedIn) {
        refreshWishlistCount();
        return;
      }
      wishlistCount.value = 0;
    },
    { immediate: true }
  );

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as Node;
    if (dropdownRef.value && !dropdownRef.value.contains(target)) {
      menuOpen.value = false;
    }
    if (searchBoxRef.value && !searchBoxRef.value.contains(target)) {
      searchFocused.value = false;
    }
  };

  // Close on outside click
  onMounted(() => {
    document.addEventListener("click", handleClickOutside);

    if (loggedIn.value) {
      refreshWishlistCount({ force: true });
    }
  });

  onBeforeUnmount(() => {
    document.removeEventListener("click", handleClickOutside);
    if (searchTimer) clearTimeout(searchTimer);
  });
</script>

<template>
  <div>
    <!-- TOP BAR: Promo announcement -->
    <div
      class="bg-gradient-to-r from-primary to-emerald-600 text-white py-2 text-[12.5px] font-bold relative overflow-hidden"
    >
      <!-- Background shimmer effect -->
      <div
        class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer pointer-events-none"
      ></div>

      <div
        class="max-w-[1400px] mx-auto px-4 lg:px-6 flex items-center justify-center gap-3 relative"
      >
        <span class="flex items-center gap-2">
          <Icon
            name="solar:ticker-star-line-duotone"
            size="16"
            class="text-yellow-300"
          />
          <span class="tracking-tight">
            Ưu đãi tháng 3: Tặng ngay
            <span
              class="bg-white/20 px-2 py-0.5 rounded-[4px] text-white mx-0.5"
              >+20%</span
            >
            giá trị nạp tiền cho tất cả tài khoản!
          </span>
        </span>
        <NuxtLink
          to="/wallet/deposit"
          class="bg-white text-primary px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider hover:bg-primary hover:text-white transition-all shadow-sm ml-2"
        >
          Nạp ngay
        </NuxtLink>
      </div>
    </div>

    <!-- MAIN HEADER -->
    <header
      class="bg-white dark:bg-[#181a1f] py-4 border-b border-slate-200 dark:border-slate-800/80 sticky top-0 z-[90] shadow-sm"
    >
      <div
        class="max-w-[1400px] mx-auto px-4 lg:px-6 flex items-center justify-between gap-6 lg:gap-12"
      >
        <!-- Logo (Placeholder cho ảnh thật) -->
        <NuxtLink to="/" class="flex-shrink-0 flex items-center h-10">
          <span
            class="text-2xl font-bold text-slate-800 dark:text-white tracking-tighter"
            >Nuxt<span class="text-primary">Js</span></span
          >
        </NuxtLink>

        <!-- Centered Search Bar -->
        <div
          ref="searchBoxRef"
          class="flex-grow w-full max-w-[500px] relative hidden md:block"
        >
          <div
            class="flex relative rounded-full overflow-hidden bg-[#f1f5f9] dark:bg-[#20232a] border border-transparent focus-within:border-primary/50 focus-within:bg-white dark:focus-within:bg-[#181a1f] transition-all"
          >
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              class="w-full h-11 bg-transparent pl-5 pr-12 text-[13px] outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 font-medium"
              @focus="searchFocused = true"
              @keydown.enter.prevent="submitSearch"
            />
            <button
              type="button"
              class="absolute right-0 top-0 bottom-0 px-4 text-slate-500 hover:text-primary transition-colors flex items-center"
              @click="submitSearch"
            >
              <Icon
                name="solar:magnifer-line-duotone"
                size="20"
                stroke-width="2"
              />
            </button>
          </div>
          <div
            v-if="canShowSearchPanel"
            class="absolute left-0 right-0 top-[calc(100%+10px)] z-[120] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#181a1f]"
          >
            <div
              v-if="searchLoading"
              class="px-4 py-3 text-[12px] font-medium text-slate-500 dark:text-slate-400"
            >
              Đang tìm kiếm...
            </div>
            <button
              v-for="item in searchResults"
              :key="item.id"
              type="button"
              class="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-none hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-[#20232a]"
              @click="goToProduct(item)"
            >
              <div
                class="w-20 shrink-0 self-start rounded-md border border-slate-200 bg-white p-[3px] dark:border-slate-700 dark:bg-[#20232a]"
              >
                <img
                  v-if="item.image"
                  :src="item.image"
                  :alt="item.name"
                  class="w-full rounded-[4px]"
                />
                <Icon
                  v-else
                  name="solar:box-minimalistic-line-duotone"
                  size="18"
                  class="mx-auto my-2 text-slate-300 dark:text-slate-600"
                />
              </div>
              <div class="min-w-0 flex-1">
                <span
                  class="line-clamp-1 text-[13px] font-semibold text-slate-800 dark:text-slate-100"
                >
                  {{ item.name }}
                </span>
              </div>
              <span
                class="shrink-0 text-right text-[12px] font-mono font-bold text-slate-700 dark:text-slate-200"
              >
                {{ formatPrice(item.minPrice) }}
              </span>
            </button>
            <div
              v-if="!searchLoading && !searchResults.length"
              class="px-4 py-3 text-[12px] font-medium text-slate-500 dark:text-slate-400"
            >
              Không có sản phẩm phù hợp
            </div>
          </div>
        </div>

        <!-- Right Actions -->
        <div class="flex items-center gap-2 lg:gap-3">
          <button
            type="button"
            class="md:hidden w-10 h-10 rounded-[8px] bg-[#f1f5f9] dark:bg-[#20232a] flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-primary/10 hover:text-primary transition-all"
            aria-label="Mở tìm kiếm"
            @click="openMobileSearch"
          >
            <Icon name="solar:magnifer-line-duotone" size="20" />
          </button>

          <NuxtLink
            to="/cart"
            class="w-10 h-10 rounded-[8px] bg-[#f1f5f9] dark:bg-[#20232a] flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-primary/10 hover:text-primary transition-all relative group"
          >
            <Icon
              name="solar:cart-large-2-line-duotone"
              size="20"
              class="group-hover:scale-110 transition-transform"
            />
            <span
              v-if="totalItems > 0"
              class="absolute -top-[5px] -right-[5px] bg-[#e43a45] text-white text-[9px] min-w-[17px] h-[17px] px-1 rounded-[6px] flex items-center justify-center font-bold shadow-sm"
              >{{ totalItems > 99 ? "99+" : totalItems }}</span
            >
          </NuxtLink>

          <NuxtLink
            to="/wishlist"
            class="w-10 h-10 rounded-[8px] bg-[#f1f5f9] dark:bg-[#20232a] hidden items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer sm:flex group relative"
          >
            <Icon
              name="solar:heart-line-duotone"
              size="20"
              class="group-hover:scale-110 transition-transform"
            />
            <span
              v-if="wishlistCount > 0"
              class="absolute -top-[5px] -right-[5px] bg-rose-500 text-white text-[9px] min-w-[17px] h-[17px] px-1 rounded-[6px] flex items-center justify-center font-bold shadow-sm"
              >{{ wishlistCount > 99 ? "99+" : wishlistCount }}</span
            >
          </NuxtLink>

          <NuxtLink
            to="/chat"
            class="w-10 h-10 rounded-[8px] bg-[#f1f5f9] dark:bg-[#20232a] hidden items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer sm:flex group relative"
          >
            <Icon
              name="solar:chat-round-line-duotone"
              size="20"
              class="group-hover:scale-110 transition-transform"
            />
            <span
              class="absolute top-[8px] right-[8px] w-2 h-2 rounded-full bg-emerald-500 border-2 border-[#f1f5f9] dark:border-[#20232a]"
            >
            </span>
          </NuxtLink>

          <template v-if="loggedIn">
            <div class="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
            <div ref="dropdownRef" class="relative">
              <!-- Trigger -->
              <button
                @click="menuOpen = !menuOpen"
                class="flex items-center gap-2 select-none"
              >
                <div
                  :class="[
                    'w-9 h-9 rounded-[8px] overflow-hidden border transition-colors bg-white shrink-0',
                    menuOpen
                      ? 'border-primary'
                      : 'border-slate-200 dark:border-slate-700 hover:border-primary/60',
                  ]"
                >
                  <img
                    src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix"
                    alt="avatar"
                    class="w-full h-full"
                  />
                </div>
                <span
                  :class="[
                    'text-[13px] font-bold transition-colors hidden lg:flex items-center gap-1',
                    menuOpen
                      ? 'text-primary'
                      : 'text-slate-700 dark:text-slate-300',
                  ]"
                >
                  {{ (user as any)?.username || "Tài khoản" }}
                  <Icon
                    :name="
                      menuOpen
                        ? 'solar:alt-arrow-up-line-duotone'
                        : 'solar:alt-arrow-down-line-duotone'
                    "
                    size="13"
                    class="opacity-50"
                  />
                </span>
              </button>

              <!-- Dropdown panel -->
              <Transition name="dropdown">
                <div
                  v-if="menuOpen"
                  class="absolute right-0 top-[calc(100%+8px)] z-[100] w-56 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-[0_20px_55px_rgba(15,23,42,0.22)] backdrop-blur dark:border-slate-700/90 dark:bg-[#181a1f]/95"
                >
                  <!-- User info -->
                  <div
                    class="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/80 px-4 py-3 dark:border-slate-800 dark:from-[#20232a] dark:to-[#1b1e24]"
                  >
                    <p
                      class="font-bold text-[13px] text-slate-800 dark:text-white leading-tight truncate"
                    >
                      {{ (user as any)?.username || "Tài khoản" }}
                    </p>
                    <p
                      class="text-[11px] font-medium text-slate-400 truncate mt-0.5"
                    >
                      {{ (user as any)?.email || "user@example.com" }}
                    </p>
                  </div>

                  <!-- Nav items -->
                  <div class="p-2">
                    <NuxtLink
                      to="/profile"
                      @click="menuOpen = false"
                      class="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#20232a]"
                    >
                      <Icon
                        name="solar:user-circle-line-duotone"
                        size="17"
                        class="text-slate-400 shrink-0"
                      />
                      Tài khoản của tôi
                    </NuxtLink>
                    <NuxtLink
                      to="/wallet/deposit"
                      @click="menuOpen = false"
                      class="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#20232a]"
                    >
                      <Icon
                        name="solar:wallet-money-line-duotone"
                        size="17"
                        class="text-slate-400 shrink-0"
                      />
                      Nạp tiền
                    </NuxtLink>
                    <NuxtLink
                      to="/orders"
                      @click="menuOpen = false"
                      class="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#20232a]"
                    >
                      <Icon
                        name="solar:bag-line-duotone"
                        size="17"
                        class="text-slate-400 shrink-0"
                      />
                      Đơn hàng của tôi
                    </NuxtLink>
                    <NuxtLink
                      to="/api-keys"
                      @click="menuOpen = false"
                      class="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#20232a]"
                    >
                      <Icon
                        name="solar:key-minimalistic-square-line-duotone"
                        size="17"
                        class="text-slate-400 shrink-0"
                      />
                      API Keys
                    </NuxtLink>

                    <!-- Divider + Logout -->
                    <div
                      class="border-t border-slate-100 dark:border-slate-800/80 mt-1 pt-1"
                    >
                      <button
                        @click="handleLogout"
                        class="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-bold text-[#e43a45] transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/20"
                      >
                        <Icon
                          name="solar:logout-2-line-duotone"
                          size="17"
                          class="shrink-0"
                        />
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </template>

          <template v-else>
            <div class="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
            <NuxtLink
              to="/auth/login"
              class="flex items-center gap-2 pl-2 pr-4 py-1.5 bg-[#f1f5f9] dark:bg-[#20232a] rounded-[8px] hover:bg-primary/10 transition-colors group"
            >
              <Icon
                name="solar:user-line-duotone"
                size="18"
                class="text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors"
              />
              <span
                class="text-[13px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors"
                >Đăng nhập</span
              >
            </NuxtLink>
          </template>
        </div>
      </div>
    </header>

    <transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-120 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="mobileSearchOpen"
        class="fixed inset-0 z-[130] bg-slate-950/45 backdrop-blur-[2px] md:hidden"
        @click="closeMobileSearch"
      >
        <div
          class="mx-3 mt-20 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-[#181a1f]"
          @click.stop
        >
          <div class="flex items-center gap-2">
            <input
              ref="mobileSearchInputRef"
              v-model="searchKeyword"
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              class="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] font-medium text-slate-800 outline-none transition focus:border-primary/40 focus:bg-white dark:border-slate-700 dark:bg-[#20232a] dark:text-slate-100"
              @keydown.enter.prevent="submitSearch"
            />
            <button
              type="button"
              class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:border-primary/30 hover:text-primary dark:border-slate-700 dark:bg-[#20232a] dark:text-slate-300"
              aria-label="Đóng tìm kiếm"
              @click="closeMobileSearch"
            >
              <Icon name="solar:close-circle-line-duotone" size="20" />
            </button>
          </div>

          <button
            type="button"
            class="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[13px] font-bold text-white transition-colors hover:bg-primary/90"
            @click="submitSearch"
          >
            <Icon name="solar:magnifer-line-duotone" size="17" />
            Tìm kiếm
          </button>

          <div
            v-if="canShowMobileSearchPanel"
            class="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#20232a]"
          >
            <div
              v-if="searchLoading"
              class="px-4 py-3 text-[12px] font-medium text-slate-500 dark:text-slate-400"
            >
              Đang tìm kiếm...
            </div>

            <button
              v-for="item in searchResults"
              :key="item.id"
              type="button"
              class="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-left transition-colors last:border-none hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900/50"
              @click="goToProduct(item)"
            >
              <div
                class="w-28 shrink-0 self-start rounded-md border border-slate-200 bg-white p-[3px] dark:border-slate-700 dark:bg-[#181a1f]"
              >
                <img
                  v-if="item.image"
                  :src="item.image"
                  :alt="item.name"
                  class="w-full rounded-[4px]"
                />
                <Icon
                  v-else
                  name="solar:box-minimalistic-line-duotone"
                  size="16"
                  class="mx-auto my-2 text-slate-300 dark:text-slate-600"
                />
              </div>

              <div class="min-w-0 flex-1">
                <p
                  class="line-clamp-2 text-[13px] font-semibold text-slate-800 dark:text-slate-100"
                >
                  {{ item.name }}
                </p>
                <p
                  class="mt-1 text-[12px] font-mono font-bold text-slate-600 dark:text-slate-300"
                >
                  {{ formatPrice(item.minPrice) }}
                </p>
              </div>
            </button>

            <div
              v-if="!searchLoading && !searchResults.length"
              class="px-4 py-3 text-[12px] font-medium text-slate-500 dark:text-slate-400"
            >
              Không có sản phẩm phù hợp
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
  .dropdown-enter-active,
  .dropdown-leave-active {
    transition:
      opacity 0.15s ease,
      transform 0.15s ease;
  }
  .dropdown-enter-from,
  .dropdown-leave-to {
    opacity: 0;
    transform: translateY(-6px);
  }
</style>
