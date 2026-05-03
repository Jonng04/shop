<script setup lang="ts">
  definePageMeta({ layout: "admin" });
  useHead({ title: "Quản lý Gói sản phẩm - Admin Panel" });

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

  const canManagePlans = computed(() => hasPermission("manage_plans"));
  const canAccessStock = computed(
    () => hasPermission("view_stocks") || hasPermission("manage_stocks")
  );

  const route = useRoute();

  const productIdParam = route.query.productId
    ? Number(route.query.productId)
    : undefined;

  const { data, refresh } = await useFetch<any[]>("/api/admin/plans", {
    query: productIdParam ? { productId: productIdParam } : {},
  });
  const plansList = computed(() => data.value || []);

  const productIdFilter = computed(() => productIdParam ?? null);

  const filterProductName = computed(() => {
    if (!productIdFilter.value) return null;
    return plansList.value[0]?.productName ?? `#${productIdFilter.value}`;
  });

  const search = ref("");
  const statusFilter = ref("all");
  const pageSize = ref(10);
  const currentPage = ref(1);

  const filteredPlans = computed(() => {
    return plansList.value.filter((plan) => {
      const keyword = search.value.toLowerCase();
      const matchesSearch =
        plan.name.toLowerCase().includes(keyword) ||
        plan.productName?.toLowerCase().includes(keyword);
      const matchesStatus =
        statusFilter.value === "all" || plan.status === statusFilter.value;

      return matchesSearch && matchesStatus;
    });
  });

  const paginatedPlans = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredPlans.value.slice(start, start + pageSize.value);
  });

  watch([search, statusFilter], () => {
    currentPage.value = 1;
  });

  watch(pageSize, () => {
    currentPage.value = 1;
  });

  const isConfirmOpen = ref(false);
  const planToDelete = ref<number | null>(null);
  const isDeleting = ref(false);

  const handleDeleteRequest = (id: number) => {
    if (!canManagePlans.value) {
      toast.error("Từ chối", "Bạn không có quyền xóa gói sản phẩm");
      return;
    }
    planToDelete.value = id;
    isConfirmOpen.value = true;
  };

  const confirmDelete = async () => {
    if (!canManagePlans.value) {
      toast.error("Từ chối", "Bạn không có quyền xóa gói sản phẩm");
      return;
    }
    if (!planToDelete.value) return;

    isDeleting.value = true;
    try {
      await $fetch(`/api/admin/plans/${planToDelete.value}`, {
        method: "DELETE",
      });
      toast.success("Thành công", "Đã xóa gói sản phẩm.");
      await refresh();
    } catch (err: any) {
      toast.error("Lỗi", err.data?.message || "Không thể xóa gói sản phẩm.");
    } finally {
      isDeleting.value = false;
      isConfirmOpen.value = false;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  // ── Fields modal ──────────────────────────────────────────────
  interface PlanField {
    label: string;
    key: string;
    type: "text" | "textarea" | "image" | "number";
    required: boolean;
  }

  const fieldTypeOptions = [
    { label: "Text - Văn bản ngắn", value: "text" },
    { label: "Textarea - Văn bản dài", value: "textarea" },
    { label: "Image - Hình ảnh", value: "image" },
    { label: "Number - Số", value: "number" },
  ];

  const fieldsModal = ref(false);
  const fieldsModalPlan = ref<any>(null);
  const fieldsList = ref<PlanField[]>([]);
  const isSavingFields = ref(false);
  const subForm = ref(false);
  const fieldDraft = reactive<PlanField>({
    label: "",
    key: "",
    type: "text",
    required: true,
  });
  const editingFieldIdx = ref<number | null>(null);

  const fieldsModalTitle = computed(() => {
    if (!subForm.value)
      return `Cấu hình trường — ${fieldsModalPlan.value?.name ?? ""}`;
    return editingFieldIdx.value !== null
      ? "Chỉnh sửa trường"
      : "Thêm trường tùy chỉnh";
  });

  const toFieldKey = (str: string) =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

  watch(
    () => fieldDraft.label,
    (v) => {
      if (editingFieldIdx.value === null) fieldDraft.key = toFieldKey(v);
    }
  );

  const openFieldsModal = (plan: any) => {
    fieldsModalPlan.value = plan;
    try {
      fieldsList.value = plan.fields ? JSON.parse(plan.fields) : [];
    } catch {
      fieldsList.value = [];
    }
    subForm.value = false;
    fieldsModal.value = true;
  };

  const openAddField = () => {
    editingFieldIdx.value = null;
    Object.assign(fieldDraft, {
      label: "",
      key: "",
      type: "text",
      required: true,
    });
    subForm.value = true;
  };

  const openEditField = (idx: number) => {
    editingFieldIdx.value = idx;
    Object.assign(fieldDraft, { ...fieldsList.value[idx] });
    subForm.value = true;
  };

  const removeField = (idx: number) => {
    fieldsList.value.splice(idx, 1);
  };

  const saveSubForm = () => {
    if (!fieldDraft.label || !fieldDraft.key) return;
    if (editingFieldIdx.value !== null) {
      fieldsList.value[editingFieldIdx.value] = { ...fieldDraft };
    } else {
      fieldsList.value.push({ ...fieldDraft });
    }
    subForm.value = false;
  };

  const saveFields = async () => {
    if (!fieldsModalPlan.value) return;
    isSavingFields.value = true;
    try {
      await $fetch(`/api/admin/plans/${fieldsModalPlan.value.id}`, {
        method: "PATCH",
        body: { fields: JSON.stringify(fieldsList.value) },
      });
      const found = (data.value || []).find(
        (p: any) => p.id === fieldsModalPlan.value.id
      );
      if (found) (found as any).fields = JSON.stringify(fieldsList.value);
      toast.success("Đã lưu", "Cấu hình trường đã được cập nhật.");
      fieldsModal.value = false;
    } catch (e: any) {
      toast.error("Lỗi", e.data?.message || "Không thể lưu cấu hình trường.");
    } finally {
      isSavingFields.value = false;
    }
  };
</script>

<template>
  <div class="space-y-6">
    <!-- productId filter banner -->
    <div
      v-if="productIdFilter"
      class="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 px-4 py-3"
    >
      <Icon
        name="solar:filter-bold-duotone"
        size="16"
        class="text-primary shrink-0"
      />
      <p class="flex-1 text-[13px] font-semibold text-primary">
        Đang hiển thị gói của:
        <span class="text-slate-800 dark:text-white">{{
          filterProductName
        }}</span>
      </p>
      <NuxtLink
        to="/admin/plans"
        class="flex items-center gap-1 text-[12px] font-semibold text-slate-500 transition-colors hover:text-rose-500"
      >
        <Icon name="solar:close-circle-bold-duotone" size="16" />
        Bỏ lọc
      </NuxtLink>
    </div>

    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <div
          class="mb-1 flex items-center gap-2 text-xs font-semibold tracking-widest text-slate-400"
        >
          <Icon
            name="solar:tag-horizontal-bold-duotone"
            class="text-primary"
            size="16"
          />
          Cấu hình bán hàng
        </div>
        <h1
          class="text-xl font-semibold tracking-tight text-slate-900 dark:text-white"
        >
          Quản lý Gói sản phẩm
        </h1>
      </div>

      <UiButton
        variant="primary"
        class="px-6"
        @click="router.push('/admin/plans/create')"
      >
        <template #left-icon>
          <Icon name="solar:add-circle-bold" size="20" />
        </template>
        Tạo gói mới
      </UiButton>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div
        v-for="stat in [
          {
            label: 'Tổng số gói',
            value: plansList.length,
            icon: 'solar:layers-bold-duotone',
            color: 'bg-blue-500/10 text-blue-600',
          },
          {
            label: 'Đang hoạt động',
            value: plansList.filter((plan) => plan.status === 'active').length,
            icon: 'solar:check-circle-bold-duotone',
            color: 'bg-emerald-500/10 text-emerald-600',
          },
          {
            label: 'Nháp/Ẩn',
            value: plansList.filter((plan) => plan.status === 'inactive')
              .length,
            icon: 'solar:eye-closed-bold-duotone',
            color: 'bg-slate-500/10 text-slate-600',
          },
        ]"
        :key="stat.label"
        class="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      >
        <div
          :class="[
            'flex h-10 w-10 items-center justify-center rounded-xl',
            stat.color,
          ]"
        >
          <Icon :name="stat.icon" size="20" />
        </div>

        <div>
          <p
            class="mb-0.5 text-[11px] font-semibold tracking-widest text-slate-400"
          >
            {{ stat.label }}
          </p>
          <p class="text-xl font-semibold text-slate-800 dark:text-white">
            {{ stat.value }}
          </p>
        </div>
      </div>
    </div>

    <UiTable
      :headers="[
        { key: 'name', label: 'Thông tin gói' },
        { key: 'product', label: 'Sản phẩm' },
        { key: 'price', label: 'Giá bán' },
        { key: 'duration', label: 'Thời hạn' },
        { key: 'status', label: 'Trạng thái' },
        { key: 'actions', label: 'Thao tác', align: 'right', width: '220px' },
      ]"
      :items="paginatedPlans"
      striped
    >
      <template #top>
        <div
          class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div class="flex items-center gap-3">
            <span
              class="h-7 w-1.5 rounded-full bg-gradient-to-b from-sky-300 via-primary to-violet-400"
            ></span>
            <p class="text-base font-bold text-slate-800 dark:text-white">
              Danh sách gói sản phẩm
            </p>
          </div>

          <div class="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div class="w-full sm:min-w-[280px]">
              <UiInput
                v-model="search"
                placeholder="Tìm kiếm..."
                class="h-10 rounded-[14px] border-slate-200 bg-white shadow-sm focus:bg-white"
              >
                <template #left-icon>
                  <Icon name="solar:magnifer-line-duotone" size="18" />
                </template>
              </UiInput>
            </div>

            <div class="w-full shrink-0 sm:w-[190px]">
              <UiDropdown
                v-model="statusFilter"
                :options="[
                  { label: 'Tất cả trạng thái', value: 'all' },
                  { label: 'Đang hoạt động', value: 'active' },
                  { label: 'Tạm ẩn/Nháp', value: 'inactive' },
                ]"
              />
            </div>
          </div>
        </div>
      </template>

      <template #cell(name)="{ item }">
        <div class="flex flex-col">
          <span
            class="text-sm font-semibold text-slate-800 transition-colors group-hover:text-primary dark:text-white"
          >
            {{ item.name }}
          </span>
          <span
            class="mt-0.5 text-[11px] font-semibold tracking-widest text-slate-400"
          >
            ID: #{{ item.id }}
          </span>
        </div>
      </template>

      <template #cell(product)="{ item }">
        <div class="flex items-center gap-2">
          <div
            class="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary"
          >
            <Icon name="solar:box-bold" size="14" />
          </div>
          <span
            class="text-xs font-semibold text-slate-600 dark:text-slate-400"
          >
            {{ item.productName || "N/A" }}
          </span>
        </div>
      </template>

      <template #cell(price)="{ item }">
        <span class="text-sm font-semibold text-slate-900 dark:text-white">
          {{ formatPrice(item.price) }}
        </span>
      </template>

      <template #cell(duration)="{ item }">
        <div
          class="max-w-fit rounded border border-slate-200/50 bg-slate-100 px-2 py-1 dark:bg-slate-800"
        >
          <div class="flex items-center gap-1.5">
            <Icon
              name="solar:clock-circle-bold"
              size="14"
              class="text-slate-400"
            />
            <span class="text-[11px] font-semibold text-slate-500">
              {{ item.durationValue }}
              {{
                item.durationType === "day"
                  ? "Ngày"
                  : item.durationType === "month"
                    ? "Tháng"
                    : item.durationType === "year"
                      ? "Năm"
                      : item.durationType
              }}
            </span>
          </div>
        </div>
      </template>

      <template #cell(status)="{ item }">
        <UiBadge
          :variant="item.status === 'active' ? 'success' : 'slate'"
          :label="item.status === 'active' ? 'Đang bán' : 'Bản nháp'"
          rounded
        />
      </template>

      <template #cell(actions)="{ item }">
        <div class="flex items-center justify-end gap-1.5">
          <button
            v-if="canManagePlans"
            type="button"
            @click="openFieldsModal(item)"
            class="flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-violet-100 bg-violet-50 px-3 text-violet-600 transition-all hover:bg-violet-500 hover:text-white dark:border-violet-800 dark:bg-violet-900/20"
          >
            <Icon name="solar:settings-bold-duotone" size="14" />
            <span class="text-[11px] font-semibold">Cấu hình trường</span>
          </button>

          <NuxtLink
            v-if="canAccessStock && item.deliveryType === 'instant'"
            :to="`/admin/stock?plan_id=${item.id}`"
            class="flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-emerald-100 bg-emerald-50 px-3 text-emerald-600 transition-all hover:bg-emerald-500 hover:text-white dark:border-emerald-800 dark:bg-emerald-900/20"
          >
            <Icon name="solar:archive-bold-duotone" size="14" />
            <span class="text-[11px] font-semibold tracking-tight">Kho</span>
          </NuxtLink>

          <template v-if="canManagePlans">
            <NuxtLink
              :to="`/admin/plans/${item.id}`"
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 transition-all hover:text-primary dark:bg-slate-800"
            >
              <Icon name="solar:pen-new-square-bold" size="16" />
            </NuxtLink>
            <button
              type="button"
              @click="handleDeleteRequest(item.id)"
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 transition-all hover:text-rose-500 dark:bg-slate-800"
            >
              <Icon name="solar:trash-bin-trash-bold" size="16" />
            </button>
          </template>

          <span
            v-if="!canAccessStock && !canManagePlans"
            class="text-xs font-medium text-slate-400"
            >---</span
          >
        </div>
      </template>

      <template #empty>
        <div class="py-5 text-center">
          <div
            class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"
          >
            <Icon name="solar:box-minimalistic-line-duotone" size="24" />
          </div>
          <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Không có gói sản phẩm
          </p>
        </div>
      </template>
      <template #footer>
        <UiPagination
          :total="filteredPlans.length"
          v-model:pageSize="pageSize"
          v-model:currentPage="currentPage"
        />
      </template>
    </UiTable>

    <UiConfirm
      v-model="isConfirmOpen"
      title="Xóa gói sản phẩm"
      message="Bạn có chắc chắn muốn xóa gói sản phẩm này? Các tài khoản trong kho của gói này cũng sẽ bị ảnh hưởng."
      :loading="isDeleting"
      @confirm="confirmDelete"
    />

    <!-- Fields config modal -->
    <UiModal v-model="fieldsModal" :title="fieldsModalTitle" size="lg">
      <!-- Body: single root, v-if/v-else inside -->
      <div>
        <!-- Sub-form: add / edit field -->
        <div v-if="subForm" class="space-y-4">
          <div class="space-y-1.5">
            <label
              class="text-[11px] font-semibold uppercase tracking-widest text-slate-400"
            >
              Nhãn hiển thị <span class="text-rose-500">*</span>
            </label>
            <UiInput
              v-model="fieldDraft.label"
              placeholder="VD: Link tài khoản Facebook"
            />
            <p class="text-[11px] text-slate-400">
              Nhãn này sẽ hiển thị cho khách hàng
            </p>
          </div>

          <div class="space-y-1.5">
            <label
              class="text-[11px] font-semibold uppercase tracking-widest text-slate-400"
            >
              Field Key <span class="text-rose-500">*</span>
            </label>
            <UiInput v-model="fieldDraft.key" placeholder="VD: facebook_link" />
            <p class="text-[11px] text-slate-400">
              Tên kỹ thuật (không dấu, chữ thường, gạch dưới)
            </p>
          </div>

          <div class="space-y-1.5">
            <label
              class="text-[11px] font-semibold uppercase tracking-widest text-slate-400"
            >
              Loại trường <span class="text-rose-500">*</span>
            </label>
            <UiDropdown
              v-model="fieldDraft.type"
              :options="fieldTypeOptions"
              height-class="h-10"
            />
          </div>

          <div
            class="flex cursor-pointer select-none items-center gap-3"
            @click="fieldDraft.required = !fieldDraft.required"
          >
            <div
              class="relative h-6 w-10 rounded-full transition-colors"
              :class="
                fieldDraft.required
                  ? 'bg-primary'
                  : 'bg-slate-300 dark:bg-slate-600'
              "
            >
              <div
                class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                :class="fieldDraft.required ? 'translate-x-4' : 'translate-x-0'"
              />
            </div>
            <span
              class="text-[13px] font-semibold text-slate-700 dark:text-slate-200"
              >Bắt buộc nhập</span
            >
          </div>
        </div>

        <!-- Field list -->
        <div v-else class="space-y-3">
          <div v-if="fieldsList.length === 0" class="py-8 text-center">
            <Icon
              name="solar:document-add-bold-duotone"
              size="36"
              class="mx-auto mb-2 opacity-30 text-slate-400"
            />
            <p class="text-sm font-semibold text-slate-500">
              Chưa có trường nào
            </p>
            <p class="mt-1 text-xs text-slate-400">
              Bấm "Thêm trường" để bắt đầu
            </p>
          </div>

          <div
            v-for="(field, idx) in fieldsList"
            :key="idx"
            class="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#20232a] px-4 py-3"
          >
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              :class="{
                'bg-primary/10 text-primary': field.type === 'text',
                'bg-amber-50 text-amber-500': field.type === 'textarea',
                'bg-rose-50 text-rose-500': field.type === 'image',
                'bg-sky-50 text-sky-500': field.type === 'number',
              }"
            >
              <Icon
                :name="
                  field.type === 'image'
                    ? 'solar:gallery-bold-duotone'
                    : field.type === 'textarea'
                      ? 'solar:document-text-bold-duotone'
                      : field.type === 'number'
                        ? 'solar:hashtag-circle-bold-duotone'
                        : 'solar:text-bold-duotone'
                "
                size="16"
              />
            </div>
            <div class="min-w-0 flex-1">
              <p
                class="text-[13px] font-semibold leading-tight text-slate-800 dark:text-white"
              >
                {{ field.label }}
              </p>
              <p class="mt-0.5 text-[11px] text-slate-400">
                <span
                  class="rounded bg-slate-200 dark:bg-slate-700 px-1 font-mono"
                  >{{ field.key }}</span
                >
                <span class="ml-2"
                  >•
                  {{
                    fieldTypeOptions.find((o) => o.value === field.type)?.label
                  }}</span
                >
                <span
                  v-if="field.required"
                  class="ml-2 font-semibold text-rose-500"
                  >Bắt buộc</span
                >
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-1">
              <button
                type="button"
                @click="openEditField(idx)"
                class="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <Icon name="solar:pen-bold-duotone" size="14" />
              </button>
              <button
                type="button"
                @click="removeField(idx)"
                class="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
              >
                <Icon name="solar:trash-bin-trash-bold" size="14" />
              </button>
            </div>
          </div>

          <button
            type="button"
            @click="openAddField"
            class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-3 text-[13px] font-semibold text-slate-400 transition-colors hover:border-primary hover:text-primary"
          >
            <Icon name="solar:add-circle-bold-duotone" size="18" />
            Thêm trường mới
          </button>
        </div>
      </div>

      <!-- Footer: single #footer slot, v-if/v-else inside -->
      <template #footer>
        <div class="flex w-full items-center justify-between">
          <!-- Sub-form footer -->
          <template v-if="subForm">
            <button
              type="button"
              @click="subForm = false"
              class="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 transition-colors hover:text-slate-700"
            >
              <Icon name="solar:alt-arrow-left-linear" size="16" /> Quay lại
            </button>
            <div class="flex gap-2">
              <UiButton variant="outline" size="sm" @click="fieldsModal = false"
                >Đóng</UiButton
              >
              <UiButton
                variant="primary"
                size="sm"
                :disabled="!fieldDraft.label || !fieldDraft.key"
                @click="saveSubForm"
              >
                <template #prefix
                  ><Icon name="solar:diskette-bold-duotone" size="15"
                /></template>
                Lưu trường
              </UiButton>
            </div>
          </template>
          <!-- List footer -->
          <template v-else>
            <span />
            <div class="flex gap-2">
              <UiButton variant="outline" size="sm" @click="fieldsModal = false"
                >Hủy</UiButton
              >
              <UiButton
                variant="primary"
                size="sm"
                :loading="isSavingFields"
                @click="saveFields"
              >
                <template #prefix
                  ><Icon name="solar:diskette-bold-duotone" size="15"
                /></template>
                Lưu cấu hình
              </UiButton>
            </div>
          </template>
        </div>
      </template>
    </UiModal>
  </div>
</template>
