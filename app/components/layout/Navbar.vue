<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";

interface NavbarCategory {
  id: number;
  name: string;
  slug: string | null;
  image?: string | null;
  productCount: number;
}

const route = useRoute();
const { loggedIn } = useUserSession();
const { totalItems } = useCart();
const {
  balance: userBalance,
  isLoading,
  fetchBalance,
  clearBalance,
} = useUserBalance();

const { data: categoriesData } = await useFetch<NavbarCategory[]>(
  "/api/categories",
  {
    key: "layout-navbar-categories",
    default: () => [],
  },
);

const categories = computed(() => categoriesData.value || []);
const featuredCategory = computed(() => categories.value[0] || null);
const categoriesMenuOpen = ref(false);
const mobileMenuOpen = ref(false);
const mobileCategoriesOpen = ref(false);
const bottomCategoriesOpen = ref(false);
const mobileMenuButtonRef = ref<HTMLButtonElement | null>(null);
const mobileMenuCloseButtonRef = ref<HTMLButtonElement | null>(null);
const categoriesMenuRef = ref<HTMLElement | null>(null);
const closeTimer = ref<ReturnType<typeof setTimeout> | null>(null);

const navItems = [
  {
    label: "Nạp tiền",
    to: "/wallet/deposit",
    icon: "solar:wallet-linear",
    mobileIcon: "solar:wallet-money-line-duotone",
    badge: "Hot",
  },
  {
    label: "Đơn hàng",
    to: "/orders",
    icon: "solar:bag-linear",
    mobileIcon: "solar:bag-line-duotone",
  },
  {
    label: "Hỗ trợ",
    to: "/support",
    icon: "solar:chat-round-line-duotone",
    mobileIcon: "solar:chat-round-line-duotone",
  },
  {
    label: "API Docs",
    to: "/document-api",
    icon: "solar:document-text-line-duotone",
    mobileIcon: "solar:document-text-line-duotone",
  },
];

const fetchUserBalance = async () => {
  if (!loggedIn.value || isLoading.value) return;

  try {
    await fetchBalance();
  } catch (error) {
    console.error("Failed to fetch user balance:", error);
  }
};

const isActiveLink = (to: string) => route.path.startsWith(to);
const isCategoriesActive = computed(() => route.path.startsWith("/categories"));

const resolveCategoryLink = (category: NavbarCategory) =>
  category.slug ? `/categories/${category.slug}` : `/categories/${category.id}`;

const clearCloseTimer = () => {
  if (closeTimer.value) {
    clearTimeout(closeTimer.value);
    closeTimer.value = null;
  }
};

const openCategoriesMenu = () => {
  clearCloseTimer();
  categoriesMenuOpen.value = true;
};

const scheduleCloseCategoriesMenu = () => {
  clearCloseTimer();
  closeTimer.value = setTimeout(() => {
    categoriesMenuOpen.value = false;
    closeTimer.value = null;
  }, 140);
};

const toggleCategoriesMenu = () => {
  clearCloseTimer();
  categoriesMenuOpen.value = !categoriesMenuOpen.value;
};

const closeCategoriesMenu = () => {
  clearCloseTimer();
  categoriesMenuOpen.value = false;
};

const openMobileMenu = async () => {
  mobileMenuOpen.value = true;
  await nextTick();
  mobileMenuCloseButtonRef.value?.focus();
};

const closeMobileMenu = () => {
  mobileMenuOpen.value = false;
  mobileCategoriesOpen.value = false;
  nextTick(() => {
    mobileMenuButtonRef.value?.focus();
  });
};

const toggleMobileCategories = () => {
  mobileCategoriesOpen.value = !mobileCategoriesOpen.value;
};

const toggleBottomCategoriesMenu = () => {
  bottomCategoriesOpen.value = !bottomCategoriesOpen.value;
};

const closeBottomCategoriesMenu = () => {
  bottomCategoriesOpen.value = false;
};

const handleSelectBottomCategory = async (category: NavbarCategory) => {
  closeBottomCategoriesMenu();
  await navigateTo(resolveCategoryLink(category));
};

const handleWindowClick = (event: MouseEvent) => {
  const target = event.target as Node | null;

  if (
    categoriesMenuRef.value &&
    target &&
    !categoriesMenuRef.value.contains(target)
  ) {
    closeCategoriesMenu();
  }
};

