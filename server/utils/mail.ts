import nodemailer from "nodemailer";
import { db } from "../database";
import { settings } from "../database/schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getMailSettings(): Promise<Record<string, string>> {
  const allRows = await db.select().from(settings);
  const map: Record<string, string> = {};
  for (const row of allRows) {
    if (row.value !== null) map[row.key] = row.value;
  }
  return map;
}

function buildTransporter(cfg: Record<string, string>) {
  const encryption = (cfg.mailEncryption || "TLS").toUpperCase();
  const port = Number(cfg.mailPort || 587);

  return nodemailer.createTransport({
    host: cfg.mailHost,
    port,
    secure: encryption === "SSL", // true = port 465
    auth: {
      user: cfg.mailUsername,
      pass: cfg.mailPassword,
    },
    tls: encryption === "NONE" ? { rejectUnauthorized: false } : undefined,
  });
}

// ---------------------------------------------------------------------------
// Email Templates
// ---------------------------------------------------------------------------

export interface OrderEmailItem {
  productName: string;
  planName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  deliveredContent: string | null;
  status: string;
}

interface BaseEmailOptions {
  toEmail: string;
  toName: string;
  siteUrl?: string;
  siteName?: string;
}

export interface SendOrderEmailOptions extends BaseEmailOptions {
  orderCode: string;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  balanceAfter: number;
  couponCode: string | null;
  isFullyDelivered: boolean;
  items: OrderEmailItem[];
}

export interface SendTopupEmailOptions extends BaseEmailOptions {
  paymentCode: string;
  receivedAmount: number;
  bonusAmount: number;
  creditedAmount: number;
  balanceAfter: number;
  paidAt?: Date | string | null;
}

export interface SendResetPasswordEmailOptions extends BaseEmailOptions {
  resetUrl: string;
  expiredMinutes: number;
}

