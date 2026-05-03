<script setup lang="ts">
  import {
    parseBusinessDateTimeInput,
    toBusinessDateTimeLocalValue,
  } from "../../../../shared/timezone";

  definePageMeta({ layout: "admin" });
  useHead({ title: "Tạo mã giảm giá - Admin Panel" });
  const { formatDate } = useDateFormatter();

  const toast = useToast();
  const router = useRouter();
  const { user } = useUserSession();

  interface SessionUser {
    role?: string | null;
    permissions?: string[] | null;
  }

  const sessionUser = computed(() => user.value as SessionUser | null);

  const hasPermission = (permission: string) => {
    const role = String(sessionUser.value?.role || "").trim();
    if (role === "admin") return true;

    const permissions = sessionUser.value?.permissions || [];
    return permissions.includes("*") || permissions.includes(permission);
  };

  const canManageCoupons = computed(() => hasPermission("manage_coupons"));

  if (!canManageCoupons.value) {
    toast.error("Từ chối", "Bạn không có quyền tạo mã giảm giá");
    await navigateTo("/admin/coupons");
  }

  const discountTypeOptions = [
    { label: "Phần trăm", value: "percent" },
    { label: "Tiền mặt", value: "fixed" },
  ];

  const { data: productsData, pending: prodPending } = await useFetch<any[]>(
    "/api/admin/products"
  );
  const { data: plansData, pending: plansPending } =
    await useFetch<any[]>("/api/admin/plans");

  const products = computed(() => productsData.value || []);
  const plans = computed(() => plansData.value || []);
  const searchQuery = ref("");
  const expandedProductIds = ref<Set<number>>(new Set());

  const form = reactive({
    code: "",
    discountType: "percent" as "percent" | "fixed",
    discountValue: 10,
    maxDiscount: 0,
    minOrderValue: 0,
    applicableProductIds: [] as number[],
    usageLimit: 0,
    maxPerUser: 0,
    startAt: "",
    expiryDate: "",
    description: "",
    internalNote: "",
  });

  // ── Product selector ──────────────────────────────────────────────────────
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

  // O(1) lookup
  const selectedSet = computed(
    () => new Set(form.applicableProductIds.map(Number))
  );

  const allPlanIds = computed(() => plans.value.map((p) => Number(p.id)));
  const isAllSelected = computed(
    () =>
      allPlanIds.value.length > 0 &&
      allPlanIds.value.every((id) => selectedSet.value.has(id))
  );

  // Per-product state: "none" | "partial" | "all"
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

  const isExpanded = (productId: number) => {
    if (searchQuery.value.trim()) return true;
    return expandedProductIds.value.has(Number(productId));
  };

  const toggleExpand = (productId: number) => {
    if (!canManageCoupons.value) return;
    const pid = Number(productId);
    if (expandedProductIds.value.has(pid)) expandedProductIds.value.delete(pid);
    else expandedProductIds.value.add(pid);
  };

  const toggleAllPlans = () => {
    if (!canManageCoupons.value) return;
    if (isAllSelected.value) {
      form.applicableProductIds = [];
    } else {
      form.applicableProductIds = [...allPlanIds.value];
    }
  };

  const toggleProduct = (productId: number) => {
    if (!canManageCoupons.value) return;
    const pid = Number(productId);
    const planIds = getPlans(pid).map((p) => Number(p.id));
    if (!planIds.length) return;
    const state = productSelectionState.value[pid];
    if (state === "all" || state === "partial") {
      form.applicableProductIds = form.applicableProductIds.filter(
        (id) => !planIds.includes(Number(id))
      );
    } else {
      const next = new Set(form.applicableProductIds.map(Number));
      planIds.forEach((id) => next.add(id));
      form.applicableProductIds = [...next];
    }
  };

  const togglePlan = (planId: number) => {
    if (!canManageCoupons.value) return;
    const pid = Number(planId);
    if (selectedSet.value.has(pid)) {
      form.applicableProductIds = form.applicableProductIds.filter(
        (id) => Number(id) !== pid
      );
    } else {
      form.applicableProductIds = [...form.applicableProductIds, pid];
    }
  };

  const isSubmitting = ref(false);

  const normalizedCode = computed(() =>
    form.code.trim().toUpperCase().replace(/\s+/g, "-")
  );

  watch(
    () => form.discountType,
    (type) => {
      if (type === "percent") {
        form.discountValue = Math.min(
          100,
          Math.max(1, Number(form.discountValue) || 10)
        );
        return;
      }

      form.discountValue = Math.max(1000, Number(form.discountValue) || 10000);
    },
    { immediate: true }
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value || 0);

  const previewDiscount = computed(() => {
    if (form.discountType === "percent") return `-${form.discountValue}%`;
    return `-${formatCurrency(form.discountValue)}`;
  });

  const generateRandomCode = () => {
    if (!canManageCoupons.value) return;

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 10; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    form.code = code;
    toast.success("Thành công", `Mã ngẫu nhiên: ${code}`);
  };

  const handleSave = async () => {
    if (!canManageCoupons.value) {
      toast.error("Từ chối", "Bạn không có quyền tạo mã giảm giá");
      return;
    }

    if (!normalizedCode.value || normalizedCode.value.length < 4) {
      return toast.error(
        "Thiếu thông tin",
        "Mã giảm giá phải có ít nhất 4 ký tự."
      );
    }

    if (Number(form.discountValue) <= 0) {
      return toast.error("Lỗi", "Giá trị giảm phải lớn hơn 0.");
    }

    const normalizedStartAt = toBusinessDateTimeLocalValue(form.startAt);
    const normalizedExpiryDate = toBusinessDateTimeLocalValue(form.expiryDate);
    const startAtDate =
      parseBusinessDateTimeInput(normalizedStartAt)?.dateValue;
    const expiryDate =
      parseBusinessDateTimeInput(normalizedExpiryDate)?.dateValue;

    if (startAtDate && expiryDate && startAtDate > expiryDate) {
      return toast.error("Lỗi", "Ngày bắt đầu phải trước ngày hết hạn.");
    }

    isSubmitting.value = true;
    try {
      await $fetch("/api/admin/coupons", {
        method: "POST",
        body: {
          code: normalizedCode.value,
          discountType: form.discountType,
          discountValue: Number(form.discountValue),
          maxDiscount: form.maxDiscount > 0 ? Number(form.maxDiscount) : null,
          minOrderValue:
            form.minOrderValue > 0 ? Number(form.minOrderValue) : null,
          applicableProductIds:
            form.applicableProductIds.length > 0
              ? form.applicableProductIds
              : null,
          usageLimit: form.usageLimit > 0 ? Number(form.usageLimit) : null,
          maxPerUser: form.maxPerUser > 0 ? Number(form.maxPerUser) : null,
          startAt: normalizedStartAt || null,
          expiryDate: normalizedExpiryDate || null,
          description: form.description || null,
          internalNote: form.internalNote || null,
        },
      });

      toast.success("Thành công", `Đã tạo mã ${normalizedCode.value}.`);
      router.push("/admin/coupons");
    } catch (error: any) {
      toast.error("Lỗi", error.data?.message || "Không thể tạo mã giảm giá");
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
          to="/admin/coupons"
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
            Tạo mã giảm giá
          </h1>
          <p
            class="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400"
          >
            Cấu hình đầy đủ ưu đãi, điều kiện, giới hạn và thời hạn
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <UiButton
          variant="outline"
          class="px-5"
          @click="router.push('/admin/coupons')"
        >
          Hủy bỏ
        </UiButton>
        <UiButton
          class="px-7"
          :loading="isSubmitting"
          :disabled="!canManageCoupons"
          @click="handleSave"
        >
          Lưu mã giảm giá
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
              Thông tin mã
            </h3>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <label
                class="ml-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500"
              >
                Mã coupon
              </label>
              <div class="flex items-end gap-2">
                <div class="flex-1">
                  <UiInput
                    v-model="form.code"
                    placeholder="Ví dụ: WELCOME10"
                    class="uppercase"
                    :disabled="!canManageCoupons"
                  />
                </div>
                <button
                  type="button"
                  class="mb-0.5 flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-600 transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-primary/10 dark:hover:text-primary"
                  title="Tạo mã ngẫu nhiên"
                  :disabled="!canManageCoupons"
                  @click="generateRandomCode"
                >
                  <Icon name="solar:shuffle-bold-duotone" size="18" />
                </button>
              </div>
            </div>

            <div class="space-y-2">
              <label
                class="ml-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500"
              >
                Loại giảm giá
              </label>
              <UiDropdown
                v-model="form.discountType"
                :options="discountTypeOptions"
                :disabled="!canManageCoupons"
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
                :placeholder="form.discountType === 'percent' ? '10' : '50000'"
                :disabled="!canManageCoupons"
              />
            </div>

            <div class="space-y-2">
              <label
                class="ml-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500"
              >
                Giảm tối đa (nếu %)
              </label>
              <UiInput
                v-model.number="form.maxDiscount"
                type="number"
                placeholder="500000 (tuỳ chọn)"
                :disabled="!canManageCoupons"
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
              name="solar:filter-bold-duotone"
              class="text-primary"
              size="18"
            />
            <h3
              class="text-xs font-semibold uppercase tracking-widest text-slate-500"
            >
              Điều kiện áp dụng
            </h3>
          </div>

          <div class="space-y-2">
            <label
              class="ml-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500"
            >
              Giá trị đơn tối thiểu
            </label>
            <UiInput
              v-model.number="form.minOrderValue"
              type="number"
              placeholder="0 (không giới hạn)"
              :disabled="!canManageCoupons"
            />
            <p class="text-xs text-slate-400">
              Khách hàng phải đạt hóa đơn tối thiểu bao nhiêu để dùng mã này
            </p>
          </div>

          <div class="space-y-2">
            <!-- Header label + badge + clear -->
            <div class="flex items-center justify-between">
              <label
                class="ml-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500"
              >
                Áp dụng cho sản phẩm và gói
              </label>
              <div class="flex items-center gap-2">
                <span
                  v-if="form.applicableProductIds.length > 0"
                  class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
                >
                  {{ form.applicableProductIds.length }} gói đã chọn
                </span>
                <button
                  v-if="
                    form.applicableProductIds.length > 0 && canManageCoupons
                  "
                  type="button"
                  class="text-[10px] font-medium text-slate-400 transition-colors hover:text-rose-500"
                  @click="form.applicableProductIds = []"
                >
                  Bỏ tất cả
                </button>
              </div>
            </div>

            <!-- Search -->
            <UiInput
              v-model="searchQuery"
              placeholder="Tìm kiếm sản phẩm..."
              :disabled="!canManageCoupons"
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
              Đang tải...
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
              :class="!canManageCoupons && 'pointer-events-none opacity-60'"
            >
              <!-- Select all row -->
              <button
                type="button"
                class="flex w-full select-none items-center gap-2 rounded px-1 py-1.5 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/50"
                @click="toggleAllPlans"
              >
                <div
                  class="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-2 transition-all duration-150"
                  :class="
                    isAllSelected
                      ? 'border-primary bg-primary'
                      : form.applicableProductIds.length > 0
                        ? 'border-primary bg-primary/10'
                        : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                  "
                >
                  <svg
                    v-if="isAllSelected"
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
                  <div
                    v-else-if="form.applicableProductIds.length > 0"
                    class="h-[2px] w-2.5 rounded-full bg-primary"
                  />
                </div>
                <span
                  class="flex-1 text-sm font-medium text-slate-600 dark:text-slate-400"
                >
                  ~ Tất cả sản phẩm và gói ~
                </span>
              </button>

              <!-- Products -->
              <div v-for="product in filteredProducts" :key="product.id">
                <!-- Product row -->
                <div class="flex items-center gap-1 rounded">
                  <!-- Expand button -->
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

                  <!-- Checkbox + name -->
                  <button
                    type="button"
                    class="flex flex-1 select-none items-center gap-2 rounded px-1 py-1.5 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/50"
                    @click="toggleProduct(product.id)"
                  >
                    <div
                      class="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-2 transition-all duration-150"
                      :class="{
                        'border-primary bg-primary':
                          productSelectionState[product.id] === 'all',
                        'border-primary bg-primary/10':
                          productSelectionState[product.id] === 'partial',
                        'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800':
                          !productSelectionState[product.id] ||
                          productSelectionState[product.id] === 'none',
                      }"
                    >
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
                      <span class="ml-1 text-xs text-slate-400"
                        >({{ getPlans(product.id).length }} gói)</span
                      >
                    </span>
                  </button>
                </div>

                <!-- Plan list -->
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
                      <span
                        class="text-sm text-slate-600 dark:text-slate-400"
                        >{{ plan.name }}</span
                      >
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
              Để trống = áp dụng cho toàn bộ sản phẩm và gói. Click mũi tên để
              mở/đóng gói. Click tên sản phẩm để chọn/bỏ chọn toàn bộ.
            </p>
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
              Thời gian và giới hạn
            </h3>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <label
                class="ml-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500"
              >
                Ngày bắt đầu
              </label>
              <UiDateTime
                v-model="form.startAt"
                clearable
                :disabled="!canManageCoupons"
              />
            </div>

            <div class="space-y-2">
              <label
                class="ml-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500"
              >
                Ngày hết hạn
              </label>
              <UiDateTime
                v-model="form.expiryDate"
                clearable
                :disabled="!canManageCoupons"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <label
                class="ml-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500"
              >
                Tối đa dùng / người
              </label>
              <UiInput
                v-model.number="form.maxPerUser"
                type="number"
                placeholder="1 (bỏ trống = không giới hạn)"
                :disabled="!canManageCoupons"
              />
              <p class="text-xs text-slate-400">
                Mỗi người có thể dùng bao nhiêu lần
              </p>
            </div>

            <div class="space-y-2">
              <label
                class="ml-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500"
              >
                Tổng giới hạn sử dụng
              </label>
              <UiInput
                v-model.number="form.usageLimit"
                type="number"
                placeholder="100 (bỏ trống = không giới hạn)"
                :disabled="!canManageCoupons"
              />
              <p class="text-xs text-slate-400">Tổng số lần được dùng</p>
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
              name="solar:document-text-bold-duotone"
              class="text-primary"
              size="18"
            />
            <h3
              class="text-xs font-semibold uppercase tracking-widest text-slate-500"
            >
              Mô tả và ghi chú
            </h3>
          </div>

          <div class="space-y-2">
            <label
              class="ml-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500"
            >
              Mô tả công khai
            </label>
            <textarea
              v-model="form.description"
              placeholder="Mô tả mã giảm giá cho khách hàng..."
              class="min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              :disabled="!canManageCoupons"
            />
          </div>

          <div class="space-y-2">
            <label
              class="ml-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500"
            >
              Ghi chú nội bộ
            </label>
            <textarea
              v-model="form.internalNote"
              placeholder="Ghi chú cho quản trị viên..."
              class="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              :disabled="!canManageCoupons"
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
            <p
              class="font-mono text-base font-semibold tracking-wide text-primary"
            >
              {{ normalizedCode || "COUPON-CODE" }}
            </p>
            <p class="mt-1 text-xs font-medium text-slate-400">
              Loại:
              {{ form.discountType === "percent" ? "Phần trăm" : "Tiền mặt" }}
            </p>
            <p class="mt-2 text-xs font-medium text-slate-500">
              {{
                form.startAt
                  ? `Bắt đầu: ${formatDate(form.startAt)}`
                  : "Chưa đặt ngày bắt đầu"
              }}
            </p>
            <p class="text-xs font-medium text-slate-500">
              {{
                form.expiryDate
                  ? `Hết hạn: ${formatDate(form.expiryDate)}`
                  : "Không giới hạn thời gian"
              }}
            </p>
          </div>

          <div
            class="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40"
          >
            <p
              class="text-[11px] font-semibold uppercase tracking-wider text-slate-400"
            >
              Ưu đãi áp dụng
            </p>
            <p class="mt-1 text-base font-semibold text-primary">
              {{ previewDiscount }}
            </p>
            <p
              v-if="form.maxDiscount"
              class="mt-1 text-xs font-medium text-slate-400"
            >
              Tối đa: {{ formatCurrency(form.maxDiscount) }}
            </p>

            <div
              class="mt-4 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700"
            >
              <div
                v-if="form.minOrderValue"
                class="text-xs text-slate-600 dark:text-slate-400"
              >
                <span class="font-semibold">Đơn tối thiểu:</span>
                {{ formatCurrency(form.minOrderValue) }}
              </div>
              <div
                v-if="form.maxPerUser"
                class="text-xs text-slate-600 dark:text-slate-400"
              >
                <span class="font-semibold">Tối đa/người:</span>
                {{ form.maxPerUser }} lần
              </div>
              <div
                v-if="form.usageLimit"
                class="text-xs text-slate-600 dark:text-slate-400"
              >
                <span class="font-semibold">Tổng giới hạn:</span>
                {{ form.usageLimit }} lần
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
            <li>Mã sẽ được chuẩn hóa sang chữ in hoa khi lưu.</li>
            <li>
              Để trống = không giới hạn ngày, lượt dùng hoặc số lần/người.
            </li>
            <li>
              Bạn có thể chọn theo từng gói hoặc toàn bộ sản phẩm để áp mã.
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
