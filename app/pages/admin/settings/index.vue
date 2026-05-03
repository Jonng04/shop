<template>
  <div class="space-y-5">
    <div class="flex items-center gap-2 text-sm text-slate-500 mb-2">
      <Icon name="solar:home-line-duotone" class="h-4 w-4" />
      <span>/</span>
      <span class="text-slate-800 font-medium flex items-center gap-1"
        ><Icon name="solar:settings-line-duotone" class="h-4 w-4" /> Cài
        đặt</span
      >
    </div>

    <!-- Alert Thông báo -->
    <UiAlert type="warning" title="Lưu ý hệ thống" closable>
      Các thay đổi tại đây sẽ ảnh hưởng trực tiếp đến toàn bộ giao diện khách
      hàng. Vui lòng kiểm tra kỹ trước khi nhấn <b>Lưu cài đặt</b>.
    </UiAlert>

    <!-- Header -->
    <section
      class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900"
    >
      <h2
        class="text-xl font-semibold text-slate-900 sm:text-2xl dark:text-slate-100"
      >
        Cài đặt hệ thống
      </h2>
      <p class="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
        Quản lý cấu hình site, media, thông báo, email, bảo mật và tích hợp.
      </p>
    </section>

    <!-- Tab bar -->
    <div
      class="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <div class="flex min-w-max items-center gap-1 p-1.5">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition"
          :class="
            activeTab === tab.key
              ? 'bg-primary text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
          "
          @click="navigateTo({ query: { tab: tab.key } })"
        >
          <Icon :name="tab.icon" class="h-4 w-4 shrink-0" />
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Content -->
    <section class="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
      <article class="space-y-4 lg:col-span-2 lg:space-y-5">
        <!-- TAB: Tổng quan -->
        <template v-if="activeTab === 'general'">
          <div
            class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900"
          >
            <h3
              class="inline-flex items-center text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              <Icon
                name="solar:widget-3-line-duotone"
                class="mr-2 h-4.5 w-4.5 text-primary"
              />
              Thông tin cơ bản & SEO
            </h3>
            <div class="mt-4 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
              <div>
                <label
                  class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >Tên website</label
                >
                <input v-model="form.siteName" type="text" :class="inputCls" />
              </div>
              <div>
                <label
                  class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >Múi giờ</label
                >
                <UiDropdown
                  v-model="form.timezone"
                  :options="timezoneOptions"
                />
              </div>
              <div>
                <label
                  class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >URL website</label
                >
                <input v-model="form.siteUrl" type="url" :class="inputCls" />
              </div>
              <div>
                <label
                  class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >Tiêu đề trang chủ</label
                >
                <input
                  v-model="form.siteTitle"
                  type="text"
                  :class="inputCls"
                  placeholder="VD: Cinema Hub - Xem phim chất lượng cao"
                />
              </div>
              <div class="md:col-span-2">
                <label
                  class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >Mô tả (Description)</label
                >
                <textarea
                  v-model="form.seoDescription"
                  rows="3"
                  class="w-full rounded-[8px] border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  placeholder="Nhập mô tả SEO..."
                ></textarea>
              </div>
              <div class="md:col-span-2">
                <label
                  class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >Từ khóa (Keywords)</label
                >
                <input
                  v-model="form.seoKeywords"
                  type="text"
                  :class="inputCls"
                  placeholder="VD: xem phim, phim lẻ, anime..."
                />
                <p class="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  Phân cách bằng dấu phẩy (,)
                </p>
              </div>
            </div>
            <div class="mt-5 flex justify-end">
              <button
                type="button"
                :class="saveBtnCls"
                @click="saveSettings('Tổng quan')"
              >
                <Icon
                  name="solar:diskette-line-duotone"
                  class="mr-2 h-4.5 w-4.5"
                />Lưu cài đặt
              </button>
            </div>
          </div>
        </template>

        <!-- TAB: Media -->
        <template v-if="activeTab === 'media'">
          <div
            class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900"
          >
            <h3
              class="inline-flex items-center text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              <Icon
                name="solar:gallery-line-duotone"
                class="mr-2 h-4.5 w-4.5 text-primary"
              />
              Logo, Favicon & Ảnh bìa
            </h3>
            <div class="mt-4 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
              <div class="space-y-1.5">
                <label
                  class="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >Logo</label
                >
                <input
                  ref="logoInputRef"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="onFileSelected($event, 'logo')"
                />
                <div
                  class="flex h-[37.33px] items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-2 dark:border-slate-700 dark:bg-slate-800"
                >
                  <button
                    type="button"
                    class="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                    @click="openFilePicker('logo')"
                  >
                    Chọn file
                  </button>
                  <p
                    class="min-w-0 flex-1 truncate text-sm text-slate-500 dark:text-slate-400"
                  >
                    {{ logoFileName }}
                  </p>
                </div>
              </div>
              <div class="space-y-1.5">
                <label
                  class="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >Favicon</label
                >
                <input
                  ref="faviconInputRef"
                  type="file"
                  accept="image/x-icon,image/png,image/svg+xml,image/*"
                  class="hidden"
                  @change="onFileSelected($event, 'favicon')"
                />
                <div
                  class="flex h-[37.33px] items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-2 dark:border-slate-700 dark:bg-slate-800"
                >
                  <button
                    type="button"
                    class="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                    @click="openFilePicker('favicon')"
                  >
                    Chọn file
                  </button>
                  <p
                    class="min-w-0 flex-1 truncate text-sm text-slate-500 dark:text-slate-400"
                  >
                    {{ faviconFileName }}
                  </p>
                </div>
              </div>
              <div class="space-y-1.5 md:col-span-2">
                <label
                  class="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >Ảnh bìa (Open Graph)</label
                >
                <input
                  ref="ogInputRef"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="onFileSelected($event, 'og')"
                />
                <div
                  class="flex h-[37.33px] items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-2 dark:border-slate-700 dark:bg-slate-800"
                >
                  <button
                    type="button"
                    class="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                    @click="openFilePicker('og')"
                  >
                    Chọn file
                  </button>
                  <p
                    class="min-w-0 flex-1 truncate text-sm text-slate-500 dark:text-slate-400"
                  >
                    {{ ogFileName }}
                  </p>
                </div>
                <p class="text-xs text-slate-400 dark:text-slate-500">
                  Gợi ý: 1200 × 630px.
                </p>
              </div>
            </div>
            <div
              class="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4 md:grid-cols-2 lg:grid-cols-3 dark:border-slate-700 dark:bg-slate-800"
            >
              <div
                class="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
              >
                <img
                  v-if="logoPreview"
                  :src="logoPreview"
                  alt="Logo"
                  class="h-10 w-10 rounded-md border border-slate-200 object-contain"
                />
                <div
                  v-else
                  class="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-slate-400 dark:border-slate-600 dark:bg-slate-800"
                >
                  <Icon name="solar:image-line-duotone" class="h-4 w-4" />
                </div>
                <div>
                  <p
                    class="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Logo preview
                  </p>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400">
                    {{ logoPreview ? "PNG/SVG" : "Chưa có ảnh" }}
                  </p>
                </div>
              </div>
              <div
                class="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
              >
                <img
                  v-if="faviconPreview"
                  :src="faviconPreview"
                  alt="Favicon"
                  class="h-8 w-8 rounded-md border border-slate-200 object-contain"
                />
                <div
                  v-else
                  class="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-slate-400 dark:border-slate-600 dark:bg-slate-800"
                >
                  <Icon
                    name="solar:document-line-duotone"
                    class="h-3.5 w-3.5"
                  />
                </div>
                <div>
                  <p
                    class="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Favicon preview
                  </p>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400">
                    {{ faviconPreview ? "ICO/PNG 32×32" : "Chưa có" }}
                  </p>
                </div>
              </div>
              <div class="rounded-lg border border-slate-200 bg-white p-2">
                <img
                  v-if="ogPreview"
                  :src="ogPreview"
                  alt="OG"
                  class="h-20 w-full rounded-md object-cover"
                />
                <div
                  v-else
                  class="flex h-20 w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-slate-400"
                >
                  <Icon name="solar:gallery-line-duotone" class="h-5 w-5" />
                </div>
                <p class="mt-2 text-[11px] font-semibold text-slate-700">
                  OG cover
                </p>
              </div>
            </div>
            <div class="mt-5 flex justify-end">
              <button
                type="button"
                :class="saveBtnCls"
                @click="saveSettings('Media')"
              >
                <Icon
                  name="solar:diskette-line-duotone"
                  class="mr-2 h-4.5 w-4.5"
                />Lưu cài đặt
              </button>
            </div>
          </div>
        </template>

        <!-- TAB: Sliders -->
        <template v-if="activeTab === 'sliders'">
          <div
            class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900"
          >
            <h3
              class="inline-flex items-center text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              <Icon
                name="solar:play-circle-line-duotone"
                class="mr-2 h-4.5 w-4.5 text-primary"
              />
              Quản lý Sliders (Carousel)
            </h3>
            <p class="mt-1 text-xs text-slate-500">
              Thêm, chỉnh sửa ảnh carousel trên trang chủ. Kéo để sắp xếp thứ
              tự.
            </p>

            <!-- List sliders -->
            <div class="mt-4 space-y-3">
              <div
                v-for="(slider, idx) in parsedSliders"
                :key="idx"
                class="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
              >
                <img
                  :src="slider.image"
                  :alt="slider.title"
                  class="h-16 w-24 rounded-md border border-slate-200 object-cover dark:border-slate-700"
                />
                <div class="flex-1 min-w-0">
                  <p
                    class="text-sm font-medium text-slate-800 dark:text-slate-200"
                  >
                    {{ slider.title || "Không có tiêu đề" }}
                  </p>
                  <p
                    class="text-xs text-slate-500 truncate dark:text-slate-400"
                  >
                    {{ slider.image }}
                  </p>
                </div>
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    class="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                    @click="removeSlider(Number(idx))"
                    title="Xoá"
                  >
                    <Icon
                      name="solar:trash-bin-2-line-duotone"
                      class="h-4 w-4 text-rose-500"
                    />
                  </button>
                </div>
              </div>

              <div
                v-if="parsedSliders.length === 0"
                class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-600 dark:bg-slate-800"
              >
                <Icon
                  name="solar:image-line-duotone"
                  class="mx-auto h-8 w-8 text-slate-400"
                />
                <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Chưa có slider nào. Thêm slider đầu tiên!
                </p>
              </div>
            </div>

            <!-- Add slider form -->
            <div
              class="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
            >
              <p
                class="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Thêm Slider Mới
              </p>
              <div class="space-y-3">
                <div>
                  <label
                    class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Tiêu đề (tuỳ chọn)
                  </label>
                  <input
                    v-model="newSlider.title"
                    type="text"
                    :class="inputCls"
                    placeholder="Ví dụ: Ảnh khuyến mãi"
                    class="text-sm"
                  />
                </div>
                <div>
                  <label
                    class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Chọn Ảnh *
                  </label>
                  <input
                    ref="sliderFileInput"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="onSliderFileSelected"
                  />
                  <div
                    class="flex h-[37.33px] items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-2 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <button
                      type="button"
                      class="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                      @click="sliderFileInput?.click()"
                    >
                      Chọn file
                    </button>
                    <p
                      class="min-w-0 flex-1 truncate text-sm text-slate-500 dark:text-slate-400"
                    >
                      {{ sliderFileName || "Chưa chọn ảnh" }}
                    </p>
                  </div>
                  <div
                    v-if="sliderImagePreview"
                    class="mt-2 flex h-20 w-full items-center justify-center rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <img
                      :src="sliderImagePreview"
                      alt="preview"
                      class="h-20 rounded-lg object-cover"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  class="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
                  @click="addSlider"
                  :disabled="sliderUploading"
                >
                  <Icon
                    name="solar:add-circle-line-duotone"
                    class="mr-1.5 -ml-1 inline h-4 w-4"
                  />
                  {{ sliderUploading ? "Đang upload..." : "Thêm Slider" }}
                </button>
              </div>
            </div>

            <div class="mt-5 flex justify-end">
              <button
                type="button"
                :class="saveBtnCls"
                @click="saveSettings('Sliders')"
              >
                <Icon
                  name="solar:diskette-line-duotone"
                  class="mr-2 h-4.5 w-4.5"
                />Lưu cài đặt
              </button>
            </div>
          </div>
        </template>

        <!-- TAB: Banner -->
        <template v-if="activeTab === 'banner'">
          <div
            class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900"
          >
            <h3
              class="inline-flex items-center text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              <Icon
                name="solar:gallery-wide-line-duotone"
                class="mr-2 h-4.5 w-4.5 text-primary"
              />
              Banner cạnh slider trang chủ
            </h3>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Quản lý 3 banner ảnh bên trái và 2 banner chữ bên phải của khu vực
              slider trang chủ.
            </p>

            <div class="mt-4 space-y-6">
              <div>
                <div class="mb-3">
                  <h4
                    class="text-sm font-semibold text-slate-800 dark:text-slate-200"
                  >
                    Banner ảnh bên trái
                  </h4>
                  <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Hiển thị thành 3 banner dọc ở cột trái slider.
                  </p>
                </div>

                <div class="space-y-4">
                  <div
                    v-for="(banner, idx) in parsedHomeLeftImageBanners"
                    :key="`left-${idx}`"
                    class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div class="mb-3 flex items-center gap-2">
                      <span
                        class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                      >
                        {{ idx + 1 }}
                      </span>
                      <p
                        class="text-sm font-semibold text-slate-800 dark:text-slate-200"
                      >
                        Banner ảnh {{ idx + 1 }}
                      </p>
                    </div>

                    <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div class="md:col-span-2">
                        <label
                          class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          Ảnh banner
                        </label>
                        <input
                          :ref="
                            (el) =>
                              setHomeLeftImageBannerFileInputRef(
                                el as HTMLInputElement | null,
                                idx
                              )
                          "
                          type="file"
                          accept="image/*"
                          class="hidden"
                          @change="
                            onHomeLeftImageBannerFileSelected($event, idx)
                          "
                        />
                        <div
                          class="flex h-[37.33px] items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-2 dark:border-slate-700 dark:bg-slate-800"
                        >
                          <button
                            type="button"
                            class="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                            @click="openHomeLeftImageBannerFilePicker(idx)"
                          >
                            Chọn file
                          </button>
                          <p
                            class="min-w-0 flex-1 truncate text-sm text-slate-500 dark:text-slate-400"
                          >
                            {{
                              homeLeftImageBannerFileNames[idx] ||
                              (banner.image ? "Đã có ảnh" : "Chưa chọn ảnh")
                            }}
                          </p>
                          <span
                            v-if="homeLeftImageBannerUploading[idx]"
                            class="text-xs font-medium text-primary"
                          >
                            Đang upload...
                          </span>
                        </div>
                        <div
                          v-if="banner.image"
                          class="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                        >
                          <img
                            :src="banner.image"
                            :alt="`Banner ảnh ${idx + 1}`"
                            class="h-24 w-full object-cover"
                          />
                        </div>
                      </div>
                      <div class="md:col-span-2">
                        <label
                          class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          Link khi click
                        </label>
                        <input
                          :value="banner.href"
                          type="text"
                          :class="inputCls"
                          placeholder="/products"
                          @input="
                            updateHomeLeftImageBanner(
                              idx,
                              'href',
                              ($event.target as HTMLInputElement).value
                            )
                          "
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div class="mb-3">
                  <h4
                    class="text-sm font-semibold text-slate-800 dark:text-slate-200"
                  >
                    Banner chữ bên phải
                  </h4>
                  <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Giữ kiểu card chữ như hiện tại, chỉ thay nội dung.
                  </p>
                </div>

                <div class="space-y-4">
                  <div
                    v-for="(banner, idx) in parsedHomePromoBanners.slice(0, 2)"
                    :key="idx"
                    class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div class="mb-3 flex items-center gap-2">
                      <span
                        class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                      >
                        {{ idx + 1 }}
                      </span>
                      <p
                        class="text-sm font-semibold text-slate-800 dark:text-slate-200"
                      >
                        Banner {{ idx + 1 }}
                      </p>
                    </div>

                    <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label
                          class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          Nhãn nhỏ
                        </label>
                        <input
                          :value="banner.label"
                          type="text"
                          :class="inputCls"
                          placeholder="VD: Deal hôm nay"
                          @input="
                            updateHomePromoBanner(
                              idx,
                              'label',
                              ($event.target as HTMLInputElement).value
                            )
                          "
                        />
                      </div>
                      <div>
                        <label
                          class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          Icon
                        </label>
                        <input
                          :value="banner.icon"
                          type="text"
                          :class="inputCls"
                          placeholder="VD: solar:ticket-sale-line-duotone"
                          @input="
                            updateHomePromoBanner(
                              idx,
                              'icon',
                              ($event.target as HTMLInputElement).value
                            )
                          "
                        />
                      </div>
                      <div>
                        <label
                          class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          Tiêu đề chính
                        </label>
                        <input
                          :value="banner.title"
                          type="text"
                          :class="inputCls"
                          placeholder="VD: Giảm đến 70%"
                          @input="
                            updateHomePromoBanner(
                              idx,
                              'title',
                              ($event.target as HTMLInputElement).value
                            )
                          "
                        />
                      </div>
                      <div>
                        <label
                          class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          Link khi click
                        </label>
                        <input
                          :value="banner.href"
                          type="text"
                          :class="inputCls"
                          placeholder="/products"
                          @input="
                            updateHomePromoBanner(
                              idx,
                              'href',
                              ($event.target as HTMLInputElement).value
                            )
                          "
                        />
                      </div>
                      <div class="md:col-span-2">
                        <label
                          class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          Mô tả
                        </label>
                        <textarea
                          :value="banner.description"
                          rows="3"
                          class="w-full rounded-[8px] border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          placeholder="Nội dung mô tả ngắn cho banner"
                          @input="
                            updateHomePromoBanner(
                              idx,
                              'description',
                              ($event.target as HTMLTextAreaElement).value
                            )
                          "
                        ></textarea>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-5 flex justify-end">
              <button
                type="button"
                :class="saveBtnCls"
                @click="saveSettings('Banner')"
              >
                <Icon
                  name="solar:diskette-line-duotone"
                  class="mr-2 h-4.5 w-4.5"
                />Lưu cài đặt
              </button>
            </div>
          </div>
        </template>

        <!-- TAB: Telegram -->
        <template v-if="activeTab === 'telegram'">
          <div
            class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900"
          >
            <div class="flex items-center justify-between">
              <h3
                class="inline-flex items-center text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                <Icon
                  name="solar:plain-3-line-duotone"
                  class="mr-2 h-4.5 w-4.5 text-primary"
                />Telegram Bot
              </h3>
              <label class="inline-flex cursor-pointer items-center gap-2">
                <span class="text-sm text-slate-600 dark:text-slate-400"
                  >Kích hoạt</span
                >
                <div class="relative">
                  <input
                    v-model="form.telegramEnabled"
                    type="checkbox"
                    class="peer sr-only"
                  />
                  <div
                    class="h-5 w-9 rounded-full bg-slate-200 transition peer-checked:bg-primary/100"
                  ></div>
                  <div
                    class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4"
                  ></div>
                </div>
              </label>
            </div>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Nhận thông báo tức thì qua Telegram Bot khi có hoạt động mới.
            </p>
            <div
              class="mt-4 grid grid-cols-1 gap-3 sm:gap-4"
              :class="!form.telegramEnabled && 'pointer-events-none opacity-50'"
            >
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700"
                  >Bot Token</label
                >
                <input
                  v-model="form.telegramBotToken"
                  type="text"
                  :class="inputCls"
                  placeholder="123456789:AAF..."
                />
                <p class="mt-1 text-xs text-slate-400">
                  Lấy từ
                  <span class="font-medium text-sky-600">@BotFather</span> trên
                  Telegram.
                </p>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700"
                  >Chat ID</label
                >
                <input
                  v-model="form.telegramChatId"
                  type="text"
                  :class="inputCls"
                  placeholder="-100123456789"
                />
                <p class="mt-1 text-xs text-slate-400">
                  ID của group/channel muốn nhận thông báo.
                </p>
              </div>
              <div>
                <p class="mb-2 text-sm font-medium text-slate-700">
                  Gửi thông báo khi:
                </p>
                <div class="space-y-2">
                  <label
                    class="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <input
                      v-model="form.telegramOnNewOrder"
                      type="checkbox"
                      class="h-4 w-4 rounded border-slate-300 text-primary"
                    />
                    <div>
                      <p
                        class="text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Đơn hàng mới
                      </p>
                      <p class="text-xs text-slate-500 dark:text-slate-400">
                        Thông báo khi có đơn hàng được tạo.
                      </p>
                    </div>
                  </label>
                  <label
                    class="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <input
                      v-model="form.telegramOnNewUser"
                      type="checkbox"
                      class="h-4 w-4 rounded border-slate-300 text-primary"
                    />
                    <div>
                      <p
                        class="text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Người dùng mới đăng ký
                      </p>
                      <p class="text-xs text-slate-500 dark:text-slate-400">
                        Thông báo khi có tài khoản mới.
                      </p>
                    </div>
                  </label>
                  <label
                    class="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <input
                      v-model="form.telegramOnPayment"
                      type="checkbox"
                      class="h-4 w-4 rounded border-slate-300 text-primary"
                    />
                    <div>
                      <p
                        class="text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Thanh toán thành công
                      </p>
                      <p class="text-xs text-slate-500 dark:text-slate-400">
                        Thông báo khi giao dịch hoàn tất.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <div class="mt-5 flex justify-end">
              <button
                type="button"
                :class="saveBtnCls"
                @click="saveSettings('Telegram')"
              >
                <Icon
                  name="solar:diskette-line-duotone"
                  class="mr-2 h-4.5 w-4.5"
                />Lưu cài đặt
              </button>
            </div>
          </div>
        </template>

        <!-- TAB: SMTP Mail -->
        <template v-if="activeTab === 'email'">
          <div
            class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900"
          >
            <div class="flex items-center justify-between">
              <h3
                class="inline-flex items-center text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                <Icon
                  name="solar:letter-line-duotone"
                  class="mr-2 h-4.5 w-4.5 text-primary"
                />SMTP Mail
              </h3>
              <label class="inline-flex cursor-pointer items-center gap-2">
                <span class="text-sm text-slate-600 dark:text-slate-400"
                  >Kích hoạt</span
                >
                <div class="relative">
                  <input
                    v-model="form.mailEnabled"
                    type="checkbox"
                    class="peer sr-only"
                  />
                  <div
                    class="h-5 w-9 rounded-full bg-slate-200 transition peer-checked:bg-primary/100"
                  ></div>
                  <div
                    class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4"
                  ></div>
                </div>
              </label>
            </div>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Cấu hình máy chủ email để gửi thông báo và xác thực tài khoản.
            </p>
            <div
              class="mt-4 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2"
              :class="!form.mailEnabled && 'pointer-events-none opacity-50'"
            >
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700"
                  >SMTP Host</label
                >
                <input
                  v-model="form.mailHost"
                  type="text"
                  :class="inputCls"
                  placeholder="smtp.mailtrap.io"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700"
                  >SMTP Port</label
                >
                <input
                  v-model="form.mailPort"
                  type="text"
                  :class="inputCls"
                  placeholder="587"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700"
                  >Username</label
                >
                <input
                  v-model="form.mailUsername"
                  type="text"
                  :class="inputCls"
                  placeholder="username@example.com"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700"
                  >Password</label
                >
                <input
                  v-model="form.mailPassword"
                  type="password"
                  :class="inputCls"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700"
                  >Encryption</label
                >
                <UiDropdown
                  v-model="form.mailEncryption"
                  :options="encryptionOptions"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700"
                  >From Name</label
                >
                <input
                  v-model="form.mailFromName"
                  type="text"
                  :class="inputCls"
                  placeholder="Cinema Hub"
                />
              </div>
              <div class="md:col-span-2">
                <label class="mb-1 block text-sm font-medium text-slate-700"
                  >From Address</label
                >
                <input
                  v-model="form.mailFromAddress"
                  type="email"
                  :class="inputCls"
                  placeholder="no-reply@example.com"
                />
              </div>
            </div>
            <div class="mt-5 flex justify-end">
              <button
                type="button"
                :class="saveBtnCls"
                @click="saveSettings('SMTP Mail')"
              >
                <Icon
                  name="solar:diskette-line-duotone"
                  class="mr-2 h-4.5 w-4.5"
                />Lưu cài đặt
              </button>
            </div>
          </div>
        </template>

        <!-- TAB: Google Auth -->
        <template v-if="activeTab === 'security'">
          <div
            class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900"
          >
            <div class="flex items-center justify-between">
              <h3
                class="inline-flex items-center text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                <Icon
                  name="solar:shield-user-line-duotone"
                  class="mr-2 h-4.5 w-4.5 text-primary"
                />Google OAuth
              </h3>
              <label class="inline-flex cursor-pointer items-center gap-2">
                <span class="text-sm text-slate-600 dark:text-slate-400"
                  >Kích hoạt</span
                >
                <div class="relative">
                  <input
                    v-model="form.googleAuthEnabled"
                    type="checkbox"
                    class="peer sr-only"
                  />
                  <div
                    class="h-5 w-9 rounded-full bg-slate-200 transition peer-checked:bg-primary/100"
                  ></div>
                  <div
                    class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4"
                  ></div>
                </div>
              </label>
            </div>
            <p class="mt-1 text-xs text-slate-500">
              Cho phép người dùng đăng nhập nhanh bằng tài khoản Google.
            </p>
            <div
              class="mt-4 grid grid-cols-1 gap-3 sm:gap-4"
              :class="
                !form.googleAuthEnabled && 'pointer-events-none opacity-50'
              "
            >
              <div
                class="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700"
              >
                <p class="font-semibold">Hướng dẫn:</p>
                <p class="mt-0.5">
                  Truy cập
                  <span class="font-medium">console.cloud.google.com</span> â†’
                  Credentials â†’ Create OAuth 2.0 Client ID.
                </p>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700"
                  >Client ID</label
                >
                <input
                  v-model="form.googleClientId"
                  type="text"
                  :class="inputCls"
                  placeholder="xxxxxxxxxxxx.apps.googleusercontent.com"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700"
                  >Client Secret</label
                >
                <input
                  v-model="form.googleClientSecret"
                  type="password"
                  :class="inputCls"
                  placeholder="GOCSPX-..."
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700"
                  >Callback URL</label
                >
                <input
                  v-model="form.googleCallbackUrl"
                  type="url"
                  :class="inputCls"
                />
                <p class="mt-1 text-xs text-slate-400">
                  Thêm URL này vào Authorized Redirect URIs trong Google
                  Console.
                </p>
              </div>
            </div>
            <div class="mt-5 flex justify-end">
              <button
                type="button"
                :class="saveBtnCls"
                @click="saveSettings('Google Auth')"
              >
                <Icon
                  name="solar:diskette-line-duotone"
                  class="mr-2 h-4.5 w-4.5"
                />Lưu cài đặt
              </button>
            </div>
          </div>
        </template>

        <!-- TAB: Turnstile -->
        <template v-if="activeTab === 'captcha'">
          <div
            class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900"
          >
            <div class="flex items-center justify-between">
              <h3
                class="inline-flex items-center text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                <Icon
                  name="solar:shield-check-line-duotone"
                  class="mr-2 h-4.5 w-4.5 text-primary"
                />Cloudflare Turnstile
              </h3>
              <label class="inline-flex cursor-pointer items-center gap-2">
                <span class="text-sm text-slate-600 dark:text-slate-400"
                  >Kích hoạt</span
                >
                <div class="relative">
                  <input
                    v-model="form.turnstileEnabled"
                    type="checkbox"
                    class="peer sr-only"
                  />
                  <div
                    class="h-5 w-9 rounded-full bg-slate-200 transition peer-checked:bg-primary/100"
                  ></div>
                  <div
                    class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4"
                  ></div>
                </div>
              </label>
            </div>
            <p class="mt-1 text-xs text-slate-500">
              Bảo vệ form đăng nhập/đăng ký khỏi bot bằng Cloudflare Turnstile.
            </p>
            <div
              class="mt-4 grid grid-cols-1 gap-3 sm:gap-4"
              :class="
                !form.turnstileEnabled && 'pointer-events-none opacity-50'
              "
            >
              <div
                class="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-xs text-orange-700"
              >
                <p class="font-semibold">Hướng dẫn:</p>
                <p class="mt-0.5">
                  Truy cập
                  <span class="font-medium">dash.cloudflare.com</span> â†’
                  Turnstile → Add Site để tạo key.
                </p>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700"
                  >Site Key</label
                >
                <input
                  v-model="form.turnstileSiteKey"
                  type="text"
                  :class="inputCls"
                  placeholder="0x4AAAAAAA..."
                />
                <p class="mt-1 text-xs text-slate-400">
                  Key dùng phía frontend để render widget.
                </p>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700"
                  >Secret Key</label
                >
                <input
                  v-model="form.turnstileSecretKey"
                  type="password"
                  :class="inputCls"
                  placeholder="0x4AAAAAAA..."
                />
                <p class="mt-1 text-xs text-slate-400">
                  Key dùng phía server để verify token, không để lộ.
                </p>
              </div>
            </div>
            <div class="mt-5 flex justify-end">
              <button
                type="button"
                :class="saveBtnCls"
                @click="saveSettings('Turnstile')"
              >
                <Icon
                  name="solar:diskette-line-duotone"
                  class="mr-2 h-4.5 w-4.5"
                />Lưu cài đặt
              </button>
            </div>
          </div>
        </template>

        <!-- TAB: Bảo mật -->
        <template v-if="activeTab === 'secconf'">
          <div
            class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900"
          >
            <h3
              class="inline-flex items-center text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              <Icon
                name="solar:lock-password-line-duotone"
                class="mr-2 h-4.5 w-4.5 text-primary"
              />
              Bảo mật & Quyền truy cập
            </h3>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Kiểm soát session, giới hạn đăng nhập sai và chế độ bảo trì.
            </p>

            <div class="mt-5 space-y-5">
              <!-- Session -->
              <div
                class="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
              >
                <p
                  class="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Session
                </p>
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                      >Thời gian hết hạn (phút)</label
                    >
                    <input
                      v-model="form.sessionLifetime"
                      type="number"
                      min="1"
                      :class="inputCls"
                      placeholder="120"
                    />
                    <p class="mt-1 text-xs text-slate-400">
                      Người dùng sẽ bị đăng xuất sau khoảng thời gian không hoạt
                      động.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Login lockout -->
              <div
                class="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
              >
                <p
                  class="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Giới hạn đăng nhập sai
                </p>
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                      >Số lần sai tối đa</label
                    >
                    <input
                      v-model="form.loginMaxAttempts"
                      type="number"
                      min="1"
                      :class="inputCls"
                      placeholder="5"
                    />
                  </div>
                  <div>
                    <label
                      class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                      >Thời gian khóa (phút)</label
                    >
                    <input
                      v-model="form.loginLockoutMinutes"
                      type="number"
                      min="1"
                      :class="inputCls"
                      placeholder="15"
                    />
                  </div>
                </div>
                <p class="mt-2 text-xs text-slate-400">
                  Tài khoản sẽ bị khóa tạm thời sau khi đăng nhập sai
                  {{ form.loginMaxAttempts }} lần.
                </p>
              </div>

              <!-- Maintenance mode -->
              <div
                class="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <p
                      class="text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Chế độ bảo trì
                    </p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">
                      Chặn truy cập từ người dùng thông thường trong khi bảo
                      trì.
                    </p>
                  </div>
                  <label class="inline-flex cursor-pointer items-center gap-2">
                    <div class="relative">
                      <input
                        v-model="form.maintenanceEnabled"
                        type="checkbox"
                        class="peer sr-only"
                      />
                      <div
                        class="h-5 w-9 rounded-full bg-slate-200 transition peer-checked:bg-rose-500"
                      ></div>
                      <div
                        class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4"
                      ></div>
                    </div>
                  </label>
                </div>
                <div v-if="form.maintenanceEnabled" class="mt-3 space-y-2">
                  <div
                    class="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
                  >
                    ⚠ Đang bật chế độ bảo trì — người dùng không thể truy cập
                    site.
                  </div>
                  <label
                    class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >Thông báo hiển thị</label
                  >
                  <textarea
                    v-model="form.maintenanceMessage"
                    rows="3"
                    class="w-full rounded-[8px] border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  ></textarea>
                </div>
              </div>
            </div>

            <div class="mt-5 flex justify-end">
              <button
                type="button"
                :class="saveBtnCls"
                @click="saveSettings('Bảo mật')"
              >
                <Icon
                  name="solar:diskette-line-duotone"
                  class="mr-2 h-4.5 w-4.5"
                />Lưu cài đặt
              </button>
            </div>
          </div>
        </template>

        <!-- TAB: Hê thống -->
        <template v-if="activeTab === 'system'">
          <div class="space-y-4">
            <!-- Actions -->
            <div
              class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900"
            >
              <h3
                class="inline-flex items-center text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                <Icon
                  name="solar:server-minimalistic-line-duotone"
                  class="mr-2 h-4.5 w-4.5 text-primary"
                />
                Thao tác hệ thống
              </h3>

              <div class="mt-4 grid grid-cols-1 gap-3">
                <div
                  class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div class="flex items-center gap-3">
                    <span
                      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary"
                    >
                      <Icon
                        name="solar:database-line-duotone"
                        class="h-5 w-5"
                      />
                    </span>
                    <div class="min-w-0 flex-1">
                      <p
                        class="text-sm font-semibold text-slate-800 dark:text-slate-200"
                      >
                        Backup database
                      </p>
                      <p class="text-xs text-slate-500 dark:text-slate-400">
                        Tạo bản sao lưu cơ sở dữ liệu dưới dạng file SQL.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="mt-3 w-full rounded-lg border border-primary/30 bg-white px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 dark:border-primary/50 dark:bg-slate-900 dark:hover:bg-primary/20"
                    :disabled="isBackingUp"
                    @click="handleBackupDb"
                  >
                    {{ isBackingUp ? "Đang backup..." : "Backup ngay" }}
                  </button>
                </div>
              </div>

              <div
                class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
              >
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <p
                      class="text-sm font-semibold text-slate-800 dark:text-slate-200"
                    >
                      Lịch backup tự động
                    </p>
                    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Thiết lập chu kỳ chạy tự động, ví dụ mỗi 7 giờ hoặc mỗi 30
                      phút.
                    </p>
                  </div>
                  <label class="inline-flex cursor-pointer items-center gap-2">
                    <span class="text-sm text-slate-600 dark:text-slate-400">
                      Kích hoạt
                    </span>
                    <div class="relative">
                      <input
                        v-model="form.autoBackupEnabled"
                        type="checkbox"
                        class="peer sr-only"
                      />
                      <div
                        class="h-5 w-9 rounded-full bg-slate-200 transition peer-checked:bg-primary/100"
                      ></div>
                      <div
                        class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4"
                      ></div>
                    </div>
                  </label>
                </div>

                <div
                  class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2"
                  :class="
                    !form.autoBackupEnabled && 'pointer-events-none opacity-50'
                  "
                >
                  <div>
                    <label
                      class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Mỗi
                    </label>
                    <input
                      v-model="form.autoBackupIntervalValue"
                      type="number"
                      min="1"
                      max="999"
                      :class="inputCls"
                    />
                  </div>

                  <div>
                    <label
                      class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Đơn vị thời gian
                    </label>
                    <UiDropdown
                      v-model="form.autoBackupIntervalUnit"
                      :options="backupIntervalUnitOptions"
                    />
                  </div>

                  <div class="md:col-span-2">
                    <label
                      class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Số file giữ lại
                    </label>
                    <input
                      v-model="form.autoBackupRetentionCount"
                      type="number"
                      min="1"
                      max="90"
                      :class="inputCls"
                    />
                  </div>
                </div>

                <div
                  class="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                >
                  Endpoint chạy lịch backup:
                  <span class="font-mono text-primary"
                    >/api/cron/backups/process</span
                  >
                  <div class="mt-1">
                    Quy tắc: sau mỗi lần backup thành công, hệ thống sẽ chờ đủ
                    chu kỳ rồi mới cho chạy lại.
                  </div>
                  <div class="mt-1">
                    Lần chạy gần nhất:
                    <span
                      class="font-medium text-slate-700 dark:text-slate-300"
                    >
                      {{ autoBackupLastRunText }}
                    </span>
                  </div>
                </div>

                <div class="mt-4 flex justify-end">
                  <button
                    type="button"
                    :class="saveBtnCls"
                    @click="saveSettings('Hệ thống')"
                  >
                    <Icon
                      name="solar:diskette-line-duotone"
                      class="mr-2 h-4.5 w-4.5"
                    />Lưu cài đặt
                  </button>
                </div>
              </div>
            </div>

            <!-- App info -->
            <div
              class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900"
            >
              <h3
                class="inline-flex items-center text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                <Icon
                  name="solar:info-circle-line-duotone"
                  class="mr-2 h-4.5 w-4.5 text-primary"
                />
                Thông tin ứng dụng
              </h3>
              <div
                class="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden dark:divide-slate-700 dark:border-slate-700"
              >
                <div
                  v-for="item in appInfoItems"
                  :key="item.label"
                  class="flex items-center justify-between bg-white px-4 py-3 dark:bg-slate-900"
                >
                  <span class="text-sm text-slate-600 dark:text-slate-400">
                    {{ item.label }}
                  </span>
                  <span
                    class="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {{ item.value }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </article>

      <!-- Sidebar -->
      <article>
        <div
          class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900"
        >
          <h4
            class="inline-flex items-center text-sm font-semibold text-slate-900 dark:text-slate-100"
          >
            <Icon
              name="solar:magnifer-line-duotone"
              class="mr-2 h-4 w-4 text-primary"
            />SEO Preview
          </h4>
          <div
            class="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
          >
            <p class="truncate text-sm font-semibold text-sky-700">
              {{ seoPreviewTitle }}
            </p>
            <p class="mt-0.5 truncate text-xs text-primary">
              {{ seoPreviewUrl }}
            </p>
            <p
              class="mt-1 line-clamp-3 text-xs text-slate-600 dark:text-slate-400"
            >
              {{ seoPreviewDescription }}
            </p>
            <img
              v-if="ogPreview"
              :src="ogPreview"
              alt="OG"
              class="mt-3 h-24 w-full rounded-md border border-slate-200 object-cover"
            />
            <div
              v-else
              class="mt-3 flex h-24 w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-xs text-slate-400"
            >
              Chưa có ảnh bìa OG
            </div>
          </div>

          <div class="mt-4 space-y-2">
            <p
              class="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500"
            >
              Trạng thái tích hợp
            </p>
            <div
              v-for="item in [
                {
                  label: 'Telegram',
                  icon: 'solar:plain-3-line-duotone',
                  color: 'text-sky-500',
                  active: form.telegramEnabled,
                },
                {
                  label: 'SMTP Mail',
                  icon: 'solar:letter-line-duotone',
                  color: 'text-violet-500',
                  active: form.mailEnabled,
                },
                {
                  label: 'Google Auth',
                  icon: 'solar:shield-user-line-duotone',
                  color: 'text-blue-500',
                  active: form.googleAuthEnabled,
                },
                {
                  label: 'Turnstile',
                  icon: 'solar:shield-check-line-duotone',
                  color: 'text-orange-500',
                  active: form.turnstileEnabled,
                },
                {
                  label: 'Bảo trì',
                  icon: 'solar:danger-triangle-line-duotone',
                  color: 'text-rose-500',
                  active: form.maintenanceEnabled,
                },
              ]"
              :key="item.label"
              class="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            >
              <span
                class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
              >
                <Icon :name="item.icon" class="h-4 w-4" :class="item.color" />{{
                  item.label
                }}
              </span>
              <UiBadge
                :variant="item.active ? 'primary' : 'slate'"
                :label="item.active ? 'Bật' : 'Tắt'"
              />
            </div>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>
