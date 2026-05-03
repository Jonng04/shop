<script setup lang="ts">
  definePageMeta({ layout: "admin" });
  useHead({ title: "Tạo Flash Sale - Admin Panel" });
  import { toBusinessDateTimeLocalValue } from "../../../../shared/timezone";

  const toast = useToast();
  const router = useRouter();
  const { data: productsData, pending: prodPending } = await useFetch<any[]>(
    "/api/admin/products"
  );
  const { data: plansData, pending: plansPending } =
    await useFetch<any[]>("/api/admin/plans");

  const products = computed(() => productsData.value || []);
  const plans = computed(() => plansData.value || []);

  // ── Product selector state ─────────────────────────────────────────────────
  const searchQuery = ref("");
  const expandedProductIds = ref<Set<number>>(new Set());
  // Source of truth: flat list of selected plan ids (numbers)
  const selectedPlanIds = ref<number[]>([]);

  // O(1) lookup set – recomputed whenever selectedPlanIds changes
  const selectedSet = computed(
    () => new Set(selectedPlanIds.value.map(Number))
  );

  const form = reactive({
    name: "",
    discountType: "percent" as "percent" | "fixed",
    discountValue: 20,
    maxDiscount: 0,
    quantityLimit: 100,
    maxPerUser: 1,
    startAt: "",
    endAt: "",
    note: "",
  });

  // Plans grouped by product id
  const plansByProduct = computed(() => {
    const grouped: Record<number, any[]> = {};
    for (const product of products.value) {
      const pid = Number(product.id);
      grouped[pid] = plans.value.filter((p) => Number(p.productId) === pid);
    }
    return grouped;
  });

  const getPlans = (productId: number): any[] =>
    plansByProduct.value[Number(productId)] ?? [];

  // Per-product selection state: "none" | "partial" | "all"
  // Purely derived from selectedSet – never has stale state
  const productSelectionState = computed(() => {
    const states: Record<number, "none" | "partial" | "all"> = {};
    for (const product of products.value) {
      const pid = Number(product.id);
      const productPlans = getPlans(pid);
      if (!productPlans.length) {
        states[pid] = "none";
        continue;
      }
      const count = productPlans.filter((p) =>
        selectedSet.value.has(Number(p.id))
      ).length;
      if (count === 0) states[pid] = "none";
      else if (count === productPlans.length) states[pid] = "all";
      else states[pid] = "partial";
    }
    return states;
  });

  const filteredProducts = computed(() => {
    const q = searchQuery.value.toLowerCase().trim();
    if (!q) return products.value;
    return products.value.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        getPlans(Number(p.id)).some((plan) =>
          plan.name.toLowerCase().includes(q)
        )
    );
  });

  // Is product panel expanded (auto-expand when searching)
  const isExpanded = (productId: number) => {
    if (searchQuery.value.trim()) return true;
    return expandedProductIds.value.has(Number(productId));
  };

  // Toggle expand/collapse a product panel
  const toggleExpand = (productId: number) => {
    const pid = Number(productId);
    if (expandedProductIds.value.has(pid)) {
      expandedProductIds.value.delete(pid);
    } else {
      expandedProductIds.value.add(pid);
    }
  };

  // Click checkbox at product level: select-all / deselect-all / deselect-partial
  const toggleProduct = (productId: number) => {
    const pid = Number(productId);
    const planIds = getPlans(pid).map((p) => Number(p.id));
    if (!planIds.length) return;
    const state = productSelectionState.value[pid];
    if (state === "all" || state === "partial") {
      // Remove all plans of this product
      selectedPlanIds.value = selectedPlanIds.value.filter(
        (id) => !planIds.includes(Number(id))
      );
    } else {
      // Add all plans of this product
      const next = new Set(selectedPlanIds.value.map(Number));
      planIds.forEach((id) => next.add(id));
      selectedPlanIds.value = [...next];
    }
  };

  // Click a specific plan row
  const togglePlan = (planId: number) => {
    const pid = Number(planId);
    if (selectedSet.value.has(pid)) {
      selectedPlanIds.value = selectedPlanIds.value.filter(
        (id) => Number(id) !== pid
      );
    } else {
      selectedPlanIds.value = [...selectedPlanIds.value, pid];
    }
  };

  // ── Derived payload ────────────────────────────────────────────────────────
  const selectedPlans = computed(() =>
    plans.value.filter((plan) => selectedSet.value.has(Number(plan.id)))
  );

  const selectedProductIds = computed(() => {
    const ids = new Set<number>();
    selectedPlans.value.forEach((plan) => ids.add(Number(plan.productId)));
    return [...ids];
  });

  const selectedProductNames = computed(() =>
    products.value
      .filter((product) =>
        selectedProductIds.value.includes(Number(product.id))
      )
      .map((product) => product.name)
  );

  const selectedSummary = computed(() => {
    const productCount = selectedProductIds.value.length;
    const planCount = selectedPlanIds.value.length;
    if (!productCount || !planCount) return "Chưa chọn sản phẩm hoặc gói";
    if (productCount === 1 && planCount === 1) {
      return `${selectedProductNames.value[0]} • ${selectedPlans.value[0]?.name || "1 gói"}`;
    }
    return `${productCount} sản phẩm • ${planCount} gói`;
  });

  const flashSaleItemsPayload = computed(() =>
    selectedPlans.value.map((plan) => ({
      productId: Number(plan.productId),
      planId: Number(plan.id),
    }))
  );

  const discountTypeOptions = [
    { label: "Phần trăm", value: "percent" },
    { label: "Tiền mặt", value: "fixed" },
  ];

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value || 0);

  const isSubmitting = ref(false);

  const handleSave = async () => {
    if (isSubmitting.value) {
      return;
    }

    if (!form.name.trim()) {
      return toast.error("Thiếu thông tin", "Bạn phải nhập tên flash sale");
    }

    if (!flashSaleItemsPayload.value.length) {
      return toast.error(
        "Thiếu thông tin",
        "Bạn phải chọn ít nhất một sản phẩm hoặc gói áp dụng"
      );
    }

    if (Number(form.discountValue || 0) <= 0) {
      return toast.error("Dữ liệu không hợp lệ", "Giá trị giảm phải lớn hơn 0");
    }

    if (
      form.discountType === "percent" &&
      Number(form.discountValue || 0) > 99
    ) {
      return toast.error(
        "Dữ liệu không hợp lệ",
        "Phần trăm giảm giá phải từ 1 đến 99"
      );
    }

    const normalizedStartAt = toBusinessDateTimeLocalValue(form.startAt);
    const normalizedEndAt = toBusinessDateTimeLocalValue(form.endAt);

    if (
      normalizedStartAt &&
      normalizedEndAt &&
      normalizedStartAt >= normalizedEndAt
    ) {
      return toast.error(
        "Dữ liệu không hợp lệ",
        "Thời gian bắt đầu phải trước thời gian kết thúc"
      );
    }

    isSubmitting.value = true;

    try {
      await $fetch("/api/admin/flash-sales", {
        method: "POST",
        body: {
          name: form.name.trim(),
          items: flashSaleItemsPayload.value,
          discountType: form.discountType,
          discountValue: Number(form.discountValue || 0),
          maxDiscount: Number(form.maxDiscount || 0) || null,
          quantityLimit: Number(form.quantityLimit || 0),
          maxPerUser: Number(form.maxPerUser || 1),
          startAt: normalizedStartAt || null,
          endAt: normalizedEndAt || null,
          note: form.note || null,
        },
      });

      toast.success("Thành công", "Đã tạo flash sale mới");
      await router.push("/admin/flash-sales");
    } catch (error: any) {
      toast.error(
        "Thất bại",
        error?.data?.message || error?.message || "Không thể tạo flash sale"
      );
    } finally {
      isSubmitting.value = false;
    }
  };
