<template>
  <footer
    class="relative mt-20 overflow-hidden border-t border-slate-200/60 bg-white dark:border-slate-800/60 dark:bg-[#0b0c10]"
  >
    <div
      class="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-primary via-teal-400 to-sky-400"
    />

    <div class="mx-auto max-w-[1400px] px-4 pb-12 pt-16 lg:px-6">
      <div class="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-16">
        <div class="flex flex-col">
          <NuxtLink to="/" class="mb-6 inline-block">
            <div class="flex items-center gap-2.5">
              <div
                class="flex h-10 w-10 items-center justify-center rounded bg-primary text-white shadow shadow-primary/20"
              >
                <Icon
                  name="logos:nuxt-icon"
                  size="24"
                  class="brightness-0 invert"
                />
              </div>
              <span
                class="text-xl font-bold tracking-tight text-slate-800 dark:text-white"
              >
                Nuxt<span class="text-primary">Js</span>
              </span>
            </div>
          </NuxtLink>
          <p class="mb-8 pr-4 text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
            Hệ sinh thái số toàn diện. Cung cấp dịch vụ số và xử lý tự động.
          </p>
          <div class="flex items-center gap-4">
            <a
              href="#"
              class="text-slate-400 transition-all hover:-translate-y-1 hover:text-[#1877f2]"
              title="Facebook"
            >
              <Icon name="bxl:facebook-circle" size="26" />
            </a>
            <a
              href="#"
              class="text-slate-400 transition-all hover:-translate-y-1 hover:text-[#ff0000]"
              title="Youtube"
            >
              <Icon name="bxl:youtube" size="26" />
            </a>
            <a
              href="#"
              class="text-slate-400 transition-all hover:-translate-y-1 hover:text-[#0a66c2]"
              title="Linkedin"
            >
              <Icon name="bxl:linkedin-square" size="26" />
            </a>
            <a
              href="#"
              class="text-slate-400 transition-all hover:-translate-y-1 hover:text-slate-900 dark:hover:text-white"
              title="Github"
            >
              <Icon name="bxl:github" size="26" />
            </a>
          </div>
        </div>

        <div>
          <h4 class="mb-6 text-[15px] font-bold text-slate-900 dark:text-white">
            Dịch vụ & Hỗ trợ
          </h4>
          <ul class="flex flex-col gap-3.5 text-[14px] text-slate-500 dark:text-slate-400">
            <li>
              <a href="#" class="flex items-center gap-2 transition-colors hover:text-primary">
                <Icon name="solar:alt-arrow-right-linear" size="14" class="text-slate-300" />
                Về chúng tôi
              </a>
            </li>
            <li>
              <a href="#" class="flex items-center gap-2 transition-colors hover:text-primary">
                <Icon name="solar:alt-arrow-right-linear" size="14" class="text-slate-300" />
                Ưu đãi thành viên
              </a>
            </li>
            <li>
              <NuxtLink
                to="/document-api"
                class="flex items-center gap-2 transition-colors hover:text-primary"
              >
                <Icon name="solar:alt-arrow-right-linear" size="14" class="text-slate-300" />
                Tài liệu API
              </NuxtLink>
            </li>
            <li>
              <a href="#" class="flex items-center gap-2 transition-colors hover:text-primary">
                <Icon name="solar:alt-arrow-right-linear" size="14" class="text-slate-300" />
                Chính sách bảo hành
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 class="mb-6 text-[15px] font-bold text-slate-900 dark:text-white">Liên hệ</h4>
          <ul class="flex flex-col gap-4 text-[14px] text-slate-500 dark:text-slate-400">
            <li class="flex items-start gap-3">
              <Icon name="solar:map-point-linear" size="20" class="shrink-0 text-slate-400" />
              <span class="leading-relaxed">Quận 1, TP. Hồ Chí Minh</span>
            </li>
            <li class="flex items-center gap-3">
              <Icon name="solar:phone-calling-linear" size="20" class="shrink-0 text-slate-400" />
              <a href="tel:1900xxxx" class="font-medium transition-colors hover:text-primary">
                1900.xxx.xxx
              </a>
            </li>
            <li class="flex items-center gap-3">
              <Icon name="solar:letter-linear" size="20" class="shrink-0 text-slate-400" />
              <a
                href="mailto:cskh@nuxtjs.vn"
                class="font-medium transition-colors hover:text-primary"
              >
                cskh@nuxtjs.vn
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 class="mb-6 text-[15px] font-bold text-slate-900 dark:text-white">Thanh toán an toàn</h4>
          <div class="mb-8 grid cursor-pointer grid-cols-4 gap-2 group">
            <div
              class="flex h-10 items-center justify-center rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/50"
            >
              <Icon
                name="logos:visa"
                size="28"
                class="opacity-60 grayscale transition-all duration-500 group-hover:opacity-100 group-hover:grayscale-0"
              />
            </div>
            <div
              class="flex h-10 items-center justify-center rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/50"
            >
              <Icon
                name="logos:mastercard"
                size="22"
                class="opacity-60 grayscale transition-all duration-500 group-hover:opacity-100 group-hover:grayscale-0"
              />
            </div>
            <div
              class="flex h-10 items-center justify-center rounded-md border border-slate-200 bg-slate-50 p-1 text-[11px] font-bold text-pink-600 opacity-60 grayscale transition-all duration-500 group-hover:opacity-100 group-hover:grayscale-0 dark:border-slate-700 dark:bg-slate-800/50"
            >
              MoMo
            </div>
            <div
              class="flex h-10 items-center justify-center rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/50"
            >
              <Icon
                name="logos:paypal"
                size="16"
                class="opacity-60 grayscale transition-all duration-500 group-hover:opacity-100 group-hover:grayscale-0"
              />
            </div>
          </div>

          <h4
            class="mb-3 text-[12px] font-bold uppercase tracking-wider text-slate-900 dark:text-white"
          >
            Chứng nhận bởi
          </h4>
          <img
            src="https://images.dmca.com/Badges/dmca_protected_sml_120m.png?ID=b52b36b5-82e1-4c6e-aba6-2c700cb74e92"
            alt="DMCA"
            class="h-6 cursor-pointer opacity-40 transition-opacity hover:opacity-100"
          />
        </div>
      </div>
    </div>

    <div class="border-t border-slate-200/60 bg-slate-50/50 dark:border-slate-800/60 dark:bg-black/20">
      <div
        class="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-4 py-5 text-[13px] text-slate-500 md:flex-row lg:px-6"
      >
        <p>© 2026 <strong>NuxtJs Ecosystem</strong>. All Rights Reserved.</p>
        <div class="flex items-center gap-6 font-medium">
          <a href="#" class="transition-colors hover:text-primary">Điều khoản</a>
          <a href="#" class="transition-colors hover:text-primary">Bảo mật</a>
          <a href="#" class="transition-colors hover:text-primary">Sitemap</a>
        </div>
      </div>
    </div>
  </footer>
</template>


