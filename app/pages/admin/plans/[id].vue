<script setup lang="ts">
definePageMeta({ layout: "admin" });

const route = useRoute();
const id = route.params.id;
useHead({ title: `Sửa gói sản phẩm #${id} - Admin Panel` });

const toast = useToast();
const router = useRouter();
const { user } = useUserSession();
const { formatDateTime } = useDateFormatter();

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

if (!canManagePlans.value) {
  toast.error("Từ chối", "Bạn không có quyền cập nhật gói sản phẩm");
  await navigateTo("/admin/plans");
}

const { data: planData } = await useFetch<any>(`/api/admin/plans/${id}`);
const { data: productsData } = await useFetch<any[]>("/api/admin/products");

const productOptions = computed(() => {
  if (!productsData.value) return [];
  return productsData.value.map((product) => ({
    label: product.name,
    value: product.id.toString(),
  }));
});

const durationTypes = [
  { label: "Ngày", value: "day" },
  { label: "Tháng", value: "month" },
  { label: "Năm", value: "year" },
  { label: "Vĩnh viễn", value: "permanent" },
];

const form = reactive({
  productId: "",
  name: "",
  slug: "",
  price: 0,
  durationValue: 1,
  durationType: "month",
  image: "",
  status: "active" as "active" | "inactive",
  deliveryType: "manual" as "manual" | "instant",
  description: "",
});

watchEffect(() => {
  if (!planData.value) return;

  form.productId = planData.value.productId?.toString() || "";
  form.name = planData.value.name || "";
  form.slug = planData.value.slug || "";
  form.price = planData.value.price || 0;
  form.durationValue = planData.value.durationValue || 1;
  form.durationType = planData.value.durationType || "month";
  form.image = planData.value.image || "";
  form.status = planData.value.status || "active";
  form.deliveryType = planData.value.deliveryType || "manual";
  form.description = planData.value.description || "";
});

const selectedFile = ref<File | null>(null);
const imagePreview = ref("");
const fileInput = ref<HTMLInputElement | null>(null);

const triggerUpload = () => {
  if (!canManagePlans.value) return;
  fileInput.value?.click();
};

const handleSelectFile = (event: Event) => {
  if (!canManagePlans.value) return;

  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  selectedFile.value = file;
  imagePreview.value = URL.createObjectURL(file);
};

const isSubmitting = ref(false);

