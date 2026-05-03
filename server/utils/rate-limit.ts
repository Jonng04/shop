/**
 * In-Memory Rate Limiter
 * Simple rate limiting for concurrent user protection
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// Store: key -> { count, resetAt }
const store = new Map<string, RateLimitRecord>();

/**
 * Check if request is allowed
 * @param key Unique identifier (e.g., "user:123:checkout")
 * @param limit Max requests allowed
 * @param windowMs Time window in milliseconds (default: 60000 = 1 minute)
 * @returns true if allowed, false if exceeded
 */
export function isAllowed(
  key: string,
  limit: number,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = store.get(key);

  // First request or window expired
  if (!record || now > record.resetAt) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  // Within window
  record.count++;
  if (record.count > limit) {
    return false;
  }

  return true;
}

/**
 * Cleanup old records (run periodically)
 */
export function cleanup(): void {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now > record.resetAt) {
      store.delete(key);
    }
  }
}

// Auto cleanup every 5 minutes
if (process.server) {
  setInterval(
    () => {
      cleanup();
    },
    5 * 60 * 1000
  );
}
