import { cartService } from '../services/cartService.js';

const CART_CHANGED_EVENT = 'cart:changed';

let cartItems = cartService.getItems();
let appliedVoucher = null;
let discountAmount = 0;

const clearVoucherState = () => {
  appliedVoucher = null;
  discountAmount = 0;
};

const notifyCartChanged = () => {
  window.dispatchEvent(
    new CustomEvent(CART_CHANGED_EVENT, {
      detail: {
        cartItems,
        totalQuantity: CartContext.getTotalQuantity(),
        subtotal: CartContext.getSubtotal(),
        appliedVoucher,
        discountAmount,
        finalTotal: CartContext.getFinalTotal()
      }
    })
  );
};

const setCartItems = (items) => {
  cartItems = cartService.saveItems(items);
  notifyCartChanged();
  return cartItems;
};

export const CartContext = {
  get cartItems() {
    return cartItems;
  },

  get appliedVoucher() {
    return appliedVoucher;
  },

  get discountAmount() {
    return discountAmount;
  },

  addItem: (item) => {
    clearVoucherState();
    cartItems = cartService.addItem(item);
    notifyCartChanged();
    return cartItems;
  },

  updateQuantity: (cartItemId, quantity) => {
    clearVoucherState();
    cartItems = cartService.updateQuantity(cartItemId, quantity);
    notifyCartChanged();
    return cartItems;
  },

  removeItem: (cartItemId) => {
    clearVoucherState();
    cartItems = cartService.removeItem(cartItemId);
    notifyCartChanged();
    return cartItems;
  },

  clearCart: () => {
    clearVoucherState();
    cartItems = cartService.clearCart();
    notifyCartChanged();
    return cartItems;
  },

  getSubtotal: () => cartService.getSubtotal(cartItems),

  getFinalTotal: () => Math.max(0, CartContext.getSubtotal() - discountAmount),

  getTotalQuantity: () => cartService.getTotalQuantity(cartItems),

  applyVoucher: (voucher) => {
    appliedVoucher = voucher;
    discountAmount = Number(voucher?.discount_amount || 0);
    notifyCartChanged();
    return appliedVoucher;
  },

  removeVoucher: () => {
    clearVoucherState();
    notifyCartChanged();
  },

  subscribe: (handler) => {
    window.addEventListener(CART_CHANGED_EVENT, handler);
    return () => window.removeEventListener(CART_CHANGED_EVENT, handler);
  },

  reload: () => setCartItems(cartService.getItems())
};
