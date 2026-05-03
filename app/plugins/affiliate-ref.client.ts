/**
 * Affiliate Ref Plugin
 * - Nhận ?ref parameter từ URL
 * - Lưu vào cookie với thời gian 30 ngày
 * - Lưu timestamp để có thể kiểm tra độ tuổi của cookie
 */

export default defineNuxtPlugin(() => {
  if (process.server) return;

  // Lấy ref parameter từ URL
  const route = useRoute();
  const refCode = route.query.ref as string | undefined;

  if (refCode && refCode.trim()) {
    // Lưu vào cookie - 30 ngày
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + 30);
    const expiresStr = expiresDate.toUTCString();

    // Lưu ref code với SameSite=Lax để browser gửi đi trong request
    document.cookie = `affiliate_ref=${encodeURIComponent(refCode)}; path=/; expires=${expiresStr}; SameSite=Lax`;

    // Lưu timestamp để track khi user được refer
    document.cookie = `affiliate_ref_time=${Date.now()}; path=/; expires=${expiresStr}; SameSite=Lax`;
  }
});
