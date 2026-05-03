<script setup lang="ts">
  useHead({ title: "Đăng nhập - Nuxt.Js" });
  const { loggedIn, fetch: fetchSession } = useUserSession();

  // Tự động chuyển hướng nếu đã đăng nhập
  if (loggedIn.value) {
    navigateTo("/");
  }

  const toast = useToast();

  const form = ref({
    identifier: "",
    password: "",
    remember: false,
  });

  const loading = ref(false);
  const showPassword = ref(false);

  const handleLogin = async () => {
    if (!form.value.identifier)
      return toast.error(
        "Thiếu thông tin",
        "Vui lòng nhập tài khoản hoặc email"
      );
    if (!form.value.password)
      return toast.error("Thiếu thông tin", "Vui lòng nhập mật khẩu của bạn");

    loading.value = true;
    try {
      const response = await $fetch("/api/auth/login", {
        method: "POST",
        body: {
          identifier: form.value.identifier,
          password: form.value.password,
        },
      });

      toast.success("Chào mừng trở lại!", "Đăng nhập thành công.");

      // Cập nhật trạng thái session ngay lập tức
      await fetchSession();

      setTimeout(() => {
        navigateTo("/");
      }, 1000);
    } catch (error: any) {
      const message =
        error.data?.message ||
        error.message ||
        "Tài khoản hoặc mật khẩu không đúng";
      toast.error("Đăng nhập thất bại", message);
      console.error("Login error details:", error);
    } finally {
      loading.value = false;
    }
  };
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#0f1011] relative overflow-hidden"
  >
    <!-- Hiệu ứng background ảo diệu -->
    <div
      class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none animate-pulse"
    ></div>
    <div
      class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"
    ></div>

    <div class="w-full max-w-[440px] px-6 py-12 relative z-10">
      <!-- Khung Login Card -->
      <div
        class="bg-white dark:bg-[#121417] rounded-3xl border border-slate-200 dark:border-slate-800 p-8 animate-in fade-in duration-500"
      >
        <div class="mb-8">
          <h1
            class="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight"
          >
            Chào mừng trở lại!
          </h1>
          <p
            class="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium italic"
          >
            Vui lòng đăng nhập để tiếp tục mua sắm.
          </p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-5">
          <!-- Username / Email -->
          <div class="space-y-2">
            <label
              class="text-[11px] font-semibold text-slate-400 tracking-widest ml-1"
              >Username / Email</label
            >
            <UiInput
              v-model="form.identifier"
              placeholder="Nhập tài khoản hoặc email của bạn..."
            >
              <template #prefix>
                <Icon
                  name="solar:user-circle-bold-duotone"
                  class="text-slate-400"
                  size="18"
                />
              </template>
            </UiInput>
          </div>

          <!-- Password -->
          <div class="space-y-2">
            <div class="flex items-center justify-between px-1">
              <label
                class="text-[11px] font-semibold text-slate-400 tracking-widest"
                >Password</label
              >
              <NuxtLink
                to="/auth/forgot-password"
                class="text-[11px] font-semibold text-primary tracking-widest hover:underline"
                >Forgot password?</NuxtLink
              >
            </div>
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

          <!-- Remember & Other -->
          <div class="px-1">
            <button
              type="button"
              class="flex select-none items-center gap-2 cursor-pointer"
              @click="form.remember = !form.remember"
            >
              <div
                class="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-2 transition-all duration-150"
                :class="
                  form.remember
                    ? 'border-primary bg-primary'
                    : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                "
              >
                <svg
                  v-if="form.remember"
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
                class="text-xs font-semibold transition-colors duration-150"
                :class="
                  form.remember
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400'
                "
              >
                Ghi nhớ đăng nhập
              </span>
            </button>
          </div>

          <!-- Submit Button -->
          <UiButton type="submit" class="w-full" size="md" :loading="loading">
            Đăng Nhập Ngay
          </UiButton>
        </form>

        <!-- Divider -->
        <div class="relative my-8">
          <div class="absolute inset-0 flex items-center">
            <div
              class="w-full border-t border-slate-100 dark:border-slate-800"
            ></div>
          </div>
          <div
            class="relative flex justify-center text-[10px] uppercase font-semibold"
          >
            <span
              class="bg-white dark:bg-slate-900 px-4 text-slate-400 tracking-[0.2em]"
              >Hoặc</span
            >
          </div>
        </div>

        <!-- Register Link -->
        <div class="text-center">
          <p class="text-sm font-medium text-slate-500 dark:text-slate-400">
            Bạn chưa có tài khoản?
            <NuxtLink
              to="/auth/register"
              class="text-primary font-semibold hover:underline ml-1"
              >Đăng ký thành viên</NuxtLink
            >
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