<script setup lang="ts">
  definePageMeta({ layout: "admin" });
  useHead({ title: "Cài đặt hệ thống" });
  const { formatDateTime } = useDateFormatter();

  const toast = useToast();
  const route = useRoute();
  const activeTab = ref((route.query.tab as string) || "general");

  // Sync activeTab with URL when route changes
  watch(
    () => route.query.tab,
    (newTab) => {
      if (newTab) {
        activeTab.value = newTab as string;
      }
    }
  );

  const tabs = [
    {
      key: "general",
      label: "Tổng quan",
      icon: "solar:widget-3-line-duotone",
    },
    { key: "media", label: "Media", icon: "solar:gallery-line-duotone" },
    {
      key: "sliders",
      label: "Sliders",
      icon: "solar:play-circle-line-duotone",
    },
    {
      key: "banner",
      label: "Banner",
      icon: "solar:gallery-wide-line-duotone",
    },
    { key: "telegram", label: "Telegram", icon: "solar:plain-3-line-duotone" },
    { key: "email", label: "SMTP Mail", icon: "solar:letter-line-duotone" },
    {
      key: "security",
      label: "Google Auth",
      icon: "solar:shield-user-line-duotone",
    },
    {
      key: "captcha",
      label: "Turnstile",
      icon: "solar:shield-check-line-duotone",
    },
    {
      key: "secconf",
      label: "Bảo mật",
      icon: "solar:lock-password-line-duotone",
    },
    {
      key: "system",
      label: "Hệ thống",
      icon: "solar:server-minimalistic-line-duotone",
    },
  ];

  // Load settings từ DB
  const { data: settingsData, refresh: refreshSettings } = await useFetch<
    Record<string, string | null>
  >("/api/admin/settings");

  const { data: systemData, refresh: refreshSystemData } = await useFetch<{
    appInfo: {
      appVersion: string;
      nuxtVersion: string;
      nodeVersion: string;
      environment: string;
      debugMode: string;
    };
  }>("/api/admin/settings/system");

  // Helper: lấy giá trị string từ DB, fallback nếu null/undefined
  const s = (key: string, fallback = "") =>
    settingsData.value?.[key] ?? fallback;
  const sb = (key: string, fallback = false) => {
    const v = settingsData.value?.[key];
    if (v === null || v === undefined) return fallback;
    return v === "true" || v === "1";
  };
  const sn = (key: string, fallback = 0) => {
    const v = settingsData.value?.[key];
    return v ? Number(v) : fallback;
  };

  // Reactive form - được populate từ DB
  const form = reactive({
    siteName: "",
    timezone: "Asia/Ho_Chi_Minh (GMT+7)",
    siteUrl: "",
    siteTitle: "",
    seoDescription: "",
    seoKeywords: "",
    telegramEnabled: false,
    telegramBotToken: "",
    telegramChatId: "",
    telegramOnNewOrder: true,
    telegramOnNewUser: true,
    telegramOnPayment: true,
    mailEnabled: false,
    mailHost: "",
    mailPort: "",
    mailUsername: "",
    mailPassword: "",
    mailEncryption: "TLS",
    mailFromName: "",
    mailFromAddress: "",
    googleAuthEnabled: false,
    googleClientId: "",
    googleClientSecret: "",
    googleCallbackUrl: "",
    turnstileEnabled: false,
    turnstileSiteKey: "",
    turnstileSecretKey: "",
    sessionLifetime: 120,
    loginMaxAttempts: 5,
    loginLockoutMinutes: 15,
    maintenanceEnabled: false,
    maintenanceMessage: "",
    sliders: "[]",
    homeLeftImageBanners: "[]",
    homePromoBanners: "[]",
    autoBackupEnabled: false,
    autoBackupIntervalValue: 24,
    autoBackupIntervalUnit: "hour",
    autoBackupRetentionCount: 7,
  });

  // Populate form khi data load xong
  const populateForm = () => {
    if (!settingsData.value) return;
    form.siteName = s("siteName");
    form.timezone = s("timezone", "Asia/Ho_Chi_Minh (GMT+7)");
    form.siteUrl = s("siteUrl");
    form.siteTitle = s("siteTitle");
    form.seoDescription = s("seoDescription");
    form.seoKeywords = s("seoKeywords");
    form.telegramEnabled = sb("telegramEnabled");
    form.telegramBotToken = s("telegramBotToken");
    form.telegramChatId = s("telegramChatId");
    form.telegramOnNewOrder = sb("telegramOnNewOrder", true);
    form.telegramOnNewUser = sb("telegramOnNewUser", true);
    form.telegramOnPayment = sb("telegramOnPayment", true);
    form.mailEnabled = sb("mailEnabled");
    form.mailHost = s("mailHost");
    form.mailPort = s("mailPort");
    form.mailUsername = s("mailUsername");
    form.mailPassword = s("mailPassword");
    form.mailEncryption = s("mailEncryption", "TLS");
    form.mailFromName = s("mailFromName");
    form.mailFromAddress = s("mailFromAddress");
    form.googleAuthEnabled = sb("googleAuthEnabled");
    form.googleClientId = s("googleClientId");
    form.googleClientSecret = s("googleClientSecret");
    form.googleCallbackUrl = s("googleCallbackUrl");
    form.turnstileEnabled = sb("turnstileEnabled");
    form.turnstileSiteKey = s("turnstileSiteKey");
    form.turnstileSecretKey = s("turnstileSecretKey");
    form.sessionLifetime = sn("sessionLifetime", 120);
    form.loginMaxAttempts = sn("loginMaxAttempts", 5);
    form.loginLockoutMinutes = sn("loginLockoutMinutes", 15);
    form.maintenanceEnabled = sb("maintenanceEnabled");
    form.maintenanceMessage = s(
      "maintenanceMessage",
      "Hệ thống đang bảo trì, vui lòng quay lại sau."
    );
    form.sliders = s("sliders", "[]");
    form.homeLeftImageBanners = s(
      "homeLeftImageBanners",
      JSON.stringify(getDefaultHomeLeftImageBanners())
    );
    form.homePromoBanners = s(
      "homePromoBanners",
      JSON.stringify(getDefaultHomePromoBanners())
    );
    form.autoBackupEnabled = sb("autoBackupEnabled");
    form.autoBackupIntervalValue = sn("autoBackupIntervalValue", 24);
    form.autoBackupIntervalUnit = s("autoBackupIntervalUnit", "hour");
    form.autoBackupRetentionCount = sn("autoBackupRetentionCount", 7);
  };

  // Populate ngay khi có data
  watch(settingsData, populateForm, { immediate: true });

  // Mapping tab -> các key cần lưu
  const tabKeys: Record<string, string[]> = {
    general: [
      "siteName",
      "timezone",
      "siteUrl",
      "siteTitle",
      "seoDescription",
      "seoKeywords",
    ],
    telegram: [
      "telegramEnabled",
      "telegramBotToken",
      "telegramChatId",
      "telegramOnNewOrder",
      "telegramOnNewUser",
      "telegramOnPayment",
    ],
    email: [
      "mailEnabled",
      "mailHost",
      "mailPort",
      "mailUsername",
      "mailPassword",
      "mailEncryption",
      "mailFromName",
      "mailFromAddress",
    ],
    security: [
      "googleAuthEnabled",
      "googleClientId",
      "googleClientSecret",
      "googleCallbackUrl",
    ],
    captcha: ["turnstileEnabled", "turnstileSiteKey", "turnstileSecretKey"],
    secconf: [
      "sessionLifetime",
      "loginMaxAttempts",
      "loginLockoutMinutes",
      "maintenanceEnabled",
      "maintenanceMessage",
    ],
    sliders: ["sliders"],
    banner: ["homeLeftImageBanners", "homePromoBanners"],
    system: [
      "autoBackupEnabled",
      "autoBackupIntervalValue",
      "autoBackupIntervalUnit",
      "autoBackupRetentionCount",
    ],
  };

  const isSaving = ref(false);

  const saveSettings = async (tabName: string) => {
    isSaving.value = true;
    const keys = tabKeys[activeTab.value] || Object.keys(form);
    const payload: Record<string, string> = {};
    for (const key of keys) {
      const val = (form as any)[key];
      payload[key] = typeof val === "boolean" ? String(val) : String(val ?? "");
    }

    try {
      await $fetch("/api/admin/settings", { method: "POST", body: payload });
      await refreshSettings();
      await refreshSystemData();
      toast.success("Lưu thành công!", `Cài đặt ${tabName} đã được cập nhật.`);
    } catch (err: any) {
      toast.error("Lỗi", err.data?.message || "Không thể lưu cài đặt.");
    } finally {
      isSaving.value = false;
    }
  };

  // Media upload
  const timezoneOptions = [
    { label: "Asia/Ho_Chi_Minh (GMT+7)", value: "Asia/Ho_Chi_Minh (GMT+7)" },
  ];
  const encryptionOptions = [
    { label: "TLS", value: "TLS" },
    { label: "SSL", value: "SSL" },
    { label: "None", value: "None" },
  ];
  const backupIntervalUnitOptions = [
    { label: "Giờ", value: "hour" },
    { label: "Phút", value: "minute" },
  ];
  const inputCls =
    "h-[37.33px] w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
  const saveBtnCls =
    "inline-flex rounded-xl font-medium bg-primary hover:bg-primary text-white px-5 py-2.5 text-[13px] font-semibold flex items-center justify-center transition-all disabled:opacity-60";

  const logoPreview = ref("");
  const faviconPreview = ref("");
  const ogPreview = ref("");
  const logoFileName = ref("Chưa chọn file...");
  const faviconFileName = ref("Chưa chọn file...");
  const ogFileName = ref("Chưa chọn file...");

  const logoInputRef = ref<HTMLInputElement | null>(null);
  const faviconInputRef = ref<HTMLInputElement | null>(null);
  const ogInputRef = ref<HTMLInputElement | null>(null);

  const openFilePicker = (type: string) => {
    if (type === "logo") logoInputRef.value?.click();
    if (type === "favicon") faviconInputRef.value?.click();
    if (type === "og") ogInputRef.value?.click();
  };
  const onFileSelected = (e: Event, type: string) => {
    const target = e.target as HTMLInputElement;
    if (target && target.files && target.files.length > 0) {
      const file = target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (type === "logo") {
          logoFileName.value = file.name;
          logoPreview.value = result;
        }
        if (type === "favicon") {
          faviconFileName.value = file.name;
          faviconPreview.value = result;
        }
        if (type === "og") {
          ogFileName.value = file.name;
          ogPreview.value = result;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const isBackingUp = ref(false);

  const handleBackupDb = async () => {
    if (isBackingUp.value) return;

    isBackingUp.value = true;
    try {
      const result = await $fetch<{ url: string }>(
        "/api/admin/settings/backup",
        {
          method: "POST",
        }
      );
      if (import.meta.client && result.url) {
        window.open(result.url, "_blank", "noopener,noreferrer");
      }
    } catch (err: any) {
    } finally {
      isBackingUp.value = false;
    }
  };

  const appInfoItems = computed(() => [
    {
      label: "PhiÃªn báº£n á»©ng dá»¥ng",
      value: systemData.value?.appInfo?.appVersion || "Không rõ",
    },
    {
      label: "Nuxt version",
      value: systemData.value?.appInfo?.nuxtVersion || "Không rõ",
    },
    {
      label: "Node.js version",
      value: systemData.value?.appInfo?.nodeVersion || "Không rõ",
    },
    {
      label: "Môi trường",
      value: systemData.value?.appInfo?.environment || "Không rõ",
    },
    {
      label: "Debug mode",
      value: systemData.value?.appInfo?.debugMode || "Không rõ",
    },
  ]);

  const autoBackupLastRunText = computed(() => {
    const rawValue = settingsData.value?.autoBackupLastRunAt;
    if (!rawValue) return "Chưa chạy lần nào";

    const formatted = formatDateTime(rawValue, "vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    return formatted === "---" ? "Chưa chạy lần nào" : formatted;
  });

  const seoPreviewTitle = computed(() => form.siteTitle || "Chưa có tiêu đề");
  const seoPreviewUrl = computed(() => form.siteUrl || "Chưa có URL");
  const seoPreviewDescription = computed(
    () => form.seoDescription || "Chưa có mô tả"
  );

  // Sliders management
  const sliderFileInput = ref<HTMLInputElement | null>(null);
  const sliderFileName = ref("");
  const sliderImagePreview = ref("");
  const sliderUploading = ref(false);
  const sliderFile = ref<File | null>(null);
  const newSlider = ref({ title: "" });

  const parsedSliders = computed(() => {
    try {
      return JSON.parse(form.sliders || "[]");
    } catch {
      return [];
    }
  });

  const onSliderFileSelected = (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    sliderFileName.value = file.name;
    sliderFile.value = file;

    // Preview image
    const reader = new FileReader();
    reader.onload = (e) => {
      sliderImagePreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const addSlider = async () => {
    if (!sliderFile.value) {
      toast.error("Lỗi", "Vui lòng chọn ảnh");
      return;
    }

    sliderUploading.value = true;
    try {
      // Upload file via /api/common/upload
      const formData = new FormData();
      formData.append("file", sliderFile.value);

      const uploadRes = await $fetch<{ url: string }>("/api/common/upload", {
        method: "POST",
        body: formData,
      });

      // Add slider with uploaded URL
      const sliders = parsedSliders.value;
      sliders.push({
        id: Date.now(),
        title: newSlider.value.title.trim(),
        image: uploadRes.url,
        order: sliders.length,
        active: true,
      });
      form.sliders = JSON.stringify(sliders);
      newSlider.value = { title: "" };
      sliderFile.value = null;
      sliderFileName.value = "";
      sliderImagePreview.value = "";
      toast.success("Thành công", "Slider được thêm");
    } catch (err: any) {
      toast.error("Lỗi", err.data?.message || "Upload ảnh thất bại");
    } finally {
      sliderUploading.value = false;
    }
  };

  const removeSlider = (index: number) => {
    const sliders = parsedSliders.value;
    sliders.splice(index, 1);
    form.sliders = JSON.stringify(sliders);
    toast.success("Thành công", "Slider được xoá");
  };

  const homeLeftImageBannerFileInputs = ref<Array<HTMLInputElement | null>>([]);
  const homeLeftImageBannerFileNames = ref<string[]>(["", "", ""]);
  const homeLeftImageBannerUploading = ref<boolean[]>([false, false, false]);

  const setHomeLeftImageBannerFileInputRef = (
    element: HTMLInputElement | null,
    index: number
  ) => {
    homeLeftImageBannerFileInputs.value[index] = element;
  };

  const openHomeLeftImageBannerFilePicker = (index: number) => {
    homeLeftImageBannerFileInputs.value[index]?.click();
  };

  interface HomeLeftImageBanner {
    image: string;
    href: string;
  }

  interface HomePromoBanner {
    label: string;
    title: string;
    description: string;
    icon: string;
    href: string;
  }

  function getDefaultHomeLeftImageBanners(): HomeLeftImageBanner[] {
    return Array.from({ length: 3 }, () => ({
      image: "",
      href: "",
    }));
  }

  function getDefaultHomePromoBanners(): HomePromoBanner[] {
    return [
      {
        label: "",
        title: "",
        description: "",
        icon: "",
        href: "",
      },
      {
        label: "",
        title: "",
        description: "",
        icon: "",
        href: "",
      },
    ];
  }

  const parsedHomeLeftImageBanners = computed<HomeLeftImageBanner[]>(() => {
    const defaultHomeLeftImageBanners = getDefaultHomeLeftImageBanners();
    try {
      const parsed = JSON.parse(form.homeLeftImageBanners || "[]");
      if (!Array.isArray(parsed)) return defaultHomeLeftImageBanners;

      return defaultHomeLeftImageBanners.map((fallback, index) => {
        const item = parsed[index] || {};
        return {
          image: String(item?.image || fallback.image || ""),
          href: String(item?.href || fallback.href || ""),
        };
      });
    } catch {
      return defaultHomeLeftImageBanners;
    }
  });

  const parsedHomePromoBanners = computed<HomePromoBanner[]>(() => {
    const defaultHomePromoBanners = getDefaultHomePromoBanners();
    try {
      const parsed = JSON.parse(form.homePromoBanners || "[]");
      if (!Array.isArray(parsed)) return defaultHomePromoBanners;

      return defaultHomePromoBanners.map((fallback, index) => {
        const item = parsed[index] || {};
        return {
          label: String(item?.label || fallback.label || ""),
          title: String(item?.title || fallback.title || ""),
          description: String(item?.description || fallback.description || ""),
          icon: String(item?.icon || fallback.icon || ""),
          href: String(item?.href || fallback.href || ""),
        };
      });
    } catch {
      return defaultHomePromoBanners;
    }
  });

  const updateHomePromoBanner = (
    index: number,
    field: keyof HomePromoBanner,
    value: string
  ) => {
    const nextBanners = parsedHomePromoBanners.value.map((banner) => ({
      ...banner,
    }));
    if (!nextBanners[index]) return;
    nextBanners[index][field] = value;
    form.homePromoBanners = JSON.stringify(nextBanners);
  };

  const updateHomeLeftImageBanner = (
    index: number,
    field: keyof HomeLeftImageBanner,
    value: string
  ) => {
    const nextBanners = parsedHomeLeftImageBanners.value.map((banner) => ({
      ...banner,
    }));
    if (!nextBanners[index]) return;
    nextBanners[index][field] = value;
    form.homeLeftImageBanners = JSON.stringify(nextBanners);
  };

  const onHomeLeftImageBannerFileSelected = async (
    event: Event,
    index: number
  ) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    homeLeftImageBannerFileNames.value[index] = file.name;
    homeLeftImageBannerUploading.value[index] = true;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await $fetch<{ url: string }>("/api/common/upload", {
        method: "POST",
        body: formData,
      });

      updateHomeLeftImageBanner(index, "image", uploadRes.url);
      toast.success("Thành công", `Đã cập nhật ảnh banner ${index + 1}`);
    } catch (err: any) {
      toast.error("Lỗi", err.data?.message || "Upload ảnh thất bại");
    } finally {
      homeLeftImageBannerUploading.value[index] = false;
      input.value = "";
    }
  };
</script>
