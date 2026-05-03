const WISHLIST_COUNT_TTL_MS = 8000;
let wishlistCountRequest: Promise<number> | null = null;

export const useWishlist = () => {
  const { loggedIn } = useUserSession();
  const wishlistCount = useState<number>("wishlist-count", () => 0);
  const wishlistLoading = useState<boolean>(
    "wishlist-count-loading",
    () => false
  );
  const wishlistCountLastFetchedAt = useState<number>(
    "wishlist-count-last-fetched-at",
    () => 0
  );

  const refreshWishlistCount = async (options?: { force?: boolean }) => {
    if (!loggedIn.value) {
      wishlistCount.value = 0;
      wishlistCountLastFetchedAt.value = 0;
      return 0;
    }

    const now = Date.now();
    const isFresh =
      wishlistCountLastFetchedAt.value > 0 &&
      now - wishlistCountLastFetchedAt.value < WISHLIST_COUNT_TTL_MS;

    if (!options?.force && isFresh) {
      return wishlistCount.value;
    }

    if (wishlistCountRequest) {
      return await wishlistCountRequest;
    }

    wishlistCountRequest = (async () => {
      wishlistLoading.value = true;
      try {
        const response = await $fetch<{ count: number }>("/api/wishlist/count");
        wishlistCount.value = Math.max(0, Number(response?.count || 0));
        wishlistCountLastFetchedAt.value = Date.now();
      } catch {
        wishlistCount.value = 0;
        wishlistCountLastFetchedAt.value = 0;
      } finally {
        wishlistLoading.value = false;
      }

      return wishlistCount.value;
    })();

    try {
      return await wishlistCountRequest;
    } finally {
      wishlistCountRequest = null;
    }
  };

  const setWishlistCount = (count: number) => {
    wishlistCount.value = Math.max(0, Number(count || 0));
    wishlistCountLastFetchedAt.value = Date.now();
  };

  return {
    wishlistCount,
    wishlistLoading,
    refreshWishlistCount,
    setWishlistCount,
  };
};
