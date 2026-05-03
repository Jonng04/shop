<script setup lang="ts">
  definePageMeta({ layout: "admin" });
  useHead({ title: "Quản lý danh mục - Admin Panel" });

  const toast = useToast();

  interface Category {
    id: number;
    name: string;
    image: string | null;
    status: string;
    product_count?: number;
    createdAt: string;
  }

  const statusOptions = [
    { label: "Tất cả trạng thái", value: "all" },
    { label: "Đang hoạt động", value: "active" },
    { label: "Đang ẩn", value: "hidden" },
  ];

  const { data, refresh } = await useFetch<Category[]>("/api/admin/categories");
  const categoriesList = computed(() => data.value || []);

  const search = ref("");
  const filterStatus = ref("all");
  const pageSize = ref(10);
  const currentPage = ref(1);

  const filteredCategories = computed(() => {
    return categoriesList.value.filter((category) => {
      const matchesSearch =
        !search.value ||
        category.name.toLowerCase().includes(search.value.toLowerCase());
      const matchesStatus =
        filterStatus.value === "all" || category.status === filterStatus.value;

      return matchesSearch && matchesStatus;
    });
  });

  const paginatedCategories = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredCategories.value.slice(start, start + pageSize.value);
  });

  watch([search, filterStatus], () => {
    currentPage.value = 1;
  });

  watch(pageSize, () => {
    currentPage.value = 1;
  });

  const isModalOpen = ref(false);
  const isEditing = ref(false);
  const submitting = ref(false);
  const uploadingImage = ref(false);
  const fileInput = ref<HTMLInputElement | null>(null);
  const selectedFile = ref<File | null>(null);
  const imagePreview = ref("");

  const form = reactive({
    id: null as number | null,
    name: "",
    slug: "",
    image: "https://cdn-icons-png.flaticon.com/512/1000/1000966.png",
    status: "active" as "active" | "hidden",
  });

  const handleAdd = () => {
    isEditing.value = false;
    form.id = null;
    form.name = "";
    form.slug = "";
    form.image = "https://cdn-icons-png.flaticon.com/512/1000/1000966.png";
    form.status = "active";
    selectedFile.value = null;
    imagePreview.value = "";
    isModalOpen.value = true;
  };

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
      if (!isEditing.value) form.slug = toSlug(val);
    }
  );

  const handleEdit = (category: Category) => {
    isEditing.value = true;
    form.id = category.id;
    form.name = category.name;
    form.slug = (category as any).slug || "";
    form.image = category.image || "";
    form.status = category.status as "active" | "hidden";
    selectedFile.value = null;
    imagePreview.value = "";
    isModalOpen.value = true;
  };

  const triggerImageUpload = () => {
    fileInput.value?.click();
  };

  const handleImageSelect = (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    selectedFile.value = file;
    imagePreview.value = URL.createObjectURL(file);
  };

  const handleSave = async () => {
    if (!form.name || form.name.trim().length < 2) {
      return toast.error("Lỗi", "Tên danh mục phải có ít nhất 2 ký tự.");
    }

    submitting.value = true;
    try {
      if (selectedFile.value) {
        uploadingImage.value = true;
        const uploadFormData = new FormData();
        uploadFormData.append("file", selectedFile.value);

        const uploadRes = await $fetch<{ url: string }>("/api/common/upload", {
          method: "POST",
          body: uploadFormData,
        });

        form.image = uploadRes.url;
      }

      if (isEditing.value && form.id) {
        await $fetch(`/api/admin/categories/${form.id}`, {
          method: "PATCH",
          body: {
            name: form.name,
            slug: form.slug || null,
            image: form.image,
            status: form.status,
          },
        });
        toast.success("Thành công", `Đã cập nhật danh mục ${form.name}.`);
      } else {
        await $fetch("/api/admin/categories", {
          method: "POST",
          body: {
            name: form.name,
            slug: form.slug || null,
            image: form.image,
            status: form.status,
          },
        });
        toast.success("Thành công", `Đã thêm danh mục ${form.name}.`);
      }

      await refresh();
      isModalOpen.value = false;
      selectedFile.value = null;
      imagePreview.value = "";
    } catch (err: any) {
      toast.error("Lỗi", err.data?.message || "Có lỗi xảy ra khi lưu.");
    } finally {
      uploadingImage.value = false;
      submitting.value = false;
    }
  };

  const isConfirmOpen = ref(false);
  const categoryToDelete = ref<number | null>(null);
  const deleting = ref(false);

  const handleDelete = (id: number) => {
    categoryToDelete.value = id;
    isConfirmOpen.value = true;
  };

  const confirmDelete = async () => {
    if (!categoryToDelete.value) return;

    deleting.value = true;
    try {
      await $fetch(`/api/admin/categories/${categoryToDelete.value}`, {
        method: "DELETE",
      });
      toast.success("Đã xóa!", "Danh mục đã được gỡ bỏ khỏi hệ thống.");
      await refresh();
      isConfirmOpen.value = false;
    } catch (err: any) {
      toast.error("Lỗi", err.data?.message || "Không thể xóa danh mục này.");
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
          <Icon
            name="solar:folder-2-bold-duotone"
            class="text-primary"
            size="16"
          />
          Cấu hình hiển thị
        </div>
        <h1
          class="text-xl font-semibold tracking-tight text-slate-900 dark:text-white"
        >
          Quản lý Danh mục sản phẩm
        </h1>
      </div>

      <UiButton @click="handleAdd" class="shadow-lg shadow-primary/20">
        <template #prefix>
          <Icon name="solar:add-folder-bold" size="20" />
        </template>
        Thêm danh mục
      </UiButton>
    </div>

    <UiTable
      :headers="[
        { key: 'category', label: 'Danh mục' },
        { key: 'status', label: 'Trạng thái', width: '140px' },
        { key: 'actions', label: 'Hành động', align: 'right', width: '100px' },
      ]"
      :items="paginatedCategories"
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
              Danh sách danh mục
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
              <UiDropdown v-model="filterStatus" :options="statusOptions" />
            </div>
          </div>
        </div>
      </template>

      <template #cell(category)="{ item }">
        <div class="flex items-start gap-4 py-1">
          <div
            class="w-20 shrink-0 self-start rounded-xl border border-slate-200 bg-white p-[6px] dark:border-slate-700 dark:bg-[#20232a]"
          >
            <img v-if="item.image" :src="item.image" :alt="item.name" class="block w-full rounded-lg" />
            <div
              v-else
              class="flex aspect-[16/9] w-full items-center justify-center rounded-lg bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600"
            >
              <Icon name="solar:folder-2-bold-duotone" size="22" />
            </div>
          </div>

          <div class="min-w-0">
            <p
              class="line-clamp-1 text-[13px] font-bold text-slate-800 dark:text-slate-100"
            >
              {{ item.name }}
            </p>
            <p
              class="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"
            >
              ID: #C{{ item.id }}
            </p>
          </div>
        </div>
      </template>

      <template #cell(status)="{ item }">
        <UiBadge
          :variant="item.status === 'active' ? 'success' : 'slate'"
          :label="item.status === 'active' ? 'Hoạt động' : 'Đang ẩn'"
          rounded
        />
      </template>

      <template #cell(actions)="{ item }">
        <div class="flex items-center justify-end gap-2">
          <UiButton
            variant="ghost"
            size="sm"
            @click="handleEdit(item)"
            class="!flex !h-9 !w-9 !items-center !justify-center !rounded-xl border border-slate-200 !bg-white !p-0 text-slate-500 transition-all hover:!-translate-y-0.5 hover:!border-primary/30 hover:!bg-primary/5 hover:!text-primary dark:border-slate-700 dark:!bg-[#20232a] dark:text-slate-300 dark:hover:!border-primary/40 dark:hover:!bg-primary/10"
          >
            <Icon name="solar:pen-new-square-bold" size="16" />
          </UiButton>

          <UiButton
            variant="ghost"
            size="sm"
            @click="handleDelete(item.id)"
            class="!flex !h-9 !w-9 !items-center !justify-center !rounded-xl border border-slate-200 !bg-white !p-0 text-slate-500 transition-all hover:!-translate-y-0.5 hover:!border-rose-200 hover:!bg-rose-50 hover:!text-rose-500 dark:border-slate-700 dark:!bg-[#20232a] dark:text-slate-300 dark:hover:!border-rose-500/30 dark:hover:!bg-rose-900/20 dark:hover:!text-rose-400"
          >
            <Icon name="solar:trash-bin-trash-bold" size="16" />
          </UiButton>
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
            Không có danh mục
          </p>
        </div>
      </template>
      <template #footer>
        <UiPagination
          :total="filteredCategories.length"
          v-model:pageSize="pageSize"
          v-model:currentPage="currentPage"
        />
      </template>
    </UiTable>

    <UiModal
      v-model="isModalOpen"
      :title="isEditing ? 'Cập nhật danh mục' : 'Thêm danh mục mới'"
      size="lg"
    >
      <div class="space-y-5">
        <div>
          <label
            class="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-200"
          >
            Ảnh đại diện (Thumbnail)
          </label>

          <input
            ref="fileInput"
            type="file"
            class="hidden"
            accept="image/*"
            @change="handleImageSelect"
          />

          <div class="flex items-center gap-4">
            <div
              class="h-20 w-20 overflow-hidden rounded-3xl border border-slate-100 bg-slate-50 p-2 shadow-inner dark:border-slate-700 dark:bg-slate-800"
            >
              <img
                v-if="imagePreview || form.image"
                :src="imagePreview || form.image"
                alt="Preview"
                class="h-full w-full object-contain"
              />
              <div
                v-else
                class="flex h-full w-full items-center justify-center rounded-2xl bg-slate-100 text-slate-300 dark:bg-slate-700 dark:text-slate-500"
              >
                <Icon name="solar:camera-bold-duotone" size="24" />
              </div>
            </div>

            <div class="flex-1 space-y-2">
              <UiButton
                variant="outline"
                class="w-full justify-center"
                :loading="uploadingImage"
                @click="triggerImageUpload"
              >
                <template #prefix>
                  <Icon name="solar:upload-minimalistic-bold-duotone" size="18" />
                </template>
                Tải ảnh lên
              </UiButton>
              <p class="mt-2 text-[11px] font-medium italic text-slate-400">
                Chọn ảnh vuông 1:1 để hiển thị đẹp hơn trong danh mục.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label
            class="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-200"
          >
            Tên danh mục
          </label>
          <UiInput
            v-model="form.name"
            placeholder="Ví dụ: Youtube Premium, Netflix..."
          />
        </div>

        <div>
          <label
            class="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-200"
          >
            Slug (URL)
          </label>
          <UiInput v-model="form.slug" placeholder="vd: youtube-premium" />
          <p class="mt-1.5 text-[11px] font-medium text-slate-400">
            Dùng cho đường dẫn: /categories/<span class="text-primary">{{
              form.slug || "slug"
            }}</span>
          </p>
        </div>

        <div>
          <label
            class="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-200"
          >
            Trạng thái hiển thị
          </label>
          <UiDropdown
            v-model="form.status"
            :options="[
              { label: 'Hoạt động (Hiển thị ngay)', value: 'active' },
              { label: 'Đang ẩn (Tạm tắt)', value: 'hidden' },
            ]"
          />
        </div>
      </div>

      <template #empty>
        <div class="py-5 text-center">
          <div
            class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"
          >
            <Icon name="solar:box-minimalistic-line-duotone" size="24" />
          </div>
          <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Không có danh mục
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex gap-3">
          <UiButton
            variant="outline"
            class="flex-1"
            @click="isModalOpen = false"
          >
            Hủy bỏ
          </UiButton>
          <UiButton class="flex-1" :loading="submitting" @click="handleSave">
            {{ isEditing ? "Lưu cập nhật" : "Xác nhận tạo" }}
          </UiButton>
        </div>
      </template>
    </UiModal>

    <UiConfirm
      v-model="isConfirmOpen"
      title="Xóa danh mục"
      message="Bạn có chắc chắn muốn xóa danh mục này? Hệ thống sẽ tự động kiểm tra nếu có sản phẩm nào đang thuộc danh mục này."
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>
