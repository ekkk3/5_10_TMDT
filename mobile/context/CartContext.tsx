import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const CART_KEY = "fastfood-cart-v1";
const VOUCHER_KEY = "fastfood-voucher-v1";

export interface CartOption {
  option_id: number;
  option_name: string;
  option_type: string;
  extra_price: number;
}

export interface CartItem {
  cart_item_id: string;
  food_id: number;
  food_name: string;
  image_url: string;
  base_price: number;
  selected_options: CartOption[];
  quantity: number;
  note: string;
  item_total: number;
}

export interface AppliedVoucher {
  code: string;
  voucher_name: string;
  discount_amount: number;
}

interface CartContextValue {
  items: CartItem[];
  appliedVoucher: AppliedVoucher | null;
  discountAmount: number;
  totalQuantity: number;
  subtotal: number;
  finalTotal: number;
  addItem: (item: Omit<CartItem, "cart_item_id" | "item_total">) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, qty: number) => void;
  clearCart: () => void;
  applyVoucher: (voucher: AppliedVoucher) => void;
  removeVoucher: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const calcItemTotal = (item: Omit<CartItem, "cart_item_id" | "item_total">) => {
  const optionsCost = item.selected_options.reduce((sum, o) => sum + Number(o.extra_price || 0), 0);
  return (Number(item.base_price || 0) + optionsCost) * item.quantity;
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [appliedVoucher, setAppliedVoucher] = useState<AppliedVoucher | null>(null);

  // Khởi tạo nạp dữ liệu giỏ hàng từ AsyncStorage lên thiết bị lúc mở app
  useEffect(() => {
    const loadCartAndVoucher = async () => {
      try {
        const storedCart = await AsyncStorage.getItem(CART_KEY);
        const storedVoucher = await AsyncStorage.getItem(VOUCHER_KEY);

        if (storedCart) {
          const parsed: CartItem[] = JSON.parse(storedCart);
          // Tính lại item_total khi nạp từ bộ nhớ (dữ liệu cũ có thể lưu dạng string)
          const recalculated = parsed.map((item) => ({
            ...item,
            base_price: Number(item.base_price || 0),
            selected_options: item.selected_options.map((o) => ({
              ...o,
              extra_price: Number(o.extra_price || 0),
            })),
            item_total: calcItemTotal({
              ...item,
              base_price: Number(item.base_price || 0),
              selected_options: item.selected_options.map((o) => ({
                ...o,
                extra_price: Number(o.extra_price || 0),
              })),
            }),
          }));
          setItems(recalculated);
        }
        if (storedVoucher) {
          setAppliedVoucher(JSON.parse(storedVoucher));
        }
      } catch (error) {
        console.log("Lỗi nạp giỏ hàng từ bộ nhớ máy:", error);
      }
    };

    loadCartAndVoucher();
  }, []);

  const addItem = useCallback((newItem: Omit<CartItem, "cart_item_id" | "item_total">) => {
    setItems((prev) => {
      // Tìm xem món ăn cùng tùy chọn đã tồn tại chưa
      const existingIdx = prev.findIndex(
        (i) =>
          i.food_id === newItem.food_id &&
          JSON.stringify(i.selected_options) === JSON.stringify(newItem.selected_options) &&
          i.note === newItem.note
      );

      let next: CartItem[];
      if (existingIdx > -1) {
        next = [...prev];
        const current = next[existingIdx];
        const nextQty = current.quantity + newItem.quantity;
        next[existingIdx] = {
          ...current,
          quantity: nextQty,
          item_total: calcItemTotal({ ...current, quantity: nextQty }),
        };
      } else {
        const id = `${newItem.food_id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        next = [...prev, { ...newItem, cart_item_id: id, item_total: calcItemTotal(newItem) }];
      }

      AsyncStorage.setItem(CART_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const removeItem = useCallback((cartItemId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.cart_item_id !== cartItemId);
      AsyncStorage.setItem(CART_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const updateQuantity = useCallback((cartItemId: string, q: number) => {
    if (q <= 0) {
      removeItem(cartItemId);
      return;
    }
    setItems((prev) => {
      const next = prev.map((i) =>
        i.cart_item_id === cartItemId
          ? { ...i, quantity: q, item_total: calcItemTotal({ ...i, quantity: q }) }
          : i
      );
      AsyncStorage.setItem(CART_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
    setAppliedVoucher(null);
    AsyncStorage.multiRemove([CART_KEY, VOUCHER_KEY]).catch(() => {});
  }, []);

  const applyVoucher = useCallback((voucher: AppliedVoucher) => {
    setAppliedVoucher(voucher);
    AsyncStorage.setItem(VOUCHER_KEY, JSON.stringify(voucher)).catch(() => {});
  }, []);

  const removeVoucher = useCallback(() => {
    setAppliedVoucher(null);
    AsyncStorage.removeItem(VOUCHER_KEY).catch(() => {});
  }, []);

  const subtotal = items.reduce((s, i) => s + i.item_total, 0);
  const discountAmount = appliedVoucher?.discount_amount ?? 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);
  const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        appliedVoucher,
        discountAmount,
        totalQuantity,
        subtotal,
        finalTotal,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        applyVoucher,
        removeVoucher,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart phải được bọc trong CartProvider");
  return context;
}