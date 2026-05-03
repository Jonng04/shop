<script setup lang="ts">
  const isSidebarOpen = useState("isSidebarOpen");
  const colorMode = useColorMode();
  const isDark = computed(() => colorMode.value === "dark");
  const toggleTheme = () => {
    colorMode.preference = isDark.value ? "light" : "dark";
  };
</script>

<template>
  <header
    class="sticky top-0 z-20 flex h-[60px] shrink-0 items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 backdrop-blur-md sm:px-6 dark:border-slate-800 dark:bg-slate-950/90"
  >
    <!-- Left: Mobile Menu -->
    <div class="flex flex-1 items-center gap-4">
      <button
        @click="isSidebarOpen = true"
        class="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden dark:hover:bg-slate-800 dark:hover:text-slate-300"
      >
        <Icon name="solar:hamburger-menu-line-duotone" size="22" />
      </button>
    </div>

    <!-- Right: Quick actions -->
    <div class="flex items-center gap-1 sm:gap-1.5">
      <!-- Go to store -->
      <NuxtLink
        to="/"
        target="_blank"
        class="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 md:flex dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        <Icon name="solar:earth-bold-duotone" class="h-[15px] w-[15px]" />
        Cửa hàng
      </NuxtLink>

      <div
        class="mx-1 hidden h-4 w-px bg-slate-200 md:block dark:bg-slate-700"
      />

      <!-- Theme toggle -->
      <button
        @click="toggleTheme"
        class="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        :title="isDark ? 'Chuyển light mode' : 'Chuyển dark mode'"
      >
        <Transition name="theme-icon" mode="out-in">
          <Icon
            v-if="isDark"
            key="sun"
            name="solar:sun-bold-duotone"
            class="h-[18px] w-[18px] text-amber-400"
          />
          <Icon
            v-else
            key="moon"
            name="solar:moon-bold-duotone"
            class="h-[18px] w-[18px]"
          />
        </Transition>
      </button>

      <!-- Notifications -->
      <button
        class="relative flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
      >
        <Icon name="solar:bell-bing-line-duotone" class="h-[18px] w-[18px]" />
        <span
          class="absolute right-1.5 top-1.5 h-[5px] w-[5px] rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-950"
        />
      </button>

      <div class="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />

      <!-- Profile -->
      <button
        class="group flex items-center gap-2 rounded-full border border-transparent p-1 pl-2.5 transition hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800"
      >
        <div class="hidden text-right md:block">
          <p
            class="text-[12px] font-bold leading-none text-slate-700 dark:text-slate-200"
          >
            Admin
          </p>
        </div>
        <img
          src="https://ui-avatars.com/api/?name=AD&background=065f46&color=fff&rounded=true"
          alt="Avatar"
          class="h-7 w-7 rounded-full shadow-sm ring-[1.5px] ring-white dark:ring-slate-800"
        />
      </button>
    </div>
  </header>
</template>

<style scoped>
  .theme-icon-enter-active,
  .theme-icon-leave-active {
    transition:
      opacity 0.15s ease,
      transform 0.15s ease;
  }
  .theme-icon-enter-from {
    opacity: 0;
    transform: rotate(-30deg) scale(0.8);
  }
  .theme-icon-leave-to {
    opacity: 0;
    transform: rotate(30deg) scale(0.8);
  }
</style>
