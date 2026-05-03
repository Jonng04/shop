<script setup lang="ts" generic="T extends Record<string, any>">
interface Header {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  width?: string;
  sortable?: boolean;
}

const props = withDefaults(
  defineProps<{
    headers: Header[];
    items: T[];
    loading?: boolean;
    hoverable?: boolean;
    striped?: boolean;
    containerClass?: string;
  }>(),
  {
    loading: false,
    hoverable: true,
    striped: false,
    containerClass: "",
  },
);

const getAlignCls = (align?: "left" | "center" | "right") => {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
};
</script>

<template>
  <div
    class="overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900"
    :class="containerClass"
  >
    <div
      v-if="$slots.top"
      class="border-b border-slate-200/90 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6"
    >
      <slot name="top"></slot>
    </div>

    <div class="overflow-x-auto custom-scrollbar">
      <table class="w-full border-separate border-spacing-0 text-left text-sm">
        <thead class="bg-slate-50/70 dark:bg-slate-800/40">
          <tr>
            <th
              v-for="header in headers"
              :key="header.key"
              class="border-b border-r border-slate-200/80 px-6 py-4 text-[13px] font-bold whitespace-nowrap text-slate-800 last:border-r-0 dark:border-slate-800 dark:text-slate-100"
              :class="[getAlignCls(header.align)]"
              :style="{ width: header.width }"
            >
              <slot :name="`header(${header.key})`" :header="header">
                {{ header.label }}
              </slot>
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <template v-if="loading">
            <tr v-for="i in 5" :key="i" class="animate-pulse">
              <td
                v-for="header in headers"
                :key="header.key"
                class="border-r border-slate-100 px-6 py-4 last:border-r-0 dark:border-slate-800"
              >
                <div
                  class="h-4 w-full rounded bg-slate-100 opacity-50 dark:bg-slate-800"
                ></div>
              </td>
            </tr>
          </template>

          <template v-else-if="items.length === 0">
            <tr>
              <td :colspan="headers.length" class="px-6 py-12 text-center">
                <slot name="empty">
                  <div
                    class="flex flex-col items-center justify-center grayscale opacity-40"
                  >
                    <Icon
                      name="solar:box-minimalistic-line-duotone"
                      size="48"
                      class="mb-2 text-slate-400"
                    />
                    <p class="text-sm font-bold text-slate-500">
                      Chưa có dữ liệu
                    </p>
                  </div>
                </slot>
              </td>
            </tr>
          </template>

          <template v-else>
            <tr
              v-for="(item, index) in items"
              :key="index"
              class="group transition-colors"
              :class="[
                hoverable
                  ? 'hover:bg-slate-50/80 dark:hover:bg-slate-800/30'
                  : '',
                striped && index % 2 !== 0
                  ? 'bg-slate-50/70 dark:bg-slate-800/10'
                  : 'bg-white dark:bg-slate-900',
              ]"
            >
              <td
                v-for="header in headers"
                :key="header.key"
                class="border-r border-slate-100 px-6 py-4 transition-all last:border-r-0 dark:border-slate-800"
                :class="[getAlignCls(header.align)]"
              >
                <slot :name="`cell(${header.key})`" :item="item" :index="index">
                  <span
                    class="whitespace-nowrap font-medium text-slate-700 dark:text-slate-200"
                  >
                    {{ item[header.key] }}
                  </span>
                </slot>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div
      v-if="$slots.footer"
      class="border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e2e8f0;
  border-radius: 10px;
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #334155;
}
</style>
