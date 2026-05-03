import {
  mysqlTable,
  text,
  varchar,
  int,
  bigint,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/mysql-core";

// Helper để tái sử dụng cột ID tự tăng cho MySQL
const id = (name: string) => int(name).primaryKey().autoincrement();

// 1. Danh mục (Categories)
export const categories = mysqlTable(
  "categories",
  {
    id: id("id"),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).unique(),
    image: text("image"),
    status: varchar("status", { length: 50 }).default("active"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_categories_status").on(table.status)]
);

// 2. Sản phẩm (Products)
export const products = mysqlTable(
  "products",
  {
    id: id("id"),
    categoryId: int("category_id").references(() => categories.id),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).unique(),
    image: text("image"),
    description: text("description"),
    deliveryType: varchar("delivery_type", { length: 50 }).default("manual"), // manual | instant
    status: varchar("status", { length: 50 }).default("active"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_products_category_id").on(table.categoryId),
    index("idx_products_status").on(table.status),
    index("idx_products_status_name").on(table.status, table.name),
    index("idx_products_status_slug").on(table.status, table.slug),
  ]
);

// 3. Gói sản phẩm (Plans)
export const plans = mysqlTable(
  "plans",
  {
    id: id("id"),
    productId: int("product_id").references(() => products.id),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).unique(),
    image: text("image"),
    price: bigint("price", { mode: "number" }).notNull(),
    durationValue: int("duration_value"),
    durationType: varchar("duration_type", { length: 50 }),
    status: varchar("status", { length: 50 }).default("active"),
    description: text("description"),
    deliveryType: varchar("delivery_type", { length: 50 }).default("manual"), // manual | instant
    fields: text("fields"), // JSON: [{label, key, type, required}]
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_plans_product_id").on(table.productId),
    index("idx_plans_product_status").on(table.productId, table.status),
  ]
);

// 4. Kho hàng (Stocks)
export const stocks = mysqlTable(
  "stocks",
  {
    id: id("id"),
    planId: int("plan_id").references(() => plans.id),
    content: text("content").notNull(),
    status: varchar("status", { length: 50 }).default("available"),
    orderId: int("order_id"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_stocks_plan_id").on(table.planId),
    index("idx_stocks_plan_status").on(table.planId, table.status),
  ]
);

// 5. Vai trò quản trị (Admin Roles)
export const adminRoles = mysqlTable("admin_roles", {
  id: id("id"),
  name: varchar("name", { length: 255 }).notNull().unique(), // Tên vai trò hiển thị, ví dụ: Super Admin, Hỗ trợ
  role: text("role"), // Danh sách quyền, ví dụ: view_orders,view_users,edit_users
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// 6. Khách hàng (Users)
export const users = mysqlTable(
  "users",
  {
    id: id("id"),
    username: varchar("username", { length: 255 }).notNull().unique(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),

    // Tài chính & Phân quyền
    balance: bigint("balance", { mode: "number" }).default(0),
    totalBalance: bigint("total_balance", { mode: "number" }).default(0), // Tổng nạp
    role: varchar("role", { length: 255 }).default("user"), // user | tên vai trò admin

    // Bảo mật & Token
    resetToken: varchar("reset_token", { length: 255 }), // Token quên mật khẩu
    lastIp: varchar("last_ip", { length: 45 }), // Lưu IP login cuối
    device: text("device"), // Lưu thông tin thiết bị (User-Agent)
    referredByRefCode: varchar("referred_by_ref_code", { length: 100 }), // Ref code người giới thiệu
    loginAttempts: int("login_attempts").default(0), // Đếm số lần login sai
    status: varchar("status", { length: 50 }).default("active"), // active | banned
    lastLoginAt: timestamp("last_login_at"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => [
    index("idx_users_status").on(table.status),
    index("idx_users_role").on(table.role),
    index("idx_users_created_at").on(table.createdAt),
    index("idx_users_referred_by_ref_code").on(table.referredByRefCode),
  ]
);

// 7.1 API Keys (Khóa API cho tích hợp bên ngoài)
export const apiKeys = mysqlTable(
  "api_keys",
  {
    id: id("id"),
    userId: int("user_id")
      .references(() => users.id)
      .notNull(),
    name: varchar("name", { length: 120 }),
    apiKey: varchar("api_key", { length: 255 }).notNull().unique(),
    secretHash: varchar("secret_hash", { length: 255 }).notNull(),
    status: varchar("status", { length: 50 }).default("active"),
    lastUsedAt: timestamp("last_used_at"),
    expiresAt: timestamp("expires_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => [
    index("api_keys_user_idx").on(table.userId),
    index("api_keys_status_idx").on(table.status),
    index("api_keys_user_status_idx").on(table.userId, table.status),
  ]
);

// 7. Đơn hàng (Orders)
export const orders = mysqlTable(
  "orders",
  {
    id: id("id"),
    orderCode: varchar("order_code", { length: 50 }).notNull().unique(), // Mã đơn hiển thị cho admin/user, ví dụ: ORD-20260330-0001
    userId: int("user_id").references(() => users.id),
    assignedAdminId: int("assigned_admin_id").references(() => users.id), // Admin đang phụ trách xử lý đơn

    // Kiểu đơn & cách giao hàng
    orderType: varchar("order_type", { length: 50 }).default("instant"), // instant | manual_order | preorder

    // Thanh toán
    paymentType: varchar("payment_type", { length: 50 }).default("balance"), // balance | payment
    paymentId: int("payment_id"), // Giữ ID mềm để tránh vòng FK với bảng payments

    // Xử lý / fulfillment
    fulfillmentStatus: varchar("fulfillment_status", { length: 50 }).default(
      "pending"
    ), // pending | processing | partially_delivered | delivered | cancelled | failed
    couponCode: varchar("coupon_code", { length: 100 }),
    affiliateCommissionId: int("affiliate_commission_id"), // Soft ref → affiliate_commissions.id

    // Tổng tiền
    subtotalAmount: bigint("subtotal_amount", { mode: "number" }).default(0),
    discountAmount: bigint("discount_amount", { mode: "number" }).default(0),
    totalAmount: bigint("total_amount", { mode: "number" }).notNull(),

    // Trạng thái tổng thể của đơn
    status: varchar("status", { length: 50 }).default("pending"), // pending | processing | completed | cancelled | refunded | failed

    // Ghi chú
    customerNote: text("customer_note"),
    adminNote: text("admin_note"),
    reason: text("reason"), // Lý do hủy / lỗi / hoàn tiền nếu có

    // Các mốc thời gian quan trọng
    reservationExpiresAt: timestamp("reservation_expires_at"), // Hết hạn giữ đơn / chờ thanh toán
    processingAt: timestamp("processing_at"),
    deliveredAt: timestamp("delivered_at"),
    completedAt: timestamp("completed_at"),
    cancelledAt: timestamp("cancelled_at"),
    refundedAt: timestamp("refunded_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => [
    index("idx_orders_user_id").on(table.userId),
    index("idx_orders_status").on(table.status),
    index("idx_orders_user_created").on(table.userId, table.createdAt),
  ]
);

// 8. Hội thoại hỗ trợ (Support Conversations)
export const supportConversations = mysqlTable(
  "support_conversations",
  {
    id: id("id"),
    conversationCode: varchar("conversation_code", { length: 50 })
      .notNull()
      .unique(), // Mã hội thoại hiển thị cho admin/user, ví dụ: CHAT-20260331-0001
    customerUserId: int("customer_user_id")
      .references(() => users.id)
      .notNull(), // Khách hàng mở chat
    adminUserId: int("admin_user_id").references(() => users.id), // Admin đang phụ trách, có thể null khi chưa nhận
    assignedByUserId: int("assigned_by_user_id").references(() => users.id), // Admin thực hiện gán/chuyển hội thoại
    orderId: int("order_id").references(() => orders.id), // Nếu chat phát sinh từ đơn hàng

    // Trạng thái hội thoại
    status: varchar("status", { length: 50 }).default("waiting"), // waiting | active | resolved | closed
    priority: varchar("priority", { length: 50 }).default("normal"), // low | normal | high | urgent
    source: varchar("source", { length: 50 }).default("web"), // web | order | system
    subject: varchar("subject", { length: 255 }), // Tiêu đề ngắn hoặc chủ đề chat
    tags: text("tags"), // CSV hoặc JSON string nếu cần gắn nhãn

    // Snapshot nhanh để render danh sách hội thoại
    lastMessageId: int("last_message_id"), // Soft reference để tránh vòng FK
    lastMessagePreview: text("last_message_preview"), // Preview tin cuối cho sidebar/list
    lastMessageSenderRole: varchar("last_message_sender_role", {
      length: 50,
    }), // customer | admin | system
    lastMessageAt: timestamp("last_message_at"),

    // Bộ đếm unread để query nhanh, không phải count từ support_messages mỗi lần
    customerUnreadCount: int("customer_unread_count").default(0),
    adminUnreadCount: int("admin_unread_count").default(0),

    // Soft pointer last-read để hỗ trợ read receipt
    customerLastReadMessageId: int("customer_last_read_message_id"),
    adminLastReadMessageId: int("admin_last_read_message_id"),

    // Mốc xử lý
    assignedAt: timestamp("assigned_at"),
    firstResponseAt: timestamp("first_response_at"),
    resolvedAt: timestamp("resolved_at"),
    closedAt: timestamp("closed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => [
    index("support_conversations_customer_idx").on(table.customerUserId),
    index("support_conversations_admin_idx").on(table.adminUserId),
    index("support_conversations_assigned_by_idx").on(table.assignedByUserId),
    index("support_conversations_status_idx").on(table.status),
    index("support_conversations_order_idx").on(table.orderId),
    index("support_conversations_last_message_at_idx").on(table.lastMessageAt),
    index("support_conversations_admin_status_last_message_idx").on(
      table.adminUserId,
      table.status,
      table.lastMessageAt
    ),
    index("support_conversations_customer_last_message_idx").on(
      table.customerUserId,
      table.lastMessageAt
    ),
    index("support_conversations_status_last_message_idx").on(
      table.status,
      table.lastMessageAt
    ),
  ]
);

// 9. Tin nhắn hỗ trợ (Support Messages)
export const supportMessages = mysqlTable(
  "support_messages",
  {
    id: id("id"),
    conversationId: int("conversation_id")
      .references(() => supportConversations.id)
      .notNull(),
    clientMessageId: varchar("client_message_id", { length: 100 }).unique(), // ID do client tạo để chống gửi trùng khi retry/reconnect
    senderUserId: int("sender_user_id").references(() => users.id), // null cho message hệ thống
    senderRole: varchar("sender_role", { length: 50 }).notNull(), // customer | admin | system

    // Nội dung
    messageType: varchar("message_type", { length: 50 }).default("text"), // text | image | file | system
    content: text("content"),
    metadata: text("metadata"), // JSON string cho payload phụ, cần giữ format ổn định giữa API/client
    replyToMessageId: int("reply_to_message_id"), // Soft reference
    isInternal: boolean("is_internal").default(false), // Ghi chú nội bộ chỉ admin thấy

    // Trạng thái message
    isEdited: boolean("is_edited").default(false),
    isDeleted: boolean("is_deleted").default(false),
    editedAt: timestamp("edited_at"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => [
    index("support_messages_conversation_idx").on(table.conversationId),
    index("support_messages_sender_idx").on(table.senderUserId),
    index("support_messages_created_at_idx").on(table.createdAt),
    index("support_messages_conversation_created_at_idx").on(
      table.conversationId,
      table.createdAt
    ),
    index("support_messages_reply_to_idx").on(table.replyToMessageId),
  ]
);

// 10. Tệp đính kèm tin nhắn hỗ trợ (Support Message Attachments)
export const supportMessageAttachments = mysqlTable(
  "support_message_attachments",
  {
    id: id("id"),
    messageId: int("message_id")
      .references(() => supportMessages.id)
      .notNull(),
    storageKey: varchar("storage_key", { length: 255 }), // Key/path thật trong storage để cleanup hoặc đổi CDN an toàn
    fileName: varchar("file_name", { length: 255 }).notNull(),
    originalName: varchar("original_name", { length: 255 }),
    fileUrl: text("file_url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    mimeType: varchar("mime_type", { length: 150 }),
    fileSize: bigint("file_size", { mode: "number" }).default(0),
    width: int("width"),
    height: int("height"),
    durationSeconds: int("duration_seconds"), // Cho audio/video nếu có
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("support_message_attachments_message_idx").on(table.messageId),
  ]
);

// 11. Thanh toán / hóa đơn (Payments)
export const payments = mysqlTable(
  "payments",
  {
    id: id("id"),
    paymentCode: varchar("payment_code", { length: 50 }).notNull().unique(), // Mã hóa đơn/thanh toán, ví dụ: PAY-20260330-0001
    userId: int("user_id").references(() => users.id),
    orderId: int("order_id").references(() => orders.id), // Có giá trị khi thanh toán cho đơn hàng

    // Kênh thanh toán
    type: varchar("type", { length: 50 }).default("checkout"), // checkout | topup | manual

    // Trạng thái
    status: varchar("status", { length: 50 }).default("pending"), // pending | paid | cancelled | failed | expired | refunded

    // Giá trị tiền
    amount: bigint("amount", { mode: "number" }).notNull(), // Số tiền hóa đơn
    receivedAmount: bigint("received_amount", { mode: "number" }).default(0), // Số tiền thực nhận

    // Thông tin đối soát
    referenceCode: varchar("reference_code", { length: 255 }), // Mã giao dịch phía cổng thanh toán / ngân hàng
    transferContent: varchar("transfer_content", { length: 255 }), // Nội dung chuyển khoản kỳ vọng

    // Ghi chú
    note: text("note"),

    // Thời gian
    expiredAt: timestamp("expired_at"),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => [
    index("idx_payments_user_id").on(table.userId),
    index("idx_payments_status").on(table.status),
    index("idx_payments_order_id").on(table.orderId),
  ]
);

// 12. Chi tiết từng sản phẩm trong đơn (Order Items)
export const orderItems = mysqlTable("order_items", {
  id: id("id"),
  orderId: int("order_id")
    .references(() => orders.id)
    .notNull(),
  productId: int("product_id").references(() => products.id),
  planId: int("plan_id").references(() => plans.id),
  stockId: int("stock_id").references(() => stocks.id), // Stock đã giao cho item này nếu có

  // Snapshot item tại thời điểm mua
  productName: varchar("product_name", { length: 255 }),
  planName: varchar("plan_name", { length: 255 }),

  // Giá trị
  quantity: int("quantity").default(1),
  unitPrice: bigint("unit_price", { mode: "number" }).default(0),
  subtotalAmount: bigint("subtotal_amount", { mode: "number" }).default(0),
  couponCode: varchar("coupon_code", { length: 100 }),
  discountAmount: bigint("discount_amount", { mode: "number" }).default(0),
  totalAmount: bigint("total_amount", { mode: "number" }).default(0),

  // Xử lý từng item
  status: varchar("status", { length: 50 }).default("pending"), // pending | processing | delivered | cancelled | failed
  reason: text("reason"), // Lý do hủy / lỗi nếu có
  deliveredContent: text("delivered_content"), // Nội dung giao thực tế nếu cần snapshot

  // Thời gian
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// 13. Lịch sử giao dịch (Transactions)
export const transactions = mysqlTable("transactions", {
  id: id("id"),
  userId: int("user_id").references(() => users.id),
  orderId: int("order_id").references(() => orders.id),
  paymentId: int("payment_id").references(() => payments.id),
  balanceBefore: bigint("balance_before", { mode: "number" }).notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  balanceAfter: bigint("balance_after", { mode: "number" }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // deposit | purchase | refund | adjustment
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 14. Tài khoản ngân hàng nhận tiền (Banks)
export const banks = mysqlTable("banks", {
  id: id("id"),
  bankName: varchar("bank_name", { length: 255 }).notNull(), // Tên đầy đủ ngân hàng
  bankCode: varchar("bank_code", { length: 50 }), // Ví dụ: VCB, ACB, TCB
  accountNumber: varchar("account_number", { length: 50 }).notNull(),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default("active"), // active | inactive
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// 15. Chặn IP (Block IPs)
export const blockIps = mysqlTable("block_ips", {
  id: id("id"),
  ip: varchar("ip", { length: 45 }).notNull(),
  username: varchar("username", { length: 255 }),
  country: varchar("country", { length: 10 }).default("VN"),
  reason: text("reason").notNull(),
  hitCount: int("hit_count").default(0),
  status: varchar("status", { length: 50 }).default("active"),
  blockType: varchar("block_type", { length: 50 }).default("manual"),
  blockedAt: timestamp("blocked_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activityLogs = mysqlTable("activity_logs", {
  id: id("id"),
  actorUserId: int("actor_user_id").references(() => users.id),
  actorName: varchar("actor_name", { length: 255 }).notNull(),
  actorEmail: varchar("actor_email", { length: 255 }),
  actorRole: varchar("actor_role", { length: 50 }).default("admin"),
  action: varchar("action", { length: 255 }).notNull(),
  module: varchar("module", { length: 100 }).notNull(),
  target: varchar("target", { length: 255 }).notNull(),
  description: text("description"),
  level: varchar("level", { length: 50 }).default("info"),
  ip: varchar("ip", { length: 45 }),
  device: text("device"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = mysqlTable("settings", {
  id: id("id"),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// 16. Mã giảm giá (Coupons)
export const coupons = mysqlTable(
  "coupons",
  {
    id: id("id"),
    code: varchar("code", { length: 100 }).notNull().unique(),

    // Loại & Giá trị giảm
    discountType: varchar("discount_type", { length: 50 }).default("percent"), // percent | fixed | buy-one-get-one
    discountValue: int("discount_value").notNull(), // Giá trị giảm
    maxDiscount: int("max_discount"), // Giảm tối đa (khi % để không quá đắt)

    // Điều kiện sử dụng
    minOrderValue: int("min_order_value"), // Giá trị đơn tối thiểu để sử dụng
    applicableProductIds: text("applicable_product_ids"), // JSON: [1,2,3] hoặc null = toàn bộ
    applicableCategoryIds: text("applicable_category_ids"), // JSON: [1,2] hoặc null = toàn bộ

    // Giới hạn sử dụng
    usageLimit: int("usage_limit"), // Tổng số lần dùng (null = không giới hạn)
    usedCount: int("used_count").default(0), // Số lần đã dùng
    maxPerUser: int("max_per_user"), // Tối đa lần dùng/người (null = không giới hạn)

    // Thời hạn
    startAt: timestamp("start_at"), // Ngày bắt đầu áp dụng
    expiryDate: timestamp("expiry_date"), // Ngày hết hạn

    // Trạng thái & Thông tin
    status: varchar("status", { length: 50 }).default("active"), // active | inactive | paused
    description: text("description"), // Mô tả cho khách hàng
    internalNote: text("internal_note"), // Ghi chú nội bộ

    // Quản trị
    createdBy: int("created_by"), // ID admin tạo (nullable cho compatibility)
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => [
    index("idx_coupons_code").on(table.code),
    index("idx_coupons_status").on(table.status),
  ]
);

// 17. Lịch sử sử dụng Coupon (Coupon Usage)
export const couponUsage = mysqlTable("coupon_usage", {
  id: id("id"),

  // Liên kết
  couponId: int("coupon_id")
    .references(() => coupons.id)
    .notNull(),
  userId: int("user_id")
    .references(() => users.id)
    .notNull(),
  orderId: int("order_id").references(() => orders.id),

  // Chi tiết giảm giá
  discountType: varchar("discount_type", { length: 50 }).notNull(), // percent | fixed
  discountValue: int("discount_value").notNull(), // Giá trị giảm
  discountAmount: bigint("discount_amount", { mode: "number" }).notNull(), // Số tiền/% thực tế được giảm
  orderValueBefore: bigint("order_value_before", { mode: "number" }).notNull(), // Giá trị đơn trước khi giảm
  orderValueAfter: bigint("order_value_after", { mode: "number" }).notNull(), // Giá trị đơn sau khi giảm

  // Trạng thái
  status: varchar("status", { length: 50 }).default("applied"), // applied | reversed | canceled
  reason: text("reason"), // Lý do reversed/canceled (nếu có)

  // Thời gian
  appliedAt: timestamp("applied_at").defaultNow(), // Khi nào được áp dụng
  createdAt: timestamp("created_at").defaultNow(),
});

// 18. Chương trình Flash Sale
// 20. Yêu thích (Wishlists)
export const wishlists = mysqlTable(
  "wishlists",
  {
    id: id("id"),
    userId: int("user_id")
      .references(() => users.id)
      .notNull(),
    productId: int("product_id")
      .references(() => products.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("wishlists_user_idx").on(table.userId),
    index("wishlists_product_idx").on(table.productId),
    index("wishlists_user_product_idx").on(table.userId, table.productId),
  ]
);

// 18. Chương trình Flash Sale
export const flashSales = mysqlTable(
  "flash_sales",
  {
    id: id("id"),

    // Thông tin campaign chung
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).unique(),
    status: varchar("status", { length: 50 }).default("upcoming"), // Trạng thái vận hành: upcoming | running | paused | ended
    note: text("note"),

    // Lịch chạy
    startAt: timestamp("start_at"),
    endAt: timestamp("end_at"),

    // Quản trị
    createdBy: int("created_by").references(() => users.id),
    updatedBy: int("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => [
    index("flash_sales_status_idx").on(table.status),
    index("flash_sales_start_at_idx").on(table.startAt),
    index("flash_sales_end_at_idx").on(table.endAt),
    index("flash_sales_status_start_end_idx").on(
      table.status,
      table.startAt,
      table.endAt
    ),
    index("flash_sales_created_by_idx").on(table.createdBy),
  ]
);

// 19. Item áp dụng trong Flash Sale
export const flashSaleItems = mysqlTable(
  "flash_sale_items",
  {
    id: id("id"),
    flashSaleId: int("flash_sale_id")
      .references(() => flashSales.id)
      .notNull(),

    // Liên kết sản phẩm áp dụng
    productId: int("product_id").references(() => products.id),
    planId: int("plan_id").references(() => plans.id),

    // Rule giảm giá của item
    discountType: varchar("discount_type", { length: 50 }).default("percent"), // percent | fixed
    discountValue: bigint("discount_value", { mode: "number" }).notNull(),
    maxDiscount: bigint("max_discount", { mode: "number" }),

    // Giới hạn bán
    quantityLimit: int("quantity_limit").default(0), // 0 = không giới hạn theo item
    soldCount: int("sold_count").default(0), // Cache để render nhanh danh sách admin
    maxPerUser: int("max_per_user").default(1),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => [
    index("flash_sale_items_flash_sale_idx").on(table.flashSaleId),
    index("flash_sale_items_product_idx").on(table.productId),
    index("flash_sale_items_plan_idx").on(table.planId),
    index("flash_sale_items_flash_sale_product_idx").on(
      table.flashSaleId,
      table.productId
    ),
  ]
);

// ──────────────────────────────────────────────────────────────
// AFFILIATE SYSTEM
// ──────────────────────────────────────────────────────────────

// A1. Link affiliate của từng user
export const affiliateLinks = mysqlTable(
  "affiliate_links",
  {
    id: id("id"),
    userId: int("user_id")
      .references(() => users.id)
      .notNull()
      .unique(), // 1 user = 1 link
    refCode: varchar("ref_code", { length: 100 }).notNull().unique(), // Giá trị ?ref= trong URL (mặc định = username)
    commissionRate: int("commission_rate").default(10), // % hoa hồng, admin có thể override từng user

    // Counters lũy kế (tránh COUNT() mỗi lần)
    totalClicks: bigint("total_clicks", { mode: "number" }).default(0),
    totalOrders: bigint("total_orders", { mode: "number" }).default(0),
    totalEarned: bigint("total_earned", { mode: "number" }).default(0), // Tổng đã earn (đã approved)
    pendingBalance: bigint("pending_balance", { mode: "number" }).default(0), // Hoa hồng chờ rút

    status: varchar("status", { length: 50 }).default("active"), // active | paused
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => [
    index("affiliate_links_user_idx").on(table.userId),
    index("affiliate_links_ref_code_idx").on(table.refCode),
    index("affiliate_links_status_idx").on(table.status),
  ]
);

// A2. Lịch sử hoa hồng (mỗi hàng = 1 đơn hàng phát sinh hoa hồng)
export const affiliateCommissions = mysqlTable(
  "affiliate_commissions",
  {
    id: id("id"),
    affiliateUserId: int("affiliate_user_id")
      .references(() => users.id)
      .notNull(), // Người giới thiệu (nhận hoa hồng)
    referredUserId: int("referred_user_id").references(() => users.id), // Người mua (nullable nếu guest)
    orderId: int("order_id")
      .references(() => orders.id)
      .unique(), // 1 đơn chỉ sinh tối đa 1 commission
    affiliateLinkId: int("affiliate_link_id").references(
      () => affiliateLinks.id
    ),

    // Snapshot tại thời điểm đơn (không bị ảnh hưởng khi admin thay đổi tỉ lệ sau)
    commissionRate: int("commission_rate").notNull(), // % tại thời điểm mua
    orderAmount: bigint("order_amount", { mode: "number" }).notNull(), // Tổng đơn
    commissionAmount: bigint("commission_amount", { mode: "number" }).notNull(), // Tiền hoa hồng thực tế

    // Trạng thái hoa hồng
    status: varchar("status", { length: 50 }).default("paid"), // paid | cancelled
    note: text("note"), // Ghi chú admin

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("affiliate_commissions_user_idx").on(table.affiliateUserId),
    index("affiliate_commissions_order_idx").on(table.orderId),
    index("affiliate_commissions_status_idx").on(table.status),
    index("affiliate_commissions_link_idx").on(table.affiliateLinkId),
    index("affiliate_commissions_user_status_idx").on(
      table.affiliateUserId,
      table.status
    ),
  ]
);

// A3. Yêu cầu rút tiền hoa hồng
export const affiliateWithdrawals = mysqlTable(
  "affiliate_withdrawals",
  {
    id: id("id"),
    userId: int("user_id")
      .references(() => users.id)
      .notNull(), // Người yêu cầu rút
    withdrawalCode: varchar("withdrawal_code", { length: 50 })
      .notNull()
      .unique(), // VD: AFF-WD-20260415-0001
    amount: bigint("amount", { mode: "number" }).notNull(), // Số tiền muốn rút (VND)

    // Phương thức rút
    method: varchar("method", { length: 50 }).default("wallet"), // wallet | bank

    // Thông tin ngân hàng (chỉ cần khi method = 'bank')
    bankName: varchar("bank_name", { length: 255 }),
    bankAccountNumber: varchar("bank_account_number", { length: 50 }),
    bankAccountName: varchar("bank_account_name", { length: 255 }),

    // Trạng thái
    status: varchar("status", { length: 50 }).default("pending"), // pending | approved | rejected | completed

    // Ghi chú
    note: text("note"), // Ghi chú của user
    adminNote: text("admin_note"), // Ghi chú admin khi duyệt / từ chối

    // Admin xử lý
    reviewedBy: int("reviewed_by").references(() => users.id), // Admin duyệt (nullable)
    reviewedAt: timestamp("reviewed_at"), // Khi admin duyệt / từ chối
    completedAt: timestamp("completed_at"), // Khi tiền đã chuyển thành công
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => [
    index("affiliate_withdrawals_user_idx").on(table.userId),
    index("affiliate_withdrawals_code_idx").on(table.withdrawalCode),
    index("affiliate_withdrawals_status_idx").on(table.status),
    index("affiliate_withdrawals_user_status_idx").on(
      table.userId,
      table.status
    ),
  ]
);
