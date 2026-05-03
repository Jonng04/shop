<script setup lang="ts">
  const isSidebarOpen = useState("isSidebarOpen", () => false);

  // Tự động đóng sidebar khi chuyển trang trên mobile
  const route = useRoute();
  watch(
    () => route.fullPath,
    () => {
      isSidebarOpen.value = false;
    }
  );
</script>

<template>
  <div
    class="flex h-screen bg-slate-50 font-sans text-gray-800 dark:bg-[#0f1115] dark:text-slate-200"
  >
    <!-- Mobile Overlay -->
    <div
      v-if="isSidebarOpen"
      @click="isSidebarOpen = false"
      class="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm transition-opacity lg:hidden"
    ></div>

    <AdminLayoutSidebar />

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden relative">
      <AdminLayoutHeader />

      <main class="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
        <slot />
      </main>
    </div>
    <UiToast />
  </div>
</template>
