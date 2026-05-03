<script setup lang="ts">
interface Props {
  variant?: "success" | "error" | "warning" | "info" | "primary" | "slate";
  size?: "sm" | "md" | "lg";
  rounded?: boolean;
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "primary",
  size: "md",
  rounded: false,
});

const getVariantCls = () => {
  switch (props.variant) {
    case "success":
      return "bg-emerald-50/50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/10 dark:text-emerald-400 dark:border-emerald-900/30";
    case "error":
      return "bg-rose-50/50 text-rose-700 border-rose-100 dark:bg-rose-900/10 dark:text-rose-400 dark:border-rose-900/30";
    case "warning":
      return "bg-amber-50/50 text-amber-700 border-amber-100 dark:bg-amber-900/10 dark:text-amber-400 dark:border-amber-900/30";
    case "info":
      return "bg-sky-50/50 text-sky-700 border-sky-100 dark:bg-sky-900/10 dark:text-sky-400 dark:border-sky-900/30";
    case "primary":
      return "bg-primary/5 text-primary border-primary/10 dark:bg-primary/10 dark:text-primary-400 dark:border-primary-900/20";
    case "slate":
      return "bg-slate-50/50 text-slate-700 border-slate-200 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700";
    default:
      return "bg-primary/5 text-primary border-primary/10";
  }
};

const getSizeCls = () => {
  switch (props.size) {
    case "sm":
      return "px-2 py-0.5 text-[10px] font-semibold";
    case "md":
      return "px-2.5 py-1 text-[11px] font-semibold";
    case "lg":
      return "px-3 py-1 text-xs font-semibold";
    default:
      return "px-2.5 py-1 text-[11px] font-semibold";
  }
};
</script>

<template>
  <span
    class="inline-flex items-center justify-center whitespace-nowrap transition-colors border"
    :class="[
      getVariantCls(),
      getSizeCls(),
      rounded ? 'rounded-full' : 'rounded-md',
    ]"
  >
    <slot>{{ label }}</slot>
  </span>
</template>
