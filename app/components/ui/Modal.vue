<script setup lang="ts">
interface Props {
  modelValue: boolean;
  title?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  showClose?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  size: "md",
  showClose: true,
});

const emit = defineEmits(["update:modelValue", "close"]);

const close = () => {
  emit("update:modelValue", false);
  emit("close");
};

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6"
    >
      <!-- Backdrop with its own transition -->
      <Transition
        appear
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          key="backdrop"
          @click="close"
          class="fixed inset-0 bg-slate-900/60 backdrop-blur-[4px]"
        ></div>
      </Transition>

      <!-- Modal Panel with its own transition -->
      <Transition
        appear
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 scale-95 translate-y-4"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 scale-100 translate-y-0"
        leave-to-class="opacity-0 scale-95 translate-y-4"
      >
        <div
          v-if="modelValue"
          key="panel"
          class="relative w-full bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden border border-slate-200 dark:bg-[#0f1011] dark:border-slate-800 transition-all transform"
          :class="sizeClasses[size]"
        >
          <!-- Header -->
          <div
            class="px-6 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#0f1011]"
          >
            <h3
              v-if="title"
              class="text-lg font-semibold text-slate-900 dark:text-white tracking-tight"
            >
              {{ title }}
            </h3>
            <button
              v-if="showClose"
              @click="close"
              class="group flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
            >
              <Icon
                name="solar:close-circle-bold"
                size="22"
                class="group-hover:rotate-90 transition-transform duration-300"
              />
            </button>
          </div>

          <!-- Body -->
          <div
            class="p-6 max-h-[75vh] overflow-y-auto custom-scrollbar bg-white dark:bg-[#0f1011]"
          >
            <slot />
          </div>

          <!-- Footer -->
          <div
            v-if="$slots.footer"
            class="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20"
          >
            <slot name="footer" />
          </div>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #334155;
}
</style>