const handleWindowKeydown = (event: KeyboardEvent) => {
  if (event.key !== "Escape") return;

  if (mobileMenuOpen.value) {
    closeMobileMenu();
    return;
  }

  if (bottomCategoriesOpen.value) {
    closeBottomCategoriesMenu();
    return;
  }

  if (categoriesMenuOpen.value) {
    closeCategoriesMenu();
  }
};

onMounted(() => {
  if (loggedIn.value) {
    fetchUserBalance();
  }

  window.addEventListener("click", handleWindowClick);
  window.addEventListener("keydown", handleWindowKeydown);
});

onBeforeUnmount(() => {
  clearCloseTimer();
  window.removeEventListener("click", handleWindowClick);
  window.removeEventListener("keydown", handleWindowKeydown);
});

watch(
  () => loggedIn.value,
  (isLoggedIn) => {
    if (isLoggedIn) {
      fetchUserBalance();
    } else {
      clearBalance();
    }
  },
);

watch(
  () => route.fullPath,
  () => {
    closeCategoriesMenu();
    closeMobileMenu();
    closeBottomCategoriesMenu();
  },
);

watch(
  () => mobileMenuOpen.value,
  (isOpen) => {
    if (isOpen) {
      closeBottomCategoriesMenu();
    }
  },
);
</script>

