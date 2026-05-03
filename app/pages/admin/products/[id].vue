<script setup lang="ts">
  definePageMeta({ layout: "admin" });

  const route = useRoute();
  const id = route.params.id;
  useHead({ title: `Sửa sản phẩm #${id} - Admin Panel` });

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
    toast.error("Từ chối", "Bạn không có quyền cập nhật sản phẩm");
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

  const { data: productData } = await useFetch<any>(
    `/api/admin/products/${id}`
  );

  watchEffect(() => {
    if (!productData.value) return;

    form.name = productData.value.name || "";
    form.slug = productData.value.slug || "";
    form.categoryId = productData.value.categoryId?.toString() || "";
    form.status = productData.value.status || "active";
    form.image = productData.value.image || "";
    form.description = productData.value.description || "";
    form.deliveryType = productData.value.deliveryType || "manual";
  });

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
  };

  const triggerUpload = () => {
    if (!canManageProducts.value) return;
    fileInput.value?.click();
  };

  const handleUpdate = async () => {
    if (!canManageProducts.value) {
      toast.error("Từ chối", "Bạn không có quyền cập nhật sản phẩm");
      return;
    }

    if (!form.name || form.name.trim().length < 2) {
      return toast.error("Lỗi", "Tên sản phẩm phải có ít nhất 2 ký tự.");
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

      await $fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        body: {
          name: form.name,
          slug: form.slug || null,
          categoryId: form.categoryId,
          image: form.image,
          description: form.description,
          status: form.status,
        },
      });

      toast.success("Đã cập nhật", `Thông tin sản phẩm #${id} đã được lưu.`);
      router.push("/admin/products");
    } catch (error: any) {
      toast.error("Lỗi", error.data?.message || "Có lỗi xảy ra khi cập nhật.");
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
            class="text-lg font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-2"
          >
            Chỉnh sửa sản phẩm
            <span
              class="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-lg"
              >#{{ id }}</span
            >
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
          @click="handleUpdate"
        >
          <template #prefix
            ><Icon name="solar:diskette-bold-duotone" size="16"
          /></template>
          Lưu thay đổi
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
              class="w-1.5 h-6 rounded-full bg-gradient-to-b from-indigo-400 to-primary"
            />
            <div>
              <p
                class="text-[10px] font-semibold uppercase tracking-widest text-slate-400"
              >
                1. Thông tin cơ bản
              </p>
              <p class="text-sm font-semibold text-slate-800 dark:text-white">
                Tên, slug & danh mục
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
                placeholder="VD: Netflix Premium..."
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
                placeholder="netflix-premium"
                :disabled="!canManageProducts"
              />
              <p class="text-[11px] text-slate-400">
                /products/<span class="text-primary font-medium">{{
                  form.slug || "slug"
                }}</span>
              </p>
            </div>
            <div class="space-y-1.5">
              <label
                class="text-[11px] font-semibold uppercase tracking-widest text-slate-400"
                >Danh mục</label
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

        <!-- Section 2: Nội dung & Ảnh -->
        <div>
          <div class="flex items-center gap-2 mb-4">
            <div
              class="w-1.5 h-6 rounded-full bg-gradient-to-b from-rose-400 to-pink-500"
            />
            <div>
              <p
                class="text-[10px] font-semibold uppercase tracking-widest text-slate-400"
              >
                2. Nội dung & Ảnh
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
                placeholder="Mô tả tính năng, quyền lợi..."
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
                class="group cursor-pointer transition-all"
                :class="!canManageProducts ? 'cursor-default' : ''"
                @click="triggerUpload"
              >
                <div
                  v-if="imagePreview || form.image"
                  class="w-full rounded-xl border border-slate-200 bg-white p-[6px] shadow-sm dark:border-slate-700 dark:bg-[#20232a]"
                >
                  <img
                    :src="imagePreview || form.image"
                    class="block w-full rounded-lg"
                  />
                </div>
                <div
                  v-else
                  class="relative overflow-hidden rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary/40"
                  style="aspect-ratio: 16/9"
                >
                  <div
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
    </div>
  </div>
</template>
