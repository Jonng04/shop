<script setup lang="ts">
const props = defineProps<{
  total: number;
  pageSize: number;
  currentPage: number;
}>();

const emit = defineEmits(["update:currentPage", "update:pageSize"]);

const pageSizes = [
  { label: "10 / trang", value: 10 },
  { label: "20 / trang", value: 20 },
  { label: "50 / trang", value: 50 },
  { label: "100 / trang", value: 100 },
];

const localPageSize = computed({
  get: () => props.pageSize,
  set: (val) => emit("update:pageSize", val),
});

const totalPages = computed(() => Math.ceil(props.total / props.pageSize) || 1);

const setPage = (page: number) => {
  if (page < 1 || page > totalPages.value) return;
  emit("update:currentPage", page);
};
</script>

<template>
  <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
    <!-- Left: Status Info & Rows selector -->
    <div class="flex items-center gap-4">
      <p class="text-[11px] font-semibold text-slate-400 tracking-wider">
        Hiển thị
        <span class="text-slate-700 dark:text-slate-200"
          >{{ (currentPage - 1) * pageSize + 1 }}-{{
            Math.min(currentPage * pageSize, total)
          }}</span
        >
        trên
        <span class="text-slate-700 dark:text-slate-200">{{
          total.toLocaleString()
        }}</span>
      </p>

      <div
        class="hidden sm:block h-4 w-px bg-slate-200 dark:bg-slate-800"
      ></div>

      <div class="flex items-center gap-2">
        <span class="text-[11px] font-semibold text-slate-400 tracking-tighter"
          >Số dòng:</span
        >
        <div class="w-28">
          <UiDropdown
            v-model="localPageSize"
            :options="pageSizes"
            placement="top"
          />
        </div>
      </div>
    </div>

    <!-- Right: Page Navigation -->
    <div class="flex items-center gap-1.5">
      <button
        @click="setPage(currentPage - 1)"
        :disabled="currentPage === 1"
        class="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-all hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed dark:border-slate-700 dark:hover:bg-slate-800"
      >
        <Icon name="solar:alt-arrow-left-linear" size="14" />
      </button>

      <template v-for="p in totalPages" :key="p">
        <button
          v-if="
            p === 1 ||
            p === totalPages ||
            (p >= currentPage - 1 && p <= currentPage + 1)
          "
          @click="setPage(p)"
          :class="[
            'h-8 min-w-[32px] px-2 text-xs font-semibold rounded-lg transition-all',
            p === currentPage
              ? 'bg-primary text-white shadow-sm ring-2 ring-primary/20'
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400',
          ]"
        >
          {{ p }}
        </button>
        <span
          v-else-if="p === 2 || p === totalPages - 1"
          class="px-1 text-slate-300"
          >...</span
        >
      </template>

      <button
        @click="setPage(currentPage + 1)"
        :disabled="currentPage === totalPages"
        class="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-all hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed dark:border-slate-700 dark:hover:bg-slate-800"
      >
        <Icon name="solar:alt-arrow-right-linear" size="14" />
      </button>
    </div>
  </div>
</template>
