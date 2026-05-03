interface ParsedOrderItemInput {
  productId: number;
  planId: number;
  productName: string;
  planName: string;
  price: number;
  quantity: number;
}

interface ParsedCreateOrderBody {
  items: ParsedOrderItemInput[];
  couponCode: string;
  note: string | null;
}

interface ParsedCreateTopupBody {
  bankId: number;
  amount: number;
}

interface ParsedLoginBody {
  identifier: string;
  password: string;
}

interface ParsedRegisterBody {
  username: string;
  email: string;
  password: string;
  turnstileToken: string | null;
}

interface ParsedSupportAttachmentInput {
  storageKey: string | null;
  fileName: string | null;
  originalName: string | null;
  fileUrl: string | null;
  thumbnailUrl: string | null;
  mimeType: string | null;
  fileSize: number;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
}

interface ParsedSupportMessageBody {
  conversationId: number | null;
  content: string;
  messageType: string;
  replyToMessageId: number | null;
  clientMessageId: string | null;
  metadata: unknown;
  subject: string;
  orderId: number | null;
  attachments: ParsedSupportAttachmentInput[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toTrimmedString = (value: unknown) => String(value ?? "").trim();

const toNullableTrimmedString = (value: unknown) => {
  const normalized = toTrimmedString(value);
  return normalized || null;
};

const toPositiveInteger = (value: unknown) => {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  if (typeof value === "string") {
    const normalized = value.trim();

    if (!normalized || !/^\d+$/.test(normalized)) {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
};

const toNonNegativeNumber = (value: unknown) => {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  if (typeof value === "string") {
    const normalized = value.trim();

    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  return null;
};

export const parseCreateOrderBody = (body: unknown): ParsedCreateOrderBody => {
  const payload = isRecord(body) ? body : {};
  const rawItems = Array.isArray(payload.items) ? payload.items : [];

  if (rawItems.length === 0) {
    throw createError({ statusCode: 400, message: "Giỏ hàng trống" });
  }

  const items = rawItems.map((rawItem) => {
    if (!isRecord(rawItem)) {
      throw createError({
        statusCode: 400,
        message: "Dữ liệu sản phẩm không hợp lệ",
      });
    }

    const productId = toPositiveInteger(rawItem.productId);
    const planId = toPositiveInteger(rawItem.planId);
    const price = toNonNegativeNumber(rawItem.price);
    const quantity = toPositiveInteger(rawItem.quantity);

    if (!productId || !planId || price === null || !quantity) {
      throw createError({
        statusCode: 400,
        message: "Dữ liệu sản phẩm không hợp lệ",
      });
    }

    return {
      productId,
      planId,
      productName: toTrimmedString(rawItem.productName),
      planName: toTrimmedString(rawItem.planName),
      price,
      quantity,
    };
  });

  return {
    items,
    couponCode: toTrimmedString(payload.couponCode).toUpperCase(),
    note: toNullableTrimmedString(payload.note),
  };
};

export const parseCreateTopupBody = (body: unknown): ParsedCreateTopupBody => {
  const payload = isRecord(body) ? body : {};
  const bankId = toPositiveInteger(payload.bankId);
  const amountValue = toNonNegativeNumber(payload.amount);
  const amount = amountValue === null ? null : Math.floor(amountValue);

  if (!bankId || !amount || amount <= 0) {
    throw createError({
      statusCode: 400,
      message: "Thiếu ngân hàng hoặc số tiền nạp không hợp lệ",
    });
  }

  return {
    bankId,
    amount,
  };
};

export const parseLoginBody = (body: unknown): ParsedLoginBody => {
  const payload = isRecord(body) ? body : {};
  const identifier = toTrimmedString(payload.identifier);
  const password =
    typeof payload.password === "string"
      ? payload.password
      : String(payload.password ?? "");

  if (!identifier || !password) {
    throw createError({
      statusCode: 400,
      message: "Identifier và mật khẩu là bắt buộc",
    });
  }

  return {
    identifier,
    password,
  };
};

export const parseRegisterBody = (body: unknown): ParsedRegisterBody => {
  const payload = isRecord(body) ? body : {};
  const username = toTrimmedString(payload.username);
  const email = toTrimmedString(payload.email).toLowerCase();
  const password =
    typeof payload.password === "string"
      ? payload.password
      : String(payload.password ?? "");
  const turnstileToken = toNullableTrimmedString(payload.turnstileToken);

  if (!username || !email || !password) {
    throw createError({
      statusCode: 400,
      message: "Vui lòng nhập đầy đủ thông tin",
    });
  }

  if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
    throw createError({
      statusCode: 400,
      message: "Tên đăng nhập không hợp lệ",
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({
      statusCode: 400,
      message: "Email không hợp lệ",
    });
  }

  if (password.length < 6) {
    throw createError({
      statusCode: 400,
      message: "Mật khẩu phải có ít nhất 6 ký tự",
    });
  }

  return {
    username,
    email,
    password,
    turnstileToken,
  };
};

export const parseSupportMessageBody = (
  body: unknown
): ParsedSupportMessageBody => {
  const payload = isRecord(body) ? body : {};
  const rawAttachments = Array.isArray(payload.attachments)
    ? payload.attachments
    : [];

  const attachments = rawAttachments.map((rawAttachment) => {
    if (!isRecord(rawAttachment)) {
      throw createError({
        statusCode: 400,
        message: "Tep dinh kem khong hop le",
      });
    }

    const fileSizeValue = toNonNegativeNumber(rawAttachment.fileSize);
    const widthValue = toPositiveInteger(rawAttachment.width);
    const heightValue = toPositiveInteger(rawAttachment.height);
    const durationValue = toPositiveInteger(rawAttachment.durationSeconds);

    return {
      storageKey: toNullableTrimmedString(rawAttachment.storageKey),
      fileName: toNullableTrimmedString(rawAttachment.fileName),
      originalName: toNullableTrimmedString(rawAttachment.originalName),
      fileUrl: toNullableTrimmedString(rawAttachment.fileUrl),
      thumbnailUrl: toNullableTrimmedString(rawAttachment.thumbnailUrl),
      mimeType: toNullableTrimmedString(rawAttachment.mimeType),
      fileSize: fileSizeValue === null ? 0 : Math.floor(fileSizeValue),
      width: widthValue,
      height: heightValue,
      durationSeconds: durationValue,
    };
  });

  const conversationId = toPositiveInteger(payload.conversationId);
  const replyToMessageId = toPositiveInteger(payload.replyToMessageId);
  const orderId = toPositiveInteger(payload.orderId);
  const content = toTrimmedString(payload.content);
  const messageType = toTrimmedString(payload.messageType) || "text";
  const clientMessageId = toNullableTrimmedString(payload.clientMessageId);
  const subject = toTrimmedString(payload.subject);
  const metadata = payload.metadata ?? null;

  if (!content && attachments.length === 0) {
    throw createError({
      statusCode: 400,
      message: "Tin nhan khong duoc de trong",
    });
  }

  return {
    conversationId,
    content,
    messageType,
    replyToMessageId,
    clientMessageId,
    metadata,
    subject,
    orderId,
    attachments,
  };
};

export type {
  ParsedCreateOrderBody,
  ParsedCreateTopupBody,
  ParsedLoginBody,
  ParsedOrderItemInput,
  ParsedRegisterBody,
  ParsedSupportAttachmentInput,
  ParsedSupportMessageBody,
};
