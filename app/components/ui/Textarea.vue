<script setup lang="ts">
  const model = defineModel<string>();

  defineProps<{
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    id?: string;
    rows?: number;
    class?: any;
  }>();
</script>

<template>
  <div class="relative w-full">
    <textarea
      :id="id"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :rows="rows ?? 3"
      v-model="model"
      :class="[
        'w-full rounded-[8px] border border-slate-200 text-sm outline-none transition-all resize-none focus:bg-white focus:border-primary/40 focus:ring-4 focus:ring-primary/5 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:disabled:bg-slate-800/50 px-3 py-2.5',
        $attrs.class,
      ]"
    />
  </div>
</template>
