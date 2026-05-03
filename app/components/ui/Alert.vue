<script setup lang="ts">
interface Props {
  type?: 'success' | 'error' | 'warning' | 'info'
  title?: string
  icon?: string
  closable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  closable: false
})

const emit = defineEmits(['close'])

const config = {
  success: {
    container: 'border-emerald-100 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-900/10',
    iconClip: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
    text: 'text-emerald-700 dark:text-emerald-300',
    icon: 'solar:check-circle-bold-duotone'
  },
  error: {
    container: 'border-rose-100 bg-rose-50/50 dark:border-rose-900/30 dark:bg-rose-900/10',
    iconClip: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400',
    text: 'text-rose-700 dark:text-rose-300',
    icon: 'solar:danger-triangle-bold-duotone'
  },
  warning: {
    container: 'border-amber-100 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-900/10',
    iconClip: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
    text: 'text-amber-700 dark:text-amber-300',
    icon: 'solar:danger-triangle-bold-duotone'
  },
  info: {
    container: 'border-sky-100 bg-sky-50/50 dark:border-sky-900/30 dark:bg-sky-900/10',
    iconClip: 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400',
    text: 'text-sky-700 dark:text-sky-300',
    icon: 'solar:info-circle-bold-duotone'
  }
}

const current = computed(() => config[props.type])
</script>

<template>
  <div 
    class="flex items-start gap-3 rounded-2xl border p-4 transition-all"
    :class="current.container"
  >
    <!-- Icon -->
    <div 
      class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
      :class="current.iconClip"
    >
      <Icon :name="icon || current.icon" size="14" />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <h5 v-if="title" class="text-sm font-bold mb-0.5" :class="current.text">
        {{ title }}
      </h5>
      <div class="text-[11px] leading-relaxed sm:text-xs" :class="current.text">
        <slot />
      </div>
    </div>

    <!-- Close Button -->
    <button 
      v-if="closable"
      @click="emit('close')"
      class="shrink-0 -mr-1 -mt-1 p-1 rounded-lg transition-colors opacity-60 hover:opacity-100"
      :class="current.text"
    >
      <Icon name="solar:close-circle-line-duotone" size="18" />
    </button>
  </div>
</template>
