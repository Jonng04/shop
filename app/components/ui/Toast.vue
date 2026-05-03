<script setup lang="ts">
import { useToast } from '#imports'

const { toasts, remove } = useToast()

const getIcon = (type: string) => {
  switch (type) {
    case 'success': return 'lucide:check-circle'
    case 'error': return 'lucide:x-circle'
    case 'warning': return 'lucide:alert-circle'
    case 'info': return 'lucide:info'
    case 'loading': return 'lucide:loader-circle'
    default: return 'lucide:check-circle'
  }
}

const getBgColor = (type: string) => {
  switch (type) {
    case 'success': return 'bg-[#34C759]' // Apple Green
    case 'error': return 'bg-[#FF3B30]' // Apple Red
    case 'warning': return 'bg-[#FF9500]' // Apple Orange
    case 'info': return 'bg-[#007AFF]' // Apple Blue
    case 'loading': return 'bg-slate-800' // Apple Dark Mode Loading
    default: return 'bg-slate-800'
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-5 right-0 z-[200] flex w-full flex-col items-end gap-3 px-4 pointer-events-none sm:top-5 sm:right-5 sm:w-auto sm:px-0">
      <TransitionGroup
        enter-active-class="transition duration-400 cubic-bezier(0.175, 0.885, 0.32, 1.275)"
        enter-from-class="translate-x-full opacity-0 sm:translate-x-full scale-90"
        enter-to-class="translate-x-0 opacity-100 scale-100"
        leave-active-class="transition duration-300 ease-in absolute w-[calc(100%-2rem)] sm:w-full"
        leave-from-class="translate-x-0 opacity-100 scale-100"
        leave-to-class="translate-x-full opacity-0 scale-90"
        move-class="transition-all duration-400 ease-out"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto relative flex w-full sm:w-auto sm:min-w-[280px] max-w-[340px] items-center gap-3 overflow-hidden rounded-[16px] bg-white/80 p-2.5 pr-5 shadow-[0_8px_30px_rgb(0,0,0,0.08)] backdrop-blur-xl border border-white/50 dark:border-slate-700/50 dark:bg-slate-800/80 transition-all cursor-pointer hover:bg-white/90"
          @click="remove(toast.id)"
        >
          <!-- Icon Box -->
          <div 
            class="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] text-white shadow-sm transition-colors"
            :class="getBgColor(toast.type)"
          >
            <Icon :name="getIcon(toast.type)" size="20" stroke-width="2.5" :class="toast.type === 'loading' ? 'animate-spin' : ''" />
          </div>
          
          <!-- Content -->
          <div class="flex flex-1 flex-col py-0.5">
            <h4 class="text-[14px] font-bold tracking-tight text-slate-800 dark:text-slate-100 leading-tight">
              {{ toast.title }}
            </h4>
            <p v-if="toast.message" class="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400 leading-snug break-words">
              {{ toast.message }}
            </p>
          </div>

          <!-- Progress Bar at bottom -->
          <div 
            v-if="toast.duration > 0"
            class="absolute bottom-0 left-0 h-[2.5px] rounded-bl-[16px] origin-left shrink-progress opacity-80"
            :class="getBgColor(toast.type)"
            :style="{ 
              animationDuration: `${toast.duration}ms`
            }"
          ></div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.shrink-progress {
  animation-name: shrink;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}

@keyframes shrink {
  0% {
    width: 100%;
  }
  100% {
    width: 0%;
  }
}
</style>
