<script setup lang="ts">
const model = defineModel<string>();

const props = withDefaults(
  defineProps<{
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    id?: string;
    min?: string;
    max?: string;
    step?: number;
    clearable?: boolean;
    fullWidth?: boolean;
    minWidthClass?: string;
    heightClass?: string;
    placement?: "top" | "bottom";
  }>(),
  {
    placeholder: "Chọn ngày giờ",
    disabled: false,
    required: false,
    clearable: false,
    fullWidth: true,
    minWidthClass: "min-w-[180px]",
    heightClass: "h-[37.33px]",
    placement: "bottom",
  },
);

interface CalendarCell {
  key: string;
  date: Date;
  dateStr: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isDisabled: boolean;
}

const rootRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const currentMonth = ref(new Date());
const selectedDate = ref("");
const selectedHour = ref("00");
const selectedMinute = ref("00");

const weekDays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const pad2 = (value: number | string) => String(value).padStart(2, "0");

const toDateStr = (date: Date) => {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
};

const minDateStr = computed(() => props.min?.split("T")[0] || "");
const maxDateStr = computed(() => props.max?.split("T")[0] || "");

const minuteStep = computed(() => {
  const stepSeconds = Math.max(60, props.step || 60);
  return Math.min(30, Math.max(1, Math.round(stepSeconds / 60)));
});

const minuteOptions = computed(() => {
  const options: string[] = [];
  for (let minute = 0; minute < 60; minute += minuteStep.value) {
    options.push(pad2(minute));
  }
  return options;
});

const hourOptions = Array.from({ length: 24 }, (_, hour) => pad2(hour));

const hourDropdownOptions = computed(() =>
  hourOptions.map((hour) => ({ label: hour, value: hour })),
);

const minuteDropdownOptions = computed(() =>
  minuteOptions.value.map((minute) => ({ label: minute, value: minute })),
);

const isDateDisabled = (dateStr: string) => {
  if (minDateStr.value && dateStr < minDateStr.value) return true;
  if (maxDateStr.value && dateStr > maxDateStr.value) return true;
  return false;
};

const parseModel = (value?: string) => {
  if (!value) {
    return { date: "", hour: "00", minute: minuteOptions.value[0] || "00" };
  }

  const [datePart = "", timePart = "00:00"] = value.split("T");
  const [hourPart = "00", minutePart = "00"] = timePart.split(":");

  const normalizedMinute = minuteOptions.value.includes(minutePart)
    ? minutePart
    : minuteOptions.value[0] || "00";

  return {
    date: datePart,
    hour: pad2(hourPart),
    minute: normalizedMinute,
  };
};

const syncFromModel = (value?: string) => {
  const parsed = parseModel(value);
  selectedDate.value = parsed.date;
  selectedHour.value = parsed.hour;
  selectedMinute.value = parsed.minute;

  if (parsed.date) {
    const [year, month] = parsed.date.split("-");
    currentMonth.value = new Date(Number(year), Number(month) - 1, 1);
  }
};

syncFromModel(model.value);

watch(
  () => model.value,
  (nextValue) => {
    const composed = selectedDate.value
      ? `${selectedDate.value}T${selectedHour.value}:${selectedMinute.value}`
      : "";

    if ((nextValue || "") !== composed) {
      syncFromModel(nextValue);
    }
  },
);

watch(
  [selectedDate, selectedHour, selectedMinute, minuteOptions],
  () => {
    if (!minuteOptions.value.includes(selectedMinute.value)) {
      selectedMinute.value = minuteOptions.value[0] || "00";
      return;
    }

    const nextValue = selectedDate.value
      ? `${selectedDate.value}T${selectedHour.value}:${selectedMinute.value}`
      : "";

    if ((model.value || "") !== nextValue) {
      model.value = nextValue;
    }
  },
  { deep: true },
);

const monthTitle = computed(() =>
  new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    year: "numeric",
  }).format(currentMonth.value),
);

const displayLabel = computed(() => {
  if (!selectedDate.value) return props.placeholder;

  const [year, month, day] = selectedDate.value.split("-");
  return `${day}/${month}/${year} ${selectedHour.value}:${selectedMinute.value}`;
});

const calendarCells = computed<CalendarCell[]>(() => {
  const monthFirstDay = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth(),
    1,
  );

  const startOffset = monthFirstDay.getDay();
  const startDate = new Date(monthFirstDay);
  startDate.setDate(monthFirstDay.getDate() - startOffset);

  const todayStr = toDateStr(new Date());
  const selected = selectedDate.value;

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    const dateStr = toDateStr(date);

    return {
      key: `${dateStr}-${index}`,
      date,
      dateStr,
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === currentMonth.value.getMonth(),
      isToday: dateStr === todayStr,
      isSelected: dateStr === selected,
      isDisabled: isDateDisabled(dateStr),
    };
  });
});

const toggle = () => {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
};

const close = () => {
  isOpen.value = false;
};

const previousMonth = () => {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() - 1,
    1,
  );
};

const nextMonth = () => {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() + 1,
    1,
  );
};

const selectDate = (cell: CalendarCell) => {
  if (cell.isDisabled) return;
  selectedDate.value = cell.dateStr;
};

const setToday = () => {
  const today = new Date();
  const todayStr = toDateStr(today);

  if (isDateDisabled(todayStr)) return;

  selectedDate.value = todayStr;
  selectedHour.value = pad2(today.getHours());

  const roundedMinute = Math.floor(today.getMinutes() / minuteStep.value) * minuteStep.value;
  selectedMinute.value = minuteOptions.value.includes(pad2(roundedMinute))
    ? pad2(roundedMinute)
    : minuteOptions.value[0] || "00";

  currentMonth.value = new Date(today.getFullYear(), today.getMonth(), 1);
};