<template>
  <nav
    class="relative border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#181a1f]"
    :class="mobileMenuOpen ? 'z-[140]' : 'z-[60]'"
  >
    <div
      class="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-4 lg:px-6"
    >
      <div class="flex items-center gap-3 lg:hidden">
        <button
          ref="mobileMenuButtonRef"
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:border-primary/30 hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          :aria-expanded="mobileMenuOpen"
          aria-label="Mở menu"
          @click="openMobileMenu"
        >
          <Icon name="solar:hamburger-menu-line-duotone" size="20" />
        </button>
      </div>

      <ul class="hidden items-center gap-2 sm:gap-6 lg:flex lg:gap-8">
        <li
          ref="categoriesMenuRef"
          class="relative"
          @mouseenter="openCategoriesMenu"
          @mouseleave="scheduleCloseCategoriesMenu"
        >
          <button
            type="button"
            class="inline-flex items-center gap-2 whitespace-nowrap py-4 text-[13px] font-bold transition-colors"
            :class="
              isCategoriesActive
                ? 'text-primary'
                : 'text-slate-600 hover:text-primary dark:text-slate-300'
            "
            @click.stop="toggleCategoriesMenu"
          >
            <Icon name="solar:widget-linear" size="18" />
            Danh mục
            <Icon
              name="solar:alt-arrow-down-linear"
              size="14"
              class="transition-transform duration-200"
              :class="categoriesMenuOpen ? 'rotate-180' : ''"
            />
          </button>

          <transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-120 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 translate-y-1"
          >
            <div
              v-if="categoriesMenuOpen"
              class="absolute left-0 top-full z-[90] w-[min(94vw,760px)] pt-3"
            >
              <div class="h-3"></div>

              <div
                class="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_26px_80px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-[#181a1f]"
              >
                <div class="p-4 sm:p-5">
                  <div
                    class="flex flex-col gap-3 border-b border-slate-100 px-1 pb-4 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between mb-4"
                  >
                    <div>
                      <p
                        class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400"
                      >
                        Browse
                      </p>
                      <p
                        class="mt-1 text-base font-bold text-slate-800 dark:text-slate-100"
                      >
                        Khám phá danh mục
                      </p>
                    </div>

                    <NuxtLink
                      to="/categories"
                      class="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3.5 py-2 text-[12px] font-bold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary dark:border-slate-700 dark:text-slate-300"
                    >
                      Tất cả danh mục
                      <Icon name="solar:alt-arrow-right-linear" size="14" />
                    </NuxtLink>
                  </div>

                  <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <NuxtLink
                      v-for="category in categories"
                      :key="category.id"
                      :to="resolveCategoryLink(category)"
                      class="group flex items-center gap-3 rounded-2xl border border-slate-200 px-3.5 py-3.5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-slate-50 hover:shadow-sm dark:border-slate-800 dark:hover:bg-slate-900/50"
                    >
                      <div
                        class="w-20 shrink-0 self-start rounded-md border border-slate-200 bg-white p-[3px] dark:border-slate-700 dark:bg-[#20232a]"
                      >
                        <img
                          v-if="category.image"
                          :src="category.image"
                          :alt="category.name"
                          class="w-full rounded-[4px]"
                        />
                        <Icon
                          v-else
                          name="solar:widget-5-line-duotone"
                          size="16"
                          class="mx-auto my-2 text-slate-300 dark:text-slate-600"
                        />
                      </div>

                      <div class="min-w-0 flex-1">
                        <p
                          class="truncate text-[13px] font-bold text-slate-800 transition-colors group-hover:text-primary dark:text-slate-100"
                        >
                          {{ category.name }}
                        </p>
                        <p class="mt-1 text-[11px] text-slate-400">
                          {{ category.productCount }} sản phẩm
                        </p>
                      </div>

                      <Icon
                        name="solar:alt-arrow-right-linear"
                        size="15"
                        class="shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-primary dark:text-slate-600"
                      />
                    </NuxtLink>
                  </div>

                  <div
                    v-if="!categories.length"
                    class="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-[13px] font-medium text-slate-400 dark:border-slate-800"
                  >
                    Chưa có danh mục để hiển thị.
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </li>

        <li v-for="item in navItems" :key="item.to">
          <NuxtLink
            :to="item.to"
            class="inline-flex items-center gap-2 whitespace-nowrap py-4 text-[13px] font-bold transition-colors"
            :class="
              isActiveLink(item.to)
                ? 'text-primary'
                : 'text-slate-600 hover:text-primary dark:text-slate-300'
            "
          >
            <Icon :name="item.icon" size="18" />
            {{ item.label }}
            <span
              v-if="item.badge"
              class="rounded bg-orange-500 px-1.5 py-0.5 text-[9px] uppercase text-white"
            >
              {{ item.badge }}
            </span>
          </NuxtLink>
        </li>
      </ul>

      <div class="hidden items-center lg:flex">
        <template v-if="loggedIn">
          <div
            class="flex items-center gap-3 rounded-[8px] border border-slate-200 bg-[#f1f5f9] py-1.5 pl-1.5 pr-4 dark:border-slate-800 dark:bg-[#20232a]"
          >
            <div
              class="flex h-8 w-8 items-center justify-center rounded-[6px] bg-primary text-white shadow-md shadow-primary/20"
            >
              <Icon name="solar:wallet-money-bold" size="18" />
            </div>
            <div class="flex flex-col justify-center leading-none">
              <span
                class="mb-1 text-[9px] font-bold uppercase tracking-widest text-slate-400"
              >
                Số dư tài khoản
              </span>
              <span class="text-[14px] font-bold text-primary">
                {{ userBalance.toLocaleString() }}đ
              </span>
            </div>
            <NuxtLink
              to="/wallet/deposit"
              class="group ml-2 flex h-7 w-7 items-center justify-center rounded-[6px] border border-slate-200 bg-white text-slate-600 transition-all hover:border-primary hover:bg-primary hover:text-white dark:border-slate-700 dark:bg-[#181a1f] dark:text-slate-400"
              title="Nạp nhanh"
            >
              <Icon
                name="solar:add-square-bold-duotone"
                size="16"
                class="transition-transform group-hover:scale-110"
              />
            </NuxtLink>
          </div>
        </template>
      </div>
    </div>

    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="mobileMenuOpen"
        class="fixed inset-0 z-[150] bg-slate-950/45 backdrop-blur-[2px] lg:hidden"
        @click="closeMobileMenu"
      />
    </transition>

    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="-translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="-translate-x-full"
    >
      <aside
        v-if="mobileMenuOpen"
        class="fixed inset-y-0 left-0 z-[160] flex w-[min(86vw,340px)] flex-col border-r border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.24)] dark:border-slate-800 dark:bg-[#181a1f] lg:hidden"
      >
        <div
          class="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-800"
        >
          <div>
            <p class="text-[14px] font-bold uppercase tracking-[0.18em]">
              Menu
            </p>
          </div>

          <button
            ref="mobileMenuCloseButtonRef"
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:border-primary/30 hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            aria-label="Đóng menu"
            @click="closeMobileMenu"
          >
            <Icon name="solar:close-circle-line-duotone" size="20" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-4 py-4">
          <div
            v-if="loggedIn"
            class="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60"
          >
            <p
              class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400"
            >
              Số dư
            </p>
            <div class="mt-2 flex items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/20"
                >
                  <Icon name="solar:wallet-money-line-duotone" size="18" />
                </div>
                <div>
                  <p class="text-sm font-bold text-primary">
                    {{ userBalance.toLocaleString() }}đ
                  </p>
                  <p class="text-[11px] text-slate-400">Tài khoản của bạn</p>
                </div>
              </div>

              <NuxtLink
                to="/wallet/deposit"
                class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:border-primary hover:bg-primary hover:text-white dark:border-slate-700 dark:bg-[#181a1f] dark:text-slate-300"
                @click="closeMobileMenu"
              >
                <Icon name="solar:add-circle-line-duotone" size="18" />
              </NuxtLink>
            </div>
          </div>

          <div class="space-y-2">
            <div class="rounded-2xl">
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[14px] font-bold transition-colors"
                :class="
                  isCategoriesActive || mobileCategoriesOpen
                    ? 'bg-primary/5 text-primary'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-primary dark:text-slate-200 dark:hover:bg-slate-900/60'
                "
                @click="toggleMobileCategories"
              >
                <Icon name="solar:widget-3-line-duotone" size="18" />
                <span class="flex-1 text-left">Danh mục</span>
                <Icon
                  name="solar:alt-arrow-down-line-duotone"
                  size="16"
                  class="transition-transform duration-200"
                  :class="mobileCategoriesOpen ? 'rotate-180' : ''"
                />
              </button>

              <transition
                enter-active-class="transition duration-200 ease-out"
                enter-from-class="opacity-0 -translate-y-1"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition duration-150 ease-in"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-1"
              >
                <div v-if="mobileCategoriesOpen" class="mt-2 space-y-1 pl-3">
                  <NuxtLink
                    to="/categories"
                    class="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary dark:text-slate-300 dark:hover:bg-slate-900/60"
                    @click="closeMobileMenu"
                  >
                    <Icon name="solar:layers-line-duotone" size="16" />
                    Tất cả danh mục
                  </NuxtLink>

                  <NuxtLink
                    v-for="category in categories"
                    :key="category.id"
                    :to="resolveCategoryLink(category)"
                    class="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[13px] font-semibold transition-colors hover:bg-slate-50 hover:text-primary dark:text-slate-200 dark:hover:bg-slate-900/60"
                    @click="closeMobileMenu"
                  >
                    <div
                      class="w-28 shrink-0 self-start rounded-md border border-slate-200 bg-white p-[3px] dark:border-slate-700 dark:bg-[#181a1f]"
                    >
                      <img
                        v-if="category.image"
                        :src="category.image"
                        :alt="category.name"
                        class="w-full rounded-[4px]"
                      />
                      <Icon
                        v-else
                        name="solar:widget-5-line-duotone"
                        size="16"
                        class="mx-auto my-2 text-slate-300 dark:text-slate-600"
                      />
                    </div>

                    <div class="min-w-0 flex-1">
                      <p class="truncate">
                        {{ category.name }}
                      </p>
                      <p class="mt-0.5 text-[11px] text-slate-400">
                        {{ category.productCount }} sản phẩm
                      </p>
                    </div>
                  </NuxtLink>

                  <div
                    v-if="!categories.length"
                    class="rounded-2xl bg-slate-50 px-4 py-4 text-center text-[12px] text-slate-400 dark:bg-slate-900/50"
                  >
                    Chưa có danh mục để hiển thị.
                  </div>
                </div>
              </transition>
            </div>

            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 rounded-2xl px-4 py-3 text-[14px] font-bold transition-colors"
              :class="
                isActiveLink(item.to)
                  ? 'bg-primary/5 text-primary'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-primary dark:text-slate-200 dark:hover:bg-slate-900/60'
              "
              @click="closeMobileMenu"
            >
              <Icon :name="item.mobileIcon || item.icon" size="18" />
              <span class="flex-1">{{ item.label }}</span>
              <span
                v-if="item.badge"
                class="rounded bg-orange-500 px-1.5 py-0.5 text-[9px] uppercase text-white"
              >
                {{ item.badge }}
              </span>
            </NuxtLink>
          </div>
        </div>
      </aside>
    </transition>

    <div
      v-if="bottomCategoriesOpen && !mobileMenuOpen"
      class="fixed inset-0 z-[144] lg:hidden"
      @click="closeBottomCategoriesMenu"
    />

    <div
      v-if="!mobileMenuOpen"
      class="fixed inset-x-0 bottom-0 z-[145] px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 lg:hidden"
    >
      <transition
        enter-active-class="transition duration-180 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-130 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-2"
      >
        <div
          v-if="bottomCategoriesOpen"
          class="mb-2 overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-[0_18px_40px_rgba(15,23,42,0.18)] backdrop-blur dark:border-slate-700/90 dark:bg-[#181a1f]/95"
          @click.stop
        >
          <div
            class="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700"
          >
            <p
              class="text-[12px] font-bold uppercase tracking-[0.15em] text-slate-400"
            >
              Danh mục
            </p>
            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-primary/30 hover:text-primary dark:border-slate-700 dark:bg-[#20232a] dark:text-slate-300"
              aria-label="Đóng danh mục"
              @click="closeBottomCategoriesMenu"
            >
              <Icon name="solar:close-circle-line-duotone" size="17" />
            </button>
          </div>

          <div class="max-h-[45vh] overflow-y-auto p-3">
            <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <button
                v-for="category in categories"
                :key="`bottom-${category.id}`"
                type="button"
                class="group flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-3 text-center transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#20232a] dark:hover:bg-slate-900/60"
                @click="handleSelectBottomCategory(category)"
              >
                <div
                  class="w-full rounded-md border border-slate-200 bg-white p-[3px] dark:border-slate-700 dark:bg-[#181a1f]"
                >
                  <img
                    v-if="category.image"
                    :src="category.image"
                    :alt="category.name"
                    class="w-full rounded-[4px]"
                  />
                  <Icon
                    v-else
                    name="solar:widget-5-line-duotone"
                    size="18"
                    class="mx-auto my-2 text-slate-300 dark:text-slate-600"
                  />
                </div>

                <div class="mt-2 min-w-0 w-full">
                  <p
                    class="truncate text-[12px] font-bold text-slate-800 group-hover:text-primary dark:text-slate-100"
                  >
                    {{ category.name }}
                  </p>
                  <p class="mt-0.5 text-[10px] text-slate-400">
                    {{ category.productCount }} sản phẩm
                  </p>
                </div>
              </button>
            </div>

            <div
              v-if="!categories.length"
              class="mt-1 rounded-2xl border border-dashed border-slate-200 px-3 py-6 text-center text-[12px] font-medium text-slate-400 dark:border-slate-700"
            >
              Chưa có danh mục để hiển thị.
            </div>
          </div>
        </div>
      </transition>

      <div
        class="mx-auto max-w-md rounded-3xl border border-slate-200/80 bg-white/95 p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.2)] backdrop-blur dark:border-slate-700/80 dark:bg-[#181a1f]/95"
      >
        <div class="grid grid-cols-5 gap-1">
          <NuxtLink
            to="/"
            class="relative flex h-12 flex-col items-center justify-center rounded-2xl text-[10px] font-bold transition-colors"
            :class="
              route.path === '/'
                ? 'bg-primary/10 text-primary'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/80'
            "
          >
            <Icon name="solar:home-smile-line-duotone" size="18" />
            <span class="mt-0.5">Trang chủ</span>
          </NuxtLink>

          <button
            type="button"
            class="relative flex h-12 flex-col items-center justify-center rounded-2xl text-[10px] font-bold transition-colors"
            :class="
              bottomCategoriesOpen || route.path.startsWith('/categories')
                ? 'bg-primary/10 text-primary'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/80'
            "
            aria-label="Mở danh sách danh mục"
            @click="toggleBottomCategoriesMenu"
          >
            <Icon name="solar:widget-3-line-duotone" size="18" />
            <span class="mt-0.5">Danh mục</span>
          </button>

          <button
            type="button"
            class="relative flex h-12 flex-col items-center justify-center rounded-2xl text-[10px] font-bold text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/80"
            aria-label="Mở menu"
            @click="openMobileMenu"
          >
            <Icon name="solar:hamburger-menu-line-duotone" size="18" />
            <span class="mt-0.5">Menu</span>
          </button>

          <NuxtLink
            to="/search"
            class="relative flex h-12 flex-col items-center justify-center rounded-2xl text-[10px] font-bold transition-colors"
            :class="
              route.path.startsWith('/search')
                ? 'bg-primary/10 text-primary'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/80'
            "
          >
            <Icon name="solar:magnifer-line-duotone" size="18" />
            <span class="mt-0.5">Tìm kiếm</span>
          </NuxtLink>

          <NuxtLink
            to="/cart"
            class="relative flex h-12 flex-col items-center justify-center rounded-2xl text-[10px] font-bold transition-colors"
            :class="
              route.path.startsWith('/cart')
                ? 'bg-primary/10 text-primary'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/80'
            "
          >
            <Icon name="solar:cart-large-2-line-duotone" size="18" />
            <span class="mt-0.5">Giỏ hàng</span>
            <span
              v-if="totalItems > 0"
              class="absolute right-3 top-1.5 min-w-[16px] rounded-full bg-rose-500 px-1 text-center text-[9px] font-bold leading-4 text-white"
            >
              {{ totalItems > 99 ? "99+" : totalItems }}
            </span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </nav>
</template>
