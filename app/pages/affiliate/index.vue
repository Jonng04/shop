<template>
  <div class="min-h-screen bg-[#fafafa] font-sans dark:bg-[#0f1115]">
    <LayoutHeader />
    <LayoutNavbar />

    <main class="mx-auto max-w-[1400px] px-4 py-8 pb-20">
      <div class="mb-5 flex items-center gap-2 text-[13px] text-slate-500">
        <NuxtLink
          to="/"
          class="flex items-center gap-1.5 transition-colors hover:text-primary"
        >
          <Icon name="solar:home-smile-linear" size="14" />
          Trang chủ
        </NuxtLink>
        <Icon name="solar:alt-arrow-right-linear" size="12" />
        <span class="font-medium text-slate-700 dark:text-slate-300">
          Affiliate
        </span>
      </div>

      <div
        class="mb-5 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#181a1f]"
      >
        <div
          class="border-b border-slate-100 px-6 pb-4 pt-5 dark:border-slate-800"
        >
          <div class="mb-4 flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10"
              >
                <Icon
                  name="solar:hand-money-bold-duotone"
                  size="18"
                  class="text-primary"
                />
              </div>
              <div>
                <h1
                  class="text-[15px] font-bold leading-tight text-slate-900 dark:text-white"
                >
                  Chương trình Affiliate
                </h1>
                <p class="mt-0.5 text-[11px] text-slate-400">
                  Kiếm
                  <strong class="text-emerald-500">
                    {{ stats.commissionRate }}%
                  </strong>
                  hoa hồng mỗi đơn hàng thành công
                </p>
              </div>
            </div>

            <div class="hidden items-center gap-1.5 sm:flex">
              <button
                @click="shareVia('facebook')"
                class="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-500 transition-all hover:border-[#1877f2]/30 hover:bg-[#1877f2]/5 hover:text-[#1877f2] dark:border-slate-700"
              >
                <Icon name="logos:facebook" size="13" />
                Facebook
              </button>
              <button
                @click="shareVia('zalo')"
                class="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-500 transition-all hover:border-blue-300/30 hover:bg-blue-50/50 hover:text-blue-500 dark:border-slate-700"
              >
                <span
                  class="flex h-3.5 w-3.5 items-center justify-center rounded bg-blue-500 text-[7px] font-black leading-none text-white"
                >
                  Z
                </span>
                Zalo
              </button>
            </div>
          </div>

          <UiAlert type="info" title="Cách hoạt động" class="mb-4">
            Chia sẻ link bên dưới. Khi người dùng mua hàng qua link của bạn, bạn
            sẽ nhận
            <strong>{{ stats.commissionRate }}% hoa hồng</strong> và có thể gửi
            <strong>yêu cầu rút tiền</strong> về tài khoản ngân hàng của mình.
            Cookie có hiệu lực <strong>30 ngày</strong> kể từ lần nhấp cuối
            cùng.
          </UiAlert>

          <div class="flex items-center gap-2">
            <div
              class="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60"
            >
              <Icon
                name="solar:link-bold-duotone"
                size="14"
                class="shrink-0 text-slate-400"
              />
              <p
                class="min-w-0 flex-1 truncate font-mono text-[12px] text-slate-600 dark:text-slate-300"
              >
                {{ affLink }}
              </p>
            </div>
            <button
              @click="copyLink"
              class="shrink-0 rounded-xl px-3.5 py-2.5 text-[12px] font-semibold text-white transition-all active:scale-95"
              :class="
                copied ? 'bg-emerald-500' : 'bg-primary hover:bg-primary/90'
              "
            >
              <span class="flex items-center gap-1.5">
                <Icon
                  :name="
                    copied
                      ? 'solar:check-circle-bold'
                      : 'solar:copy-bold-duotone'
                  "
                  size="15"
                />
                {{ copied ? "Đã chép!" : "Sao chép" }}
              </span>
            </button>
          </div>
        </div>

        <div
          class="grid grid-cols-2 divide-x divide-y divide-slate-100 dark:divide-slate-800 sm:grid-cols-3 lg:grid-cols-6 sm:divide-y-0"
        >
          <div
            v-for="card in statCards"
            :key="card.label"
            class="flex items-center gap-3 px-5 py-3.5"
          >
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
              :class="card.iconBg"
            >
              <Icon :name="card.icon" size="15" :class="card.iconColor" />
            </div>
            <div>
              <p
                class="text-[14px] font-bold leading-none text-slate-900 dark:text-white"
              >
                {{ card.value }}
              </p>
              <p class="mt-0.5 text-[10px] text-slate-400">{{ card.label }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <section
          class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#181a1f] lg:col-span-7"
        >
          <div
            class="border-b border-slate-100 px-6 py-4 dark:border-slate-800"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20"
              >
                <Icon name="solar:card-send-bold-duotone" size="20" />
              </div>
              <div>
                <p class="text-sm font-bold text-slate-900 dark:text-white">
                  Gửi yêu cầu rút tiền
                </p>
                <p class="text-xs text-slate-400">
                  Chọn ngân hàng và nhập đúng thông tin nhận tiền của bạn.
                </p>
              </div>
            </div>
          </div>

          <div class="space-y-5 p-6">
            <UiAlert type="info" title="Lưu ý" class="!mb-0">
              Việc admin duyệt chỉ là xác nhận yêu cầu. Hệ thống chỉ xem là đã
              rút khi request của bạn được xử lý hoàn tất.
            </UiAlert>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Ngân hàng
                </label>
                <UiDropdown
                  v-model="withdrawalForm.bankCode"
                  :options="bankOptions"
                />
              </div>

              <div>
                <label
                  class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Số tiền muốn rút
                </label>
                <UiInput
                  v-model="withdrawalForm.amount"
                  type="number"
                  placeholder="Ví dụ: 100000"
                  class="h-11"
                />
                <p
                  class="mt-1.5 text-[12px] text-slate-500 dark:text-slate-400"
                >
                  Tối thiểu:
                  <span
                    class="font-semibold text-slate-700 dark:text-slate-200"
                  >
                    {{ formatCurrency(withdrawalSummary.minWithdrawalAmount) }}
                  </span>
                </p>
              </div>

              <div>
                <label
                  class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Số tài khoản
                </label>
                <UiInput
                  v-model="withdrawalForm.bankAccountNumber"
                  placeholder="Nhập số tài khoản"
                  class="h-11"
                />
              </div>

              <div>
                <label
                  class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Tên chủ tài khoản
                </label>
                <UiInput
                  v-model="withdrawalForm.bankAccountName"
                  placeholder="Nguyễn Văn A"
                  class="h-11"
                />
              </div>
            </div>

            <div>
              <label
                class="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Ghi chú
              </label>
              <UiTextarea
                v-model="withdrawalForm.note"
                :rows="3"
                placeholder="Ghi chú thêm cho admin (không bắt buộc)"
              />
            </div>

            <div
              class="flex flex-col gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"
            >
              <div class="text-xs text-slate-500 dark:text-slate-400">
                Khả dụng hiện tại:
                <strong class="text-emerald-600">
                  {{ formatCurrency(withdrawalSummary.availableAmount) }}
                </strong>
              </div>

              <button
                type="button"
                class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="creatingWithdrawal"
                @click="submitWithdrawal"
              >
                <Icon
                  :name="
                    creatingWithdrawal
                      ? 'solar:refresh-circle-line-duotone'
                      : 'solar:card-send-bold-duotone'
                  "
                  size="18"
                  :class="creatingWithdrawal ? 'animate-spin' : ''"
                />
                {{ creatingWithdrawal ? "Đang gửi..." : "Gửi yêu cầu rút" }}
              </button>
            </div>
          </div>
        </section>

        <section
          class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#181a1f] lg:col-span-5"
        >
          <div
            class="border-b border-slate-100 px-6 py-4 dark:border-slate-800"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-bold text-slate-900 dark:text-white">
                  Yêu cầu rút gần đây
                </p>
                <p class="text-xs text-slate-400">
                  Theo dõi trạng thái các yêu cầu bạn đã gửi.
                </p>
              </div>
              <span
                class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300"
              >
                {{ withdrawals.length }} requests
              </span>
            </div>
          </div>

          <div
            v-if="withdrawals.length"
            class="divide-y divide-slate-100 dark:divide-slate-800"
          >
            <div
              v-for="item in recentWithdrawals"
              :key="item.id"
              class="px-6 py-5"
            >
              <div
                class="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/40"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <span
                        class="rounded-full bg-white px-2.5 py-1 font-mono text-[11px] font-bold text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200"
                      >
                        {{ item.withdrawalCode }}
                      </span>
                      <span class="text-[11px] text-slate-400">
                        {{ formatDate(item.createdAt) }}
                      </span>
                    </div>

                    <p
                      class="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400"
                    >
                      Số tiền rút
                    </p>
                    <p
                      class="mt-1 text-xl font-semibold text-emerald-600 dark:text-emerald-400"
                    >
                      {{ formatCurrency(item.amount) }}
                    </p>
                  </div>
                  <UiBadge
                    :variant="
                      (withdrawalStatusMeta[item.status]?.variant ??
                        'slate') as any
                    "
                    :label="
                      withdrawalStatusMeta[item.status]?.label ?? item.status
                    "
                    rounded
                  />
                </div>

                <div class="mt-4">
                  <div class="flex items-center gap-2">
                    <template
                      v-for="(step, index) in getWithdrawalTimeline(
                        item.status
                      )"
                      :key="`${item.id}-${step.key}`"
                    >
                      <div class="flex items-center gap-2">
                        <div
                          class="flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold transition-colors"
                          :class="
                            step.active
                              ? 'border-primary bg-primary text-white'
                              : 'border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-500'
                          "
                        >
                          <Icon
                            v-if="step.active"
                            name="solar:check-read-line-duotone"
                            size="12"
                          />
                          <span v-else>{{ index + 1 }}</span>
                        </div>
                        <span
                          class="text-[11px] font-semibold"
                          :class="
                            step.active
                              ? 'text-slate-700 dark:text-slate-200'
                              : 'text-slate-400 dark:text-slate-500'
                          "
                        >
                          {{ step.label }}
                        </span>
                      </div>

                      <div
                        v-if="
                          index < getWithdrawalTimeline(item.status).length - 1
                        "
                        class="h-px flex-1"
                        :class="
                          step.active
                            ? 'bg-primary/40'
                            : 'bg-slate-200 dark:bg-slate-700'
                        "
                      ></div>
                    </template>
                  </div>
                </div>

                <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div
                    class="rounded-xl bg-white/90 px-3.5 py-3 dark:bg-slate-900/80"
                  >
                    <p
                      class="text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                    >
                      Ngân hàng
                    </p>
                    <p
                      class="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      {{ item.bankName || "---" }}
                    </p>
                  </div>
                  <div
                    class="rounded-xl bg-white/90 px-3.5 py-3 dark:bg-slate-900/80"
                  >
                    <p
                      class="text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                    >
                      Số tài khoản
                    </p>
                    <p
                      class="mt-1 font-mono text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      {{ item.bankAccountNumber || "---" }}
                    </p>
                  </div>
                  <div
                    class="rounded-xl bg-white/90 px-3.5 py-3 dark:bg-slate-900/80 sm:col-span-2"
                  >
                    <p
                      class="text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                    >
                      Chủ tài khoản
                    </p>
                    <p
                      class="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      {{ item.bankAccountName || "---" }}
                    </p>
                  </div>
                </div>

                <div
                  v-if="item.note || item.adminNote"
                  class="mt-4 grid grid-cols-1 gap-3"
                >
                  <div
                    v-if="item.note"
                    class="rounded-xl border border-slate-200 bg-white px-3.5 py-3 dark:border-slate-700 dark:bg-slate-900/80"
                  >
                    <p
                      class="text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                    >
                      Ghi chú của bạn
                    </p>
                    <p
                      class="mt-1 text-[13px] leading-6 text-slate-600 dark:text-slate-300"
                    >
                      {{ item.note }}
                    </p>
                  </div>

                  <div
                    v-if="item.adminNote"
                    class="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 dark:border-amber-900/40 dark:bg-amber-900/10"
                  >
                    <p
                      class="text-[11px] font-semibold uppercase tracking-wider text-amber-600/80"
                    >
                      Phản hồi từ admin
                    </p>
                    <p
                      class="mt-1 text-[13px] leading-6 text-amber-700 dark:text-amber-200"
                    >
                      {{ item.adminNote }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="p-8 text-center">
            <div
              class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"
            >
              <Icon name="solar:card-send-line-duotone" size="24" />
            </div>
            <p class="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Chưa có yêu cầu rút tiền
            </p>
          </div>
        </section>
      </div>

      <UiTable
        :headers="historyHeaders"
        :items="paginatedHistory"
        :loading="pending"
        striped
      >
        <template #top>
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <span
                class="h-6 w-1 rounded-full bg-gradient-to-b from-emerald-400 to-primary"
              />
              <p class="text-[14px] font-bold text-slate-800 dark:text-white">
                Lịch sử hoa hồng
              </p>
            </div>
            <div class="w-[240px] shrink-0">
              <UiDropdown
                v-model="filterStatus"
                :options="filterOptions"
                :fullWidth="true"
              />
            </div>
          </div>
        </template>

        <template #cell(date)="{ item }">
          <span class="whitespace-nowrap text-[11px] text-slate-400">
            {{ item.date }}
          </span>
        </template>

        <template #cell(buyer)="{ item }">
          <span
            class="text-[13px] font-medium text-slate-700 dark:text-slate-300"
          >
            {{ item.buyer }}
          </span>
        </template>

        <template #cell(product)="{ item }">
          <span
            class="block max-w-[200px] truncate text-[13px] text-slate-600 dark:text-slate-400"
            :title="item.product"
          >
            {{ item.product }}
          </span>
        </template>

        <template #cell(commission)="{ item }">
          <span
            class="text-[13px] font-bold text-emerald-600 dark:text-emerald-400"
          >
            +{{ formatCurrency(item.commission) }}
          </span>
        </template>

        <template #cell(status)="{ item }">
          <UiBadge
            :variant="(statusMeta[item.status]?.variant ?? 'slate') as any"
            :label="statusMeta[item.status]?.label ?? item.status"
            rounded
          />
        </template>

        <template #empty>
          <div class="py-10 text-center">
            <div
              class="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"
            >
              <Icon name="solar:hand-money-bold-duotone" size="20" />
            </div>
            <p class="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Chưa có hoa hồng
            </p>
          </div>
        </template>

        <template #footer>
          <UiPagination
            :total="filteredHistory.length"
            v-model:pageSize="pageSize"
            v-model:currentPage="currentPage"
          />
        </template>
      </UiTable>

      <div class="mt-8">
        <div class="mb-4 flex items-center gap-3">
          <span
            class="h-6 w-1 rounded-full bg-gradient-to-b from-blue-400 to-primary"
          />
          <p class="text-[14px] font-bold text-slate-800 dark:text-white">
            Người được giới thiệu ({{ referrals.length }})
          </p>
        </div>

        <div
          v-if="referrals.length === 0"
          class="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#181a1f]"
        >
          <div
            class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"
          >
            <Icon name="solar:users-group-rounded-line-duotone" size="24" />
          </div>
          <p class="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Chưa có ai đăng ký qua link của bạn
          </p>
          <p class="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Chia sẻ link affiliate của bạn để nhận người giới thiệu
          </p>
        </div>

        <div
          v-else
          class="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#181a1f]"
        >
          <div
            class="grid grid-cols-1 divide-x divide-y divide-slate-100 dark:divide-slate-700 sm:grid-cols-2 xl:grid-cols-4"
          >
            <div
              v-for="referral in referrals"
              :key="referral.id"
              class="p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <div class="flex items-start gap-2">
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-emerald-500 text-xs font-semibold text-white"
                >
                  {{ referral.username?.charAt(0).toUpperCase() }}
                </div>
                <div class="min-w-0 flex-1">
                  <p
                    class="truncate text-[12px] font-semibold text-slate-900 dark:text-white"
                  >
                    {{ referral.username }}
                  </p>
                  <p
                    class="truncate text-[10px] text-slate-500 dark:text-slate-400"
                  >
                    {{ referral.email }}
                  </p>
                  <p class="mt-1 text-[9px] text-slate-400 dark:text-slate-500">
                    {{
                      referral.joinedAt
                        ? formatDateOnly(referral.joinedAt, "vi-VN", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          })
                        : "---"
                    }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <LayoutFooter />
  </div>
</template>

<script setup lang="ts">
  useHead({ title: "Affiliate" });

  const { user } = useUserSession();
  const toast = useToast();
  const { formatDateTime, formatDate: formatDateOnly } = useDateFormatter();

  interface HistoryItem {
    id: number;
    date: string;
    buyer: string;
    product: string;
    commission: number;
    status: "paid" | "pending" | "approved" | "cancelled";
  }

  interface AffiliateWithdrawalItem {
    id: number;
    withdrawalCode: string;
    amount: number;
    method: string;
    bankName?: string | null;
    bankAccountNumber?: string | null;
    bankAccountName?: string | null;
    status: "pending" | "approved" | "completed" | "rejected";
    note?: string | null;
    adminNote?: string | null;
    reviewedAt?: string | null;
    completedAt?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  }

  interface WithdrawalSummary {
    affiliateStatus: string;
    pendingBalance: number;
    lockedAmount: number;
    availableAmount: number;
    minWithdrawalAmount: number;
    completedAmount: number;
    rejectedAmount: number;
  }

  const username = computed(
    () => (user.value as { username?: string } | null)?.username || "user"
  );

  const {
    data: affiliateData,
    pending,
    refresh,
  } = await useFetch("/api/affiliate/me", {
    key: "user-affiliate-data",
  });

  const { data: referralsData } = await useFetch("/api/affiliate/referrals", {
    key: "user-affiliate-referrals",
  });

  const { data: withdrawalsData, refresh: refreshWithdrawals } =
    await useFetch<{
      withdrawals: AffiliateWithdrawalItem[];
      summary: WithdrawalSummary;
    }>("/api/affiliate/withdrawals", {
      key: "user-affiliate-withdrawals",
      default: () => ({
        withdrawals: [],
        summary: {
          affiliateStatus: "active",
          pendingBalance: 0,
          lockedAmount: 0,
          availableAmount: 0,
          minWithdrawalAmount: 100,
          completedAmount: 0,
          rejectedAmount: 0,
        },
      }),
    });

  const referrals = computed(() => referralsData.value?.referrals || []);
  const withdrawals = computed(() => withdrawalsData.value?.withdrawals || []);
  const recentWithdrawals = computed(() => withdrawals.value.slice(0, 5));
  const withdrawalSummary = computed(
    () =>
      withdrawalsData.value?.summary || {
        affiliateStatus: "active",
        pendingBalance: 0,
        lockedAmount: 0,
        availableAmount: 0,
        minWithdrawalAmount: 100,
        completedAmount: 0,
        rejectedAmount: 0,
      }
  );

  const stats = computed(
    () =>
      affiliateData.value?.stats || {
        totalEarned: 0,
        pendingEarned: 0,
        totalClicks: 0,
        totalOrders: 0,
        commissionRate: 10,
      }
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value || 0);

  const formatDate = (value?: string | null) => {
    return formatDateTime(value, "vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const statCards = computed(() => [
    {
      label: "Đã nhận",
      value: formatCurrency(stats.value.totalEarned),
      icon: "solar:money-bag-bold-duotone",
      iconBg: "bg-emerald-50 dark:bg-emerald-900/20",
      iconColor: "text-emerald-500",
    },
    {
      label: "Có thể rút",
      value: formatCurrency(withdrawalSummary.value.availableAmount),
      icon: "solar:card-send-bold-duotone",
      iconBg: "bg-sky-50 dark:bg-sky-900/20",
      iconColor: "text-sky-500",
    },
    {
      label: "Đang xử lý",
      value: formatCurrency(withdrawalSummary.value.lockedAmount),
      icon: "solar:clock-circle-bold-duotone",
      iconBg: "bg-amber-50 dark:bg-amber-900/20",
      iconColor: "text-amber-500",
    },
    {
      label: "Rút xong",
      value: formatCurrency(withdrawalSummary.value.completedAmount),
      icon: "solar:check-circle-bold-duotone",
      iconBg: "bg-cyan-50 dark:bg-cyan-900/20",
      iconColor: "text-cyan-500",
    },
    {
      label: "Lượt click",
      value: stats.value.totalClicks.toLocaleString(),
      icon: "solar:cursor-bold-duotone",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "Đơn thành công",
      value: stats.value.totalOrders.toString(),
      icon: "solar:bag-bold-duotone",
      iconBg: "bg-violet-50 dark:bg-violet-900/20",
      iconColor: "text-violet-500",
    },
  ]);

  const refCode = computed(
    () => affiliateData.value?.refCode || username.value
  );
  const copied = ref(false);
  let copyTimer: ReturnType<typeof setTimeout> | null = null;

  const affLink = computed(() =>
    import.meta.server ? "" : `${window.location.origin}/?ref=${refCode.value}`
  );

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(affLink.value);
    } catch {
      const el = document.createElement("textarea");
      el.value = affLink.value;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }

    copied.value = true;
    toast.success("Đã sao chép", "Link affiliate đã được sao chép");

    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copied.value = false;
    }, 2500);
  }

  function shareVia(channel: "facebook" | "zalo") {
    const url = encodeURIComponent(affLink.value);
    window.open(
      channel === "facebook"
        ? `https://www.facebook.com/sharer/sharer.php?u=${url}`
        : `https://zalo.me/share?url=${url}`,
      "_blank",
      "width=600,height=440"
    );
  }

  const allHistory = computed(
    () => (affiliateData.value?.history || []) as HistoryItem[]
  );

  const statusMeta: Record<string, { label: string; variant: string }> = {
    paid: { label: "Đã ghi nhận", variant: "success" },
    approved: { label: "Sẵn sàng rút", variant: "info" },
    pending: { label: "Đang xử lý", variant: "warning" },
    cancelled: { label: "Đã hủy", variant: "slate" },
  };

  const withdrawalStatusMeta: Record<
    string,
    { label: string; variant: string }
  > = {
    pending: { label: "Chờ duyệt", variant: "warning" },
    approved: { label: "Đã duyệt", variant: "info" },
    completed: { label: "Đã chuyển khoản", variant: "success" },
    rejected: { label: "Từ chối", variant: "slate" },
  };

  const getWithdrawalTimeline = (status: string) => {
    if (status === "rejected") {
      return [
        { key: "submitted", label: "Đã gửi", active: true },
        { key: "rejected", label: "Từ chối", active: true },
      ];
    }

    return [
      { key: "submitted", label: "Đã gửi", active: true },
      {
        key: "approved",
        label: "Đã duyệt",
        active: status === "approved" || status === "completed",
      },
      {
        key: "completed",
        label: "Hoàn tất",
        active: status === "completed",
      },
    ];
  };

  const filterStatus = ref("all");
  const filterOptions = [
    { label: "Tất cả", value: "all" },
    { label: "Đã ghi nhận", value: "paid" },
    { label: "Sẵn sàng rút", value: "approved" },
    { label: "Đang xử lý", value: "pending" },
    { label: "Đã hủy", value: "cancelled" },
  ];

  const filteredHistory = computed(() =>
    filterStatus.value === "all"
      ? allHistory.value
      : allHistory.value.filter((item) => item.status === filterStatus.value)
  );

  const pageSize = ref(10);
  const currentPage = ref(1);

  watch(filterStatus, () => {
    currentPage.value = 1;
  });

  const paginatedHistory = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredHistory.value.slice(start, start + pageSize.value);
  });

  const historyHeaders = [
    { key: "date", label: "Thời gian", width: "135px" },
    { key: "buyer", label: "Người mua", width: "110px" },
    { key: "product", label: "Sản phẩm" },
    {
      key: "commission",
      label: "Hoa hồng",
      align: "right" as const,
      width: "120px",
    },
    {
      key: "status",
      label: "Trạng thái",
      align: "center" as const,
      width: "120px",
    },
  ];

  const vietQrBanks = [
    { label: "Vietcombank", value: "970436" },
    { label: "VietinBank", value: "970415" },
    { label: "BIDV", value: "970418" },
    { label: "Agribank", value: "970405" },
    { label: "Techcombank", value: "970407" },
    { label: "MBBank", value: "970422" },
    { label: "ACB", value: "970416" },
    { label: "VPBank", value: "970432" },
    { label: "TPBank", value: "970423" },
    { label: "Sacombank", value: "970403" },
    { label: "HDBank", value: "970437" },
    { label: "VIB", value: "970441" },
    { label: "OCB", value: "970448" },
    { label: "MSB", value: "970426" },
    { label: "Eximbank", value: "970431" },
    { label: "SHB", value: "970443" },
    { label: "SeABank", value: "970440" },
    { label: "ABBANK", value: "970425" },
    { label: "VietABank", value: "970427" },
    { label: "VietBank", value: "970433" },
  ];

  const bankOptions = vietQrBanks.map((bank) => ({
    label: bank.label,
    value: bank.value,
  }));

  const withdrawalForm = reactive({
    bankCode: bankOptions[0]?.value || "",
    amount: "",
    bankAccountNumber: "",
    bankAccountName: "",
    note: "",
  });

  const creatingWithdrawal = ref(false);

  const selectedWithdrawalBank = computed(
    () =>
      vietQrBanks.find((bank) => bank.value === withdrawalForm.bankCode) || null
  );

  const getWithdrawalValidationError = () => {
    const amount = Math.floor(Number(withdrawalForm.amount || 0));

    if (!selectedWithdrawalBank.value) {
      return "Vui lòng chọn ngân hàng nhận tiền";
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return "Vui lòng nhập số tiền rút hợp lệ";
    }

    if (amount < withdrawalSummary.value.minWithdrawalAmount) {
      return `Số tiền rút tối thiểu là ${formatCurrency(
        withdrawalSummary.value.minWithdrawalAmount
      )}`;
    }

    if (!withdrawalForm.bankAccountNumber.trim()) {
      return "Vui lòng nhập số tài khoản";
    }

    if (!withdrawalForm.bankAccountName.trim()) {
      return "Vui lòng nhập tên chủ tài khoản";
    }

    if (withdrawalSummary.value.availableAmount <= 0) {
      return "Bạn chưa có số dư affiliate khả dụng để rút";
    }

    if (amount > withdrawalSummary.value.availableAmount) {
      return `Số tiền rút đang lớn hơn mức khả dụng ${formatCurrency(
        withdrawalSummary.value.availableAmount
      )}`;
    }

    return null;
  };

  const resetWithdrawalForm = () => {
    withdrawalForm.amount = "";
    withdrawalForm.bankAccountNumber = "";
    withdrawalForm.bankAccountName = "";
    withdrawalForm.note = "";
  };

  const submitWithdrawal = async () => {
    if (creatingWithdrawal.value) {
      return;
    }

    const validationError = getWithdrawalValidationError();

    if (validationError) {
      toast.error("Chưa thể gửi yêu cầu", validationError);
      return;
    }

    creatingWithdrawal.value = true;

    try {
      await $fetch("/api/affiliate/withdrawals", {
        method: "POST",
        body: {
          amount: Math.floor(Number(withdrawalForm.amount || 0)),
          bankName: selectedWithdrawalBank.value?.label || "",
          bankAccountNumber: withdrawalForm.bankAccountNumber.trim(),
          bankAccountName: withdrawalForm.bankAccountName.trim(),
          note: withdrawalForm.note.trim(),
        },
      });

      toast.success(
        "Đã gửi yêu cầu",
        "Yêu cầu rút tiền của bạn đã được tạo thành công"
      );

      resetWithdrawalForm();
      await Promise.all([refreshWithdrawals(), refresh()]);
    } catch (error: any) {
      toast.error(
        "Không thể tạo yêu cầu",
        error?.data?.message || "Có lỗi xảy ra khi gửi yêu cầu rút tiền"
      );
    } finally {
      creatingWithdrawal.value = false;
    }
  };

  onUnmounted(() => {
    if (copyTimer) clearTimeout(copyTimer);
  });
</script>