const handleUpdate = async () => {
  if (!canManagePlans.value) {
    toast.error("Từ chối", "Bạn không có quyền cập nhật gói sản phẩm");
    return;
  }

  if (!form.name || !form.productId || form.price <= 0) {
    return toast.error(
      "Thiếu thông tin",
      "Vui lòng nhập đầy đủ tên, sản phẩm và giá bán.",
    );
  }

  if (
    form.durationType !== "permanent" &&
    (!form.durationValue || form.durationValue <= 0)
  ) {
    return toast.error(
      "Thiếu thông tin",
      "Vui lòng nhập thời lượng cho gói này.",
    );
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

    await $fetch(`/api/admin/plans/${id}`, {
      method: "PATCH",
      body: {
        productId: form.productId,
        name: form.name,
        slug: form.slug,   // server validate unique
        price: form.price,
        durationValue: form.durationValue,
        durationType: form.durationType,
        image: form.image,
        status: form.status,
        deliveryType: form.deliveryType,
        description: form.description,
      },
    });

    toast.success("Thành công", `Đã cập nhật gói "${form.name}".`);
    router.push("/admin/plans");
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
          to="/admin/plans"
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
            Quản lý gói
          </p>
          <h1
            class="text-lg font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-2"
          >
            Chỉnh sửa gói
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
          @click="router.push('/admin/plans')"
          >Hủy</UiButton
        >
        <UiButton
          variant="primary"
          size="sm"
          class="px-6"
          :loading="isSubmitting"
          :disabled="!canManagePlans"
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
                Tên, giá bán & sản phẩm
              </p>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label
                class="text-[11px] font-semibold uppercase tracking-widest text-slate-400"
                >Tên gói <span class="text-rose-500">*</span></label
              >
              <UiInput
                v-model="form.name"
                placeholder="VD: Gói Gold..."
                :disabled="!canManagePlans"
              />
            </div>
            <div class="space-y-1.5">
              <label
                class="text-[11px] font-semibold uppercase tracking-widest text-slate-400"
                >Giá bán (VND) <span class="text-rose-500">*</span></label
              >
              <UiInput
                v-model.number="form.price"
                type="number"
                placeholder="0"
                :disabled="!canManagePlans"
              />
            </div>
            <div class="space-y-1.5">
              <label
                class="text-[11px] font-semibold uppercase tracking-widest text-slate-400"
                >Sản phẩm <span class="text-rose-500">*</span></label
              >
              <UiDropdown
                v-model="form.productId"
                :options="productOptions"
                placeholder="Chọn sản phẩm..."
                height-class="h-10"
                :disabled="!canManagePlans"
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
                  { label: '🟢 Đang bán', value: 'active' },
                  { label: '⚫ Ẩn gói', value: 'inactive' },
                ]"
                height-class="h-10"
                :disabled="!canManagePlans"
              />
            </div>
            <!-- Slug -->
            <div class="col-span-2 space-y-1.5">
              <label class="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Slug <span class="font-normal normal-case text-slate-400">(dùng cho URL shareable)</span>
              </label>
              <div class="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden h-10">
                <span class="px-3 text-[12px] text-slate-400 bg-slate-50 dark:bg-slate-800 h-full flex items-center border-r border-slate-200 dark:border-slate-700 shrink-0">?plan=</span>
                <input
                  v-model="form.slug"
                  type="text"
                  placeholder="vd: youtube-1-thang"
                  class="flex-1 px-3 text-sm bg-transparent outline-none text-slate-700 dark:text-slate-200"
                  :disabled="!canManagePlans"
                />
              </div>
              <p class="text-[11px] text-slate-400">URL share: <span class="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">/products/[ten-sp]?plan={{ form.slug || 'slug-goi' }}</span></p>
            </div>
          </div>
        </div>

        <div class="border-t border-slate-100 dark:border-slate-800" />

        <!-- Section 2: Thời hạn -->
        <div>
          <div class="flex items-center gap-2 mb-4">
            <div
              class="w-1.5 h-6 rounded-full bg-gradient-to-b from-orange-400 to-orange-500"
            />
            <div>
              <p
                class="text-[10px] font-semibold uppercase tracking-widest text-slate-400"
              >
                2. Thời hạn
              </p>
              <p class="text-sm font-semibold text-slate-800 dark:text-white">
                Khoảng thời gian sử dụng
              </p>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div v-show="form.durationType !== 'permanent'" class="space-y-1.5">
              <label
                class="text-[11px] font-semibold uppercase tracking-widest text-slate-400"
                >Thời lượng</label
              >
              <UiInput
                v-model.number="form.durationValue"
                type="number"
                placeholder="VD: 30, 1..."
                :disabled="!canManagePlans"
              />
            </div>
            <div class="space-y-1.5">
              <label
                class="text-[11px] font-semibold uppercase tracking-widest text-slate-400"
                >Đơn vị</label
              >
              <UiDropdown
                v-model="form.durationType"
                :options="durationTypes"
                height-class="h-10"
                :disabled="!canManagePlans"
              />
            </div>
          </div>
        </div>

        <div class="border-t border-slate-100 dark:border-slate-800" />

        <!-- Section 3: Giao hàng -->
        <div>
          <div class="flex items-center gap-2 mb-4">
            <div
              class="w-1.5 h-6 rounded-full bg-gradient-to-b from-teal-400 to-cyan-500"
            />
            <div>
              <p
                class="text-[10px] font-semibold uppercase tracking-widest text-slate-400"
              >
                3. Phương thức giao hàng
              </p>
              <p class="text-sm font-semibold text-slate-800 dark:text-white">
                Cách tự động hay thủ công
              </p>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              @click="form.deliveryType = 'instant'"
              :disabled="!canManagePlans"
              class="relative flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all"
              :class="
                form.deliveryType === 'instant'
                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-slate-200 dark:border-slate-700 hover:border-primary/40'
              "
            >
              <div
                class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                :class="
                  form.deliveryType === 'instant'
                    ? 'bg-primary/10'
                    : 'bg-slate-100 dark:bg-slate-800'
                "
              >
                <Icon
                  name="solar:bolt-bold-duotone"
                  size="16"
                  :class="
                    form.deliveryType === 'instant'
                      ? 'text-primary'
                      : 'text-slate-400'
                  "
                />
              </div>
              <div class="flex-1 min-w-0">
                <p
                  class="text-[13px] font-semibold text-slate-800 dark:text-white"
                >
                  Tự động
                </p>
                <p class="text-[11px] text-slate-400">
                  Giao ngay sau thanh toán
                </p>
              </div>
              <div
                class="w-4 h-4 rounded-full border-2 shrink-0"
                :class="
                  form.deliveryType === 'instant'
                    ? 'border-primary bg-primary'
                    : 'border-slate-300 dark:border-slate-600'
                "
              />
            </button>
            <button
              type="button"
              @click="form.deliveryType = 'manual'"
              :disabled="!canManagePlans"
              class="relative flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all"
              :class="
                form.deliveryType === 'manual'
                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-slate-200 dark:border-slate-700 hover:border-primary/40'
              "
            >
              <div
                class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                :class="
                  form.deliveryType === 'manual'
                    ? 'bg-primary/10'
                    : 'bg-slate-100 dark:bg-slate-800'
                "
              >
                <Icon
                  name="solar:user-hand-up-bold-duotone"
                  size="16"
                  :class="
                    form.deliveryType === 'manual'
                      ? 'text-primary'
                      : 'text-slate-400'
                  "
                />
              </div>
              <div class="flex-1 min-w-0">
                <p
                  class="text-[13px] font-semibold text-slate-800 dark:text-white"
                >
                  Thủ công
                </p>
                <p class="text-[11px] text-slate-400">Admin xử lý thủ công</p>
              </div>
              <div
                class="w-4 h-4 rounded-full border-2 shrink-0"
                :class="
                  form.deliveryType === 'manual'
                    ? 'border-primary bg-primary'
                    : 'border-slate-300 dark:border-slate-600'
                "
              />
            </button>
          </div>
        </div>

        <div class="border-t border-slate-100 dark:border-slate-800" />

        <!-- Section 4: Mô tả & Ảnh -->
        <div>
          <div class="flex items-center gap-2 mb-4">
            <div
              class="w-1.5 h-6 rounded-full bg-gradient-to-b from-rose-400 to-pink-500"
            />
            <div>
              <p
                class="text-[10px] font-semibold uppercase tracking-widest text-slate-400"
              >
                4. Nội dung & Ảnh
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
                >Mô tả gói</label
              >
              <UiRichText
                v-model="form.description"
                placeholder="Mô tả đặc quyền, lợi ích..."
                :disabled="!canManagePlans"
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
                :disabled="!canManagePlans"
                @change="handleSelectFile"
              />
              <div
                class="group cursor-pointer transition-all"
                :class="!canManagePlans ? 'cursor-default' : ''"
                @click="triggerUpload"
              >
                <div
                  v-if="imagePreview || form.image"
                  class="w-full rounded-xl border border-slate-200 bg-white p-[6px] dark:border-slate-700 dark:bg-[#20232a]"
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

        <!-- Section 5: Ngày tạo -->
        <div
          v-if="planData?.createdAt"
          class="rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-4 flex items-center gap-3"
        >
          <Icon
            name="solar:calendar-bold-duotone"
            size="18"
            class="text-slate-400 shrink-0"
          />
          <div>
            <p
              class="text-[10px] font-semibold uppercase tracking-widest text-slate-400 leading-none mb-0.5"
            >
              Ngày tạo
            </p>
            <p
              class="text-[12px] font-semibold text-slate-600 dark:text-slate-300"
            >
              {{ formatDateTime(planData.createdAt) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
