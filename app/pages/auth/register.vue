<script setup lang="ts">
  useHead({ title: "Đăng ký thành viên - Nuxt.Js" });
  const { loggedIn, fetch: fetchSession } = useUserSession();

  if (loggedIn.value) {
    navigateTo("/");
  }

  const toast = useToast();

  const { data: turnstileData } = await useFetch<{ enabled: boolean; siteKey: string }>(
    "/api/common/turnstile-key"
  );
  const isTurnstileEnabled = computed(() => Boolean(turnstileData.value?.enabled));
  const turnstileSiteKey = computed(() => turnstileData.value?.siteKey || "");

  const form = ref({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    refCode: "",
  });

  const turnstileToken = ref("");
  const loading = ref(false);

  const handleRegister = async () => {
    // Bắt lỗi dữ liệu bằng Toast
    if (!form.value.username)
      return toast.error("Thiếu thông tin", "Vui lòng nhập tên đăng nhập");
    if (!form.value.email)
      return toast.error("Thiếu thông tin", "Vui lòng nhập địa chỉ email");
    if (!form.value.password)
      return toast.error("Thiếu thông tin", "Vui lòng nhập mật khẩu");
    if (form.value.password !== form.value.confirmPassword) {
      return toast.error("Không khớp", "Mật khẩu xác nhận không khớp!");
    }
    if (isTurnstileEnabled.value && !turnstileToken.value) {
      return toast.error(
        "Xác minh chưa hoàn tất",
        "Vui lòng hoàn thành xác minh bảo mật"
      );
    }

    loading.value = true;
    try {
      const response = await $fetch("/api/auth/register", {
        method: "POST",
        body: {
          username: form.value.username,
          email: form.value.email,
          password: form.value.password,
          turnstileToken: isTurnstileEnabled.value ? turnstileToken.value : "",
          // refCode được giữ lại trên UI nhưng không gửi lên API theo yêu cầu
        },
      });

      toast.success(
        "Đăng ký thành công!",
        "Bây giờ bạn có thể trải nghiệm dịch vụ."
      );

      // Cập nhật trạng thái session ngay lập tức
      await fetchSession();

      setTimeout(() => {
        navigateTo("/");
      }, 1500);
    } catch (error: any) {
      const message =
        error.data?.message || error.message || "Có lỗi xảy ra khi đăng ký";
      toast.error("Đăng ký thất bại", message);
    } finally {
      loading.value = false;
    }
  };
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#0f1011] relative overflow-hidden font-sans"
  >
    <!-- Hiệu ứng background ảo diệu -->
    <div
      class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none animate-pulse"
    ></div>
    <div
      class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"
    ></div>

    <div class="w-full max-w-[440px] px-6 py-12 relative z-10">
      <!-- Khung Register Card -->
      <div
        class="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[24px] border border-white/40 dark:border-slate-800/50 p-8 shadow-2xl shadow-slate-200/50 dark:shadow-none animate-in fade-in slide-in-from-bottom-4 duration-500"
      >
        <div class="mb-8">
          <h1
            class="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight"
          >
            Tạo tài khoản mới
          </h1>
        </div>

        <form @submit.prevent="handleRegister" class="space-y-4">
          <!-- Username -->
          <div class="space-y-1.5">
            <label
              class="text-[11px] font-semibold text-slate-400 tracking-widest ml-1"
              >Tên đăng nhập</label
            >
            <UiInput v-model="form.username" placeholder="Ví dụ: abc123" />
          </div>

          <!-- Email -->
          <div class="space-y-1.5">
            <label
              class="text-[11px] font-semibold text-slate-400 tracking-widest ml-1"
              >Địa chỉ Email</label
            >
            <UiInput
              v-model="form.email"
              type="email"
              placeholder="email@example.com"
            />
          </div>

          <!-- Mật khẩu -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label
                class="text-[11px] font-semibold text-slate-400 tracking-widest ml-1"
                >Mật khẩu</label
              >
              <UiInput
                v-model="form.password"
                type="password"
                placeholder="••••••••"
              />
            </div>
            <div class="space-y-1.5">
              <label
                class="text-[11px] font-semibold text-slate-400 tracking-widest ml-1"
                >Xác nhận</label
              >
              <UiInput
                v-model="form.confirmPassword"
                type="password"
                placeholder="••••••••"
              />
            </div>
          </div>

          <!-- Affiliate Code (Optional) -->
          <div class="space-y-1.5 pt-1">
            <div
              class="flex items-center gap-1.5 ml-1 text-emerald-500 dark:text-emerald-400"
            >
              <Icon
                name="solar:users-group-two-rounded-bold-duotone"
                size="14"
              />
              <label class="text-[10px] font-semibold uppercase tracking-widest"
                >Mã giới thiệu (Không bắt buộc)</label
              >
            </div>
            <UiInput
              v-model="form.refCode"
              placeholder="Nhập mã giới thiệu..."
              class="border-emerald-100 dark:border-emerald-900/30"
            />
          </div>

          <!-- Turnstile -->
          <div class="flex justify-center pt-1">
            <NuxtTurnstile
              v-if="isTurnstileEnabled && turnstileSiteKey"
              v-model="turnstileToken"
              :site-key="turnstileSiteKey"
            />
          </div>

          <!-- Submit Button -->
          <UiButton
            type="submit"
            class="w-full mt-2"
            size="md"
            :loading="loading"
          >
            Đăng Ký Ngay
          </UiButton>
        </form>

        <!-- Footer -->
        <div class="mt-8 text-center tracking-tight">
          <p class="text-sm font-medium text-slate-500 dark:text-slate-400">
            Bạn đã có tài khoản?
            <NuxtLink
              to="/auth/login"
              class="text-primary font-semibold hover:underline ml-1"
              >Đăng nhập</NuxtLink
            >
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