</script>

<template>
  <div class="space-y-6">
    <div
      class="flex flex-col gap-3 pb-1 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-3">
        <NuxtLink
          to="/admin/flash-sales"
          class="group flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 transition-all hover:border-primary/30 hover:text-primary dark:border-slate-800 dark:bg-slate-900"
        >
          <Icon
            name="solar:alt-arrow-left-line-duotone"
            size="22"
            class="transition-transform group-hover:-translate-x-0.5"
          />
        </NuxtLink>

        <div>
          <h1
            class="text-xl font-semibold tracking-tight text-slate-900 dark:text-white"
          >
            Tạo Flash Sale mới
          </h1>
          <p
            class="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400"
          >
            Cấu hình giá, thời gian và giới hạn bán
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <UiButton
          variant="outline"
          class="px-5"
          :disabled="isSubmitting"
          @click="router.push('/admin/flash-sales')"
        >
          Hủy bỏ
        </UiButton>
        <UiButton class="px-7" :loading="isSubmitting" @click="handleSave">
          Lưu Flash Sale
        </UiButton>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div class="space-y-6 lg:col-span-2">
        <div
          class="space-y-5 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
        >
          <div
            class="flex items-center gap-2 border-b border-slate-100 pb-4 dark:border-slate-800"
          >
            <Icon
              name="solar:ticket-bold-duotone"
              class="text-primary"
              size="18"
            />
            <h3
              class="text-xs font-semibold uppercase tracking-widest text-slate-500"
            >
              Thông tin chương trình
            </h3>
          </div>

          <div class="space-y-2">
            <label
              class="ml-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500"
            >
              Tên chương trình
            </label>
            <UiInput
              v-model="form.name"
              placeholder="Ví dụ: Flash sale cuối tuần"
            />
          </div>

          <div class="space-y-2">
            <!-- Header label + badge + clear -->
            <div class="flex items-center justify-between">
              <label
                class="ml-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500"
              >
                Sản phẩm áp dụng
              </label>
              <div class="flex items-center gap-2">
                <span
                  v-if="selectedPlanIds.length > 0"
                  class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
                >
                  {{ selectedPlanIds.length }} gói đã chọn
                </span>
                <button
                  v-if="selectedPlanIds.length > 0"
                  type="button"
                  class="text-[10px] font-medium text-slate-400 transition-colors hover:text-rose-500"
                  @click="selectedPlanIds = []"
                >
                  Bỏ tất cả
                </button>
              </div>
            </div>

            <!-- Search -->
            <UiInput
              v-model="searchQuery"
              placeholder="Tìm sản phẩm hoặc gói..."
            >
              <template #left-icon>
                <Icon name="solar:magnifer-line-duotone" size="18" />
              </template>
            </UiInput>

            <!-- Loading -->
            <div
              v-if="prodPending || plansPending"
              class="py-3 text-sm text-slate-400"
            >
              Đang tải sản phẩm...
            </div>

            <!-- Empty -->
            <div
              v-else-if="filteredProducts.length === 0"
              class="py-3 text-sm text-slate-400"
            >
              Không có sản phẩm phù hợp
            </div>

            <!-- Product list -->
            <div
              v-else
              class="max-h-96 space-y-px overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/50"
            >
              <div v-for="product in filteredProducts" :key="product.id">
                <!-- Product row -->
                <div class="flex items-center gap-2 rounded">
                  <!-- Expand/collapse button -->
                  <button
                    type="button"
                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
                    @click="toggleExpand(product.id)"
                  >
                    <Icon
                      :name="
                        isExpanded(product.id)
                          ? 'solar:alt-arrow-down-bold'
                          : 'solar:alt-arrow-right-bold'
                      "
                      size="13"
                    />
                  </button>

                  <!-- Clickable area: checkbox + name -->
                  <button
                    type="button"
                    class="flex flex-1 select-none items-center gap-2 rounded px-1 py-1.5 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/50"
                    @click="toggleProduct(product.id)"
                  >
                    <!-- Inline product checkbox – purely display, zero internal state -->
                    <div
                      class="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-2 transition-all duration-150"
                      :class="{
                        'border-primary bg-primary':
                          productSelectionState[product.id] === 'all',
                        'border-primary bg-primary/10':
                          productSelectionState[product.id] === 'partial',
                        'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800':
                          productSelectionState[product.id] === 'none' ||
                          !productSelectionState[product.id],
                      }"
                    >
                      <!-- All selected: checkmark -->
                      <svg
                        v-if="productSelectionState[product.id] === 'all'"
                        class="h-2.5 w-2.5 text-white"
                        viewBox="0 0 12 10"
                        fill="none"
                      >
                        <path
                          d="M1 5L4.5 8.5L11 1.5"
                          stroke="currentColor"
                          stroke-width="2.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                      <!-- Partial: dash -->
                      <div
                        v-else-if="
                          productSelectionState[product.id] === 'partial'
                        "
                        class="h-[2px] w-2.5 rounded-full bg-primary"
                      />
                    </div>

                    <span
                      class="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      {{ product.name }}
                      <span class="ml-1 text-xs text-slate-400">
                        ({{ getPlans(product.id).length }} gói)
                      </span>
                    </span>
                  </button>
                </div>

                <!-- Plan list (accordion) -->
                <transition name="slide-down">
                  <div
                    v-if="isExpanded(product.id)"
                    class="space-y-px pb-1 pl-9 pt-0.5"
                  >
                    <button
                      v-for="plan in getPlans(product.id)"
                      :key="plan.id"
                      type="button"
                      class="flex w-full select-none items-center gap-2 rounded px-1 py-1.5 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/50"
                      @click="togglePlan(plan.id)"
                    >
                      <!-- Inline plan checkbox – purely display, zero internal state -->
                      <div
                        class="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-2 transition-all duration-150"
                        :class="
                          selectedSet.has(Number(plan.id))
                            ? 'border-primary bg-primary'
                            : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                        "
                      >
                        <svg
                          v-if="selectedSet.has(Number(plan.id))"
                          class="h-2.5 w-2.5 text-white"
                          viewBox="0 0 12 10"
                          fill="none"
                        >
                          <path
                            d="M1 5L4.5 8.5L11 1.5"
                            stroke="currentColor"
                            stroke-width="2.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      </div>

                      <span class="text-sm text-slate-600 dark:text-slate-400">
                        {{ plan.name }}
                      </span>
                      <span
                        v-if="plan.price"
                        class="ml-auto text-xs text-slate-400"
                      >
                        {{ (plan.price / 1000).toLocaleString("vi-VN") }}k
                      </span>
                    </button>
                  </div>
                </transition>
              </div>
            </div>

            <p class="text-xs text-slate-400">
              Click vào mũi tên để mở/đóng gói. Click vào tên sản phẩm để
              chọn/bỏ chọn toàn bộ gói. Click vào từng gói để chọn riêng lẻ.
            </p>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <label
                class="ml-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500"
              >
                Loại giảm giá
              </label>
              <UiDropdown
                v-model="form.discountType"
                :options="discountTypeOptions"
              />
            </div>
            <div class="space-y-2">
              <label
                class="ml-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500"
              >
                Giá trị giảm
              </label>
              <UiInput
                v-model.number="form.discountValue"
                type="number"
                :placeholder="form.discountType === 'percent' ? '20' : '50000'"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <label
                class="ml-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500"
              >
                Giảm tối đa
              </label>
              <UiInput
                v-model.number="form.maxDiscount"
                type="number"
                placeholder="0"
              />
            </div>
            <div class="space-y-2">
              <label
                class="ml-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500"
              >
                Giới hạn số lượng bán
              </label>
              <UiInput
                v-model.number="form.quantityLimit"
                type="number"
                placeholder="100"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <label
                class="ml-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500"
              >
                Giới hạn / người dùng
              </label>
              <UiInput
                v-model.number="form.maxPerUser"
                type="number"
                placeholder="1"
              />
            </div>
          </div>
        </div>

        <div
          class="space-y-5 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
        >
          <div
            class="flex items-center gap-2 border-b border-slate-100 pb-4 dark:border-slate-800"
          >
            <Icon
              name="solar:calendar-bold-duotone"
              class="text-primary"
              size="18"
            />
            <h3
              class="text-xs font-semibold uppercase tracking-widest text-slate-500"
            >
              Lịch chạy
            </h3>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <label
                class="ml-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500"
              >
                Bắt đầu
              </label>
              <UiDateTime v-model="form.startAt" clearable />
            </div>
            <div class="space-y-2">
              <label
                class="ml-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500"
              >
                Kết thúc
              </label>
              <UiDateTime v-model="form.endAt" clearable />
            </div>
          </div>

          <div class="space-y-2">
            <label
              class="ml-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500"
            >
              Ghi chú
            </label>
            <UiRichText
              v-model="form.note"
              placeholder="Mô tả ngắn cho nội bộ..."
              :min-height="160"
            />
          </div>
        </div>
      </div>

      <div class="space-y-6">
        <div
          class="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
        >
          <div
            class="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800"
          >
            <Icon
              name="solar:eye-bold-duotone"
              class="text-primary"
              size="18"
            />
            <p
              class="text-xs font-semibold uppercase tracking-widest text-slate-500"
            >
              Xem nhanh
            </p>
          </div>

          <div>
            <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {{ form.name || "Tên flash sale" }}
            </p>
            <p class="mt-1 text-xs font-medium text-slate-400">
              {{ selectedSummary }}
            </p>
          </div>

          <div
            class="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40"
          >
            <p
              class="text-[11px] font-semibold uppercase tracking-wider text-slate-400"
            >
              Loại giảm
            </p>
            <p
              class="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              {{ form.discountType === "percent" ? "Phần trăm" : "Tiền mặt" }}
            </p>
            <p
              class="mt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400"
            >
              Giá trị giảm
            </p>
            <p class="mt-1 text-base font-semibold text-primary">
              {{
                form.discountType === "percent"
                  ? `${form.discountValue}%`
                  : formatCurrency(form.discountValue)
              }}
            </p>

            <div
              class="mt-4 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700"
            >
              <div class="text-xs text-slate-600 dark:text-slate-400">
                <span class="font-semibold">Giảm tối đa:</span>
                {{
                  form.maxDiscount > 0
                    ? formatCurrency(form.maxDiscount)
                    : "Không giới hạn"
                }}
              </div>
              <div class="text-xs text-slate-600 dark:text-slate-400">
                <span class="font-semibold">Số lượng bán:</span>
                {{
                  form.quantityLimit > 0 ? form.quantityLimit : "Không giới hạn"
                }}
              </div>
              <div class="text-xs text-slate-600 dark:text-slate-400">
                <span class="font-semibold">Áp dụng cho:</span>
                {{ selectedPlanIds.length }} gói
              </div>
            </div>
          </div>
        </div>

        <div
          class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
        >
          <p
            class="text-xs font-semibold uppercase tracking-widest text-slate-500"
          >
            Lưu ý
          </p>
          <ul
            class="mt-3 space-y-2 text-xs font-medium text-slate-500 dark:text-slate-400"
          >
            <li>
              Flash sale giờ lưu rule giảm giá thay vì nhập sẵn giá gốc/giá
              flash.
            </li>
            <li>Trạng thái sẽ tự suy ra theo thời gian bắt đầu và kết thúc.</li>
            <li>
              Bạn có thể chọn nhiều sản phẩm hoặc nhiều gói trong cùng một
              campaign.
            </li>
            <li>
              Chọn sản phẩm sẽ tự động chọn toàn bộ gói thuộc sản phẩm đó.
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .slide-down-enter-active,
  .slide-down-leave-active {
    transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
  }
  .slide-down-enter-from,
  .slide-down-leave-to {
    opacity: 0;
    max-height: 0;
    transform: translateY(-4px);
  }
  .slide-down-enter-to,
  .slide-down-leave-from {
    opacity: 1;
    max-height: 600px;
    transform: translateY(0);
  }
</style>