function buildOrderEmailHtml(opts: SendOrderEmailOptions): string {
  const {
    orderCode,
    subtotalAmount,
    discountAmount,
    totalAmount,
    balanceAfter,
    couponCode,
    isFullyDelivered,
    items,
    siteUrl = "",
    siteName = "Shop",
  } = opts;

  const fmt = (v: number) => v.toLocaleString("vi-VN") + "đ";

  const itemsHtml = items
    .map((item) => {
      const deliveredBlock =
        item.deliveredContent && item.status === "delivered"
          ? `
          <tr>
            <td colspan="4" style="padding:0 16px 12px; background:#f0fdf4;">
              <div style="background:#dcfce7;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:.06em;">
                  Nội dung giao hàng
                </p>
                <pre style="margin:0;font-family:monospace;font-size:13px;color:#166534;white-space:pre-wrap;word-break:break-all;">${escapeHtml(item.deliveredContent)}</pre>
              </div>
            </td>
          </tr>`
          : "";

      return `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:12px 16px;">
            <p style="margin:0;font-size:13px;font-weight:700;color:#1e293b;">${escapeHtml(item.productName)}</p>
            <p style="margin:2px 0 0;font-size:11px;color:#94a3b8;">${escapeHtml(item.planName)}</p>
          </td>
          <td style="padding:12px 16px;text-align:center;font-size:13px;color:#64748b;">x${item.quantity}</td>
          <td style="padding:12px 16px;text-align:right;font-size:13px;color:#64748b;">${fmt(item.unitPrice)}</td>
          <td style="padding:12px 16px;text-align:right;font-size:13px;font-weight:700;color:#0ea5e9;">${fmt(item.totalAmount)}</td>
        </tr>
        ${deliveredBlock}`;
    })
    .join("");

  const couponRow = couponCode
    ? `<tr>
        <td style="padding:4px 0;font-size:13px;color:#64748b;">Mã giảm giá</td>
        <td style="padding:4px 0;font-size:13px;text-align:right;color:#10b981;font-weight:600;">${escapeHtml(couponCode)} (-${fmt(discountAmount)})</td>
      </tr>`
    : "";

  const statusBadge = isFullyDelivered
    ? `<span style="background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Đã giao hàng</span>`
    : `<span style="background:#fef9c3;color:#854d0e;border:1px solid #fde68a;border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Đang xử lý</span>`;

  const viewOrderLink = siteUrl
    ? `<p style="text-align:center;margin:24px 0 0;">
        <a href="${siteUrl}/orders/${orderCode}"
          style="display:inline-block;background:#0ea5e9;color:#fff;border-radius:10px;padding:12px 28px;font-size:14px;font-weight:700;text-decoration:none;">
          Xem chi tiết đơn hàng
        </a>
      </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><title>Xác nhận đơn hàng ${orderCode}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0ea5e9,#38bdf8);padding:32px 32px 28px;text-align:center;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:rgba(255,255,255,.8);text-transform:uppercase;letter-spacing:.1em;">
        ${escapeHtml(siteName)}
      </p>
      <h1 style="margin:0;font-size:26px;font-weight:800;color:#fff;">Đặt hàng thành công!</h1>
      <p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,.85);">
        Mã đơn hàng: <strong style="font-family:monospace;">${escapeHtml(orderCode)}</strong>
      </p>
      <div style="margin-top:14px;">${statusBadge}</div>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px 0;">
      <p style="margin:0 0 20px;font-size:14px;color:#475569;">
        Xin chào <strong>${escapeHtml(opts.toName)}</strong>, đơn hàng của bạn đã được ghi nhận thành công.
        ${isFullyDelivered ? "Nội dung sản phẩm đã sẵn sàng bên dưới." : "Chúng tôi sẽ xử lý và giao hàng cho bạn sớm nhất có thể."}
      </p>
    </div>

    <!-- Items table -->
    <div style="padding:0 32px;">
      <table style="width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;">Sản phẩm</th>
            <th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;">SL</th>
            <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;">Đơn giá</th>
            <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
    </div>

    <!-- Summary -->
    <div style="padding:20px 32px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#64748b;">Tạm tính</td>
          <td style="padding:4px 0;font-size:13px;text-align:right;color:#334155;font-weight:600;">${fmt(subtotalAmount)}</td>
        </tr>
        ${couponRow}
        <tr>
          <td style="padding:8px 0 0;font-size:15px;font-weight:700;color:#0f172a;border-top:2px solid #e2e8f0;">Tổng thanh toán</td>
          <td style="padding:8px 0 0;font-size:18px;font-weight:800;text-align:right;color:#0ea5e9;border-top:2px solid #e2e8f0;">${fmt(totalAmount)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:12px;color:#94a3b8;">Số dư còn lại</td>
          <td style="padding:4px 0;font-size:12px;text-align:right;color:#10b981;font-weight:600;">${fmt(balanceAfter)}</td>
        </tr>
      </table>
    </div>

    ${viewOrderLink}

    <!-- Footer -->
    <div style="padding:24px 32px 32px;text-align:center;border-top:1px solid #f1f5f9;margin-top:24px;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">
        Email này được gửi tự động từ hệ thống ${escapeHtml(siteName)}. Vui lòng không trả lời email này.
      </p>
      ${siteUrl ? `<p style="margin:6px 0 0;font-size:12px;"><a href="${siteUrl}" style="color:#0ea5e9;text-decoration:none;">${escapeHtml(siteUrl)}</a></p>` : ""}
    </div>
  </div>
</body>
</html>`;
}

