<script setup lang="ts">
  useHead({ title: "Quên mật khẩu - Nuxt.Js" });

  const toast = useToast();
  const loading = ref(false);
  const form = ref({
    email: "",
  });

  const handleSubmit = async () => {
    if (!form.value.email) {
      return toast.error("Thiếu thông tin", "Vui lòng nhập email của bạn");
    }

    loading.value = true;
    try {
      const response = await $fetch<{ success: boolean; message: string }>(
        "/api/auth/forgot-password",
        {
          method: "POST",
          body: {
            email: form.value.email,
          },
        }
      );

      toast.success("Đã gửi yêu cầu", response.message);
      form.value.email = "";
    } catch (error: any) {
      toast.error(
        "Gửi yêu cầu thất bại",
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
            Quên mật khẩu?
          </h1>
          <p
            class="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium italic"
          >
            Nhập email tài khoản. Chúng tôi sẽ gửi liên kết đặt lại mật khẩu.
          </p>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-5">
          <div class="space-y-2">
            <label
              class="text-[11px] font-semibold text-slate-400 tracking-widest ml-1"
              >Email</label
            >
            <UiInput
              v-model="form.email"
              type="email"
              placeholder="email@example.com"
            >
              <template #prefix>
                <Icon
                  name="solar:letter-bold-duotone"
                  class="text-slate-400"
                  size="18"
                />
              </template>
            </UiInput>
          </div>

          <UiButton type="submit" class="w-full" size="md" :loading="loading">
            Gửi liên kết đặt lại mật khẩu
          </UiButton>
        </form>

        <div class="mt-8 text-center">
          <p class="text-sm font-medium text-slate-500 dark:text-slate-400">
            Đã nhớ mật khẩu?
            <NuxtLink
              to="/auth/login"
              class="text-primary font-semibold hover:underline ml-1"
            >
              Quay lại đăng nhập
            </NuxtLink>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
