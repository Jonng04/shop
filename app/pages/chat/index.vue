<script setup lang="ts">
  import { SOCKET_EVENTS, type SocketAckResponse } from "~~/shared/socket";
  import {
    parseBusinessDateTimeInput,
    toBusinessDateTimeLocalValue,
  } from "../../../shared/timezone";

  useSeoHead({
    title: "Chat hỗ trợ",
    description: "Trò chuyện trực tiếp với đội hỗ trợ của chúng tôi",
  });

  type ConversationStatus = "active" | "waiting" | "resolved" | "closed";
  type MessageSenderRole = "admin" | "customer" | "system";

  interface ConversationUser {
    id: number;
    username: string;
    email: string;
    role?: string | null;
    status?: string | null;
  }

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
    assignedAt?: string | null;
    firstResponseAt?: string | null;
    resolvedAt?: string | null;
    closedAt?: string | null;
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
  }

  const toast = useToast();
  const { parseServerDate } = useDateFormatter();
  const socket = useSocket();
  const route = useRoute();
  const router = useRouter();
  const { loggedIn, user } = useUserSession();

  const conversations = ref<ConversationItem[]>([]);
  const messages = ref<MessageItem[]>([]);
  const selectedConversationId = ref<number | null>(null);
  const selectedConversationDetail = ref<ConversationItem | null>(null);
  const filterStatus = ref<"all" | ConversationStatus>("all");
  const messageInput = ref("");
  const subjectInput = ref("");
  const messagesContainer = ref<HTMLElement | null>(null);
  const listLoading = ref(false);
  const detailLoading = ref(false);
  const sendingMessage = ref(false);
  const pageReady = ref(false);
  const isCreatingSupport = ref(true);
  const initialDataLoading = ref(true);

  let joinedConversationId: number | null = null;

  const sessionUser = computed(() => user.value as SessionUser | null);
  const currentUserName = computed(
    () =>
      String(
        sessionUser.value?.username || sessionUser.value?.email || "Bạn"
      ).trim() || "Bạn"
  );

  const selectedConversation = computed(
    () =>
      selectedConversationDetail.value ||
      conversations.value.find(
        (item) => item.id === selectedConversationId.value
      ) ||
      null
  );

  const canCreateNewSupportRequest = computed(
    () => conversations.value.length === 0
  );

  const showSupportComposer = computed(
    () =>
      !initialDataLoading.value &&
      canCreateNewSupportRequest.value &&
      isCreatingSupport.value &&
      !selectedConversation.value
  );

  const activeConversationStatus = computed<ConversationStatus | "new">(
    () => selectedConversation.value?.status || "new"
  );

  const canReply = computed(
    () =>
      activeConversationStatus.value === "new" ||
      activeConversationStatus.value === "active" ||
      activeConversationStatus.value === "waiting"
  );

  const stats = computed(() =>
    conversations.value.reduce(
      (result, item) => {
        if (item.status === "active") {
          result.active += 1;
        } else if (item.status === "resolved") {
          result.resolved += 1;
        } else if (item.status === "closed") {
          result.closed += 1;
        } else {
          result.waiting += 1;
        }

        result.totalUnread += Number(item.customerUnreadCount || 0);
        return result;
      },
      {
        active: 0,
        waiting: 0,
        resolved: 0,
        closed: 0,
        totalUnread: 0,
      }
    )
  );

  const filteredConversations = computed(() => {
    if (filterStatus.value === "all") {
      return conversations.value;
    }

    return conversations.value.filter(
      (item) => item.status === filterStatus.value
    );
  });

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

  const formatPrice = (value?: number | null) =>
    Number(value || 0).toLocaleString("vi-VN");

  const formatFileSize = (value?: number | null) => {
    const size = Number(value || 0);

    if (size <= 0) {
      return "";
    }

    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const truncateMessage = (message?: string | null, maxLength: number = 72) => {
    const safeMessage = String(message || "").trim();

    if (!safeMessage) {
      return "Chưa có nội dung";
    }

    return safeMessage.length > maxLength
      ? `${safeMessage.slice(0, maxLength)}...`
      : safeMessage;
  };

  const getConversationBadgeClass = (status: ConversationStatus | "new") => {
    switch (status) {
      case "active":
        return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-900/60";
      case "waiting":
        return "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-900/60";
      case "resolved":
        return "bg-sky-50 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-900/20 dark:text-sky-300 dark:ring-sky-900/60";
      case "closed":
        return "bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
      default:
        return "bg-primary/10 text-primary ring-1 ring-primary/20";
    }
  };

  const getConversationStatusLabel = (status: ConversationStatus | "new") => {
    switch (status) {
      case "active":
        return "Đang hỗ trợ";
      case "waiting":
        return "Đang chờ";
      case "resolved":
        return "Đã giải quyết";
      case "closed":
        return "Đã đóng";
      default:
        return "Cuộc trò chuyện mới";
    }
  };

  const getMessageBubbleClass = (role: MessageSenderRole) => {
    if (role === "customer") {
      return "bg-gradient-to-br from-primary to-emerald-500 text-white";
    }

    if (role === "system") {
      return "bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:ring-amber-900/60";
    }

    return "bg-white text-slate-800 ring-1 ring-slate-200 dark:bg-[#1a1d24] dark:text-slate-100 dark:ring-slate-800";
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

  const upsertConversation = (conversation: ConversationItem) => {
    const exists = conversations.value.some(
      (item) => item.id === conversation.id
    );

    if (!exists) {
      conversations.value = [conversation, ...conversations.value].sort(
        (a, b) => {
          const aTime =
            parseSupportDate(a.lastMessageAt || a.createdAt)?.getTime() || 0;
          const bTime =
            parseSupportDate(b.lastMessageAt || b.createdAt)?.getTime() || 0;
          return bTime - aTime;
        }
      );
      return;
    }

    updateConversationInList(conversation);
  };

  const scrollMessagesToBottom = () => {
    setTimeout(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop =
          messagesContainer.value.scrollHeight;
      }
    }, 40);
  };

  const getConversationDisplayUsername = (
    conversation?: Partial<ConversationItem> | null,
    fallbackUsername?: string | null
  ) =>
    String(conversation?.admin?.username || fallbackUsername || "").trim() ||
    "Đang chờ tiếp nhận";

  const getMessageAvatarSeed = (message: MessageItem) => {
    if (message.senderRole === "customer") {
      return String(
        message.sender?.username || currentUserName.value || ""
      ).trim();
    }

    if (message.senderRole === "admin") {
      return String(
        message.sender?.username ||
          selectedConversation.value?.admin?.username ||
          ""
      ).trim();
    }

    return String(message.sender?.username || "system").trim();
  };

  const joinConversationRoom = async (conversationId: number) => {
    await new Promise<void>((resolve) => {
      socket.emit(
        SOCKET_EVENTS.conversationJoin,
        { conversationId },
        (_ack: SocketAckResponse) => resolve()
      );
    });
    joinedConversationId = conversationId;
  };

  const leaveConversationRoom = async (conversationId: number) => {
    await new Promise<void>((resolve) => {
      socket.emit(
        SOCKET_EVENTS.conversationLeave,
        { conversationId },
        (_ack: SocketAckResponse) => resolve()
      );
    });

    if (joinedConversationId === conversationId) {
      joinedConversationId = null;
    }
  };

  const loadConversations = async () => {
    if (!loggedIn.value) {
      conversations.value = [];
      return;
    }

    listLoading.value = true;

    try {
      const response = await $fetch<{
        items: ConversationItem[];
      }>("/api/support/conversations", {
        query: {
          status: filterStatus.value,
          page: 1,
          pageSize: 50,
        },
      });

      conversations.value = response.items || [];
    } catch (error: any) {
      toast.error(
        "Thất bại",
        error?.data?.message ||
          error?.message ||
          "Không thể tải danh sách hỗ trợ"
      );
    } finally {
      listLoading.value = false;
    }
  };

  const loadConversationDetail = async (conversationId: number) => {
    detailLoading.value = true;

    try {
      const response = await $fetch<ConversationDetailResponse>(
        `/api/support/conversations/${conversationId}`,
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
          "Không thể tải cuộc trò chuyện"
      );
    } finally {
      detailLoading.value = false;
    }
  };

  const markConversationAsRead = async (conversationId: number) => {
    try {
      await $fetch(`/api/support/conversations/${conversationId}`, {
        method: "PATCH",
        body: { read: true },
      });

      updateConversationInList({
        id: conversationId,
        customerUnreadCount: 0,
      });

      if (selectedConversationDetail.value?.id === conversationId) {
        selectedConversationDetail.value = {
          ...selectedConversationDetail.value,
          customerUnreadCount: 0,
        };
      }
    } catch {}
  };

  const selectConversation = async (conversationId: number) => {
    if (!loggedIn.value) {
      return;
    }

    if (joinedConversationId && joinedConversationId !== conversationId) {
      await leaveConversationRoom(joinedConversationId);
    }

    isCreatingSupport.value = false;
    selectedConversationId.value = conversationId;
    await router.replace({
      query: {
        ...route.query,
        id: String(conversationId),
      },
    });
    await loadConversationDetail(conversationId);
    await joinConversationRoom(conversationId);
    await markConversationAsRead(conversationId);
  };

  const openComposer = async () => {
    if (!canCreateNewSupportRequest.value) {
      return;
    }

    if (joinedConversationId) {
      await leaveConversationRoom(joinedConversationId);
    }

    isCreatingSupport.value = true;
    selectedConversationId.value = null;
    selectedConversationDetail.value = null;
    messages.value = [];
    messageInput.value = "";
    subjectInput.value = "";

    const nextQuery = { ...route.query };
    delete nextQuery.id;
    await router.replace({ query: nextQuery });
  };

  const backToConversationList = async () => {
    if (joinedConversationId) {
      await leaveConversationRoom(joinedConversationId);
    }

    isCreatingSupport.value = canCreateNewSupportRequest.value;
    selectedConversationId.value = null;
    selectedConversationDetail.value = null;
    messages.value = [];

    const nextQuery = { ...route.query };
    delete nextQuery.id;
    await router.replace({ query: nextQuery });
  };

  const sendMessage = async () => {
    if (!loggedIn.value || sendingMessage.value) {
      return;
    }

    const content = messageInput.value.trim();
    const subject = subjectInput.value.trim();

    if (!content) {
      return;
    }

    if (!selectedConversationId.value && !subject) {
      toast.error("Thiếu thông tin", "Vui lòng nhập yêu cầu hỗ trợ");
      return;
    }

    sendingMessage.value = true;

    try {
      const response = await $fetch<{
        data?: {
          conversationId: number;
          conversation: ConversationItem;
          message: MessageItem;
        };
      }>(
        `/api/support/conversations/${selectedConversationId.value || 0}/messages`,
        {
          method: "POST",
          body: {
            content,
            subject: selectedConversationId.value ? undefined : subject,
            messageType: "text",
            clientMessageId: crypto.randomUUID(),
          },
        }
      );

      const nextConversation = response.data?.conversation || null;
      const nextMessage = response.data?.message || null;
      const nextConversationId =
        Number(response.data?.conversationId || 0) || null;

      if (nextConversation) {
        upsertConversation(nextConversation);
        selectedConversationDetail.value = nextConversation;
      }

      if (nextMessage) {
        const exists = messages.value.some(
          (item) => item.id === nextMessage.id
        );

        if (!exists) {
          messages.value = [...messages.value, nextMessage];
        }
      }

      if (nextConversationId) {
        const shouldJoin = joinedConversationId !== nextConversationId;
        isCreatingSupport.value = false;
        selectedConversationId.value = nextConversationId;
        await router.replace({
          query: {
            ...route.query,
            id: String(nextConversationId),
          },
        });

        if (shouldJoin) {
          if (joinedConversationId) {
            await leaveConversationRoom(joinedConversationId);
          }

          await joinConversationRoom(nextConversationId);
        }

        await markConversationAsRead(nextConversationId);
      }

      messageInput.value = "";
      subjectInput.value = nextConversation?.subject || "";
      scrollMessagesToBottom();
    } catch (error: any) {
      toast.error(
        "Thất bại",
        error?.data?.message || error?.message || "Không thể gửi tin nhắn"
      );
    } finally {
      sendingMessage.value = false;
    }
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
      payload.message.senderRole === "admin"
        ? Number(existingConversation?.customerUnreadCount || 0) + 1
        : 0;

    updateConversationInList({
      id: payload.conversationId,
      lastMessagePreview: preview,
      lastMessageSenderRole: payload.message.senderRole,
      lastMessageAt: payload.message.createdAt || nowBusinessTime(),
      customerUnreadCount: nextUnread,
    });

    if (selectedConversationId.value === payload.conversationId) {
      const exists = messages.value.some(
        (item) => item.id === payload.message.id
      );

      if (!exists) {
        messages.value = [...messages.value, payload.message];
        scrollMessagesToBottom();
      }

      if (payload.message.senderRole === "admin") {
        markConversationAsRead(payload.conversationId);
      }
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
      upsertConversation(payload.conversation);

      if (selectedConversationId.value === payload.conversationId) {
        selectedConversationDetail.value = {
          ...(selectedConversationDetail.value || payload.conversation),
          ...payload.conversation,
        };
      }

      return;
    }

    if (payload.status) {
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
  };

  const handleSocketConversationRead = (payload: {
    conversationId: number;
    actorRole?: string;
  }) => {
    if (!payload?.conversationId || payload.actorRole !== "customer") {
      return;
    }

    updateConversationInList({
      id: payload.conversationId,
      customerUnreadCount: 0,
    });

    if (
      selectedConversationId.value === payload.conversationId &&
      selectedConversationDetail.value
    ) {
      selectedConversationDetail.value = {
        ...selectedConversationDetail.value,
        customerUnreadCount: 0,
      };
    }
  };

  const handleSocketConversationResolved = (payload: {
    conversationId: number;
    status?: ConversationStatus;
  }) => {
    if (!payload?.conversationId) {
      return;
    }

    const nextStatus = payload.status || "resolved";

    updateConversationInList({
      id: payload.conversationId,
      status: nextStatus,
    });

    if (
      selectedConversationId.value === payload.conversationId &&
      selectedConversationDetail.value
    ) {
      selectedConversationDetail.value = {
        ...selectedConversationDetail.value,
        status: nextStatus,
      };
    }
  };

  watch(filterStatus, () => {
    loadConversations();
  });

  watch(
    () => route.query.id,
    async (id) => {
      if (!pageReady.value || !loggedIn.value) {
        return;
      }

      const nextConversationId = Number(id || 0);

      if (!nextConversationId) {
        if (joinedConversationId) {
          await leaveConversationRoom(joinedConversationId);
        }
        isCreatingSupport.value = canCreateNewSupportRequest.value;
        selectedConversationId.value = null;
        selectedConversationDetail.value = null;
        messages.value = [];
        return;
      }

      if (selectedConversationId.value !== nextConversationId) {
        await selectConversation(nextConversationId);
      }
    }
  );

  watch(selectedConversation, (conversation) => {
    if (!conversation) {
      useHead({ title: "Chat hỗ trợ" });
      return;
    }

    useHead({
      title: `Chat với ${conversation.customer?.username || "Khách hàng"}`,
    });
  });

  watch(showSupportComposer, (visible) => {
    if (!visible || selectedConversation.value) {
      return;
    }

    useHead({
      title: "Tạo yêu cầu hỗ trợ",
    });
  });

  onMounted(async () => {
    pageReady.value = true;

    if (!loggedIn.value) {
      initialDataLoading.value = false;
      return;
    }

    try {
      await loadConversations();

      const idFromQuery = Number(route.query.id || 0);

      if (idFromQuery) {
        await selectConversation(idFromQuery);
      } else {
        isCreatingSupport.value = canCreateNewSupportRequest.value;
      }

      socket.on(SOCKET_EVENTS.messageNew, handleSocketMessageNew);
      socket.on(
        SOCKET_EVENTS.conversationUpdated,
        handleSocketConversationUpdated
      );
      socket.on(SOCKET_EVENTS.conversationRead, handleSocketConversationRead);
      socket.on(
        SOCKET_EVENTS.conversationResolved,
        handleSocketConversationResolved
      );
    } finally {
      initialDataLoading.value = false;
    }
  });

  onBeforeUnmount(async () => {
    socket.off(SOCKET_EVENTS.messageNew, handleSocketMessageNew);
    socket.off(
      SOCKET_EVENTS.conversationUpdated,
      handleSocketConversationUpdated
    );
    socket.off(SOCKET_EVENTS.conversationRead, handleSocketConversationRead);
    socket.off(
      SOCKET_EVENTS.conversationResolved,
      handleSocketConversationResolved
    );

    if (joinedConversationId) {
      await leaveConversationRoom(joinedConversationId);
    }
  });
</script>

<template>
  <div
    class="min-h-screen bg-[#f3f6f8] font-sans text-slate-800 dark:bg-[#0f1115] dark:text-slate-200"
  >
    <LayoutHeader />
    <LayoutNavbar />

    <main class="mx-auto max-w-[1440px] px-4 pb-16 pt-6 lg:px-6">
      <div class="mb-6 flex items-center gap-2 text-[13px] text-slate-500">
        <NuxtLink
          to="/"
          class="flex items-center gap-1.5 transition-colors hover:text-primary"
        >
          <Icon name="solar:home-smile-linear" size="16" />
          Trang chủ
        </NuxtLink>
        <Icon name="solar:alt-arrow-right-linear" size="14" />
        <span class="font-medium text-slate-800 dark:text-slate-200">
          Chat hỗ trợ
        </span>
      </div>

      <section
        class="flex h-[calc(100vh-220px)] min-h-[640px] max-h-[860px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_-50px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-[#181a1f]"
      >
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
                Chat hỗ trợ
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

        <div v-if="!loggedIn" class="px-5 py-16 lg:px-8">
          <div
            class="mx-auto flex max-w-xl flex-col items-center rounded-[24px] border border-dashed border-slate-300 bg-[#f8fafc] px-6 py-12 text-center dark:border-slate-700 dark:bg-[#11151b]"
          >
            <div
              class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"
            >
              <Icon name="solar:lock-keyhole-bold-duotone" size="30" />
            </div>
            <h2 class="text-2xl font-black text-slate-900 dark:text-white">
              Đăng nhập để mở chat hỗ trợ
            </h2>
            <p
              class="mt-3 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400"
            >
              Bạn cần đăng nhập để xem lịch sử hội thoại và gửi yêu cầu hỗ trợ
              mới.
            </p>
            <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
              <NuxtLink to="/auth/login">
                <UiButton size="lg" class="!rounded-xl !px-6">
                  Đăng nhập
                </UiButton>
              </NuxtLink>
              <NuxtLink to="/auth/register">
                <UiButton variant="outline" size="lg" class="!rounded-xl !px-6">
                  Tạo tài khoản
                </UiButton>
              </NuxtLink>
            </div>
          </div>
        </div>

        <template v-else>
          <div
            v-if="initialDataLoading"
            class="flex min-h-0 flex-1 overflow-hidden"
          >
            <aside
              class="hidden min-h-0 w-full flex-col border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex lg:w-80 lg:flex-shrink-0 lg:border-r xl:w-96"
            >
              <div class="border-b border-slate-200 p-4 dark:border-slate-800">
                <div
                  class="h-10 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800"
                />
              </div>

              <div
                class="scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto p-2"
              >
                <div
                  v-for="item in 5"
                  :key="`chat-list-skeleton-${item}`"
                  class="rounded-xl px-4 py-4"
                >
                  <div class="flex items-start gap-3">
                    <div
                      class="h-10 w-10 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800"
                    />
                    <div class="min-w-0 flex-1 space-y-2">
                      <div class="flex items-center justify-between gap-3">
                        <div
                          class="h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800"
                        />
                        <div
                          class="h-5 w-16 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800"
                        />
                      </div>
                      <div
                        class="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800"
                      />
                      <div
                        class="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            <section
              class="flex min-h-0 flex-1 flex-col bg-white dark:bg-slate-900"
            >
              <div
                class="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50 sm:px-6 sm:py-4"
              >
                <div class="flex items-center justify-between gap-4">
                  <div class="flex min-w-0 items-center gap-3">
                    <div
                      class="h-10 w-10 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800"
                    />
                    <div class="space-y-2">
                      <div
                        class="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800"
                      />
                      <div
                        class="h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800"
                      />
                    </div>
                  </div>
                  <div
                    class="h-6 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div
                class="scrollbar min-h-0 flex flex-1 flex-col space-y-6 overflow-y-auto p-3 sm:p-4 lg:p-6"
              >
                <div
                  v-for="item in 4"
                  :key="`chat-message-skeleton-${item}`"
                  class="flex gap-3"
                  :class="item % 2 === 0 ? 'justify-end' : 'justify-start'"
                >
                  <div
                    v-if="item % 2 !== 0"
                    class="h-8 w-8 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800"
                  />
                  <div class="max-w-[70%] space-y-2">
                    <div
                      class="h-12 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"
                      :class="item % 2 === 0 ? 'w-56' : 'w-44'"
                    />
                    <div
                      class="h-3 animate-pulse rounded bg-slate-200 dark:bg-slate-800"
                      :class="item % 2 === 0 ? 'ml-auto w-16' : 'w-16'"
                    />
                  </div>
                  <div
                    v-if="item % 2 === 0"
                    class="h-8 w-8 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div
                class="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:p-4"
              >
                <div class="flex items-end gap-2">
                  <div
                    class="h-9 w-9 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800"
                  />
                  <div
                    class="h-20 flex-1 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"
                  />
                  <div
                    class="h-11 w-11 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800"
                  />
                </div>
              </div>
            </section>
          </div>

          <div v-else class="flex min-h-0 flex-1 overflow-hidden">
            <aside
              :class="[
                'min-h-0 flex-col border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
                selectedConversation || showSupportComposer
                  ? 'hidden lg:flex'
                  : 'flex',
                'w-full lg:w-80 lg:flex-shrink-0 lg:border-r xl:w-96',
              ]"
            >
              <div
                v-if="canCreateNewSupportRequest"
                class="border-b border-slate-200 p-4 dark:border-slate-800"
              >
                <UiButton class="w-full !justify-center" @click="openComposer">
                  <template #prefix>
                    <Icon name="solar:add-circle-bold-duotone" size="18" />
                  </template>
                  Yêu cầu hỗ trợ mới
                </UiButton>
              </div>

              <div class="scrollbar min-h-0 flex-1 overflow-y-auto p-2">
                <div
                  v-if="listLoading"
                  class="px-4 py-8 text-sm text-slate-500 dark:text-slate-400"
                >
                  Đang tải hội thoại...
                </div>

                <template v-else>
                  <button
                    v-for="conversation in filteredConversations"
                    :key="conversation.id"
                    class="mb-1 block w-full rounded-xl px-4 py-4 text-left transition-all"
                    :class="[
                      'cursor-pointer sm:p-4',
                      selectedConversationId === conversation.id
                        ? 'bg-primary/10 ring-1 ring-primary/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                    ]"
                    @click="selectConversation(conversation.id)"
                  >
                    <div class="flex items-start gap-2.5">
                      <div class="relative flex-shrink-0">
                        <div
                          class="h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                        >
                          <img
                            :src="`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(getConversationDisplayUsername(conversation))}`"
                            :alt="getConversationDisplayUsername(conversation)"
                            class="h-full w-full object-cover"
                          />
                        </div>
                      </div>

                      <div class="min-w-0 flex-1">
                        <div
                          class="mb-0.5 flex items-start justify-between gap-1.5"
                        >
                          <p
                            class="truncate text-sm font-medium text-slate-900 dark:text-white"
                          >
                            {{ getConversationDisplayUsername(conversation) }}
                          </p>
                          <span
                            :class="[
                              'flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium',
                              getConversationBadgeClass(conversation.status),
                            ]"
                          >
                            {{
                              getConversationStatusLabel(conversation.status)
                            }}
                          </span>
                        </div>

                        <div class="flex items-center justify-between gap-1.5">
                          <p
                            :class="[
                              'line-clamp-1 text-[14px] text-slate-900 font-semibold',
                              conversation.customerUnreadCount > 0
                                ? 'font-bold text-slate-900 dark:text-white'
                                : 'text-slate-500 dark:text-slate-400',
                            ]"
                          >
                            {{
                              truncateMessage(conversation.lastMessagePreview)
                            }}
                          </p>
                          <span
                            v-if="conversation.customerUnreadCount > 0"
                            class="inline-flex flex-shrink-0 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-xs font-bold leading-none text-white"
                          >
                            {{ conversation.customerUnreadCount }}
                          </span>
                        </div>

                        <p
                          class="mt-0.5 text-[12px] text-slate-600 dark:text-slate-500"
                        >
                          {{
                            formatRelativeTime(
                              conversation.lastMessageAt ||
                                conversation.createdAt
                            )
                          }}
                        </p>
                      </div>
                    </div>
                  </button>

                  <div
                    v-if="filteredConversations.length === 0"
                    class="flex flex-col items-center px-6 py-14 text-center"
                  >
                    <div
                      class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-[#1b2028] dark:text-slate-500"
                    >
                      <Icon
                        name="solar:chat-round-unread-bold-duotone"
                        size="30"
                      />
                    </div>
                    <p
                      class="text-base font-bold text-slate-800 dark:text-slate-200"
                    >
                      Chưa có hội thoại phù hợp
                    </p>
                    <p
                      class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400"
                    >
                      Tạo cuộc trò chuyện mới để liên hệ với admin hỗ trợ.
                    </p>
                  </div>
                </template>
              </div>
            </aside>

            <section
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
                      <Icon
                        name="solar:alt-arrow-left-line-duotone"
                        size="18"
                      />
                    </UiButton>

                    <div class="relative">
                      <div
                        class="h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                      >
                        <img
                          :src="`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(getConversationDisplayUsername(selectedConversation))}`"
                          :alt="
                            getConversationDisplayUsername(selectedConversation)
                          "
                          class="h-full w-full object-cover"
                        />
                      </div>
                    </div>

                    <div class="min-w-0">
                      <h2
                        class="truncate font-semibold text-slate-900 dark:text-white"
                      >
                        {{
                          getConversationDisplayUsername(selectedConversation)
                        }}
                      </h2>
                    </div>
                  </div>

                  <div class="flex flex-wrap items-center justify-end gap-2">
                    <span
                      :class="[
                        'rounded px-2 py-1 text-xs font-medium',
                        getConversationBadgeClass(selectedConversation.status),
                      ]"
                    >
                      {{
                        getConversationStatusLabel(selectedConversation.status)
                      }}
                    </span>
                  </div>
                </div>

                <div
                  class="mt-3 grid gap-2 text-xs text-slate-500 dark:text-slate-400 lg:grid-cols-[minmax(0,1fr)_220px]"
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
                    <span v-if="selectedConversation.order?.totalAmount">
                      Giá trị:
                      <strong class="text-slate-700 dark:text-slate-200"
                        >{{
                          formatPrice(selectedConversation.order.totalAmount)
                        }}đ</strong
                      >
                    </span>
                  </div>
                </div>
              </div>

              <div
                ref="messagesContainer"
                class="scrollbar min-h-0 flex flex-1 flex-col space-y-4 overflow-y-auto p-3 sm:p-4 lg:p-6"
              >
                <div
                  v-if="detailLoading"
                  class="text-sm text-slate-500 dark:text-slate-400"
                >
                  Đang tải tin nhắn...
                </div>

                <template v-else-if="messages.length">
                  <article
                    v-for="message in messages"
                    :key="message.id"
                    class="mb-4 flex w-full gap-2 sm:gap-3"
                    :class="
                      message.senderRole === 'customer'
                        ? 'flex-row-reverse justify-start'
                        : 'justify-start'
                    "
                  >
                    <div
                      :class="[
                        'h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border bg-white',
                        message.senderRole === 'customer'
                          ? 'border-primary/20 dark:border-primary/30'
                          : message.senderRole === 'system'
                            ? 'border-amber-200 dark:border-amber-800'
                            : 'border-slate-200 dark:border-slate-700',
                      ]"
                    >
                      <img
                        v-if="getMessageAvatarSeed(message)"
                        :src="`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(getMessageAvatarSeed(message))}`"
                        :alt="message.sender?.username || message.senderRole"
                        class="h-full w-full object-cover"
                      />
                      <div
                        v-else
                        class="flex h-full w-full items-center justify-center text-slate-400 dark:text-slate-500"
                      >
                        <Icon name="solar:user-circle-line-duotone" size="16" />
                      </div>
                    </div>

                    <div
                      class="flex min-w-0 max-w-[88%] flex-col sm:max-w-xs md:max-w-md"
                      :class="
                        message.senderRole === 'customer'
                          ? 'items-end'
                          : 'items-start'
                      "
                    >
                      <div
                        :class="
                          message.senderRole === 'customer'
                            ? 'bg-primary text-white'
                            : message.senderRole === 'system'
                              ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200'
                              : 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white'
                        "
                        class="rounded-2xl px-3 py-2 text-sm sm:px-4"
                      >
                        <p
                          v-if="message.content"
                          class="whitespace-pre-wrap break-words"
                        >
                          {{ message.content }}
                        </p>
                        <p v-else-if="message.attachments?.length">
                          Tệp đính kèm
                        </p>
                        <p v-else>[Tin nhắn]</p>

                        <div
                          v-if="message.attachments?.length"
                          class="mt-3 space-y-2"
                        >
                          <a
                            v-for="attachment in message.attachments"
                            :key="attachment.id"
                            :href="attachment.fileUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="flex items-center gap-3 rounded-xl bg-black/5 px-3 py-2 text-left transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
                          >
                            <div
                              class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/80 text-slate-700 dark:bg-[#0f1115] dark:text-slate-200"
                            >
                              <Icon
                                :name="
                                  String(attachment.mimeType || '').startsWith(
                                    'image/'
                                  )
                                    ? 'solar:gallery-bold-duotone'
                                    : 'solar:document-bold-duotone'
                                "
                                size="18"
                              />
                            </div>
                            <div class="min-w-0 flex-1">
                              <p class="truncate text-sm font-semibold">
                                {{
                                  attachment.originalName || attachment.fileName
                                }}
                              </p>
                              <p class="text-xs opacity-70">
                                {{ formatFileSize(attachment.fileSize) }}
                              </p>
                            </div>
                          </a>
                        </div>
                      </div>

                      <p
                        class="mt-1 text-xs text-slate-500 dark:text-slate-400"
                      >
                        {{ formatMessageTime(message.createdAt) }}
                      </p>
                    </div>
                  </article>
                </template>

                <div v-else class="text-sm text-slate-500 dark:text-slate-400">
                  Chưa có tin nhắn nào trong hội thoại này
                </div>
              </div>

              <div
                class="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:p-4"
              >
                <div
                  v-if="!canReply"
                  class="mb-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-900/60"
                >
                  Hội thoại này đã hoàn tất hoặc đã đóng. Gửi tin nhắn mới để hệ
                  thống tạo cuộc trò chuyện hỗ trợ khác.
                </div>

                <div class="flex items-end gap-2">
                  <UiButton
                    variant="ghost"
                    size="sm"
                    class="flex-shrink-0"
                    disabled
                    title="Gửi tệp sẽ nối sau"
                  >
                    <Icon name="solar:paperclip-line-duotone" size="18" />
                  </UiButton>

                  <UiTextarea
                    v-model="messageInput"
                    :rows="2"
                    class="min-w-0 flex-1"
                    :placeholder="
                      canReply
                        ? 'Nhập tin nhắn...'
                        : 'Tạo cuộc trò chuyện mới để tiếp tục'
                    "
                    :disabled="!canReply || sendingMessage"
                    @keydown="handleKeyDown"
                  />

                  <UiButton
                    variant="primary"
                    size="md"
                    class="flex-shrink-0"
                    :disabled="
                      !messageInput.trim() || sendingMessage || !canReply
                    "
                    title="Gửi tin nhắn"
                    @click="sendMessage"
                  >
                    <Icon name="solar:plain-line-duotone" size="18" />
                  </UiButton>
                </div>
              </div>
            </section>

            <section
              v-else-if="showSupportComposer"
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
                      <Icon
                        name="solar:alt-arrow-left-line-duotone"
                        size="18"
                      />
                    </UiButton>

                    <div class="relative">
                      <div
                        class="h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                      >
                        <img
                          src="https://api.dicebear.com/7.x/notionists/svg?seed=support-ticket"
                          alt="Support"
                          class="h-full w-full object-cover"
                        />
                      </div>
                    </div>

                    <div class="min-w-0">
                      <h2
                        class="truncate font-semibold text-slate-900 dark:text-white"
                      >
                        Tạo yêu cầu hỗ trợ
                      </h2>
                    </div>
                  </div>

                  <div class="flex flex-wrap items-center justify-end gap-2">
                    <span
                      :class="[
                        'rounded px-2 py-1 text-xs font-medium',
                        getConversationBadgeClass('new'),
                      ]"
                    >
                      Mới
                    </span>
                  </div>
                </div>
              </div>

              <div
                class="scrollbar flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto p-6 text-center"
              >
                <div
                  class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"
                >
                  <Icon name="solar:chat-line-bold-duotone" size="30" />
                </div>
                <h3
                  class="text-lg font-semibold text-slate-900 dark:text-white"
                >
                  Gửi yêu cầu hỗ trợ mới
                </h3>
                <p
                  class="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400"
                >
                  Nhập yêu cầu hỗ trợ và tin nhắn đầu tiên để tạo ticket mới.
                </p>
              </div>

              <div
                class="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:p-4"
              >
                <div class="mb-3">
                  <UiInput
                    v-model="subjectInput"
                    placeholder="Nhập yêu cầu hỗ trợ"
                    :disabled="sendingMessage"
                    class="w-full"
                  />
                </div>

                <div class="flex items-end gap-2">
                  <UiButton
                    variant="ghost"
                    size="sm"
                    class="flex-shrink-0"
                    disabled
                    title="Gửi tệp sẽ nối sau"
                  >
                    <Icon name="solar:paperclip-line-duotone" size="18" />
                  </UiButton>

                  <UiTextarea
                    v-model="messageInput"
                    :rows="2"
                    class="min-w-0 flex-1"
                    placeholder="Mô tả chi tiết vấn đề của bạn..."
                    :disabled="sendingMessage"
                    @keydown="handleKeyDown"
                  />

                  <UiButton
                    variant="primary"
                    size="md"
                    class="flex-shrink-0"
                    :disabled="
                      !subjectInput.trim() ||
                      !messageInput.trim() ||
                      sendingMessage
                    "
                    title="Gửi tin nhắn"
                    @click="sendMessage"
                  >
                    <Icon name="solar:plain-line-duotone" size="18" />
                  </UiButton>
                </div>
              </div>
            </section>
          </div>
        </template>
      </section>
    </main>

    <LayoutFooter />
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