function buildTopupSuccessEmailHtml(opts: SendTopupEmailOptions): string {
  const {
    paymentCode,
    receivedAmount,
    bonusAmount,
    creditedAmount,
    balanceAfter,
    paidAt,
    siteName = "Shop",
    siteUrl = "",
  } = opts;

  const fmt = (v: number) => `${Number(v || 0).toLocaleString("vi-VN")}đ`;
  const paidAtText = paidAt
    ? new Date(paidAt).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "---";

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><title>Nạp tiền thành công ${paymentCode}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(135deg,#10b981,#34d399);padding:32px 32px 28px;text-align:center;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:rgba(255,255,255,.8);text-transform:uppercase;letter-spacing:.1em;">
        ${escapeHtml(siteName)}
      </p>
      <h1 style="margin:0;font-size:26px;font-weight:800;color:#fff;">Nạp tiền thành công</h1>
      <p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,.9);">
        Mã giao dịch: <strong style="font-family:monospace;">${escapeHtml(paymentCode)}</strong>
      </p>
    </div>

    <div style="padding:24px 32px;">
      <p style="margin:0 0 18px;font-size:14px;color:#475569;">
        Xin chào <strong>${escapeHtml(opts.toName)}</strong>, hệ thống đã ghi nhận nạp tiền vào ví của bạn.
      </p>

      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <tbody>
          <tr>
            <td style="padding:12px 16px;font-size:13px;color:#64748b;background:#f8fafc;">Số tiền nhận</td>
            <td style="padding:12px 16px;text-align:right;font-size:13px;font-weight:700;color:#0f172a;background:#f8fafc;">${fmt(receivedAmount)}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;font-size:13px;color:#64748b;">Thưởng nạp</td>
            <td style="padding:12px 16px;text-align:right;font-size:13px;font-weight:700;color:#10b981;">+${fmt(bonusAmount)}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;font-size:14px;font-weight:700;color:#0f172a;border-top:2px solid #e2e8f0;">Tổng cộng ví được cộng</td>
            <td style="padding:12px 16px;text-align:right;font-size:16px;font-weight:800;color:#0ea5e9;border-top:2px solid #e2e8f0;">${fmt(creditedAmount)}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;font-size:13px;color:#64748b;">Số dư hiện tại</td>
            <td style="padding:12px 16px;text-align:right;font-size:13px;font-weight:700;color:#10b981;">${fmt(balanceAfter)}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;font-size:13px;color:#64748b;">Thời gian hoàn tất</td>
            <td style="padding:12px 16px;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${escapeHtml(paidAtText)}</td>
          </tr>
        </tbody>
      </table>

      ${
        siteUrl
          ? `<p style="text-align:center;margin:22px 0 0;"><a href="${siteUrl}/wallet/deposit" style="display:inline-block;background:#10b981;color:#fff;border-radius:10px;padding:12px 24px;font-size:14px;font-weight:700;text-decoration:none;">Xem lịch sử nạp tiền</a></p>`
          : ""
      }
    </div>

    <div style="padding:20px 32px 28px;text-align:center;border-top:1px solid #f1f5f9;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">
        Email này được gửi tự động từ hệ thống ${escapeHtml(siteName)}. Vui lòng không trả lời email này.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function buildResetPasswordEmailHtml(
  opts: SendResetPasswordEmailOptions
): string {
  const { resetUrl, expiredMinutes, siteName = "Shop" } = opts;

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><title>Đặt lại mật khẩu</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(135deg,#0ea5e9,#38bdf8);padding:32px 32px 28px;text-align:center;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:rgba(255,255,255,.8);text-transform:uppercase;letter-spacing:.1em;">
        ${escapeHtml(siteName)}
      </p>
      <h1 style="margin:0;font-size:26px;font-weight:800;color:#fff;">Yêu cầu đặt lại mật khẩu</h1>
    </div>

    <div style="padding:24px 32px;">
      <p style="margin:0 0 14px;font-size:14px;color:#475569;line-height:1.6;">
        Xin chào <strong>${escapeHtml(opts.toName)}</strong>, chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.
      </p>
      <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
        Vui lòng nhấn nút bên dưới để tạo mật khẩu mới. Liên kết này sẽ hết hạn sau <strong>${expiredMinutes} phút</strong>.
      </p>

      <p style="text-align:center;margin:22px 0 18px;">
        <a href="${resetUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;border-radius:10px;padding:12px 24px;font-size:14px;font-weight:700;text-decoration:none;">
          Đặt lại mật khẩu
        </a>
      </p>

      <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;line-height:1.6;word-break:break-all;">
        Nếu nút không hoạt động, hãy copy liên kết sau vào trình duyệt:
      </p>
      <p style="margin:0;font-size:12px;color:#0ea5e9;line-height:1.6;word-break:break-all;">
        ${escapeHtml(resetUrl)}
      </p>

      <p style="margin:18px 0 0;font-size:12px;color:#94a3b8;line-height:1.7;">
        Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
      </p>
    </div>

    <div style="padding:20px 32px 28px;text-align:center;border-top:1px solid #f1f5f9;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">
        Email này được gửi tự động từ hệ thống ${escapeHtml(siteName)}. Vui lòng không trả lời email này.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Gửi email xác nhận đơn hàng thành công.
 * Fire-and-forget: không throw, lỗi chỉ log ra console để không block response.
 */
export async function sendOrderConfirmationEmail(
  opts: SendOrderEmailOptions
): Promise<void> {
  try {
    const cfg = await getMailSettings();

    if (cfg.mailEnabled !== "true") return;
    if (!cfg.mailHost || !cfg.mailUsername || !cfg.mailPassword) return;

    const fromName = cfg.mailFromName || cfg.siteName || "Shop";
    const fromAddress = cfg.mailFromAddress || cfg.mailUsername;
    const siteName = cfg.siteName || "Shop";
    const siteUrl = cfg.siteUrl || "";

    const transporter = buildTransporter(cfg);

    const html = buildOrderEmailHtml({ ...opts, siteName, siteUrl });

    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: `"${opts.toName}" <${opts.toEmail}>`,
      subject: `[${siteName}] Xác nhận đơn hàng ${opts.orderCode}`,
      html,
    });
  } catch (err) {
    // Không throw — lỗi email không được block checkout
    console.error("[mail] sendOrderConfirmationEmail error:", err);
  }
}

/**
 * Gửi email thông báo nạp tiền thành công.
 * Fire-and-forget: không throw để không ảnh hưởng cron đối soát.
 */
export async function sendTopupSuccessEmail(
  opts: SendTopupEmailOptions
): Promise<void> {
  try {
    const cfg = await getMailSettings();

    if (cfg.mailEnabled !== "true") return;
    if (!cfg.mailHost || !cfg.mailUsername || !cfg.mailPassword) return;
    if (!opts.toEmail) return;

    const fromName = cfg.mailFromName || cfg.siteName || "Shop";
    const fromAddress = cfg.mailFromAddress || cfg.mailUsername;
    const siteName = cfg.siteName || "Shop";
    const siteUrl = cfg.siteUrl || "";

    const transporter = buildTransporter(cfg);
    const html = buildTopupSuccessEmailHtml({ ...opts, siteName, siteUrl });

    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: `"${opts.toName}" <${opts.toEmail}>`,
      subject: `[${siteName}] Nạp tiền thành công ${opts.paymentCode}`,
      html,
    });
  } catch (err) {
    console.error("[mail] sendTopupSuccessEmail error:", err);
  }
}

/**
 * Gửi email liên kết đặt lại mật khẩu.
 * Fire-and-forget: không throw để không ảnh hưởng endpoint quên mật khẩu.
 */
export async function sendResetPasswordEmail(
  opts: SendResetPasswordEmailOptions
): Promise<void> {
  try {
    const cfg = await getMailSettings();

    if (cfg.mailEnabled !== "true") return;
    if (!cfg.mailHost || !cfg.mailUsername || !cfg.mailPassword) return;
    if (!opts.toEmail) return;

    const fromName = cfg.mailFromName || cfg.siteName || "Shop";
    const fromAddress = cfg.mailFromAddress || cfg.mailUsername;
    const siteName = cfg.siteName || "Shop";

    const transporter = buildTransporter(cfg);
    const html = buildResetPasswordEmailHtml({ ...opts, siteName });

    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: `"${opts.toName}" <${opts.toEmail}>`,
      subject: `[${siteName}] Đặt lại mật khẩu`,
      html,
    });
  } catch (err) {
    console.error("[mail] sendResetPasswordEmail error:", err);
  }
}
