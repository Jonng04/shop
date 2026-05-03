<script setup lang="ts">
  definePageMeta({ layout: "admin" });
  useHead({ title: "Thêm sản phẩm mới - Admin Panel" });

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

  const canManageProducts = computed(() => hasPermission("manage_products"));

  if (!canManageProducts.value) {
    toast.error("Từ chối", "Bạn không có quyền tạo sản phẩm");
    await navigateTo("/admin/products");
  }

  const { data: categoriesData } = await useFetch<any[]>(
    "/api/admin/categories"
  );
  const categoryOptions = computed(() => {
    if (!categoriesData.value) return [];
    return categoriesData.value.map((category) => ({
      label: category.name,
      value: category.id.toString(),
    }));
  });

  const form = reactive({
    name: "",
    slug: "",
    categoryId: "" as string,
    status: "active" as "active" | "inactive",
    image: "" as string,
    description: "",
    deliveryType: "manual" as "manual" | "instant",
  });

  const toSlug = (str: string) =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");

  watch(
    () => form.name,
    (val) => {
      form.slug = toSlug(val);
    }
  );

  const isSubmitting = ref(false);
  const selectedFile = ref<File | null>(null);
  const imagePreview = ref("");
  const fileInput = ref<HTMLInputElement | null>(null);

  const handleSelectFile = (event: Event) => {
    if (!canManageProducts.value) return;

    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    selectedFile.value = file;
    imagePreview.value = URL.createObjectURL(file);
    form.image = "";
  };

  const triggerUpload = () => {
    if (!canManageProducts.value) return;
    fileInput.value?.click();
  };

  const handleSave = async () => {
    if (!canManageProducts.value) {
      toast.error("Từ chối", "Bạn không có quyền tạo sản phẩm");
      return;
    }

    if (!form.name || form.name.trim().length < 2) {
      return toast.error("Lỗi", "Tên sản phẩm phải có ít nhất 2 ký tự.");
    }
    if (!form.categoryId) {
      return toast.error("Lỗi", "Vui lòng chọn danh mục.");
    }

    isSubmitting.value = true;
    try {
      if (selectedFile.value) {
        const formData = new FormData();
        formData.append("file", selectedFile.value);

        const uploadRes = await $fetch<{ url: string }>("/api/common/upload", {
          method: "POST",
          body: formData,
        });
        form.image = uploadRes.url;
      }

      await $fetch("/api/admin/products", {
        method: "POST",
        body: {
          name: form.name,
          slug: form.slug || null,
          categoryId: form.categoryId,
          image: form.image,
          description: form.description,
          deliveryType: form.deliveryType,
          status: form.status,
        },
      });

      toast.success("Thành công", `Sản phẩm ${form.name} đã được tạo.`);
      router.push("/admin/products");
    } catch (error: any) {
      toast.error("Lỗi", error.data?.message || "Có lỗi xảy ra khi xử lý.");
    } finally {
      isSubmitting.value = false;
    }
  };
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div
      class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-3">
        <NuxtLink
          to="/admin/products"
          class="group flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 transition-all hover:border-primary/40 hover:text-primary"
        >
          <Icon
            name="solar:alt-arrow-left-line-duotone"
            size="18"
            class="transition-transform group-hover:-translate-x-0.5"
          />
        </NuxtLink>
        <div>
          <p
            class="text-[11px] font-semibold text-slate-400 uppercase tracking-widest leading-none mb-0.5"
          >
            Quản lý sản phẩm
          </p>
          <h1
            class="text-lg font-semibold tracking-tight text-slate-900 dark:text-white"
          >
            Tạo sản phẩm mới
          </h1>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <UiButton
          variant="outline"
          size="sm"
          class="px-4"
          @click="router.push('/admin/products')"
          >Hủy</UiButton
        >
        <UiButton
          variant="primary"
          size="sm"
          class="px-6"
          :loading="isSubmitting"
          :disabled="!canManageProducts"
          @click="handleSave"
        >
          <template #prefix
            ><Icon name="solar:diskette-bold-duotone" size="16"
          /></template>
          Tạo sản phẩm
        </UiButton>
      </div>
    </div>

    <!-- Form Card -->
    <div
      class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181a1f] overflow-hidden"
    >
      <div class="p-6 space-y-6">
        <!-- Section 1: Thông tin cơ bản -->
        <div>
          <div class="flex items-center gap-2 mb-4">
            <div
              class="w-1.5 h-6 rounded-full bg-gradient-to-b from-blue-400 to-blue-500"
            />
            <div>
              <p
                class="text-[10px] font-semibold uppercase tracking-widest text-slate-400"
              >
                1. Thông tin cơ bản
              </p>
              <p class="text-sm font-semibold text-slate-800 dark:text-white">
                Tên & Slug sản phẩm
              </p>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label
                class="text-[11px] font-semibold uppercase tracking-widest text-slate-400"
                >Tên sản phẩm <span class="text-rose-500">*</span></label
              >
              <UiInput
                v-model="form.name"
                placeholder="VD: Netflix Premium 4K..."
                :disabled="!canManageProducts"
              />
            </div>
            <div class="space-y-1.5">
              <label
                class="text-[11px] font-semibold uppercase tracking-widest text-slate-400"
                >Slug (URL)</label
              >
              <UiInput
                v-model="form.slug"
                placeholder="netflix-premium-4k"
                :disabled="!canManageProducts"
              />
              <p class="text-[11px] text-slate-400">
                /products/<span class="text-primary font-medium">{{
                  form.slug || "slug"
                }}</span>
              </p>
            </div>
          </div>
        </div>

        <div class="border-t border-slate-100 dark:border-slate-800" />

        <!-- Section 2: Danh mục -->
        <div>
          <div class="flex items-center gap-2 mb-4">
            <div
              class="w-1.5 h-6 rounded-full bg-gradient-to-b from-purple-400 to-purple-500"
            />
            <div>
              <p
                class="text-[10px] font-semibold uppercase tracking-widest text-slate-400"
              >
                2. Danh mục
              </p>
              <p class="text-sm font-semibold text-slate-800 dark:text-white">
                Phân loại sản phẩm
              </p>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label
                class="text-[11px] font-semibold uppercase tracking-widest text-slate-400"
                >Danh mục <span class="text-rose-500">*</span></label
              >
              <UiDropdown
                v-model="form.categoryId"
                :options="categoryOptions"
                placeholder="Chọn danh mục..."
                height-class="h-10"
                :disabled="!canManageProducts"
              />
            </div>
            <div class="space-y-1.5">
              <label
                class="text-[11px] font-semibold uppercase tracking-widest text-slate-400"
                >Trạng thái</label
              >
              <UiDropdown
                v-model="form.status"
                :options="[
                  { label: 'Đang bán', value: 'active' },
                  { label: 'Ẩn sản phẩm', value: 'inactive' },
                ]"
                height-class="h-10"
                :disabled="!canManageProducts"
              />
            </div>
          </div>
        </div>

        <div class="border-t border-slate-100 dark:border-slate-800" />

        <!-- Section 3: Giao hàng -->
        <div class="border-t border-slate-100 dark:border-slate-800" />

        <!-- Section 3: Nội dung & Ảnh -->
        <div>
          <div class="flex items-center gap-2 mb-4">
            <div
              class="w-1.5 h-6 rounded-full bg-gradient-to-b from-rose-400 to-pink-500"
            />
            <div>
              <p
                class="text-[10px] font-semibold uppercase tracking-widest text-slate-400"
              >
                3. Nội dung & Ảnh
              </p>
              <p class="text-sm font-semibold text-slate-800 dark:text-white">
                Mô tả và ảnh đại diện
              </p>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <!-- Mô tả -->
            <div class="space-y-1.5">
              <label
                class="text-[11px] font-semibold uppercase tracking-widest text-slate-400"
                >Mô tả sản phẩm</label
              >
              <UiRichText
                v-model="form.description"
                placeholder="Mô tả tính năng, quyền lợi khách hàng..."
                :disabled="!canManageProducts"
              />
            </div>
            <!-- Ảnh -->
            <div class="space-y-1.5">
              <label
                class="text-[11px] font-semibold uppercase tracking-widest text-slate-400"
                >Ảnh đại diện</label
              >
              <input
                ref="fileInput"
                type="file"
                class="hidden"
                accept="image/*"
                :disabled="!canManageProducts"
                @change="handleSelectFile"
              />
              <div
                class="relative group rounded-xl overflow-hidden cursor-pointer border-2 transition-all"
                :class="
                  imagePreview || form.image
                    ? 'border-primary/30'
                    : 'border-dashed border-slate-200 dark:border-slate-700 hover:border-primary/40'
                "
                style="aspect-ratio: 16/9"
                @click="triggerUpload"
              >
                <img
                  v-if="imagePreview || form.image"
                  :src="imagePreview || form.image"
                  class="w-full h-full object-contain"
                />
                <div
                  v-else
                  class="absolute inset-0 flex flex-col items-center justify-center gap-2"
                >
                  <Icon
                    name="solar:upload-minimalistic-bold-duotone"
                    size="28"
                    class="text-slate-300 group-hover:text-primary transition-colors"
                  />
                  <p class="text-[11px] font-semibold text-slate-400">
                    Tải ảnh lên
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tip -->
    <div
      class="rounded-xl border border-sky-200 dark:border-sky-800/40 bg-sky-50 dark:bg-sky-900/10 p-4 flex gap-3"
    >
      <Icon
        name="solar:info-circle-bold-duotone"
        size="18"
        class="text-sky-500 shrink-0 mt-0.5"
      />
      <p class="text-[12px] text-sky-700 dark:text-sky-400 leading-relaxed">
        Sau khi tạo sản phẩm, vào trang chỉnh sửa để thêm
        <strong>gói dịch vụ</strong> và <strong>kho hàng</strong>.
      </p>
    </div>
  </div>
</template>
