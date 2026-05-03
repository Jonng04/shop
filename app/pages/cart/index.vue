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
        <span
          class="text-slate-800 dark:text-slate-200 font-medium flex items-center gap-1.5"
        >
          <Icon
            name="solar:cart-large-2-bold-duotone"
            size="15"
            class="text-slate-400"
          />
          Giỏ hàng
        </span>
      </div>

      <!-- Page header -->
      <div
        class="relative bg-white dark:bg-[#181a1f] border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-5 mb-6 overflow-hidden"
      >
        <!-- bg decoration -->
        <div class="absolute inset-0 pointer-events-none">
          <div
            class="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-primary/5 dark:bg-primary/10"
          />
          <div
            class="absolute -bottom-6 right-20 w-24 h-24 rounded-full bg-primary/5 dark:bg-primary/10"
          />
        </div>
        <div class="relative flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0"
            >
              <Icon
                name="solar:cart-large-2-bold-duotone"
                size="24"
                class="text-primary"
              />
            </div>
            <div>
              <h1
                class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight"
              >
                Giỏ hàng
              </h1>
              <p class="text-[13px] text-slate-400 mt-0.5">
                <span class="font-semibold text-primary">{{
                  cartItems.length
                }}</span>
                sản phẩm đang chờ thanh toán
              </p>
            </div>
          </div>
          <UiButton
            v-if="mounted && cartItems.length > 0 && currentStep === 0"
            variant="ghost"
            size="sm"
            @click="clearCart"
            class="!text-rose-500 hover:!bg-rose-50 dark:hover:!bg-rose-900/20 hidden sm:flex shrink-0"
          >
            <template #prefix
              ><Icon name="solar:trash-bin-trash-linear" size="15"
            /></template>
            Xóa tất cả
          </UiButton>
        </div>
      </div>

      <!-- Steps timeline -->
      <div
        class="bg-white dark:bg-[#181a1f] border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 mb-6 select-none"
      >
        <div class="flex items-center justify-center">
          <template v-for="(step, i) in checkoutSteps" :key="step.key">
            <div class="flex flex-col items-center gap-1.5">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300"
                :class="
                  i < currentStep
                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30'
                    : i === currentStep
                      ? 'bg-white dark:bg-[#181a1f] border-primary text-primary ring-4 ring-primary/10'
                      : 'bg-slate-50 dark:bg-[#20232a] border-slate-200 dark:border-slate-700 text-slate-400'
                "
              >
                <Icon
                  v-if="i < currentStep"
                  name="solar:check-circle-bold"
                  size="18"
                />
                <Icon v-else :name="step.icon" size="16" />
              </div>
              <span
                class="text-[11px] font-bold whitespace-nowrap tracking-wide uppercase"
                :class="
                  i === currentStep
                    ? 'text-primary'
                    : i < currentStep
                      ? 'text-slate-500 dark:text-slate-400'
                      : 'text-slate-300 dark:text-slate-600'
                "
                >{{ step.label }}</span
              >
            </div>
            <div
              v-if="i < checkoutSteps.length - 1"
              class="flex-1 max-w-24 h-[2px] mb-5 mx-3 rounded-full transition-all duration-500"
              :class="
                i < currentStep
                  ? 'bg-primary'
                  : 'bg-slate-200 dark:bg-slate-700'
              "
            />
          </template>
        </div>
      </div>

      <!-- ───── SKELETON ───── -->
      <div
        v-if="!mounted"
        class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 animate-pulse"
      >
        <!-- Left skeleton -->
        <div class="lg:col-span-8 space-y-3">
          <div
            v-for="i in 3"
            :key="i"
            class="flex gap-4 bg-white dark:bg-[#181a1f] border border-slate-200 dark:border-slate-800 rounded-2xl p-4"
          >
            <!-- Image skeleton: giống thực tế có border + padding + img tự nhiên -->
            <div
              class="w-28 sm:w-52 shrink-0 self-start rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#20232a] p-[6px]"
            >
              <div
                class="w-full aspect-[16/9] rounded-lg bg-slate-200 dark:bg-slate-700"
              />
            </div>
            <div class="flex-1 flex flex-col gap-3 py-1">
              <div
                class="h-5 w-2/3 rounded-lg bg-slate-200 dark:bg-slate-700"
              />
              <div
                class="h-3 w-1/3 rounded-lg bg-slate-200 dark:bg-slate-700"
              />
              <div class="h-px bg-slate-100 dark:bg-slate-800 mt-1" />
              <div class="flex items-center justify-between mt-1">
                <div
                  class="h-5 w-24 rounded-lg bg-slate-200 dark:bg-slate-700"
                />
                <div
                  class="h-8 w-28 rounded-lg bg-slate-200 dark:bg-slate-700"
                />
              </div>
            </div>
          </div>
        </div>
        <!-- Right skeleton -->
        <div class="lg:col-span-4">
          <div
            class="bg-white dark:bg-[#181a1f] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4"
          >
            <div class="flex items-center gap-3 mb-1">
              <div class="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700" />
              <div class="h-4 w-32 rounded-lg bg-slate-200 dark:bg-slate-700" />
            </div>
            <div class="h-9 rounded-xl bg-slate-200 dark:bg-slate-700" />
            <div
              class="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800"
            >
              <div class="flex justify-between">
                <div class="h-3 w-28 rounded bg-slate-200 dark:bg-slate-700" />
                <div class="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
              <div class="flex justify-between">
                <div class="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700" />
                <div class="h-3 w-10 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
            <div class="flex justify-between items-center">
              <div class="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
              <div class="h-7 w-28 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
            <div class="h-11 rounded-xl bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <!-- ───── STEP 0: Giỏ hàng ───── -->
        <template v-if="currentStep === 0">
          <!-- Cart Items List (Left Column) -->
          <div class="lg:col-span-8 space-y-3">
            <template v-if="cartItems.length > 0">
              <!-- Each Item Cart -->
              <div
                v-for="item in cartItems"
                :key="item.id"
                class="flex gap-4 bg-white dark:bg-[#181a1f] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 relative group hover:border-primary/30 hover:shadow-md transition-all"
              >
                <!-- Image -->
                <div
                  class="w-28 sm:w-52 shrink-0 self-start rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#20232a] p-[6px]"
                >
                  <img
                    v-if="item.image"
                    :src="item.image"
                    class="w-full rounded-lg"
                  />
                  <div
                    v-else
                    class="w-full aspect-[4/3] rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                  >
                    <Icon
                      name="solar:box-bold-duotone"
                      size="32"
                      class="text-slate-300 dark:text-slate-600"
                    />
                  </div>
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0 flex flex-col gap-2 py-1">
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex flex-col min-w-0">
                      <NuxtLink
                        to="/"
                        class="text-[15px] sm:text-[17px] font-bold text-slate-800 dark:text-white hover:text-primary transition-colors leading-snug line-clamp-2"
                        >{{ item.productName }}</NuxtLink
                      >
                      <span
                        class="text-[11px] font-semibold text-slate-400 mt-1 truncate"
                      >
                        {{ item.planName }}
                      </span>
                    </div>
                    <button
                      @click="removeItem(item.id)"
                      class="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Icon name="solar:trash-bin-trash-linear" size="16" />
                    </button>
                  </div>
                  <div
                    class="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800"
                  >
                    <div
                      class="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#20232a] overflow-hidden h-9"
                    >
                      <button
                        @click="decreaseQty(item)"
                        class="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Icon
                          name="solar:minus-circle-line-duotone"
                          size="15"
                        />
                      </button>
                      <input
                        type="number"
                        v-model="item.quantity"
                        class="w-10 h-full bg-transparent text-center text-sm font-bold text-slate-800 dark:text-white outline-none appearance-none border-x border-slate-200 dark:border-slate-700"
                      />
                      <button
                        @click="increaseQty(item)"
                        :disabled="stockCheckingId === item.id"
                        class="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Icon
                          v-if="stockCheckingId === item.id"
                          name="solar:refresh-circle-line-duotone"
                          size="15"
                          class="animate-spin"
                        />
                        <Icon
                          v-else
                          name="solar:add-circle-line-duotone"
                          size="15"
                        />
                      </button>
                    </div>
                    <div class="flex flex-col items-end gap-0.5">
                      <!-- Flash sale còn hiệu lực → giá sale đỏ + gạch gốc -->
                      <template
                        v-if="
                          item.saleEndAt &&
                          isSaleStillActive(item.saleEndAt) &&
                          item.originalPrice &&
                          item.price < item.originalPrice
                        "
                      >
                        <span
                          class="font-bold text-[17px] text-rose-500 leading-none"
                        >
                          {{ (item.price * item.quantity).toLocaleString() }}đ
                        </span>
                        <span
                          class="font-mono text-[11px] text-slate-400 line-through"
                        >
                          {{
                            (
                              item.originalPrice * item.quantity
                            ).toLocaleString()
                          }}đ
                        </span>
                      </template>
                      <!-- Flash sale hết hạn hoặc không có → giá gốc bình thường -->
                      <template v-else>
                        <span
                          class="font-bold text-[17px] text-primary leading-none"
                        >
                          {{
                            (
                              (item.originalPrice ?? item.price) * item.quantity
                            ).toLocaleString()
                          }}đ
                        </span>
                        <span
                          v-if="
                            item.saleEndAt &&
                            item.originalPrice &&
                            item.price < item.originalPrice
                          "
                          class="text-[10px] text-rose-400 flex items-center gap-0.5"
                        >
                          <Icon name="solar:clock-circle-linear" size="11" />
                          Flash Sale đã kết thúc
                        </span>
                      </template>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <!-- Empty state -->
            <div
              v-else
              class="bg-white dark:bg-[#181a1f] border border-slate-200 dark:border-slate-800 rounded-2xl p-16 flex flex-col items-center text-center"
            >
              <div
                class="w-24 h-24 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-[#20232a] dark:to-[#181a1f] border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-5"
              >
                <Icon
                  name="solar:cart-large-4-linear"
                  size="44"
                  class="text-slate-300 dark:text-slate-600"
                />
              </div>
              <h3
                class="text-[17px] font-bold text-slate-800 dark:text-white mb-2"
              >
                Giỏ hàng trống
              </h3>
              <p
                class="text-slate-400 text-[13px] max-w-xs mb-6 leading-relaxed"
              >
                Bạn chưa có sản phẩm nào. Hãy khám phá cửa hàng nhé!
              </p>
              <UiButton
                size="md"
                @click="$router.push('/')"
                class="!rounded-xl"
              >
                <template #prefix
                  ><Icon name="solar:shop-2-bold-duotone" size="18"
                /></template>
                Mua sắm ngay
              </UiButton>
            </div>
          </div>

          <!-- Order Summary -->
          <div class="lg:col-span-4">
            <div
              class="bg-white dark:bg-[#181a1f] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden sticky top-[90px]"
            >
              <!-- Header -->
              <div
                class="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800"
              >
                <div
                  class="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"
                >
                  <Icon
                    name="solar:bill-list-bold-duotone"
                    size="16"
                    class="text-primary"
                  />
                </div>
                <p class="font-bold text-slate-800 dark:text-white text-[14px]">
                  Tóm tắt đơn hàng
                </p>
              </div>

              <div class="p-5 space-y-4">
                <!-- Promo -->
                <div class="flex gap-2">
                  <div class="flex-1">
                    <UiInput
                      v-model="couponCode"
                      placeholder="Mã giảm giá"
                      class="h-9 bg-slate-50 dark:bg-[#20232a] text-[13px] uppercase font-medium border-slate-200 dark:border-slate-700"
                      @keydown.enter.prevent="applyCoupon()"
                    >
                      <template #left-icon
                        ><Icon name="solar:ticket-sale-linear" size="15"
                      /></template>
                    </UiInput>
                  </div>
                  <UiButton
                    variant="outline"
                    class="!h-9 !px-4 !rounded-xl whitespace-nowrap text-[13px]"
                    :loading="couponLoading"
                    @click="applyCoupon()"
                    >Áp dụng</UiButton
                  >
                </div>

                <div
                  v-if="appliedCoupon"
                  class="flex items-center justify-between rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-900/10 px-3 py-2 text-[12px]"
                >
                  <div class="min-w-0">
                    <p
                      class="font-semibold text-emerald-700 dark:text-emerald-300"
                    >
                      {{ appliedCoupon.code }}
                    </p>
                    <p class="text-emerald-600/80 dark:text-emerald-400/80">
                      Giảm {{ appliedCoupon.discountAmount.toLocaleString() }}đ
                    </p>
                  </div>
                  <button
                    class="shrink-0 text-slate-400 hover:text-rose-500 transition-colors"
                    @click="clearCoupon"
                  >
                    <Icon name="solar:close-circle-linear" size="16" />
                  </button>
                </div>

                <!-- Rows -->
                <div
                  class="space-y-2.5 text-[13px] pb-4 border-b border-slate-100 dark:border-slate-800"
                >
                  <div
                    class="flex justify-between text-slate-500 dark:text-slate-400"
                  >
                    <span>Tạm tính</span>
                    <span
                      class="font-semibold text-slate-700 dark:text-slate-200"
                      >{{ effectiveSubtotal.toLocaleString() }}đ</span
                    >
                  </div>
                  <div
                    class="flex justify-between text-emerald-600 dark:text-emerald-400"
                  >
                    <span>Giảm giá</span>
                    <span class="font-semibold"
                      >-{{ discountAmount.toLocaleString() }}đ</span
                    >
                  </div>
                </div>

                <!-- Total -->
                <div
                  class="flex justify-between items-center bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl px-4 py-3"
                >
                  <span
                    class="text-[13px] font-bold text-slate-700 dark:text-slate-200"
                    >Tổng cộng</span
                  >
                  <span class="text-xl font-bold text-primary"
                    >{{ finalTotal.toLocaleString() }}đ</span
                  >
                </div>

                <!-- CTA -->
                <UiButton
                  size="md"
                  :disabled="cartEmpty"
                  class="w-full !h-11 !rounded-xl group hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50"
                  @click="currentStep = 1"
                >
                  <template #prefix>
                    <Icon
                      name="solar:shield-check-bold"
                      size="17"
                      class="group-hover:scale-110 transition-transform"
                    />
                  </template>
                  Tiếp tục thanh toán
                </UiButton>
              </div>
            </div>
          </div>
        </template>

        <!-- ───── STEP 1: Xác nhận ───── -->
        <template v-else-if="currentStep === 1">
          <!-- Cột trái: Sản phẩm đặt mua -->
          <div class="lg:col-span-8">
            <div
              class="bg-white dark:bg-[#181a1f] border border-slate-200 dark:border-slate-800 rounded-2xl p-5"
            >
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                  <Icon
                    name="solar:bag-bold-duotone"
                    size="18"
                    class="text-primary"
                  />
                  <p
                    class="text-[13px] font-bold text-slate-800 dark:text-white"
                  >
                    Sản phẩm đặt mua
                  </p>
                </div>
                <span
                  class="text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-full"
                  >{{ cartItems.length }} sản phẩm</span
                >
              </div>
              <div class="space-y-3">
                <div
                  v-for="item in cartItems"
                  :key="item.id"
                  class="flex items-center gap-3 bg-slate-50 dark:bg-[#20232a] rounded-xl px-4 py-3"
                >
                  <!-- Image wrapper giống style product card -->
                  <div
                    class="w-36 shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#20232a] p-[4px]"
                  >
                    <img
                      v-if="item.image"
                      :src="item.image"
                      class="w-full rounded-lg"
                    />
                    <div
                      v-else
                      class="w-full aspect-square rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                    >
                      <Icon
                        name="solar:box-bold-duotone"
                        size="20"
                        class="text-slate-300 dark:text-slate-600"
                      />
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p
                      class="text-[13px] font-bold text-slate-800 dark:text-white truncate"
                    >
                      {{ item.productName }}
                    </p>
                    <p
                      class="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5"
                    >
                      <Icon name="solar:tag-linear" size="11" />
                      {{ item.planName }}
                    </p>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="text-[13px] font-bold text-primary">
                      {{ (item.price * item.quantity).toLocaleString() }}đ
                    </p>
                    <p class="text-[11px] text-slate-400">
                      x{{ item.quantity }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Cột phải: Phương thức + Tóm tắt -->
          <div class="lg:col-span-4 space-y-4">
            <!-- Phương thức thanh toán -->
            <div
              class="bg-white dark:bg-[#181a1f] border border-slate-200 dark:border-slate-800 rounded-2xl p-5"
            >
              <div class="flex items-center gap-2 mb-4">
                <Icon
                  name="solar:card-bold-duotone"
                  size="18"
                  class="text-primary"
                />
                <p class="text-[13px] font-bold text-slate-800 dark:text-white">
                  Phương thức thanh toán
                </p>
              </div>
              <!-- Balance card -->
              <div
                class="flex items-center gap-3 rounded-xl border-2 px-4 py-3"
                :class="
                  userBalance >= finalTotal
                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/20'
                "
              >
                <div
                  class="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"
                >
                  <Icon
                    name="solar:wallet-bold-duotone"
                    size="18"
                    class="text-primary"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <p
                    class="text-[13px] font-bold text-slate-800 dark:text-white leading-tight"
                  >
                    Số dư tài khoản
                  </p>
                  <p
                    v-if="balanceLoading"
                    class="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700 animate-pulse mt-1"
                  />
                  <p
                    v-else
                    class="text-[12px] font-semibold text-primary mt-0.5"
                  >
                    {{ userBalance.toLocaleString() }}đ
                  </p>
                </div>
                <Icon
                  v-if="userBalance >= finalTotal"
                  name="solar:check-circle-bold"
                  size="20"
                  class="text-emerald-500 shrink-0"
                />
                <Icon
                  v-else
                  name="solar:close-circle-bold"
                  size="20"
                  class="text-rose-500 shrink-0"
                />
              </div>
              <!-- Không đủ tiền warning -->
              <p
                v-if="!balanceLoading && userBalance < finalTotal"
                class="text-[12px] text-rose-500 mt-2 flex items-center gap-1"
              >
                <Icon name="solar:info-circle-linear" size="14" />
                Cần thêm {{ (finalTotal - userBalance).toLocaleString() }}đ để
                thanh toán
              </p>
            </div>

            <!-- Tóm tắt đơn hàng -->
            <div
              class="bg-white dark:bg-[#181a1f] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sticky top-[90px]"
            >
              <div class="flex items-center gap-2 mb-4">
                <Icon
                  name="solar:bill-list-bold-duotone"
                  size="18"
                  class="text-primary"
                />
                <p class="text-[13px] font-bold text-slate-800 dark:text-white">
                  Tóm tắt đơn hàng
                </p>
              </div>

              <div
                class="space-y-2 text-[13px] text-slate-500 dark:text-slate-400 mb-4"
              >
                <div class="flex justify-between">
                  <span>Tạm tính</span>
                  <span class="font-semibold text-slate-700 dark:text-slate-200"
                    >{{ effectiveSubtotal.toLocaleString() }}đ</span
                  >
                </div>
                <div
                  class="flex justify-between text-emerald-600 dark:text-emerald-400"
                >
                  <span>Giảm giá</span>
                  <span class="font-semibold"
                    >-{{ discountAmount.toLocaleString() }}đ</span
                  >
                </div>
              </div>

              <div
                class="flex justify-between items-center bg-slate-50 dark:bg-[#20232a] rounded-xl px-4 py-3 mb-4"
              >
                <span
                  class="text-[13px] font-bold text-slate-700 dark:text-slate-200"
                  >Tổng cộng</span
                >
                <span class="text-xl font-bold text-primary"
                  >{{ finalTotal.toLocaleString() }}đ</span
                >
              </div>

              <div class="flex gap-2">
                <UiButton
                  variant="outline"
                  class="!h-10 !px-4 !rounded-xl text-[13px]"
                  @click="currentStep = 0"
                >
                  <template #prefix
                    ><Icon name="solar:arrow-left-linear" size="15"
                  /></template>
                  Quay lại
                </UiButton>
                <UiButton
                  size="md"
                  :loading="placing"
                  :disabled="!canCheckout || placing"
                  class="flex-1 !h-10 !rounded-xl group hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50"
                  @click="placeOrder"
                >
                  <template #prefix>
                    <Icon
                      name="solar:shield-check-bold"
                      size="16"
                      class="group-hover:scale-110 transition-transform"
                    />
                  </template>
                  Xác nhận thanh toán
                </UiButton>
              </div>
            </div>
          </div>
        </template>

        <!-- ───── STEP 2: Hoàn tất ───── -->
        <template v-else-if="currentStep === 2">
          <div class="lg:col-span-12">
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div class="space-y-6">
                <div
                  class="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm dark:border-slate-800 dark:bg-[#181a1f]"
                >
                  <div class="mb-6 flex items-center gap-4">
                    <div
                      class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                    >
                      <Icon name="solar:check-circle-bold" size="26" />
                    </div>
                    <p
                      class="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:border-emerald-900/30 dark:bg-emerald-900/10 dark:text-emerald-400"
                    >
                      <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
                      Đã thanh toán
                    </p>
                  </div>
                  <h2
                    class="text-[28px] font-bold leading-tight text-slate-900 dark:text-white"
                  >
                    Đơn hàng đã hoàn tất
                  </h2>
                  <p class="mt-3 max-w-xl text-[14px] leading-6 text-slate-500">
                    Giao dịch của bạn đã được ghi nhận thành công. Bạn có thể
                    xem lại thông tin đơn hàng và tóm tắt thanh toán ngay bên
                    dưới.
                  </p>

                  <div class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div
                      class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-[#20232a]"
                    >
                      <p
                        class="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                      >
                        Mã đơn hàng
                      </p>
                      <p
                        class="mt-1 font-mono text-[13px] font-bold text-slate-800 dark:text-white"
                      >
                        {{ orderResult?.orderCode }}
                      </p>
                    </div>
                    <div
                      class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-[#20232a]"
                    >
                      <p
                        class="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                      >
                        Đã thanh toán
                      </p>
                      <p
                        class="mt-1 text-[15px] font-bold text-slate-900 dark:text-white"
                      >
                        {{ orderResult?.totalAmount.toLocaleString() }} VND
                      </p>
                    </div>
                    <div
                      class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-[#20232a]"
                    >
                      <p
                        class="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                      >
                        Số dư còn lại
                      </p>
                      <p
                        class="mt-1 text-[15px] font-bold text-emerald-600 dark:text-emerald-400"
                      >
                        {{ orderResult?.balanceAfter.toLocaleString() }} VND
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#181a1f]"
                >
                  <div
                    class="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800"
                  >
                    <div>
                      <p
                        class="text-[14px] font-bold text-slate-800 dark:text-white"
                      >
                        Sản phẩm đã mua
                      </p>
                      <p class="mt-1 text-[11px] text-slate-400">
                        {{ orderResult?.items.length || 0 }} sản phẩm
                      </p>
                    </div>
                    <span
                      class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                    >
                      Hoàn tất
                    </span>
                  </div>

                  <div class="divide-y divide-slate-100 dark:divide-slate-800">
                    <div
                      v-for="item in orderResult?.items"
                      :key="item.id"
                      class="flex items-center gap-4 px-5 py-4"
                    >
                      <div
                        class="w-24 shrink-0 rounded-xl border border-slate-200 bg-white p-[4px] dark:border-slate-700 dark:bg-[#20232a]"
                      >
                        <img
                          v-if="item.image"
                          :src="item.image"
                          class="w-full rounded-lg"
                        />
                        <div
                          v-else
                          class="flex aspect-square w-full items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800"
                        >
                          <Icon
                            name="solar:box-bold-duotone"
                            size="18"
                            class="text-slate-300 dark:text-slate-600"
                          />
                        </div>
                      </div>
                      <div class="min-w-0 flex-1">
                        <p
                          class="truncate text-[14px] font-bold text-slate-800 dark:text-white"
                        >
                          {{ item.productName }}
                        </p>
                        <p class="mt-1 text-[11px] text-slate-400">
                          {{ item.planName }}
                        </p>
                      </div>
                      <div class="shrink-0 text-right">
                        <p class="text-[12px] font-semibold text-slate-400">
                          SL {{ item.quantity }}
                        </p>
                        <p
                          class="mt-1 text-[14px] font-bold text-slate-800 dark:text-white"
                        >
                          {{ (item.price * item.quantity).toLocaleString() }}
                          VND
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-6">
                <div
                  class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#181a1f]"
                >
                  <div class="mb-4">
                    <p
                      class="text-[14px] font-bold text-slate-800 dark:text-white"
                    >
                      Tóm tắt thanh toán
                    </p>
                    <p class="mt-1 text-[11px] text-slate-400">
                      Chi tiết giá trị đơn hàng sau khi chốt
                    </p>
                  </div>

                  <div class="space-y-3">
                    <div class="flex items-center justify-between text-[13px]">
                      <span class="text-slate-500">Tạm tính</span>
                      <span
                        class="font-semibold text-slate-800 dark:text-white"
                      >
                        {{ orderResult?.subtotalAmount.toLocaleString() }} VND
                      </span>
                    </div>
                    <div class="flex items-center justify-between text-[13px]">
                      <span class="text-slate-500">Giảm giá</span>
                      <span
                        class="font-semibold text-emerald-600 dark:text-emerald-400"
                      >
                        -{{ orderResult?.discountAmount.toLocaleString() }} VND
                      </span>
                    </div>
                    <div
                      v-if="orderResult?.couponCode"
                      class="flex items-center justify-between text-[13px]"
                    >
                      <span class="text-slate-500">Mã giảm giá</span>
                      <span
                        class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {{ orderResult?.couponCode }}
                      </span>
                    </div>
                  </div>

                  <div class="my-4 h-px bg-slate-100 dark:bg-slate-800"></div>

                  <div class="flex items-end justify-between gap-3">
                    <div>
                      <p
                        class="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                      >
                        Tổng cộng
                      </p>
                      <p
                        class="mt-1 text-[26px] font-bold text-slate-900 dark:text-white"
                      >
                        {{ orderResult?.totalAmount.toLocaleString() }} VND
                      </p>
                    </div>
                    <div class="text-right">
                      <p
                        class="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                      >
                        Còn lại
                      </p>
                      <p class="mt-1 text-[13px] font-bold text-primary">
                        {{ orderResult?.balanceAfter.toLocaleString() }} VND
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#181a1f]"
                >
                  <p
                    class="text-[14px] font-bold text-slate-800 dark:text-white"
                  >
                    Thao tác tiếp theo
                  </p>
                  <p class="mt-1 text-[11px] text-slate-400">
                    Bạn có thể tiếp tục mua sắm hoặc liên hệ hỗ trợ nếu cần
                  </p>

                  <div class="mt-4 flex flex-col gap-3">
                    <UiButton
                      variant="outline"
                      class="!h-11 !justify-center !rounded-xl"
                      @click="$router.push('/')"
                    >
                      <template #prefix
                        ><Icon name="solar:home-smile-linear" size="16"
                      /></template>
                      Về trang chủ
                    </UiButton>
                    <UiButton
                      class="!h-11 !justify-center !rounded-xl"
                      @click="$router.push('/support')"
                    >
                      <template #prefix
                        ><Icon name="solar:chat-line-bold-duotone" size="16"
                      /></template>
                      Liên hệ hỗ trợ
                    </UiButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
      <!-- end v-else grid -->
    </main>

    <LayoutFooter />
  </div>
</template>

<script setup lang="ts">
  const { parseServerDate } = useDateFormatter();
  const {
    items: cartItems,
    subtotal,
    removeItem,
    updateQuantity,
    clearCart,
    purgeExpired,
  } = useCart();

  // mounted flag — disable condition chỉ active sau khi client mount xong
  const mounted = ref(false);
  let _purgeInterval: ReturnType<typeof setInterval> | null = null;
  let _saleClockInterval: ReturnType<typeof setInterval> | null = null;
  const nowTimestamp = ref(Date.now());

  onMounted(() => {
    mounted.value = true;
    nowTimestamp.value = Date.now();
    // Kiểm tra và dọn items hết TTL mỗi 60 giây khi user đang ở trang cart
    _purgeInterval = setInterval(purgeExpired, 60_000);
    // Đồng hồ realtime để UI tự cập nhật khi flash sale vừa hết hạn
    _saleClockInterval = setInterval(() => {
      nowTimestamp.value = Date.now();
    }, 1000);
  });

  onUnmounted(() => {
    if (_purgeInterval) clearInterval(_purgeInterval);
    if (_saleClockInterval) clearInterval(_saleClockInterval);
  });

  useSeoHead({
    title: "Giỏ hàng ",
    description: "Xem giỏ hàng của bạn và tiến hành thanh toán",
  });

  const cartEmpty = computed(() => mounted.value && cartItems.length === 0);

  // Cache stock count theo planId: null = không giới hạn (manual/link), number = kho instant
  const stockCounts = reactive<Record<number, number | null>>({});
  const stockCheckingId = ref<string | null>(null);

  async function fetchStockCount(planId: number): Promise<number | null> {
    if (planId in stockCounts) return stockCounts[planId] ?? null;
    const res = await $fetch<{
      deliveryType: string;
      stockCount: number | null;
    }>(`/api/plans/stock-count?planId=${planId}`);
    stockCounts[planId] = res.stockCount;
    return res.stockCount;
  }

  const increaseQty = async (item: any) => {
    if (stockCheckingId.value === item.id) return;
    stockCheckingId.value = item.id;
    try {
      const maxQty = await fetchStockCount(item.planId);
      const newQty = item.quantity + 1;
      if (maxQty !== null && newQty > maxQty) {
        toast.error(
          "Không đủ hàng",
          maxQty === 0
            ? `Gói "${item.planName}" đã hết hàng`
            : `Gói "${item.planName}" chỉ còn ${maxQty} sản phẩm trong kho`
        );
        return;
      }
      updateQuantity(item.id, newQty);
    } catch (err: any) {
      toast.error(
        "Không thể kiểm tra tồn kho",
        err?.data?.message || "Vui lòng thử lại sau"
      );
    } finally {
      stockCheckingId.value = null;
    }
  };

  const decreaseQty = (item: any) => updateQuantity(item.id, item.quantity - 1);

  const currentStep = ref(0);

  const checkoutSteps = [
    { key: "cart", label: "Giỏ hàng", icon: "solar:cart-large-2-bold-duotone" },
    {
      key: "confirm",
      label: "Xác nhận",
      icon: "solar:shield-check-bold-duotone",
    },
    {
      key: "complete",
      label: "Hoàn tất",
      icon: "solar:check-circle-bold-duotone",
    },
  ];

  const deliveryEmail = ref("");
  const orderNote = ref("");
  const {
    balance: userBalance,
    isLoading: balanceLoading,
    fetchBalance,
    setBalance,
  } = useUserBalance();
  const couponCode = ref("");
  const couponLoading = ref(false);
  const appliedCoupon = ref<{
    code: string;
    discountAmount: number;
    totalAfter: number;
  } | null>(null);

  onMounted(async () => {
    await fetchBalance();
  });

  const discountAmount = computed(
    () => appliedCoupon.value?.discountAmount ?? 0
  );

  const isSaleStillActive = (saleEndAt?: string | null) => {
    const saleEndDate = parseServerDate(saleEndAt);
    if (!saleEndDate) return false;
    return saleEndDate.getTime() > nowTimestamp.value;
  };

  // Giá thực tế của từng item: nếu flash sale đã kết thúc thì dùng originalPrice
  function getEffectivePrice(item: (typeof cartItems)[0]): number {
    if (
      item.saleEndAt &&
      !isSaleStillActive(item.saleEndAt) &&
      item.originalPrice
    ) {
      return item.originalPrice;
    }
    return item.price;
  }

  // Tổng tiền thực tế (tính theo giá hiện tại, không dùng giá lưu trong localStorage)
  const effectiveSubtotal = computed(() =>
    cartItems.reduce((s, i) => s + getEffectivePrice(i) * i.quantity, 0)
  );

  const finalTotal = computed(() =>
    Math.max(0, effectiveSubtotal.value - discountAmount.value)
  );

  watch(
    () => cartItems.map((item) => `${item.id}:${item.quantity}`).join("|"),
    async () => {
      if (!mounted.value) return;
      if (!cartItems.length) {
        appliedCoupon.value = null;
        return;
      }
      if (!couponCode.value.trim()) {
        appliedCoupon.value = null;
        return;
      }
      await applyCoupon(true);
    }
  );

  // Re-apply coupon when flash sale status flips (e.g. vừa hết hạn) without user interaction.
  watch(
    () =>
      cartItems
        .map((item) => `${item.id}:${isSaleStillActive(item.saleEndAt)}`)
        .join("|"),
    async (next, prev) => {
      if (!mounted.value || next === prev) return;
      if (!cartItems.length || !couponCode.value.trim()) return;
      await applyCoupon(true);
    }
  );

  const canCheckout = computed(
    () =>
      !balanceLoading.value &&
      cartItems.length > 0 &&
      userBalance.value >= finalTotal.value
  );

  const placing = ref(false);
  const orderResult = ref<{
    orderCode: string;
    balanceAfter: number;
    fullyDelivered: boolean;
    items: typeof cartItems;
    subtotalAmount: number;
    discountAmount: number;
    totalAmount: number;
    couponCode: string | null;
  } | null>(null);
  const toast = useToast();

  async function applyCoupon(silent = false) {
    if (!cartItems.length) {
      appliedCoupon.value = null;
      return;
    }

    const code = couponCode.value.trim().toUpperCase();
    couponCode.value = code;

    if (!code) {
      appliedCoupon.value = null;
      return;
    }

    couponLoading.value = true;
    try {
      const requestItems = cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: getEffectivePrice(item),
      }));

      const result = await $fetch<{
        code: string;
        discountAmount: number;
        totalAfter: number;
      }>(`/api/coupons/${code}`, {
        method: "POST",
        body: {
          items: requestItems,
        },
      });
      appliedCoupon.value = result;
      if (!silent) {
        toast.success(
          "Áp mã thành công",
          `Đã giảm ${result.discountAmount.toLocaleString()}đ`
        );
      }
    } catch (err: any) {
      appliedCoupon.value = null;
      if (!silent) {
        const msg =
          err?.data?.message || err?.message || "Không thể áp dụng mã giảm giá";
        toast.error("Áp mã thất bại", msg);
      }
    } finally {
      couponLoading.value = false;
    }
  }

  function clearCoupon() {
    couponCode.value = "";
    appliedCoupon.value = null;
  }

  async function placeOrder() {
    if (!canCheckout.value || placing.value) return;
    placing.value = true;
    try {
      const snapshot = cartItems.map((i) => ({ ...i }));
      const result = await $fetch<{
        success: boolean;
        orderCode: string;
        orderId: number;
        subtotalAmount: number;
        discountAmount: number;
        totalAmount: number;
        couponCode: string | null;
        balanceAfter: number;
        fullyDelivered: boolean;
      }>("/api/orders", {
        method: "POST",
        body: {
          couponCode:
            appliedCoupon.value?.code || couponCode.value.trim() || undefined,
          items: snapshot.map((i) => ({
            productId: i.productId,
            planId: i.planId,
            productName: i.productName,
            planName: i.planName,
            price: getEffectivePrice(i),
            quantity: i.quantity,
          })),
        },
      });
      orderResult.value = {
        orderCode: result.orderCode,
        balanceAfter: result.balanceAfter,
        fullyDelivered: result.fullyDelivered,
        items: snapshot as any,
        subtotalAmount: result.subtotalAmount,
        discountAmount: result.discountAmount,
        totalAmount: result.totalAmount,
        couponCode: result.couponCode,
      };
      setBalance(result.balanceAfter);
      clearCart();
      clearCoupon();
      currentStep.value = 2;
    } catch (err: any) {
      toast.error(
        "Đặt hàng thất bại",
        err?.data?.message || err?.message || "Vui lòng thử lại"
      );
    } finally {
      placing.value = false;
    }
  }
</script>

<style scoped>
  /* Chrome, Safari, Edge, Opera hide input arrows */
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    appearance: none;
    margin: 0;
  }
  /* Firefox */
  input[type="number"] {
    -moz-appearance: textfield;
    appearance: textfield;
  }
</style>
