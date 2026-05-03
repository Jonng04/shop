<script setup lang="ts">
  definePageMeta({ layout: "admin" });
  useHead({ title: "Quản lý sản phẩm - Admin Panel" });

  const toast = useToast();
  const { user } = useUserSession();

  interface SessionUser {
    role?: string | null;
    permissions?: string[] | null;
  }

  interface Product {
    id: number;
    name: string;
    categoryName: string;
    categoryId: number;
    image: string | null;
    status: string;
    createdAt: string;
    planCount: number;
  }

  const sessionUser = computed(() => user.value as SessionUser | null);

  const hasPermission = (permission: string) => {
    const role = String(sessionUser.value?.role || "").trim();
    if (role === "admin") return true;

    const permissions = sessionUser.value?.permissions || [];
    return permissions.includes("*") || permissions.includes(permission);
  };

  const canManageProducts = computed(() => hasPermission("manage_products"));

  const { data: categoriesData } = await useFetch<any[]>(
    "/api/admin/categories"
  );
  const categoryOptions = computed(() => {
    const base = [{ label: "Tất cả danh mục", value: "all" }];
    if (!categoriesData.value) return base;

    return [
      ...base,
      ...categoriesData.value.map((category) => ({
        label: category.name,
        value: category.id.toString(),
      })),
    ];
  });

  const { data, refresh } = await useFetch<Product[]>("/api/admin/products");
  const productsList = computed(() => data.value || []);

  const statusOptions = [
    { label: "Đang bán", value: "active" },
    { label: "Tạm dừng", value: "inactive" },
  ];

  const search = ref("");
  const filterCategory = ref("all");
  const filterStatus = ref("all");
  const pageSize = ref(10);
  const currentPage = ref(1);

  const filteredProducts = computed(() => {
    return productsList.value.filter((product) => {
      const matchesSearch =
        !search.value ||
        product.name.toLowerCase().includes(search.value.toLowerCase()) ||
        product.id.toString().includes(search.value);

      const matchesCategory =
        filterCategory.value === "all" ||
        product.categoryId?.toString() === filterCategory.value;

      const matchesStatus =
        filterStatus.value === "all" || product.status === filterStatus.value;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  });

  const paginatedProducts = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredProducts.value.slice(start, start + pageSize.value);
  });

  watch([search, filterCategory, filterStatus], () => {
    currentPage.value = 1;
  });

  watch(pageSize, () => {
    currentPage.value = 1;
  });

  const isConfirmOpen = ref(false);
  const productToDelete = ref<number | null>(null);
  const deleting = ref(false);

  const handleDelete = (id: number) => {
    if (!canManageProducts.value) {
      toast.error("Từ chối", "Bạn không có quyền xóa sản phẩm");
      return;
    }

    productToDelete.value = id;
    isConfirmOpen.value = true;
  };

  const confirmDelete = async () => {
    if (!canManageProducts.value) {
      toast.error("Từ chối", "Bạn không có quyền xóa sản phẩm");
      return;
    }

    if (!productToDelete.value) return;

    deleting.value = true;
    try {
      await $fetch(`/api/admin/products/${productToDelete.value}`, {
        method: "DELETE",
      });
      toast.success("Thành công", "Đã xóa sản phẩm khỏi hệ thống.");
      await refresh();
      isConfirmOpen.value = false;
    } catch (err: any) {
      toast.error("Lỗi", err.data?.message || "Không thể xóa sản phẩm");
    } finally {
      deleting.value = false;
    }
  };
</script>

