<script setup lang="ts">
  useHead({ title: "Đặt lại mật khẩu - Nuxt.Js" });

  const toast = useToast();
  const route = useRoute();

  const token = computed(() => String(route.query.token || ""));
  const loading = ref(false);
  const showPassword = ref(false);
  const showConfirmPassword = ref(false);

  const form = ref({
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async () => {
    if (!token.value) {
      return toast.error("Token không hợp lệ", "Thiếu token đặt lại mật khẩu");
    }

    if (!form.value.password || form.value.password.length < 6) {
      return toast.error("Mật khẩu yếu", "Mật khẩu phải có ít nhất 6 ký tự");
    }

    if (form.value.password !== form.value.confirmPassword) {
      return toast.error("Không khớp", "Mật khẩu xác nhận không khớp");
    }

    loading.value = true;
    try {
      const response = await $fetch<{ success: boolean; message: string }>(
        "/api/auth/reset-password",
        {
          method: "POST",
          body: {
            token: token.value,
            password: form.value.password,
            confirmPassword: form.value.confirmPassword,
          },
        }
      );

      toast.success("Thành công", response.message);
      setTimeout(() => {
        navigateTo("/auth/login");
      }, 1200);
    } catch (error: any) {
      toast.error(
        "Đặt lại mật khẩu thất bại",
        error?.data?.message || "Có lỗi xảy ra, vui lòng thử lại"
      );
    } finally {
      loading.value = false;
    }
  };
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#0f1011] relative overflow-hidden"
  >
    <div
      class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none animate-pulse"
    ></div>
    <div
      class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"
    ></div>

    <div class="w-full max-w-[440px] px-6 py-12 relative z-10">
      <div
        class="bg-white dark:bg-[#121417] rounded-3xl border border-slate-200 dark:border-slate-800 p-8 animate-in fade-in duration-500"
      >
        <div class="mb-8">
          <h1
            class="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight"
          >
            Đặt lại mật khẩu
          </h1>
          <p
            class="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium italic"
          >
            Tạo mật khẩu mới cho tài khoản của bạn.
          </p>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-5">
          <div class="space-y-2">
            <label
              class="text-[11px] font-semibold text-slate-400 tracking-widest ml-1"
              >Mật khẩu mới</label
            >
            <UiInput
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
            >
              <template #prefix>
                <Icon
                  name="solar:lock-password-bold-duotone"
                  class="text-slate-400"
                  size="18"
                />
              </template>
              <template #suffix>
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="text-slate-400 hover:text-primary transition-colors"
                >
                  <Icon
                    :name="
                      showPassword
                        ? 'solar:eye-bold-duotone'
                        : 'solar:eye-closed-bold-duotone'
                    "
                    size="18"
                  />
                </button>
              </template>
            </UiInput>
          </div>

          <div class="space-y-2">
            <label
              class="text-[11px] font-semibold text-slate-400 tracking-widest ml-1"
              >Xác nhận mật khẩu</label
            >
            <UiInput
              v-model="form.confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              placeholder="••••••••"
            >
              <template #prefix>
                <Icon
                  name="solar:lock-keyhole-bold-duotone"
                  class="text-slate-400"
                  size="18"
                />
              </template>
              <template #suffix>
                <button
                  type="button"
                  @click="showConfirmPassword = !showConfirmPassword"
                  class="text-slate-400 hover:text-primary transition-colors"
                >
                  <Icon
                    :name="
                      showConfirmPassword
                        ? 'solar:eye-bold-duotone'
                        : 'solar:eye-closed-bold-duotone'
                    "
                    size="18"
                  />
                </button>
              </template>
            </UiInput>
          </div>

          <UiButton type="submit" class="w-full" size="md" :loading="loading">
            Cập nhật mật khẩu
          </UiButton>
        </form>

        <div class="mt-8 text-center">
          <p class="text-sm font-medium text-slate-500 dark:text-slate-400">
            <NuxtLink
              to="/auth/login"
              class="text-primary font-semibold hover:underline"
            >
              Quay lại đăng nhập
            </NuxtLink>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
