<template>
  <div
    class="min-h-screen bg-[#fafafa] dark:bg-[#0f1115] text-slate-800 dark:text-slate-200 font-sans"
  >
    <LayoutHeader />
    <LayoutNavbar />

    <main class="max-w-[1400px] mx-auto px-4 lg:px-6 pt-8 pb-20">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-[13px] text-slate-500 mb-6">
        <NuxtLink
          to="/"
          class="hover:text-primary transition-colors flex items-center gap-1.5"
        >
          <Icon name="solar:home-smile-linear" size="16" /> Trang chủ
        </NuxtLink>
        <Icon name="solar:alt-arrow-right-linear" size="14" />
        <NuxtLink
          v-if="data?.category"
          :to="`/categories/${data.category.id}`"
          class="hover:text-primary transition-colors flex items-center gap-1.5"
        >
          <Icon name="solar:tag-bold-duotone" size="15" class="text-primary" />
          {{ data.category.name }}
        </NuxtLink>
        <Icon name="solar:alt-arrow-right-linear" size="14" />
        <span
          class="text-slate-800 dark:text-slate-200 font-medium truncate max-w-[200px] flex items-center gap-1.5"
        >
          <Icon
            name="solar:box-bold-duotone"
            size="15"
            class="text-slate-400"
          />
          {{ data?.product?.name ?? "..." }}
        </span>
      </div>

      <!-- Loading -->
      <div
        v-if="pending"
        class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12"
      >
        <div
          class="animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800 aspect-[4/3]"
        />
        <div class="space-y-4 pt-2">
          <div class="h-5 w-24 rounded bg-slate-200 dark:bg-slate-800" />
          <div class="h-8 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
          <div class="h-8 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
          <div class="h-28 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div class="h-12 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>

      <!-- Content -->
      <template v-else-if="data">
        <div
          class="bg-white dark:bg-[#181a1f] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-7 lg:p-8 shadow-sm"
        >
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <!-- Left: Image -->
            <div class="w-full" ref="productImageRef">
              <div
                class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#20232a] p-[10px]"
              >
                <img
                  v-if="data.product.image"
                  :src="data.product.image"
                  :alt="data.product.name"
                  class="w-full rounded-xl"
                />
                <div
                  v-else
                  class="w-full aspect-[4/3] rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                >
                  <Icon
                    name="solar:box-bold-duotone"
                    size="64"
                    class="text-slate-300 dark:text-slate-600"
                  />
                </div>
              </div>

              <!-- Trust badges below image -->
              <div class="mt-4 grid grid-cols-2 gap-2">
                <div
                  class="flex items-center gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5"
                >
                  <Icon
                    name="solar:bolt-bold-duotone"
                    size="18"
                    class="text-amber-500 shrink-0"
                  />
                  <div>
                    <p
                      class="text-[11px] font-bold text-amber-700 dark:text-amber-400 leading-tight"
                    >
                      Tự động
                    </p>
                    <p
                      class="text-[10px] text-amber-600/70 dark:text-amber-500/70"
                    >
                      Giao hàng tự động
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right: Details -->
            <div class="flex flex-col gap-5">
              <!-- Category + name -->
              <div>
                <div class="flex items-center gap-2 mb-3">
                  <div
                    v-if="data.category"
                    class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-full"
                  >
                    <Icon name="solar:tag-bold-duotone" size="12" />
                    {{ data.category.name }}
                  </div>
                  <button
                    type="button"
                    @click="toggleWishlist"
                    :disabled="wishlistLoading"
                    class="ml-auto w-9 h-9 rounded-full flex items-center justify-center transition-all"
                    :class="
                      isFavorite
                        ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-500'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-rose-50 hover:text-rose-400'
                    "
                  >
                    <Icon
                      v-if="wishlistLoading"
                      name="solar:spinner-bold"
                      size="18"
                      class="animate-spin"
                    />
                    <Icon
                      v-else
                      :name="
                        isFavorite ? 'solar:heart-bold' : 'solar:heart-linear'
                      "
                      size="18"
                    />
                  </button>
                  <!-- Share / Affiliate -->
                  <button
                    type="button"
                    @click="shareOpen = true"
                    class="w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-primary/10 hover:text-primary transition-all"
                    title="Chia sẻ kiếm tiền"
                  >
                    <Icon name="solar:share-bold-duotone" size="18" />
                  </button>
                </div>
                <h1
                  class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight"
                >
                  {{ data.product.name }}
                </h1>

                <!-- Tình trạng -->
                <div class="flex items-center gap-2 mt-3">
                  <template v-if="selectedPlan">
                    <Icon
                      :name="
                        selectedPlan.stockCount > 0
                          ? 'solar:check-circle-bold-duotone'
                          : 'solar:close-circle-bold-duotone'
                      "
                      size="16"
                      :class="
                        selectedPlan.stockCount > 0
                          ? 'text-emerald-500'
                          : 'text-rose-500'
                      "
                    />
                    <span class="text-[12px] text-slate-500 dark:text-slate-400"
                      >Tình trạng:</span
                    >
                    <span
                      class="text-[12px] font-bold"
                      :class="
                        selectedPlan.stockCount > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-500'
                      "
                    >
                      {{
                        selectedPlan.stockCount > 0 ? "Còn hàng" : "Hết hàng"
                      }}
                    </span>
                  </template>
                  <template v-else>
                    <Icon
                      name="solar:info-circle-bold-duotone"
                      size="16"
                      class="text-slate-400"
                    />
                    <span class="text-[12px] text-slate-400"
                      >Chọn gói để xem tình trạng</span
                    >
                  </template>
                </div>
              </div>

              <!-- Divider -->
              <div class="h-px bg-slate-100 dark:bg-slate-800" />

              <!-- Plan selector -->
              <div v-if="data.plans.length > 0">
                <p
                  class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5"
                >
                  Chọn gói
                </p>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="plan in data.plans"
                    :key="plan.id"
                    type="button"
                    @click="selectedPlan = plan"
                    :disabled="plan.stockCount === 0"
                    class="relative text-left rounded-xl border-2 px-4 py-3 transition-all"
                    :class="[
                      selectedPlan?.id === plan.id
                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                        : plan.stockCount === 0
                          ? 'border-slate-100 dark:border-slate-800 opacity-40 cursor-not-allowed bg-transparent'
                          : 'border-slate-200 dark:border-slate-800 hover:border-primary/40 bg-slate-50/50 dark:bg-[#20232a]/50',
                    ]"
                  >
                    <div class="flex items-center gap-3">
                      <div
                        class="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                        :class="
                          selectedPlan?.id === plan.id
                            ? 'border-primary'
                            : 'border-slate-300 dark:border-slate-600'
                        "
                      >
                        <div
                          v-if="selectedPlan?.id === plan.id"
                          class="w-2 h-2 rounded-full bg-primary"
                        />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5">
                          <p
                            class="font-semibold text-[13px] text-slate-800 dark:text-white leading-tight"
                          >
                            {{ plan.name }}
                          </p>
                          <span
                            v-if="isPlanOnSale(plan)"
                            class="inline-flex items-center rounded-md bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none"
                          >
                            -{{ plan.discountPercent }}%
                          </span>
                        </div>
                      </div>
                      <div class="text-right shrink-0">
                        <!-- Giá sale -->
                        <p
                          v-if="isPlanOnSale(plan)"
                          class="font-bold text-[15px] text-rose-500 leading-tight"
                        >
                          {{
                            getPlanEffectivePrice(plan).toLocaleString("vi-VN")
                          }}đ
                        </p>
                        <!-- Giá gốc (gạch nếu có sale) -->
                        <p
                          class="leading-tight"
                          :class="
                            isPlanOnSale(plan)
                              ? 'font-mono text-[11px] text-slate-400 line-through'
                              : 'font-bold text-[15px] text-primary'
                          "
                        >
                          {{ plan.price.toLocaleString("vi-VN") }}đ
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Flash Sale Countdown -->
              <div
                v-if="
                  selectedPlan && isPlanOnSale(selectedPlan) && flashTimeLeft
                "
                class="flex items-center justify-between rounded-xl bg-gradient-to-r from-rose-500/10 to-orange-500/10 border border-rose-200 dark:border-rose-800 px-3 py-2"
              >
                <div class="flex items-center gap-1.5 text-rose-500">
                  <Icon name="solar:bolt-bold" size="14" />
                  <span class="text-[11px] font-bold uppercase tracking-wide"
                    >Flash Sale kết thúc sau</span
                  >
                </div>
                <div
                  class="flex items-center gap-1 font-mono text-[13px] font-bold text-rose-500"
                >
                  <span>{{ flashTimeLeft.h }}</span>
                  <span class="opacity-60">:</span>
                  <span>{{ flashTimeLeft.m }}</span>
                  <span class="opacity-60">:</span>
                  <span>{{ flashTimeLeft.s }}</span>
                </div>
              </div>

              <!-- Price & Quantity -->

              <div
                v-if="selectedPlan"
                class="flex items-center justify-between rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 px-4 py-3.5"
              >
                <div>
                  <p
                    class="text-[10px] font-bold uppercase tracking-widest text-primary/60 mb-0.5"
                  >
                    Tổng tiền
                  </p>
                  <p
                    class="text-2xl font-bold leading-none"
                    :class="
                      selectedPlan && isPlanOnSale(selectedPlan)
                        ? 'text-rose-500'
                        : 'text-primary'
                    "
                  >
                    {{
                      (
                        getPlanEffectivePrice(selectedPlan) * quantity
                      ).toLocaleString("vi-VN")
                    }}đ
                  </p>
                  <p
                    v-if="selectedPlan && isPlanOnSale(selectedPlan)"
                    class="font-mono text-[12px] text-slate-400 line-through mt-0.5"
                  >
                    {{
                      (selectedPlan.price * quantity).toLocaleString("vi-VN")
                    }}đ
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[11px] font-semibold text-slate-400"
                    >Số lượng</span
                  >
                  <div
                    class="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-[#20232a]"
                  >
                    <button
                      type="button"
                      @click="quantity > 1 ? quantity-- : null"
                      class="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Icon name="solar:minus-circle-line-duotone" size="15" />
                    </button>
                    <span
                      class="w-8 h-8 flex items-center justify-center text-sm font-bold text-slate-800 dark:text-white border-x border-slate-200 dark:border-slate-700"
                    >
                      {{ quantity }}
                    </span>
                    <button
                      type="button"
                      :disabled="
                        remainingStock !== null &&
                        quantity >= (remainingStock ?? 0)
                      "
                      class="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      @click="
                        remainingStock === null ||
                        quantity < (remainingStock ?? 0)
                          ? quantity++
                          : null
                      "
                    >
                      <Icon name="solar:add-circle-line-duotone" size="15" />
                    </button>
                  </div>
                </div>
              </div>

              <!-- Plan custom fields -->
              <div
                v-if="planFields.length > 0"
                class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#20232a] p-4 space-y-3"
              >
                <p
                  class="text-[10px] font-bold uppercase tracking-widest text-slate-400"
                >
                  Thông tin cần thiết
                </p>
                <div
                  v-for="field in planFields"
                  :key="field.key"
                  class="flex flex-col gap-1"
                >
                  <label
                    :for="`field-${field.key}`"
                    class="text-[12px] font-semibold text-slate-600 dark:text-slate-300"
                  >
                    {{ field.label }}
                    <span v-if="field.required" class="text-rose-500 ml-0.5"
                      >*</span
                    >
                  </label>
                  <textarea
                    v-if="field.type === 'textarea'"
                    :id="`field-${field.key}`"
                    v-model="fieldValues[field.key]"
                    :placeholder="field.label"
                    rows="3"
                    class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#181a1f] px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none transition"
                  />
                  <input
                    v-else
                    :id="`field-${field.key}`"
                    v-model="fieldValues[field.key]"
                    :type="field.type === 'number' ? 'number' : 'text'"
                    :placeholder="field.label"
                    class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#181a1f] px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                  />
                </div>
              </div>

              <!-- Actions -->
              <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <UiButton
                  ref="addCartBtnRef"
                  variant="outline"
                  size="lg"
                  :disabled="
                    !selectedPlan ||
                    selectedPlan.stockCount === 0 ||
                    !planFieldsValid ||
                    addingToCart
                  "
                  class="!h-10 !rounded-xl border-slate-300/90 bg-white text-[13px] font-semibold tracking-tight hover:!text-primary hover:!border-primary/50 dark:bg-slate-900"
                  @click="handleAddToCart"
                >
                  <template #prefix>
                    <Icon
                      v-if="addingToCart"
                      name="solar:check-circle-bold"
                      size="18"
                      class="text-emerald-500"
                    />
                    <Icon
                      v-else
                      name="solar:cart-large-2-bold-duotone"
                      size="18"
                    />
                  </template>
                  {{ addingToCart ? "Đã thêm!" : "Thêm giỏ hàng" }}
                </UiButton>
                <UiButton
                  variant="primary"
                  size="lg"
                  :disabled="
                    !selectedPlan ||
                    selectedPlan.stockCount === 0 ||
                    !planFieldsValid
                  "
                  class="!h-10 !rounded-xl text-[13px] font-semibold tracking-tight"
                  @click="handleBuyNow"
                >
                  <template #prefix
                    ><Icon name="solar:wallet-money-bold-duotone" size="18"
                  /></template>
                  Mua ngay
                </UiButton>
              </div>
            </div>
          </div>
        </div>

        <!-- Share / Affiliate modal -->
        <ProductsShareAffiliate
          v-model:open="shareOpen"
          :product-slug="id"
          :plan-slug="selectedPlan?.slug ?? undefined"
          :commission-rate="10"
        />

        <!-- Description -->
        <div class="mt-10 space-y-4">
          <!-- Chi tiết sản phẩm -->
          <div
            v-if="data.product.description"
            class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181a1f] overflow-hidden"
          >
            <button
              type="button"
              class="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              @click="descOpen = !descOpen"
            >
              <div
                class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"
              >
                <Icon
                  name="solar:document-text-bold-duotone"
                  size="20"
                  class="text-primary"
                />
              </div>
              <div class="flex-1 text-left">
                <p
                  class="text-[10px] font-bold uppercase tracking-widest text-slate-400"
                >
                  Chi tiết gói
                </p>
                <p
                  class="text-sm font-bold text-slate-800 dark:text-white mt-0.5"
                >
                  Mô tả sản phẩm
                </p>
              </div>
              <Icon
                name="solar:alt-arrow-down-linear"
                size="18"
                class="text-slate-400 transition-transform duration-200 shrink-0"
                :class="descOpen ? 'rotate-180' : ''"
              />
            </button>
            <div
              v-if="descOpen"
              class="px-5 pb-5 border-t border-slate-100 dark:border-slate-800 pt-4"
            >
              <div
                class="prose dark:prose-invert prose-slate max-w-none text-[14px] leading-relaxed"
                v-html="productDescriptionHtml"
              ></div>
            </div>
          </div>

          <!-- Đánh giá sản phẩm -->
          <div
            class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181a1f] overflow-hidden"
          >
            <!-- Header -->
            <div
              class="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800"
            >
              <div class="flex items-center gap-2">
                <Icon
                  name="solar:star-bold-duotone"
                  size="20"
                  class="text-amber-400"
                />
                <span class="text-sm font-bold text-slate-800 dark:text-white"
                  >Đánh giá sản phẩm</span
                >
              </div>
              <span
                class="text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full"
              >
                {{ reviews.length }} đánh giá
              </span>
            </div>

            <div class="p-5">
              <!-- Rating summary -->
              <div class="flex items-center gap-6 mb-6">
                <div class="text-center shrink-0">
                  <p
                    class="text-5xl font-bold text-slate-900 dark:text-white leading-none"
                  >
                    {{ avgRating.toFixed(1) }}
                  </p>
                  <div class="flex items-center justify-center gap-0.5 my-2">
                    <Icon
                      v-for="s in 5"
                      :key="s"
                      name="solar:star-bold"
                      size="14"
                      :class="
                        s <= Math.round(avgRating)
                          ? 'text-amber-400'
                          : 'text-slate-200 dark:text-slate-700'
                      "
                    />
                  </div>
                  <p class="text-[11px] font-semibold text-slate-400">
                    {{ reviews.length }} đánh giá
                  </p>
                </div>

                <!-- Bar chart -->
                <div class="flex-1 space-y-1.5">
                  <div
                    v-for="star in [5, 4, 3, 2, 1]"
                    :key="star"
                    class="flex items-center gap-2"
                  >
                    <span
                      class="text-[11px] font-bold text-slate-400 w-3 shrink-0"
                      >{{ star }}</span
                    >
                    <Icon
                      name="solar:star-bold"
                      size="11"
                      class="text-amber-400 shrink-0"
                    />
                    <div
                      class="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"
                    >
                      <div
                        class="h-full bg-amber-400 rounded-full transition-all duration-500"
                        :style="{
                          width: reviews.length
                            ? `${(starCount(star) / reviews.length) * 100}%`
                            : '0%',
                        }"
                      />
                    </div>
                    <span
                      class="text-[11px] font-semibold text-slate-400 w-4 text-right shrink-0"
                      >{{ starCount(star) }}</span
                    >
                  </div>
                </div>
              </div>

              <!-- Review list -->
              <div v-if="reviews.length > 0" class="space-y-4 mb-5">
                <div
                  v-for="review in reviews"
                  :key="review.id"
                  class="flex gap-3"
                >
                  <div
                    class="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0 uppercase"
                  >
                    {{ review.author[0] }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span
                        class="text-[13px] font-bold text-slate-800 dark:text-white"
                        >{{ review.author }}</span
                      >
                      <div class="flex items-center gap-0.5">
                        <Icon
                          v-for="s in 5"
                          :key="s"
                          name="solar:star-bold"
                          size="11"
                          :class="
                            s <= review.rating
                              ? 'text-amber-400'
                              : 'text-slate-200 dark:text-slate-700'
                          "
                        />
                      </div>
                      <span class="text-[11px] text-slate-400 ml-auto">{{
                        review.date
                      }}</span>
                    </div>
                    <p
                      class="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed"
                    >
                      {{ review.comment }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Empty -->
              <div v-else class="text-center py-6 text-slate-400">
                <Icon
                  name="solar:chat-square-like-line-duotone"
                  size="36"
                  class="mx-auto mb-2 opacity-40"
                />
                <p class="text-sm font-medium">Chưa có đánh giá nào</p>
                <p class="text-xs mt-1">
                  Hãy là người đầu tiên đánh giá sản phẩm này
                </p>
              </div>

              <!-- Write review -->
              <div
                class="border-t border-slate-100 dark:border-slate-800 pt-4 mt-2"
              >
                <p
                  class="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3"
                >
                  Viết đánh giá
                </p>
                <div class="flex items-center gap-1 mb-3">
                  <button
                    v-for="s in 5"
                    :key="s"
                    type="button"
                    @click="newRating = s"
                    class="transition-transform hover:scale-110"
                  >
                    <Icon
                      name="solar:star-bold"
                      size="22"
                      :class="
                        s <= newRating
                          ? 'text-amber-400'
                          : 'text-slate-200 dark:text-slate-700'
                      "
                    />
                  </button>
                </div>
                <textarea
                  v-model="newComment"
                  rows="3"
                  placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
                  class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#20232a] px-4 py-3 text-sm text-slate-700 dark:text-slate-200 outline-none resize-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-slate-400"
                />
                <div class="flex justify-end mt-2">
                  <UiButton
                    variant="primary"
                    size="sm"
                    :disabled="!newRating || !newComment.trim()"
                    @click="submitReview"
                    class="!rounded-xl px-5"
                  >
                    Gửi đánh giá
                  </UiButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Similar Products -->
      <template v-if="similarProducts.length > 0">
        <div class="mt-12">
          <div class="flex items-center gap-3 mb-6">
            <div
              class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"
            >
              <Icon
                name="solar:layers-bold-duotone"
                size="20"
                class="text-primary"
              />
            </div>
            <div>
              <p
                class="text-[10px] font-bold uppercase tracking-widest text-slate-400"
              >
                Khám phá thêm
              </p>
              <p
                class="text-lg sm:text-xl font-bold text-slate-900 dark:text-white"
              >
                Sản phẩm tương tự
              </p>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <NuxtLink
              v-for="product in similarProducts.slice(0, 4)"
              :key="product.id"
              :to="`/products/${product.slug}`"
              class="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181a1f] overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all"
            >
              <div class="p-[10px]">
                <img
                  v-if="product.image"
                  :src="product.image"
                  :alt="product.name"
                  class="w-full rounded-xl group-hover:opacity-90 transition-opacity duration-300"
                />
                <div
                  v-else
                  class="w-full aspect-[16/9] rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                >
                  <Icon
                    name="solar:box-bold-duotone"
                    size="48"
                    class="text-slate-300 dark:text-slate-600"
                  />
                </div>
              </div>
              <div class="p-4">
                <h3
                  class="text-sm font-semibold text-slate-800 dark:text-white line-clamp-2 group-hover:text-primary transition-colors"
                >
                  {{ product.name }}
                </h3>
                <div
                  v-if="product.plans?.length > 0"
                  class="mt-3 flex items-baseline gap-2"
                >
                  <span class="text-sm font-bold text-primary">
                    {{
                      Math.min(
                        ...product.plans.map((p: any) => p.price)
                      ).toLocaleString("vi-VN")
                    }}đ
                  </span>
                </div>
              </div>
            </NuxtLink>
          </div>
        </div>
      </template>
    </main>

    <LayoutFooter />
  </div>
</template>

<script setup lang="ts">
  const { parseServerDate } = useDateFormatter();
  const route = useRoute();
  const router = useRouter();
  const id = route.params.slug as string;

  interface PlanField {
    label: string;
    key: string;
    type: string;
    required: boolean;
  }

  interface Plan {
    id: number;
    name: string;
    slug: string | null;
    price: number;
    durationValue: number | null;
    durationType: string | null;
    image: string | null;
    description: string | null;
    status: string | null;
    stockCount: number;
    fields: string | null;
    salePrice: number | null; // null = không có flash sale
    discountPercent: number; // 0 nếu không có giảm
    saleEndAt: string | null; // ISO string thời điểm flash sale kết thúc
  }

  interface Product {
    id: number;
    name: string;
    image: string | null;
    description: string | null;
    deliveryType: string | null;
    status: string | null;
  }

  interface Category {
    id: number;
    name: string;
    image: string | null;
  }

  interface ProductResponse {
    product: Product;
    category: Category | null;
    plans: Plan[];
  }

  const {
    data: _data,
    pending,
    refresh: refreshProduct,
  } = await useFetch<ProductResponse>(`/api/products/${id}`);

  const data = computed(() => _data.value as ProductResponse | null);

  const selectedPlan = ref<Plan | null>(null);
  const quantity = ref(1);
  const nowTimestamp = ref(Date.now());

  const getPlanSaleEndTime = (plan?: Plan | null) => {
    if (!plan?.saleEndAt) {
      return null;
    }

    return parseServerDate(plan.saleEndAt);
  };

  const isPlanOnSale = (plan?: Plan | null) => {
    if (!plan || plan.salePrice === null) {
      return false;
    }

    const saleEndDate = getPlanSaleEndTime(plan);
    if (!saleEndDate) {
      return false;
    }

    return saleEndDate.getTime() > nowTimestamp.value;
  };

  const getPlanEffectivePrice = (plan?: Plan | null) => {
    if (!plan) {
      return 0;
    }

    return isPlanOnSale(plan)
      ? Number(plan.salePrice || 0)
      : Number(plan.price || 0);
  };

  // ─── Flash Sale Countdown (realtime) ──────────────────────────
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const flashTimeLeft = ref<{ h: string; m: string; s: string } | null>(null);

  const updatePlanCountdown = () => {
    const plan = selectedPlan.value;
    if (!plan || !isPlanOnSale(plan)) {
      flashTimeLeft.value = null;
      return;
    }

    const endDate = getPlanSaleEndTime(plan);
    if (!endDate) {
      flashTimeLeft.value = null;
      return;
    }

    const diff = endDate.getTime() - nowTimestamp.value;
    if (diff <= 0) {
      flashTimeLeft.value = null;
      return;
    }

    const totalSec = Math.floor(diff / 1000);
    flashTimeLeft.value = {
      h: pad2(Math.floor(totalSec / 3600)),
      m: pad2(Math.floor((totalSec % 3600) / 60)),
      s: pad2(totalSec % 60),
    };
  };

  let planTimer: ReturnType<typeof setInterval> | null = null;
  onMounted(() => {
    nowTimestamp.value = Date.now();
    updatePlanCountdown();
    planTimer = setInterval(() => {
      nowTimestamp.value = Date.now();
      updatePlanCountdown();
    }, 1000);
  });
  onUnmounted(() => {
    if (planTimer) clearInterval(planTimer);
  });

  watch(selectedPlan, () => {
    nowTimestamp.value = Date.now();
    updatePlanCountdown();
  });

  // Plan fields
  const planFields = computed<PlanField[]>(() => {
    if (!selectedPlan.value?.fields) return [];
    try {
      return JSON.parse(selectedPlan.value.fields) || [];
    } catch {
      return [];
    }
  });

  const fieldValues = ref<Record<string, string>>({});

  watch(selectedPlan, () => {
    fieldValues.value = {};
  });

  const planFieldsValid = computed(() =>
    planFields.value.every(
      (f) => !f.required || String(fieldValues.value[f.key] || "").trim() !== ""
    )
  );

  watch(
    () => data.value?.plans,
    (plans) => {
      if (!plans?.length || selectedPlan.value) return;

      // Preselect bằng slug từ query param
      const querySlug = route.query.plan as string | undefined;
      if (querySlug) {
        const matched = plans.find((p) => p.slug === querySlug);
        if (matched) {
          selectedPlan.value = matched;
          return;
        }
      }
      // Fallback: plan còn hàng đầu tiên
      selectedPlan.value =
        plans.find((p) => p.stockCount > 0) ?? plans[0] ?? null;
    },
    { immediate: true }
  );

  // Khi đổi plan → cập nhật ?plan= trong URL (không reload trang)
  watch(selectedPlan, (plan) => {
    if (!plan) return;
    router.replace({
      query: { ...route.query, plan: plan.slug ?? String(plan.id) },
    });
  });

  // SEO setup
  const runtimeConfig = useRuntimeConfig();
  watch(
    () => data.value?.product,
    (product) => {
      if (!product) return;

      const minPrice =
        data.value?.plans?.reduce(
          (min, p) => Math.min(min, p.price || 0),
          Infinity
        ) || 0;

      useSeoHead({
        title: product.name,
        description: product.description || `Mua ${product.name} với giá tốt`,
        image: product.image || undefined,
        type: "product",
        structuredData: {
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          image: product.image || undefined,
          description: product.description || product.name,
          ...(minPrice > 0 && {
            offers: {
              "@type": "Offer",
              price: minPrice,
              priceCurrency: "VND",
              availability:
                (data.value?.plans?.some(
                  (p) => p.stockCount && p.stockCount > 0
                ) ?? false)
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
            },
          }),
        },
      });
    },
    { immediate: true }
  );

  // Favorite
  const { loggedIn } = useUserSession();
  const { refreshWishlistCount, setWishlistCount } = useWishlist();
  const isFavorite = ref(false);
  const wishlistLoading = ref(false);
  const shareOpen = ref(false);

  // Load trạng thái yêu thích khi có product ID
  watch(
    () => data.value?.product?.id,
    async (productId) => {
      if (!productId || !loggedIn.value) return;
      try {
        const res = await $fetch<{ wishlisted: boolean }>(
          `/api/wishlist/${productId}`
        );
        isFavorite.value = res.wishlisted;
      } catch {}
    },
    { immediate: true }
  );

  const toggleWishlist = async () => {
    if (!loggedIn.value) {
      navigateTo("/auth/login");
      return;
    }
    const productId = data.value?.product?.id;
    if (!productId || wishlistLoading.value) return;
    wishlistLoading.value = true;
    try {
      const res = await $fetch<{ wishlisted: boolean; count?: number }>(
        `/api/wishlist/${productId}`,
        { method: isFavorite.value ? "DELETE" : "POST" }
      );
      isFavorite.value = res.wishlisted;
      if (typeof res.count === "number") {
        setWishlistCount(res.count);
      } else {
        await refreshWishlistCount();
      }
    } catch {
    } finally {
      wishlistLoading.value = false;
    }
  };

  const { addItem, items: cartItems, totalItems } = useCart();
  const addCartBtnRef = ref<HTMLElement | null>(null);
  const productImageRef = ref<HTMLElement | null>(null);
  const addingToCart = ref(false);

  // Số lượng plan hiện tại đang có trong giỏ
  const cartQtyForPlan = computed(() => {
    if (!selectedPlan.value) return 0;
    const key = `${data.value?.product?.id}-${selectedPlan.value.id}`;
    return cartItems.find((i) => i.id === key)?.quantity ?? 0;
  });

  // Số lượng còn có thể thêm (null = không giới hạn = plan manual)
  const remainingStock = computed(() => {
    if (!selectedPlan.value) return 0;
    const stockCount = selectedPlan.value.stockCount;
    if (stockCount === null || stockCount === undefined) return null;
    return Math.max(0, stockCount - cartQtyForPlan.value);
  });

  // Flying image element
  let flyEl: HTMLImageElement | null = null;

  function flyToCart() {
    if (!import.meta.client) return;
    const imgEl = productImageRef.value?.querySelector(
      "img"
    ) as HTMLImageElement | null;
    if (!imgEl) return;

    const cartBtn = document.querySelector(
      'a[href="/cart"]'
    ) as HTMLElement | null;
    if (!cartBtn) return;

    const fromRect = imgEl.getBoundingClientRect();
    const toRect = cartBtn.getBoundingClientRect();

    flyEl = document.createElement("img");
    flyEl.src = imgEl.src;
    flyEl.style.cssText = `
      position: fixed;
      z-index: 9999;
      border-radius: 10px;
      width: ${fromRect.width}px;
      height: ${fromRect.height}px;
      left: ${fromRect.left}px;
      top: ${fromRect.top}px;
      object-fit: cover;
      pointer-events: none;
      transition: all 0.7s cubic-bezier(0.25, 1, 0.5, 1);
      opacity: 1;
    `;
    document.body.appendChild(flyEl);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!flyEl) return;
        const size = 36;
        flyEl.style.left = `${toRect.left + toRect.width / 2 - size / 2}px`;
        flyEl.style.top = `${toRect.top + toRect.height / 2 - size / 2}px`;
        flyEl.style.width = `${size}px`;
        flyEl.style.height = `${size}px`;
        flyEl.style.opacity = "0";
        flyEl.style.borderRadius = "50%";
      });
    });

    setTimeout(() => {
      flyEl?.remove();
      flyEl = null;
    }, 750);
  }

  const toast = useToast();

  function handleAddToCart() {
    if (!selectedPlan.value || !data.value?.product) return;

    const stock = selectedPlan.value.stockCount;
    const isInstant = stock !== null && stock !== undefined;

    if (isInstant && cartQtyForPlan.value >= stock) {
      // Đã đầy kho → chỉ chuyển sang giỏ
      navigateTo("/cart");
      return;
    }

    if (isInstant) {
      const canAdd = stock - cartQtyForPlan.value;
      if (quantity.value > canAdd) {
        toast.error(
          "Không đủ hàng",
          `Bạn chỉ có thể thêm tối đa ${canAdd} sản phẩm nữa (kho còn ${stock})`
        );
        return;
      }
    }

    flyToCart();
    addItem(
      {
        productId: data.value.product.id,
        planId: selectedPlan.value.id,
        productName: data.value.product.name,
        planName: selectedPlan.value.name,
        image: data.value.product.image,
        price: getPlanEffectivePrice(selectedPlan.value),
        originalPrice: selectedPlan.value.price,
        saleEndAt: selectedPlan.value.saleEndAt ?? undefined,
        fields: { ...fieldValues.value },
      },
      quantity.value
    );
    addingToCart.value = true;
    setTimeout(() => {
      addingToCart.value = false;
    }, 1800);
  }

  function handleBuyNow() {
    if (!selectedPlan.value || !data.value?.product) return;

    const stock = selectedPlan.value.stockCount;
    const isInstant = stock !== null && stock !== undefined;

    if (isInstant && cartQtyForPlan.value >= stock) {
      // Đã đầy kho → chỉ chuyển sang giỏ
      navigateTo("/cart");
      return;
    }

    if (isInstant) {
      const canAdd = stock - cartQtyForPlan.value;
      if (quantity.value > canAdd) {
        toast.error(
          "Không đủ hàng",
          `Bạn chỉ có thể thêm tối đa ${canAdd} sản phẩm nữa (kho còn ${stock})`
        );
        return;
      }
    }

    flyToCart();
    addItem(
      {
        productId: data.value.product.id,
        planId: selectedPlan.value.id,
        productName: data.value.product.name,
        planName: selectedPlan.value.name,
        image: data.value.product.image,
        price: getPlanEffectivePrice(selectedPlan.value),
        originalPrice: selectedPlan.value.price,
        saleEndAt: selectedPlan.value.saleEndAt ?? undefined,
        fields: { ...fieldValues.value },
      },
      quantity.value
    );
    navigateTo("/cart");
  }

  // Description collapse
  const descOpen = ref(true);

  const sanitizeProductHtml = (value?: string | null) => {
    const input = String(value || "");

    // Strip script/style blocks and inline event handlers to reduce XSS risk.
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      .replace(/javascript:/gi, "");
  };

  const productDescriptionHtml = computed(() =>
    sanitizeProductHtml(data.value?.product?.description)
  );

  // Reviews
  interface Review {
    id: number;
    author: string;
    rating: number;
    comment: string;
    date: string;
  }
  const reviews = ref<Review[]>([]);

  const avgRating = computed(() => {
    if (!reviews.value.length) return 0;
    return (
      reviews.value.reduce((s, r) => s + r.rating, 0) / reviews.value.length
    );
  });

  const starCount = (star: number) =>
    reviews.value.filter((r) => r.rating === star).length;

  const newRating = ref(0);
  const newComment = ref("");

  const submitReview = () => {
    if (!newRating.value || !newComment.value.trim()) return;
    reviews.value.unshift({
      id: Date.now(),
      author: "Bạn",
      rating: newRating.value,
      comment: newComment.value.trim(),
      date: new Date().toLocaleDateString("vi-VN"),
    });
    newRating.value = 0;
    newComment.value = "";
  };

  // Similar Products
  const similarProducts = ref<any[]>([]);

  watch(
    () => data.value?.category?.id,
    async (categoryId) => {
      if (!categoryId) return;
      try {
        const response = await $fetch<{ category: any; products: any[] }>(
          `/api/categories/${categoryId}`
        );
        similarProducts.value = (response?.products || [])
          .filter((p: any) => p.id !== data.value?.product?.id)
          .slice(0, 8);
      } catch (err) {
        console.error("Failed to load similar products:", err);
      }
    },
    { immediate: true }
  );
</script>
