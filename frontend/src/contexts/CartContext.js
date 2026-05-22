import { cartService } from '../services/cartService.js';

const CART_CHANGED_EVENT = 'cart:changed';

let cartItems = cartService.getItems();

const notifyCartChanged = () => {
  window.dispatchEvent(
    new CustomEvent(CART_CHANGED_EVENT, {
      detail: {
        cartItems,
        totalQuantity: CartContext.getTotalQuantity(),
        subtotal: CartContext.getSubtotal()
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

  addItem: (item) => {
    cartItems = cartService.addItem(item);
    notifyCartChanged();
    return cartItems;
  },

  updateQuantity: (cartItemId, quantity) => {
    cartItems = cartService.updateQuantity(cartItemId, quantity);
    notifyCartChanged();
    return cartItems;
  },

  removeItem: (cartItemId) => {
    cartItems = cartService.removeItem(cartItemId);
    notifyCartChanged();
    return cartItems;
  },

  clearCart: () => {
    cartItems = cartService.clearCart();
    notifyCartChanged();
    return cartItems;
  },

  getSubtotal: () => cartService.getSubtotal(cartItems),

  getTotalQuantity: () => cartService.getTotalQuantity(cartItems),

  subscribe: (handler) => {
    window.addEventListener(CART_CHANGED_EVENT, handler);
    return () => window.removeEventListener(CART_CHANGED_EVENT, handler);
  },

  reload: () => setCartItems(cartService.getItems())
};
