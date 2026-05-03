export function useUserBalance() {
  const balance = useState<number>("user-balance", () => 0);
  const isLoading = useState<boolean>("user-balance-loading", () => false);

  const fetchBalance = async () => {
    if (isLoading.value) return balance.value;

    isLoading.value = true;
    try {
      const response = await $fetch<{ balance: number }>("/api/user/me");
      balance.value = Number(response?.balance ?? 0);
    } catch {
      balance.value = 0;
    } finally {
      isLoading.value = false;
    }

    return balance.value;
  };

  const setBalance = (value: number) => {
    balance.value = Number(value || 0);
  };

  const clearBalance = () => {
    balance.value = 0;
  };

  return {
    balance,
    isLoading,
    fetchBalance,
    setBalance,
    clearBalance,
  };
}
