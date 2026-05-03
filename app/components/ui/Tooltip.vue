<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    text?: string;
    placement?: "top" | "bottom" | "left" | "right";
    disabled?: boolean;
    maxWidthClass?: string;
  }>(),
  {
    text: "",
    placement: "top",
    disabled: false,
    maxWidthClass: "max-w-[240px]",
  },
);

const isOpen = ref(false);

const open = () => {
  if (props.disabled) return;
  isOpen.value = true;
};

const close = () => {
  isOpen.value = false;
};

const panelPositionClass = computed(() => {
  switch (props.placement) {
    case "bottom":
      return "left-1/2 top-full mt-2 -translate-x-1/2";
    case "left":
      return "right-full top-1/2 mr-2 -translate-y-1/2";
    case "right":
      return "left-full top-1/2 ml-2 -translate-y-1/2";
    default:
      return "left-1/2 bottom-full mb-2 -translate-x-1/2";
  }
});

const arrowClass = computed(() => {
  switch (props.placement) {
    case "bottom":
      return "left-1/2 -top-1.5 -translate-x-1/2 border-x-[6px] border-b-[6px] border-x-transparent border-b-slate-900 dark:border-b-slate-700";
    case "left":
      return "-right-1.5 top-1/2 -translate-y-1/2 border-y-[6px] border-l-[6px] border-y-transparent border-l-slate-900 dark:border-l-slate-700";
    case "right":
      return "-left-1.5 top-1/2 -translate-y-1/2 border-y-[6px] border-r-[6px] border-y-transparent border-r-slate-900 dark:border-r-slate-700";
    default:
      return "left-1/2 -bottom-1.5 -translate-x-1/2 border-x-[6px] border-t-[6px] border-x-transparent border-t-slate-900 dark:border-t-slate-700";
  }
});
</script>

<template>
  <div
    class="relative inline-flex"
    @mouseenter="open"
    @mouseleave="close"
    @focusin="open"
    @focusout="close"
  >
    <slot />

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isOpen && !props.disabled"
        role="tooltip"
        class="pointer-events-none absolute z-[120] w-max rounded-[8px] border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg dark:border-slate-600 dark:bg-slate-700"
        :class="[panelPositionClass, props.maxWidthClass]"
      >
        <span class="absolute h-0 w-0" :class="arrowClass"></span>
        <slot name="content">
          {{ props.text }}
        </slot>
      </div>
    </Transition>
  </div>
</template>
