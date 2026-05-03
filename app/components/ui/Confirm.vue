<script setup lang="ts">
interface Props {
  modelValue: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  variant?: "danger" | "primary";
}

const props = withDefaults(defineProps<Props>(), {
  title: "Xác nhận hành động",
  message: "Bạn có chắc chắn muốn thực hiện hành động này?",
  confirmLabel: "Xác nhận",
  cancelLabel: "Hủy bỏ",
  loading: false,
  variant: "danger",
});

const emit = defineEmits(["update:modelValue", "confirm", "cancel"]);

const close = () => {
  if (props.loading) return;
  emit("update:modelValue", false);
  emit("cancel");
};

const confirm = () => {
  emit("confirm");
};
</script>

<template>
  <UiModal
    :model-value="modelValue"
    @update:model-value="close"
    :title="title"
    size="sm"
  >
    <div class="flex flex-col items-center text-center p-2">
      <div 
        class="h-16 w-16 rounded-full flex items-center justify-center mb-4"
        :class="[
          variant === 'danger' ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-500'
        ]"
      >
        <Icon 
          :name="variant === 'danger' ? 'solar:trash-bin-trash-bold-duotone' : 'solar:info-circle-bold-duotone'" 
          size="32" 
        />
      </div>
      <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
        {{ message }}
      </p>
    </div>

    <template #footer>
      <div class="flex gap-3 w-full">
        <UiButton
          variant="outline"
          class="flex-1"
          @click="close"
          :disabled="loading"
        >
          {{ cancelLabel }}
        </UiButton>
        <UiButton
          :variant="variant as 'danger' | 'primary'"
          class="flex-1"
          :loading="loading"
          @click="confirm"
        >
          {{ confirmLabel }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