<template>
  <div class="space-y-6">
    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <div
          class="mb-1 flex items-center gap-2 text-xs font-semibold tracking-widest text-slate-400"
        >
          <Icon name="solar:box-bold-duotone" class="text-primary" size="16" />
          Cấu hình bán hàng
        </div>
        <h1
          class="text-xl font-semibold tracking-tight text-slate-900 dark:text-white"
        >
          Quản lý sản phẩm
        </h1>
      </div>

      <NuxtLink
        v-if="canManageProducts"
        to="/admin/products/create"
        class="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-primary/90"
      >
        <Icon name="solar:add-circle-bold" size="20" />
        Thêm sản phẩm mới
      </NuxtLink>
    </div>

    <div class="grid grid-cols-2 gap-4 pb-2 lg:grid-cols-4">
      <div
        v-for="stat in [
          {
            label: 'Tổng sản phẩm',
            val: productsList.length.toString(),
            icon: 'solar:box-bold-duotone',
            color: 'text-primary bg-primary/10',
          },
          {
            label: 'Đang hoạt động',
            val: productsList
              .filter((product) => product.status === 'active')
              .length.toString(),
            icon: 'solar:eye-bold-duotone',
            color: 'text-amber-500 bg-amber-50',
          },
          {
            label: 'Sản phẩm ẩn',
            val: productsList
              .filter((product) => product.status === 'inactive')
              .length.toString(),
            icon: 'solar:forbidden-bold-duotone',
            color: 'text-rose-500 bg-rose-50',
          },
          {
            label: 'Danh mục',
            val: (categoryOptions.length - 1).toString(),
            icon: 'solar:case-md-bold-duotone',
            color: 'text-sky-500 bg-sky-50',
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
            class="mb-1 text-[11px] font-semibold uppercase tracking-tighter leading-none text-slate-400"
          >
            {{ stat.label }}
          </p>
          <p
            class="text-xl font-semibold leading-none text-slate-800 dark:text-white"
          >
            {{ stat.val }}
          </p>
        </div>
      </div>
    </div>

    <UiTable
      :headers="[
        { key: 'product', label: 'Thông tin sản phẩm' },
        { key: 'plans', label: 'Số gói', width: '100px', align: 'center' },
        { key: 'status', label: 'Trạng thái', width: '150px' },
        { key: 'actions', label: 'Thao tác', align: 'right', width: '220px' },
      ]"
      :items="paginatedProducts"
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
              Danh sách sản phẩm
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
              <UiDropdown v-model="filterCategory" :options="categoryOptions" />
            </div>

            <div class="w-full shrink-0 sm:w-[190px]">
              <UiDropdown
                v-model="filterStatus"
                :options="[
                  { label: 'Tất cả trạng thái', value: 'all' },
                  ...statusOptions,
                ]"
              />
            </div>
          </div>
        </div>
      </template>

      <template #cell(product)="{ item }">
        <div class="flex items-start gap-4 py-1">
          <div
            class="w-24 shrink-0 self-start rounded-xl border border-slate-200 bg-white p-[6px] shadow-sm dark:border-slate-700 dark:bg-[#20232a]"
          >
            <img
              v-if="item.image"
              :src="item.image"
              :alt="item.name"
              class="block w-full rounded-lg"
            />
            <div
              v-else
              class="flex aspect-[16/9] w-full items-center justify-center rounded-lg bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600"
            >
              <Icon name="solar:box-bold-duotone" size="22" />
            </div>
          </div>

          <div class="min-w-0">
            <p
              class="line-clamp-1 text-base font-semibold leading-tight text-slate-800 dark:text-slate-100"
            >
              {{ item.name }}
            </p>
            <div class="mt-2 flex items-center gap-2">
              <span
                class="inline-flex items-center rounded-md bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              >
                {{ item.categoryName || "Chưa phân loại" }}
              </span>
              <span class="text-slate-200 dark:text-slate-700">•</span>
              <span
                class="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400"
              >
                ID: #{{ item.id }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <template #cell(plans)="{ item }">
        <div class="flex justify-center">
          <span
            class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            :class="
              item.planCount > 0
                ? 'bg-primary/10 text-primary'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            "
          >
            <Icon name="solar:layers-bold-duotone" size="12" />
            {{ item.planCount }}
          </span>
        </div>
      </template>

      <template #cell(status)="{ item }">
        <UiBadge
          :variant="item.status === 'active' ? 'success' : 'slate'"
          :label="item.status === 'active' ? 'Đang hoạt động' : 'Tạm ẩn'"
          rounded
        />
      </template>

      <template #cell(actions)="{ item }">
        <div
          v-if="canManageProducts"
          class="flex items-center justify-end gap-2 whitespace-nowrap"
        >
          <NuxtLink
            :to="`/admin/plans?productId=${item.id}`"
            class="flex items-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1.5 text-[12px] font-semibold transition-colors"
          >
            <Icon name="solar:layers-bold-duotone" size="14" />
            Quản lý gói
          </NuxtLink>
          <NuxtLink
            :to="`/admin/products/${item.id}`"
            class="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:text-primary dark:border-slate-700 dark:bg-[#20232a] dark:text-slate-300 dark:hover:border-primary/40 dark:hover:bg-primary/10"
          >
            <Icon name="solar:pen-new-square-bold" size="16" />
          </NuxtLink>
          <UiButton
            variant="ghost"
            size="sm"
            @click="handleDelete(item.id)"
            class="!flex !h-9 !w-9 !items-center !justify-center !rounded-xl border border-slate-200 !bg-white !p-0 text-slate-500 transition-all hover:!-translate-y-0.5 hover:!border-rose-200 hover:!bg-rose-50 hover:!text-rose-500 dark:border-slate-700 dark:!bg-[#20232a] dark:text-slate-300 dark:hover:!border-rose-500/30 dark:hover:!bg-rose-900/20 dark:hover:!text-rose-400"
          >
            <Icon name="solar:trash-bin-trash-bold" size="16" />
          </UiButton>
        </div>
        <span v-else class="text-xs font-medium text-slate-400">---</span>
      </template>

      <template #empty>
        <div class="py-5 text-center">
          <div
            class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"
          >
            <Icon name="solar:box-minimalistic-line-duotone" size="24" />
          </div>
          <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Không có sản phẩm
          </p>
        </div>
      </template>
      <template #footer>
        <UiPagination
          :total="filteredProducts.length"
          v-model:pageSize="pageSize"
          v-model:currentPage="currentPage"
        />
      </template>
    </UiTable>

    <UiConfirm
      v-model="isConfirmOpen"
      title="Xóa sản phẩm"
      message="Bạn có chắc chắn muốn xóa sản phẩm này? Tất cả các gói sản phẩm và kho hàng liên quan cũng sẽ bị ảnh hưởng."
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>
