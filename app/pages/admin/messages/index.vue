<script setup lang="ts">
  import { SOCKET_EVENTS, type SocketAckResponse } from "~~/shared/socket";
  import {
    parseBusinessDateTimeInput,
    toBusinessDateTimeLocalValue,
  } from "../../../../shared/timezone";

  definePageMeta({ layout: "admin" });
  useHead({ title: "Chat hỗ trợ khách hàng - Admin Panel" });

  type ConversationStatus = "active" | "waiting" | "resolved" | "closed";
  type MessageSenderRole = "admin" | "customer" | "system";

  interface ConversationUser {
    id: number;
    username: string;
    email: string;
    role?: string | null;
    status?: string | null;
  }

  interface SupportAdminOption extends ConversationUser {}

  interface ConversationOrder {
    id: number;
    orderCode: string;
    status?: string | null;
    totalAmount?: number | null;
  }

  interface ConversationItem {
    id: number;
    conversationCode: string;
    status: ConversationStatus;
    priority?: string | null;
    source?: string | null;
    subject?: string | null;
    tags?: string | null;
    lastMessagePreview?: string | null;
    lastMessageSenderRole?: MessageSenderRole | null;
    lastMessageAt?: string | null;
    adminUnreadCount: number;
    customerUnreadCount: number;
    customer: ConversationUser | null;
    admin: ConversationUser | null;
    assignedBy: ConversationUser | null;
    order: ConversationOrder | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  }

  interface AttachmentItem {
    id: number;
    messageId: number;
    fileName: string;
    originalName?: string | null;
    fileUrl: string;
    thumbnailUrl?: string | null;
    mimeType?: string | null;
    fileSize: number;
    width?: number | null;
    height?: number | null;
    durationSeconds?: number | null;
  }

  interface MessageItem {
    id: number;
    senderRole: MessageSenderRole;
    content?: string | null;
    messageType?: string | null;
    createdAt?: string | null;
    sender?: ConversationUser | null;
    attachments?: AttachmentItem[];
  }

  interface ConversationDetailResponse {
    conversation: ConversationItem;
    messages: MessageItem[];
  }

  interface SessionUser {
    id?: number | null;
    username?: string | null;
    email?: string | null;
    role?: string | null;
    permissions?: string[] | null;
  }

  const toast = useToast();
  const { parseServerDate } = useDateFormatter();
  const socket = useSocket();
  const route = useRoute();
  const router = useRouter();
  const { user } = useUserSession();

  const conversations = ref<ConversationItem[]>([]);
  const messages = ref<MessageItem[]>([]);
  const selectedConversationId = ref<number | null>(null);
  const selectedConversationDetail = ref<ConversationItem | null>(null);
  const messageInput = ref("");
  const messagesContainer = ref<HTMLElement>();
  const searchQuery = ref("");
  const filterStatus = ref<"all" | ConversationStatus>("all");
  const assignmentFilter = ref<"all" | "mine" | "unassigned" | "assigned">(
    "all"
  );
  const listLoading = ref(false);
  const detailLoading = ref(false);
  const sendingMessage = ref(false);
  const actionLoading = ref(false);
  const adminsLoading = ref(false);
  const supportAdmins = ref<SupportAdminOption[]>([]);
  const selectedAdminAssignment = ref<string>("");
  const syncingAdminAssignment = ref(false);
  const statsState = ref({
    active: 0,
    waiting: 0,
    resolved: 0,
    closed: 0,
    totalUnread: 0,
  });

  let searchDebounce: ReturnType<typeof setTimeout> | null = null;
  let joinedConversationId: number | null = null;

  const selectedConversation = computed(
    () =>
      selectedConversationDetail.value ||
      conversations.value.find((c) => c.id === selectedConversationId.value) ||
      null
  );

  const filteredConversations = computed(() => conversations.value);

  const stats = computed(() => ({
    active: Number(statsState.value.active || 0),
    waiting: Number(statsState.value.waiting || 0),
    resolved: Number(statsState.value.resolved || 0),
    totalUnread: Number(statsState.value.totalUnread || 0),
  }));
  const sessionUser = computed(() => user.value as SessionUser | null);

  const currentAdminName = computed(
    () =>
      String(
        sessionUser.value?.username ||
          sessionUser.value?.email ||
          "Support Team"
      ).trim() || "Support Team"
  );

  const currentAdminId = computed(
    () => Number(sessionUser.value?.id || 0) || null
  );

  const isRootAdmin = computed(
    () =>
      String(sessionUser.value?.role || "")
        .trim()
        .toLowerCase() === "admin"
  );

  const canClaimSelectedConversation = computed(() =>
    Boolean(selectedConversation.value && !selectedConversation.value.admin?.id)
  );

  const adminAssignmentOptions = computed(() => [
    {
      label: "Chưa gán admin",
      value: "",
    },
    ...supportAdmins.value.map((admin) => ({
      label: `${admin.username} - ${admin.role || "admin"}`,
      value: String(admin.id),
    })),
  ]);

  const parseSupportDate = (value?: string | null) => {
    const parsed = parseServerDate(value);
    if (parsed) {
      return parsed;
    }

    return parseBusinessDateTimeInput(value)?.dateValue || null;
  };

  const nowBusinessTime = () => toBusinessDateTimeLocalValue(new Date());

  const getSafeTimeDistance = (value?: string | null) => {
    const date = parseSupportDate(value);

    if (!date) {
      return null;
    }

    const now = Date.now();
    const rawDiffMinutes = Math.round((date.getTime() - now) / 60000);

    return {
      date,
      diffMinutes: rawDiffMinutes,
      absMinutes: Math.abs(rawDiffMinutes),
      isFuture: rawDiffMinutes > 0,
    };
  };

  const formatRelativeTime = (value?: string | null) => {
    const timeInfo = getSafeTimeDistance(value);

    if (!timeInfo) {
      return value || "";
    }

    if (timeInfo.isFuture && timeInfo.absMinutes > 2) {
      return timeInfo.date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }

    if (timeInfo.absMinutes < 1) {
      return "Vừa xong";
    }

    if (timeInfo.absMinutes < 60) {
      return new Intl.RelativeTimeFormat("vi", { numeric: "auto" }).format(
        timeInfo.diffMinutes,
        "minute"
      );
    }

    if (timeInfo.absMinutes < 1440) {
      return new Intl.RelativeTimeFormat("vi", { numeric: "auto" }).format(
        Math.round(timeInfo.diffMinutes / 60),
        "hour"
      );
    }

    return new Intl.RelativeTimeFormat("vi", { numeric: "auto" }).format(
      Math.round(timeInfo.diffMinutes / 1440),
      "day"
    );
  };

  const formatMessageTime = (value?: string | null) =>
    formatRelativeTime(value);

  const getAvatarSeed = (
    username?: string | null,
    email?: string | null,
    fallback: string = "support"
  ) => String(username || email || fallback).trim() || fallback;

  const getMessageAvatarSeed = (message: MessageItem) => {
    if (message.senderRole === "customer") {
      return getAvatarSeed(
        message.sender?.username ||
          selectedConversation.value?.customer?.username,
        message.sender?.email || selectedConversation.value?.customer?.email,
        "customer"
      );
    }

    if (message.senderRole === "admin") {
      return getAvatarSeed(
        message.sender?.username ||
          selectedConversation.value?.admin?.username ||
          currentAdminName.value,
        message.sender?.email ||
          selectedConversation.value?.admin?.email ||
          sessionUser.value?.email,
        "support"
      );
    }

    return getAvatarSeed(
      message.sender?.username,
      message.sender?.email,
      "system"
    );
  };

  const truncateMessage = (message?: string | null, maxLength: number = 50) => {
    const safeMessage = String(message || "");
    if (safeMessage.length > maxLength) {
      return `${safeMessage.slice(0, maxLength)}...`;
    }
    return safeMessage;
  };

  const getStatusColor = (status: ConversationStatus) => {
    switch (status) {
      case "active":
        return "bg-sky-50 text-sky-700";
      case "waiting":
        return "bg-yellow-50 text-yellow-700";
      case "resolved":
        return "bg-emerald-50 text-emerald-700";
      case "closed":
        return "bg-slate-100 text-slate-700";
    }
  };

  const getStatusLabel = (status: ConversationStatus) => {
    switch (status) {
      case "active":
        return "Đang hỗ trợ";
      case "waiting":
        return "Chờ trả lời";
      case "resolved":
        return "Đã xong";
      case "closed":
        return "Đã đóng";
    }
  };

  const updateConversationInList = (
    conversation: Partial<ConversationItem> & { id: number }
  ) => {
    const existingConversation = conversations.value.find(
      (item) => item.id === conversation.id
    );

    if (!existingConversation) {
      return;
    }

    const nextConversation: ConversationItem = {
      ...existingConversation,
      ...conversation,
    };

    conversations.value = conversations.value
      .map((item) => (item.id === conversation.id ? nextConversation : item))
      .sort((a, b) => {
        const aTime =
          parseSupportDate(a.lastMessageAt || a.createdAt)?.getTime() || 0;
        const bTime =
          parseSupportDate(b.lastMessageAt || b.createdAt)?.getTime() || 0;
        return bTime - aTime;
      });
  };

  const scrollMessagesToBottom = () => {
    setTimeout(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop =
          messagesContainer.value.scrollHeight;
      }
    }, 50);
  };

  const joinConversationRoom = async (conversationId: number) => {
    await new Promise<void>((resolve) => {
      socket.emit(
        SOCKET_EVENTS.conversationJoin,
        { conversationId },
        (_ack: SocketAckResponse) => {
          resolve();
        }
      );
    });
    joinedConversationId = conversationId;
  };

  const leaveConversationRoom = async (conversationId: number) => {
    await new Promise<void>((resolve) => {
      socket.emit(
        SOCKET_EVENTS.conversationLeave,
        { conversationId },
        (_ack: SocketAckResponse) => {
          resolve();
        }
      );
    });
    if (joinedConversationId === conversationId) {
      joinedConversationId = null;
    }
  };

  const loadConversations = async () => {
    listLoading.value = true;

    try {
      const response = await $fetch<{
        items: ConversationItem[];
        stats: typeof statsState.value;
      }>("/api/admin/messages", {
        query: {
          search: searchQuery.value || undefined,
          status: filterStatus.value,
          assignment: assignmentFilter.value,
          page: 1,
          pageSize: 50,
        },
      });

      conversations.value = response.items || [];
      statsState.value = {
        active: Number(response.stats?.active || 0),
        waiting: Number(response.stats?.waiting || 0),
        resolved: Number(response.stats?.resolved || 0),
        closed: Number(response.stats?.closed || 0),
        totalUnread: Number(response.stats?.totalUnread || 0),
      };
    } catch (error: any) {
      toast.error(
        "Thất bại",
        error?.data?.message || error?.message || "Không thể tải hội thoại"
      );
    } finally {
      listLoading.value = false;
    }
  };

  const loadSupportAdmins = async () => {
    adminsLoading.value = true;

    try {
      const response = await $fetch<{ items: SupportAdminOption[] }>(
        "/api/admin/messages/admins"
      );
      supportAdmins.value = response.items || [];
    } catch (error: any) {
      toast.error(
        "Thất bại",
        error?.data?.message ||
          error?.message ||
          "Không thể tải danh sách admin hỗ trợ"
      );
    } finally {
      adminsLoading.value = false;
    }
  };

  const loadConversationDetail = async (conversationId: number) => {
    detailLoading.value = true;

    try {
      const response = await $fetch<ConversationDetailResponse>(
        `/api/admin/messages/${conversationId}`,
        {
          query: {
            page: 1,
            pageSize: 100,
          },
        }
      );

      selectedConversationDetail.value = response.conversation;
      messages.value = response.messages || [];
      updateConversationInList(response.conversation);
      scrollMessagesToBottom();
    } catch (error: any) {
      toast.error(
        "Thất bại",
        error?.data?.message ||
          error?.message ||
          "Không thể tải chi tiết hội thoại"
      );
    } finally {
      detailLoading.value = false;
    }
  };

  const markConversationAsRead = async (conversationId: number) => {
    try {
      await $fetch(`/api/admin/messages/${conversationId}`, {
        method: "PATCH",
        body: { read: true },
      });

      updateConversationInList({
        id: conversationId,
        adminUnreadCount: 0,
      });

      if (selectedConversationDetail.value?.id === conversationId) {
        selectedConversationDetail.value = {
          ...selectedConversationDetail.value,
          adminUnreadCount: 0,
        };
      }

      await loadConversations();
    } catch {}
  };

  const selectConversation = async (id: number) => {
    if (joinedConversationId && joinedConversationId !== id) {
      await leaveConversationRoom(joinedConversationId);
    }

    selectedConversationId.value = id;
    messageInput.value = "";
    await router.replace({ query: { ...route.query, id } });
    await loadConversationDetail(id);
    await joinConversationRoom(id);
    await markConversationAsRead(id);
  };

  const backToConversationList = async () => {
    if (joinedConversationId) {
      await leaveConversationRoom(joinedConversationId);
    }

    selectedConversationId.value = null;
    selectedConversationDetail.value = null;
    messages.value = [];
    const nextQuery = { ...route.query };
    delete nextQuery.id;
    router.replace({ query: nextQuery });
  };

  const sendMessage = async () => {
    if (
      !messageInput.value.trim() ||
      !selectedConversationId.value ||
      sendingMessage.value
    ) {
      return;
    }

    sendingMessage.value = true;

    try {
      const content = messageInput.value.trim();
      const response = await $fetch<{
        data?: {
          conversationId: number;
          message: MessageItem;
        };
      }>(`/api/admin/messages/${selectedConversationId.value}/messages`, {
        method: "POST",
        body: {
          content,
          messageType: "text",
          clientMessageId: crypto.randomUUID(),
        },
      });

      if (response.data?.message) {
        const exists = messages.value.some(
          (item) => item.id === response.data?.message?.id
        );

        if (!exists) {
          messages.value = [...messages.value, response.data.message];
        }
        updateConversationInList({
          id: selectedConversationId.value,
          lastMessagePreview: content,
          lastMessageSenderRole: "admin",
          lastMessageAt: nowBusinessTime(),
        });
      }

      messageInput.value = "";
      scrollMessagesToBottom();
      await loadConversations();
    } catch (error: any) {
      toast.error(
        "Thất bại",
        error?.data?.message || error?.message || "Không thể gửi tin nhắn"
      );
    } finally {
      sendingMessage.value = false;
    }
  };

  const patchConversation = async (
    payload: Partial<{
      adminUserId: number | null;
      status: ConversationStatus;
      priority: string | null;
      subject: string | null;
      tags: string[] | string | null;
    }>,
    successMessage: string
  ) => {
    if (!selectedConversationId.value || actionLoading.value) {
      return;
    }

    actionLoading.value = true;

    try {
      await $fetch(`/api/admin/messages/${selectedConversationId.value}`, {
        method: "PATCH",
        body: payload,
      });

      toast.success("Thành công", successMessage);
      await Promise.all([
        loadConversationDetail(selectedConversationId.value),
        loadConversations(),
      ]);
    } catch (error: any) {
      toast.error(
        "Thất bại",
        error?.data?.message || error?.message || "Không thể cập nhật hội thoại"
      );
    } finally {
      actionLoading.value = false;
    }
  };

  const handleAssignToMe = async () => {
    if (!currentAdminId.value) {
      return;
    }

    await patchConversation(
      {
        adminUserId: currentAdminId.value,
        status: "active",
      },
      "Đã nhận hội thoại"
    );
  };

  const handleAssignChange = async () => {
    if (!isRootAdmin.value) {
      return;
    }

    const nextAdminUserId = selectedAdminAssignment.value
      ? Number(selectedAdminAssignment.value)
      : null;

    await patchConversation(
      {
        adminUserId: nextAdminUserId,
        status: nextAdminUserId
          ? selectedConversation.value?.status === "waiting"
            ? "active"
            : selectedConversation.value?.status || "active"
          : "waiting",
      },
      nextAdminUserId
        ? "Đã cập nhật người phụ trách"
        : "Đã đưa hội thoại về hàng chờ"
    );
  };

  const handleResolveConversation = async () => {
    await patchConversation(
      {
        status: "resolved",
      },
      "Đã đánh dấu hội thoại hoàn tất"
    );
  };

  const handleCloseConversation = async () => {
    await patchConversation(
      {
        status: "closed",
      },
      "Đã đóng hội thoại"
    );
  };

  const handleReopenConversation = async () => {
    await patchConversation(
      {
        status: selectedConversation.value?.admin?.id ? "active" : "waiting",
      },
      "Đã mở lại hội thoại"
    );
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const handleSocketMessageNew = (payload: {
    conversationId: number;
    message: MessageItem;
  }) => {
    if (!payload?.conversationId || !payload?.message) {
      return;
    }

    const preview =
      payload.message.content ||
      (payload.message.attachments?.length ? "[Tệp đính kèm]" : "[Tin nhắn]");

    const existingConversation = conversations.value.find(
      (item) => item.id === payload.conversationId
    );
    const nextUnread =
      payload.message.senderRole === "customer"
        ? Number(existingConversation?.adminUnreadCount || 0) + 1
        : 0;

    updateConversationInList({
      id: payload.conversationId,
      lastMessagePreview: preview,
      lastMessageSenderRole: payload.message.senderRole,
      lastMessageAt: payload.message.createdAt || nowBusinessTime(),
      adminUnreadCount: nextUnread,
    });

    if (selectedConversationId.value === payload.conversationId) {
      const exists = messages.value.some(
        (item) => item.id === payload.message.id
      );
      if (!exists) {
        messages.value = [...messages.value, payload.message];
        scrollMessagesToBottom();
      }

      markConversationAsRead(payload.conversationId);
    }
  };

  const handleSocketConversationUpdated = (payload: {
    conversationId: number;
    conversation?: ConversationItem;
    status?: ConversationStatus;
  }) => {
    if (!payload?.conversationId) {
      return;
    }

    if (payload.conversation) {
      updateConversationInList(payload.conversation);

      if (selectedConversationId.value === payload.conversationId) {
        selectedConversationDetail.value = {
          ...(selectedConversationDetail.value || payload.conversation),
          ...payload.conversation,
        };
      }
    } else if (payload.status) {
      updateConversationInList({
        id: payload.conversationId,
        status: payload.status,
      });

      if (
        selectedConversationId.value === payload.conversationId &&
        selectedConversationDetail.value
      ) {
        selectedConversationDetail.value = {
          ...selectedConversationDetail.value,
          status: payload.status,
        };
      }
    }

    loadConversations();
  };

  const handleSocketConversationRead = (payload: {
    conversationId: number;
    actorRole?: string;
  }) => {
    if (!payload?.conversationId || payload.actorRole !== "admin") {
      return;
    }

    updateConversationInList({
      id: payload.conversationId,
      adminUnreadCount: 0,
    });

    if (
      selectedConversationId.value === payload.conversationId &&
      selectedConversationDetail.value
    ) {
      selectedConversationDetail.value = {
        ...selectedConversationDetail.value,
        adminUnreadCount: 0,
      };
    }
  };

  watch(
    () => route.query.id,
    async (id) => {
      const parsedId = Number(id || 0);

      if (!parsedId) {
        selectedConversationId.value = null;
        selectedConversationDetail.value = null;
        messages.value = [];
        return;
      }

      if (selectedConversationId.value !== parsedId) {
        await selectConversation(parsedId);
      }
    },
    { immediate: false }
  );

  watch([searchQuery, filterStatus, assignmentFilter], () => {
    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }

    searchDebounce = setTimeout(() => {
      loadConversations();
    }, 250);
  });

  watch(
    selectedConversation,
    (conversation) => {
      syncingAdminAssignment.value = true;
      selectedAdminAssignment.value = String(conversation?.admin?.id || "");
      nextTick(() => {
        syncingAdminAssignment.value = false;
      });
    },
    { immediate: true }
  );

  watch(selectedAdminAssignment, async (value, oldValue) => {
    if (
      syncingAdminAssignment.value ||
      !isRootAdmin.value ||
      !selectedConversation.value ||
      value === oldValue
    ) {
      return;
    }

    await handleAssignChange();
  });

  watch(selectedConversation, (conversation) => {
    useHead({
      title: conversation
        ? `Chat với ${conversation.customer?.username || "khách hàng"} - Admin Panel`
        : "Chat hỗ trợ khách hàng - Admin Panel",
    });
  });

  onMounted(async () => {
    await Promise.all([loadConversations(), loadSupportAdmins()]);

    const idFromQuery = Number(route.query.id || 0);
    if (idFromQuery) {
      await selectConversation(idFromQuery);
    }

    socket.on(SOCKET_EVENTS.messageNew, handleSocketMessageNew);
    socket.on(
      SOCKET_EVENTS.conversationUpdated,
      handleSocketConversationUpdated
    );
    socket.on(SOCKET_EVENTS.conversationRead, handleSocketConversationRead);
  });

  onBeforeUnmount(async () => {
    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }

    socket.off(SOCKET_EVENTS.messageNew, handleSocketMessageNew);
    socket.off(
      SOCKET_EVENTS.conversationUpdated,
      handleSocketConversationUpdated
    );
    socket.off(SOCKET_EVENTS.conversationRead, handleSocketConversationRead);

    if (joinedConversationId) {
      await leaveConversationRoom(joinedConversationId);
    }
  });
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div
      class="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6"
    >
      <div
        class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
      >
        <div>
          <div
            class="flex items-center gap-2 text-xs font-semibold tracking-widest text-slate-400"
          >
            <Icon
              name="solar:chat-line-bold-duotone"
              class="text-primary"
              size="16"
            />
            Hỗ trợ khách hàng
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 lg:justify-end">
          <div
            class="flex w-full gap-1.5 overflow-x-auto pb-1 lg:w-auto lg:flex-wrap lg:overflow-visible lg:pb-0"
          >
            <div
              v-for="stat in [
                {
                  label: 'Đang hỗ trợ',
                  value: stats.active,
                  color: 'text-sky-600',
                },
                {
                  label: 'Chờ trả lời',
                  value: stats.waiting,
                  color: 'text-yellow-600',
                },
                {
                  label: 'Đã xong',
                  value: stats.resolved,
                  color: 'text-emerald-600',
                },
              ]"
              :key="stat.label"
              class="flex flex-shrink-0 items-center gap-1.5 rounded bg-slate-50 px-2 py-1 dark:bg-slate-800"
            >
              <span class="text-[10px] text-slate-600 dark:text-slate-400">
                {{ stat.label }}
              </span>
              <span :class="['text-sm font-bold', stat.color]">
                {{ stat.value }}
              </span>
            </div>
          </div>

          <div
            v-if="stats.totalUnread > 0"
            class="flex flex-shrink-0 items-center gap-1.5 rounded bg-rose-50 px-2 py-1 dark:bg-rose-900/20"
          >
            <Icon
              name="solar:bell-bold-duotone"
              class="text-rose-500"
              size="16"
            />
            <span class="text-xs font-semibold text-rose-600">
              {{ stats.totalUnread }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="flex min-h-0 flex-1 overflow-hidden">
      <div
        :class="[
          'min-h-0 flex-col border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
          selectedConversation ? 'hidden lg:flex' : 'flex',
          'w-full lg:w-80 lg:flex-shrink-0 lg:border-r xl:w-96',
        ]"
      >
        <div class="border-b border-slate-200 p-3 dark:border-slate-800 sm:p-4">
          <div class="mb-3">
            <UiInput v-model="searchQuery" placeholder="Tìm khách hàng...">
              <template #left-icon>
                <Icon name="solar:magnifer-line-duotone" size="18" />
              </template>
            </UiInput>
          </div>

          <div
            class="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
          >
            <button
              v-for="status in ['all', 'active', 'waiting', 'resolved']"
              :key="status"
              :class="[
                'flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                filterStatus === status
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
              ]"
              @click="filterStatus = status as 'all' | ConversationStatus"
            >
              {{
                status === "all"
                  ? "Tất cả"
                  : status === "active"
                    ? "Đang hỗ trợ"
                    : status === "waiting"
                      ? "Chờ"
                      : "Xong"
              }}
            </button>
          </div>

          <div
            class="mt-2 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
          >
            <button
              v-for="assignment in ['all', 'mine', 'unassigned', 'assigned']"
              :key="assignment"
              :class="[
                'flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                assignmentFilter === assignment
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
              ]"
              @click="
                assignmentFilter = assignment as
                  | 'all'
                  | 'mine'
                  | 'unassigned'
                  | 'assigned'
              "
            >
              {{
                assignment === "all"
                  ? "Tất cả"
                  : assignment === "mine"
                    ? "Của tôi"
                    : assignment === "unassigned"
                      ? "Chưa nhận"
                      : "Đã giao"
              }}
            </button>
          </div>
        </div>

        <div
          class="scrollbar flex-1 overflow-y-auto p-2 scrollbar-thumb-slate-300 scrollbar-track-slate-100 dark:scrollbar-thumb-slate-700 dark:scrollbar-track-slate-800"
        >
          <div
            v-if="listLoading"
            class="px-4 py-6 text-sm text-slate-500 dark:text-slate-400"
          >
            Đang tải hội thoại...
          </div>

          <button
            v-for="conv in filteredConversations"
            v-else
            :key="conv.id"
            type="button"
            :class="[
              'mb-1 block w-full cursor-pointer rounded-xl px-4 py-4 text-left transition-all sm:p-4',
              selectedConversationId === conv.id
                ? 'bg-primary/10 ring-1 ring-primary/20'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
            ]"
            @click="selectConversation(conv.id)"
          >
            <div class="flex items-start gap-2.5">
              <div class="relative flex-shrink-0">
                <div
                  class="h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                >
                  <img
                    :src="`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(getAvatarSeed(conv.customer?.username, conv.customer?.email, 'customer'))}`"
                    :alt="conv.customer?.username || 'Khách hàng'"
                    class="h-full w-full object-cover"
                  />
                </div>
              </div>

              <div class="min-w-0 flex-1">
                <div class="mb-0.5 flex items-start justify-between gap-1.5">
                  <p
                    class="truncate text-sm font-medium text-slate-900 dark:text-white"
                  >
                    {{ conv.customer?.username || "Khách hàng" }}
                  </p>
                  <span
                    :class="[
                      'flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium',
                      getStatusColor(conv.status),
                    ]"
                  >
                    {{ getStatusLabel(conv.status) }}
                  </span>
                </div>

                <p
                  class="mb-1 truncate text-[11px] text-slate-500 dark:text-slate-400"
                >
                  {{ conv.customer?.email || "Không có email" }}
                </p>

                <div class="flex items-center justify-between gap-1.5">
                  <p
                    :class="[
                      'line-clamp-1 text-[13px] font-semibold',
                      conv.adminUnreadCount > 0
                        ? 'font-bold text-slate-900 dark:text-white'
                        : 'text-slate-500 dark:text-slate-400',
                    ]"
                  >
                    {{ truncateMessage(conv.lastMessagePreview, 50) }}
                  </p>
                  <span
                    v-if="conv.adminUnreadCount > 0"
                    class="inline-flex flex-shrink-0 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-xs font-bold leading-none text-white"
                  >
                    {{ conv.adminUnreadCount }}
                  </span>
                </div>

                <p
                  class="mt-0.5 text-[12px] text-slate-600 dark:text-slate-500"
                >
                  {{ formatRelativeTime(conv.lastMessageAt || conv.createdAt) }}
                </p>
              </div>
            </div>
          </button>

          <div
            v-if="!listLoading && filteredConversations.length === 0"
            class="flex flex-col items-center justify-center px-6 py-14 text-center"
          >
            <div
              class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-[#1b2028] dark:text-slate-500"
            >
              <Icon name="solar:chat-round-unread-bold-duotone" size="30" />
            </div>
            <p class="text-base font-bold text-slate-800 dark:text-slate-200">
              Không có cuộc trò chuyện phù hợp
            </p>
            <p
              class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400"
            >
              Thử điều chỉnh bộ lọc hoặc chờ thêm tin nhắn mới từ khách hàng.
            </p>
          </div>
        </div>
      </div>

      <div
        v-if="selectedConversation"
        class="flex min-h-0 flex-1 flex-col bg-white dark:bg-slate-900"
      >
        <div
          class="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50 sm:px-6 sm:py-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-3">
              <UiButton
                variant="ghost"
                class="!h-9 !w-9 !rounded-lg !p-0 lg:!hidden"
                title="Quay lại danh sách"
                @click="backToConversationList"
              >
                <Icon name="solar:alt-arrow-left-line-duotone" size="18" />
              </UiButton>

              <div class="relative">
                <div
                  class="h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                >
                  <img
                    :src="`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(getAvatarSeed(selectedConversation.customer?.username, selectedConversation.customer?.email, 'customer'))}`"
                    :alt="
                      selectedConversation.customer?.username || 'Khách hàng'
                    "
                    class="h-full w-full object-cover"
                  />
                </div>
              </div>

              <div class="min-w-0">
                <h2
                  class="truncate font-semibold text-slate-900 dark:text-white"
                >
                  {{ selectedConversation.customer?.username || "Khách hàng" }}
                </h2>
                <p class="truncate text-xs text-slate-500 dark:text-slate-400">
                  {{ selectedConversation.customer?.email || "Không có email" }}
                </p>
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-end gap-2">
              <span
                :class="[
                  'rounded px-2 py-1 text-xs font-medium',
                  getStatusColor(selectedConversation.status),
                ]"
              >
                {{ getStatusLabel(selectedConversation.status) }}
              </span>

              <UiButton
                v-if="canClaimSelectedConversation"
                variant="outline"
                size="sm"
                :loading="actionLoading"
                @click="handleAssignToMe"
              >
                Nhận chat
              </UiButton>

              <UiButton
                v-if="selectedConversation.status !== 'resolved'"
                variant="outline"
                size="sm"
                :loading="actionLoading"
                @click="handleResolveConversation"
              >
                Resolve
              </UiButton>

              <UiButton
                v-if="selectedConversation.status !== 'closed'"
                variant="outline"
                size="sm"
                :loading="actionLoading"
                @click="handleCloseConversation"
              >
                Close
              </UiButton>

              <UiButton
                v-if="
                  selectedConversation.status === 'resolved' ||
                  selectedConversation.status === 'closed'
                "
                variant="outline"
                size="sm"
                :loading="actionLoading"
                @click="handleReopenConversation"
              >
                Mở lại
              </UiButton>
            </div>
          </div>

          <div
            :class="[
              'mt-3 grid gap-3 text-xs text-slate-500 dark:text-slate-400',
              isRootAdmin
                ? 'lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]'
                : 'lg:grid-cols-1',
            ]"
          >
            <div class="flex flex-wrap items-center gap-3">
              <span>
                Mã:
                <strong class="text-slate-700 dark:text-slate-200">{{
                  selectedConversation.conversationCode
                }}</strong>
              </span>
              <span v-if="selectedConversation.order">
                Đơn:
                <strong class="text-slate-700 dark:text-slate-200">{{
                  selectedConversation.order.orderCode
                }}</strong>
              </span>
              <span>
                Phụ trách:
                <strong class="text-slate-700 dark:text-slate-200">
                  {{ selectedConversation.admin?.username || "Chưa có admin" }}
                </strong>
              </span>
              <span v-if="selectedConversation.assignedBy">
                Giao bởi:
                <strong class="text-slate-700 dark:text-slate-200">
                  {{ selectedConversation.assignedBy.username }}
                </strong>
              </span>
            </div>

            <label
              v-if="isRootAdmin"
              class="flex min-w-0 items-center gap-2 lg:justify-end"
            >
              <span class="whitespace-nowrap">Chuyển phụ trách</span>
              <div class="w-[200px] max-w-full">
                <UiDropdown
                  v-model="selectedAdminAssignment"
                  :options="adminAssignmentOptions"
                  :disabled="adminsLoading || actionLoading"
                  height-class="h-9"
                />
              </div>
            </label>
          </div>
        </div>

        <div
          ref="messagesContainer"
          class="scrollbar flex flex-1 flex-col space-y-4 overflow-y-auto p-3 scrollbar-thumb-slate-300 scrollbar-track-slate-100 dark:scrollbar-thumb-slate-700 dark:scrollbar-track-slate-800 sm:p-4 lg:p-6"
        >
          <div
            v-if="detailLoading"
            class="text-sm text-slate-500 dark:text-slate-400"
          >
            Đang tải tin nhắn...
          </div>

          <div
            v-for="msg in messages"
            v-else
            :key="msg.id"
            :class="[
              'mb-4 flex w-full gap-2 sm:gap-3',
              msg.senderRole === 'admin'
                ? 'flex-row-reverse justify-start'
                : 'justify-start',
            ]"
          >
            <div
              :class="[
                'h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border bg-white',
                msg.senderRole === 'admin'
                  ? 'border-slate-300 dark:border-slate-600'
                  : msg.senderRole === 'system'
                    ? 'border-amber-200 dark:border-amber-800'
                    : 'border-primary/20 dark:border-primary/30',
              ]"
            >
              <img
                :src="`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(getMessageAvatarSeed(msg))}`"
                :alt="
                  msg.sender?.username ||
                  (msg.senderRole === 'customer'
                    ? selectedConversation?.customer?.username
                    : msg.senderRole === 'admin'
                      ? selectedConversation?.admin?.username ||
                        currentAdminName
                      : msg.senderRole)
                "
                class="h-full w-full object-cover"
              />
            </div>

            <div
              :class="msg.senderRole === 'admin' ? 'items-end' : 'items-start'"
              class="flex min-w-0 max-w-[88%] flex-col sm:max-w-xs md:max-w-md"
            >
              <div
                :class="[
                  'rounded-2xl px-3 py-2 text-sm sm:px-4',
                  msg.senderRole === 'admin'
                    ? 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white'
                    : msg.senderRole === 'system'
                      ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200'
                      : 'bg-primary text-white',
                ]"
              >
                <p class="whitespace-pre-wrap [overflow-wrap:anywhere]">
                  {{ msg.content || "[Tin nhắn]" }}
                </p>
              </div>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {{ formatMessageTime(msg.createdAt) }}
              </p>
            </div>
          </div>

          <div
            v-if="!detailLoading && messages.length === 0"
            class="text-sm text-slate-500 dark:text-slate-400"
          >
            Chưa có tin nhắn nào trong hội thoại này
          </div>
        </div>

        <div
          class="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:p-4"
        >
          <div class="flex items-end gap-2">
            <UiButton
              variant="ghost"
              size="sm"
              class="flex-shrink-0"
              title="Tệp đính kèm sẽ làm sau"
              disabled
            >
              <Icon name="solar:paperclip-line-duotone" size="18" />
            </UiButton>

            <UiTextarea
              v-model="messageInput"
              :rows="2"
              class="min-w-0 flex-1"
              placeholder="Nhập tin nhắn..."
              @keydown="handleKeyDown"
            />

            <UiButton
              variant="primary"
              size="md"
              class="flex-shrink-0"
              :disabled="!messageInput.trim() || sendingMessage"
              title="Gửi tin nhắn"
              @click="sendMessage"
            >
              <Icon name="solar:plain-line-duotone" size="18" />
            </UiButton>
          </div>
        </div>
      </div>

      <div
        v-else
        class="hidden flex-1 flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/30 lg:flex"
      >
        <Icon
          name="solar:chat-line-bold-duotone"
          size="64"
          class="mb-4 text-slate-300 dark:text-slate-700"
        />
        <p class="text-lg font-medium text-slate-500 dark:text-slate-400">
          Chọn một cuộc trò chuyện để bắt đầu
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgb(203, 213, 225) rgb(241, 245, 249);
  }

  .scrollbar::-webkit-scrollbar {
    width: 4px;
  }

  .scrollbar::-webkit-scrollbar-track {
    background: rgb(241, 245, 249);
  }

  .scrollbar::-webkit-scrollbar-thumb {
    background: rgb(203, 213, 225);
    border-radius: 3px;
  }

  .scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgb(148, 163, 184);
  }

  .dark .scrollbar::-webkit-scrollbar-track {
    background: rgb(30, 41, 59);
  }

  .dark .scrollbar::-webkit-scrollbar-thumb {
    background: rgb(71, 85, 105);
  }

  .dark .scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgb(100, 116, 139);
  }
</style>
