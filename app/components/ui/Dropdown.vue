<script setup lang="ts">

type DropdownOption = {
    label: string;
    value: string | number | boolean;
};

const model = defineModel<string | number | boolean>();

const props = withDefaults(defineProps<{
    options: DropdownOption[];
    minWidthClass?: string;
    fullWidth?: boolean;
    heightClass?: string;
    placement?: 'top' | 'bottom';
    disabled?: boolean;
    label?: string;
    placeholder?: string;
}>(), {
    minWidthClass: 'min-w-[120px]',
    fullWidth: true,
    heightClass: 'h-[37.33px]',
    placement: 'bottom',
    disabled: false,
    label: '',
    placeholder: 'Vui lòng chọn',
});

const isOpen = ref(false);
const rootRef = ref<HTMLElement | null>(null);
const calculatedPlacement = ref<'top' | 'bottom'>(props.placement);

const toggle = () => {
    if (props.disabled) return;
    
    if (!isOpen.value && rootRef.value) {
        // Respect explicit placement so dropdowns inside cards/tables can open predictably.
        calculatedPlacement.value = props.placement;
    }
    
    isOpen.value = !isOpen.value;
};

const selectedLabel = computed(() => {
    return props.options.find((option) => option.value === model.value)?.label || props.placeholder;
});

const selectOption = (value: string | number | boolean) => {
    model.value = value;
    isOpen.value = false;
};

const menuClasses = computed(() => {
    if (calculatedPlacement.value === 'top') {
        return 'bottom-full mb-1';
    }
    return 'top-full mt-1';
});

const transitionClasses = computed(() => {
    if (calculatedPlacement.value === 'top') {
        return {
            enterFrom: 'opacity-0 scale-95 translate-y-2',
            enterTo: 'opacity-100 scale-100 translate-y-0',
            leaveFrom: 'opacity-100 scale-100 translate-y-0',
            leaveTo: 'opacity-0 scale-95 translate-y-2'
        };
    }
    return {
        enterFrom: 'opacity-0 scale-95 translate-y-[-5px]',
        enterTo: 'opacity-100 scale-100 translate-y-0',
        leaveFrom: 'opacity-100 scale-100 translate-y-0',
        leaveTo: 'opacity-0 scale-95 translate-y-[-5px]'
    };
});

const handleDocumentClick = (event: MouseEvent) => {
    if (!rootRef.value) return;
    const target = event.target;
    if (!(target instanceof Node)) return;

    if (!rootRef.value.contains(target)) {
        isOpen.value = false;
    }
};

onMounted(() => {
    document.addEventListener('mousedown', handleDocumentClick);
});

onBeforeUnmount(() => {
    document.removeEventListener('mousedown', handleDocumentClick);
});
</script>

<template>
    <div ref="rootRef" class="relative" :class="fullWidth ? 'w-full' : 'inline-flex'">
        <label v-if="label" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{{ label }}</label>
        <button
            type="button"
            aria-haspopup="listbox"
            :aria-expanded="isOpen"
            class="inline-flex items-center justify-between gap-2 rounded-[8px] border border-slate-200 bg-white px-3 text-sm font-medium outline-none transition-all focus:bg-white focus:border-primary/40 focus:ring-4 focus:ring-primary/5 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:disabled:bg-slate-800/50"
            :class="[
                heightClass,
                fullWidth ? 'w-full' : minWidthClass
            ]"
            :disabled="disabled"
            @click="toggle"
        >
            <span class="truncate" :class="!model ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'">{{ selectedLabel }}</span>
            <Icon name="solar:alt-arrow-down-line-duotone" size="16" class="shrink-0 transition-transform text-slate-400" :class="[isOpen ? 'rotate-180' : '']" />
        </button>

        <Transition
            enter-active-class="transition duration-150 ease-out"
            :enter-from-class="transitionClasses.enterFrom"
            :enter-to-class="transitionClasses.enterTo"
            leave-active-class="transition duration-100 ease-in"
            :leave-from-class="transitionClasses.leaveFrom"
            :leave-to-class="transitionClasses.leaveTo"
        >
            <div
                v-if="isOpen"
                class="absolute left-0 right-0 z-50 max-h-60 overflow-y-auto rounded-[8px] border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
                :class="[menuClasses]"
                style="scrollbar-width: thin;"
            >
                <button
                    v-for="option in options"
                    :key="String(option.value)"
                    type="button"
                    class="flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-left text-sm font-medium transition"
                    :class="model === option.value
                        ? 'bg-primary/10 text-primary dark:bg-primary/20'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50'"
                    @click="selectOption(option.value)"
                >
                    <span class="truncate">{{ option.label }}</span>
                    <Icon v-if="model === option.value" name="solar:check-read-line-duotone" size="16" class="shrink-0" />
                </button>
            </div>
        </Transition>
    </div>
</template>
