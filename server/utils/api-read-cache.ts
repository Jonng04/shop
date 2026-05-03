interface CachedPayload<T> {
  expiresAt: number;
  payload: T;
}

export async function getOrSetReadCache<T>(
  cacheKey: string,
  maxAgeSeconds: number,
  loader: () => Promise<T>
): Promise<T> {
  const storage = useStorage("cache");
  const storageKey = `read:${cacheKey}`;
  const now = Date.now();

  try {
    const cached = await storage.getItem<CachedPayload<T>>(storageKey);

    if (
      cached &&
      typeof cached.expiresAt === "number" &&
      cached.expiresAt > now
    ) {
      return cached.payload;
    }

    const payload = await loader();
    await storage.setItem(storageKey, {
      expiresAt: now + maxAgeSeconds * 1000,
      payload,
    } satisfies CachedPayload<T>);

    return payload;
  } catch {
    // Fallback to direct loader on cache storage errors.
    return loader();
  }
}
