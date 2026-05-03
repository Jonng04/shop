<script setup lang="ts">
const model = defineModel<string | number>()

defineProps<{
  type?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  id?: string
  class?: any
}>()
</script>

<template>
  <div class="relative w-full">
    <div v-if="$slots['left-icon']" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center justify-center">
      <slot name="left-icon" />
    </div>
    <input 
      :type="type || 'text'" 
      :id="id"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      v-model="model"
      :class="[
        'h-[37.33px] w-full rounded-[8px] border border-slate-200 text-sm outline-none transition-all focus:bg-white focus:border-primary/40 focus:ring-4 focus:ring-primary/5 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:disabled:bg-slate-800/50',
        $slots['left-icon'] ? 'pl-10 pr-3' : 'px-3',
        $attrs.class
      ]"
    />
  </div>
</template>
