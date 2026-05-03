import { reactive, computed } from "vue";

const CART_TTL_MS = 30 * 60 * 1000; // 30 phút

export interface CartItem {
  id: string;
  productId: number;
  planId: number;
  productName: string;
  planName: string;
  image: string | null;
  price: number;           // giá thực tế thanh toán
  originalPrice?: number;  // giá gốc trước giảm (nếu có flash sale)
  saleEndAt?: string;      // ISO string — khi nào flash sale hết hạn
  quantity: number;
  fields: Record<string, string>;
  addedAt: number;         // unix ms — để tính TTL
}

// Module-level state — shared across all composable calls, no SSR involvement
const _items = reactive<CartItem[]>([]);
let _hydrated = false;

function isExpired(item: CartItem): boolean {
  return Date.now() - item.addedAt > CART_TTL_MS;
}

function hydrate() {
  if (_hydrated) return;
  _hydrated = true;
  try {
    const stored = localStorage.getItem("cart");
    if (stored) {
      const parsed: CartItem[] = JSON.parse(stored);
      // Lọc bỏ item hết hạn ngay khi load
      const valid = parsed.filter((i) => !isExpired(i));
      _items.splice(0, _items.length, ...valid);
      // Nếu có item bị xóa → persist lại localStorage cho sạch
      if (valid.length !== parsed.length) {
        persist();
      }
    }
  } catch {}
}

function persist() {
  try {
    localStorage.setItem("cart", JSON.stringify(_items));
  } catch {}
}

export function useCart() {
  if (import.meta.client) hydrate();

  const totalItems = computed(() => _items.reduce((s, i) => s + i.quantity, 0));

  const subtotal = computed(() =>
    _items.reduce((s, i) => s + i.price * i.quantity, 0),
  );

  function addItem(item: Omit<CartItem, "id" | "quantity" | "addedAt">, qty = 1) {
    const key = `${item.productId}-${item.planId}`;
    const existing = _items.find((i) => i.id === key);
    if (existing) {
      existing.quantity += qty;
      existing.addedAt = Date.now(); // reset TTL khi thêm lại
    } else {
      _items.push({ ...item, id: key, quantity: qty, addedAt: Date.now() });
    }
    persist();
  }

  function removeItem(id: string) {
    const idx = _items.findIndex((i) => i.id === id);
    if (idx !== -1) _items.splice(idx, 1);
    persist();
  }

  function updateQuantity(id: string, qty: number) {
    const item = _items.find((i) => i.id === id);
    if (item) {
      item.quantity = Math.max(1, qty);
      persist();
    }
  }

  function clearCart() {
    _items.splice(0, _items.length);
    persist();
  }

  // Dọn sạch các item hết TTL ngay trong memory (không cần reload trang)
  function purgeExpired() {
    const before = _items.length;
    const valid = _items.filter((i) => !isExpired(i));
    if (valid.length !== before) {
      _items.splice(0, _items.length, ...valid);
      persist();
    }
  }

  return {
    items: _items,
    totalItems,
    subtotal,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    purgeExpired,
  };
}