const clearValue = () => {
  if (props.disabled) return;
  selectedDate.value = "";
};

const handleDocumentClick = (event: MouseEvent) => {
  if (!rootRef.value) return;
  const target = event.target;
  if (!(target instanceof Node)) return;

  if (!rootRef.value.contains(target)) {
    close();
  }
};

onMounted(() => {
  document.addEventListener("mousedown", handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("mousedown", handleDocumentClick);
});

const panelPositionClass = computed(() =>
  props.placement === "top" ? "bottom-full mb-2" : "top-full mt-2",
);
</script>

<template>
  <div ref="rootRef" class="relative" :class="props.fullWidth ? 'w-full' : 'inline-flex'">
    <input
      :id="props.id"
      :value="model || ''"
      type="hidden"
      :required="props.required"
    />

    <button
      type="button"
      :disabled="props.disabled"
      @click="toggle"
      class="inline-flex items-center justify-between gap-2 rounded-[8px] border border-slate-200 bg-white px-3 text-sm font-medium outline-none transition-all focus:bg-white focus:border-primary/40 focus:ring-4 focus:ring-primary/5 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:disabled:bg-slate-800/50"
      :class="[
        props.heightClass,
        props.fullWidth ? 'w-full' : props.minWidthClass,
      ]"
    >
      <span class="inline-flex min-w-0 items-center gap-2">
        <Icon
          name="solar:calendar-line-duotone"
          size="16"
          class="shrink-0 text-slate-400"
        />
        <span
          class="truncate"
          :class="selectedDate ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'"
        >
          {{ displayLabel }}
        </span>
      </span>

      <span class="inline-flex items-center gap-1.5">
        <span
          v-if="props.clearable && selectedDate"
          role="button"
          tabindex="0"
          class="inline-flex h-5 w-5 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
          @click.stop="clearValue"
          @keydown.enter.stop.prevent="clearValue"
          @keydown.space.stop.prevent="clearValue"
          aria-label="Clear datetime"
        >
          <Icon name="solar:close-circle-line-duotone" size="15" />
        </span>

        <Icon
          name="solar:alt-arrow-down-line-duotone"
          size="16"
          class="shrink-0 text-slate-400 transition-transform"
          :class="isOpen ? 'rotate-180' : ''"
        />
      </span>
    </button>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute left-0 z-50 w-[300px] rounded-[10px] border border-slate-200 bg-white p-2.5 shadow-lg dark:border-slate-700 dark:bg-slate-800"
        :class="panelPositionClass"
      >
        <div class="mb-2 flex items-center justify-between">
          <button
            type="button"
            class="rounded-md px-2 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
            @click="previousMonth"
          >
            <Icon name="solar:alt-arrow-left-line-duotone" size="16" />
          </button>

          <p class="text-base font-semibold capitalize text-slate-800 dark:text-white">
            {{ monthTitle }}
          </p>

          <button
            type="button"
            class="rounded-md px-2 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
            @click="nextMonth"
          >
            <Icon name="solar:alt-arrow-right-line-duotone" size="16" />
          </button>
        </div>

        <div class="mb-1.5 grid grid-cols-7 gap-1">
          <span
            v-for="day in weekDays"
            :key="day"
            class="py-0.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400"
          >
            {{ day }}
          </span>
        </div>

        <div class="grid grid-cols-7 gap-1">
          <button
            v-for="cell in calendarCells"
            :key="cell.key"
            type="button"
            class="flex h-8 items-center justify-center rounded-md text-sm font-medium transition"
            :class="[
              cell.isSelected
                ? 'bg-primary text-white'
                : cell.isToday
                  ? 'border border-primary/30 text-primary'
                  : cell.isCurrentMonth
                    ? 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/70'
                    : 'text-slate-300 hover:bg-slate-50 dark:text-slate-500 dark:hover:bg-slate-700/40',
              cell.isDisabled ? 'cursor-not-allowed opacity-40 hover:bg-transparent' : '',
            ]"
            :disabled="cell.isDisabled"
            @click="selectDate(cell)"
          >
            {{ cell.day }}
          </button>
        </div>

        <div class="mt-2.5 border-t border-slate-100 pt-2.5 dark:border-slate-700">
          <div class="grid grid-cols-2 gap-2">
            <label class="space-y-1">
              <span class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Giờ
              </span>
              <UiDropdown
                v-model="selectedHour"
                :options="hourDropdownOptions"
                height-class="h-[34px]"
                placement="top"
              />
            </label>

            <label class="space-y-1">
              <span class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Phút
              </span>
              <UiDropdown
                v-model="selectedMinute"
                :options="minuteDropdownOptions"
                height-class="h-[34px]"
                placement="top"
              />
            </label>
          </div>

          <div class="mt-2.5 flex items-center justify-between">
            <button
              type="button"
              class="text-xs font-semibold text-slate-500 transition hover:text-primary"
              @click="setToday"
            >
              Hôm nay
            </button>

            <button
              v-if="props.clearable"
              type="button"
              class="text-xs font-semibold text-slate-500 transition hover:text-rose-500"
              @click="clearValue"
            >
              Xóa
            </button>

            <button
              type="button"
              class="rounded-[8px] bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary/90"
              @click="close"
            >
              Xong
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>



