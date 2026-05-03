/**
 * Composable: useAffiliateRef
 * - Lấy affiliate ref code từ cookie
 * - Đảm bảo cookie còn hiệu lực (30 ngày)
 */

export const useAffiliateRef = () => {
  const getRefCookie = (name: string): string | null => {
    if (process.server) return null;

    const nameEQ = name + "=";
    const cookies = document.cookie.split(";");

    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith(nameEQ)) {
        return decodeURIComponent(cookie.substring(nameEQ.length));
      }
    }
    return null;
  };

  const refCode = computed(() => getRefCookie("affiliate_ref"));
  const refTime = computed(() => {
    const time = getRefCookie("affiliate_ref_time");
    return time ? Number(time) : null;
  });

  // Check if cookie is still valid (30 days)
  const isValid = computed(() => {
    if (!refTime.value) return false;
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - refTime.value < thirtyDaysInMs;
  });

  // Get affiliate ref code if valid
  const getRefCode = (): string | null => {
    return isValid.value ? refCode.value : null;
  };

  // Clear affiliate ref cookie
  const clearRef = () => {
    document.cookie =
      "affiliate_ref=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    document.cookie =
      "affiliate_ref_time=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
  };

  return {
    refCode: readonly(refCode),
    refTime: readonly(refTime),
    isValid: readonly(isValid),
    getRefCode,
    clearRef,
  };
};
