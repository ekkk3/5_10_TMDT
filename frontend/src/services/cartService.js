const CART_STORAGE_KEY = 'fast-food-cart';

const normalizeOption = (option = {}) => ({
  option_id: Number(option.option_id),
  option_name: String(option.option_name || ''),
  option_type: String(option.option_type || ''),
  extra_price: Number(option.extra_price || 0)
});

const sortOptions = (options = []) =>
  [...options].map(normalizeOption).sort((a, b) => {
    const typeCompare = a.option_type.localeCompare(b.option_type);
    if (typeCompare !== 0) return typeCompare;
    return Number(a.option_id) - Number(b.option_id);
  });

const buildCartLineKey = (item) => {
  const optionsKey = sortOptions(item.selected_options)
    .map((option) => `${option.option_type}:${option.option_id}`)
    .join('|');
  const noteKey = String(item.note || '').trim();
  return `${item.food_id}::${optionsKey}::${noteKey}`;
};

const normalizeQuantity = (quantity) => Math.max(1, Number.parseInt(quantity, 10) || 1);

const calculateUnitPrice = (item) =>
  Number(item.base_price || 0) +
  sortOptions(item.selected_options).reduce((total, option) => total + Number(option.extra_price || 0), 0);

const getStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage;
};

const normalizeCartItem = (item = {}) => {
  const quantity = normalizeQuantity(item.quantity);
  const selectedOptions = sortOptions(item.selected_options);
  const normalizedItem = {
    cart_item_id: item.cart_item_id || buildCartLineKey({ ...item, selected_options: selectedOptions }),
    food_id: Number(item.food_id),
    food_name: String(item.food_name || ''),
    image_url: String(item.image_url || ''),
    base_price: Number(item.base_price || 0),
    selected_options: selectedOptions,
    quantity,
    note: String(item.note || '').trim()
  };

  normalizedItem.item_total = calculateUnitPrice(normalizedItem) * quantity;
  return normalizedItem;
};

const readCart = () => {
  try {
    const storage = getStorage();
    if (!storage) return [];

    const rawCart = storage.getItem(CART_STORAGE_KEY);
    if (!rawCart) return [];

    const parsedCart = JSON.parse(rawCart);
    if (!Array.isArray(parsedCart)) return [];

    return parsedCart
      .filter((item) => item && item.food_id && item.food_name)
      .map(normalizeCartItem);
  } catch (error) {
    console.warn('Cannot read cart from localStorage:', error);
    return [];
  }
};

const writeCart = (items) => {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(CART_STORAGE_KEY, JSON.stringify(items.map(normalizeCartItem)));
};

export const cartService = {
  getItems: () => readCart(),

  saveItems: (items = []) => {
    const normalizedItems = items.map(normalizeCartItem);
    writeCart(normalizedItems);
    return normalizedItems;
  },

  addItem: (item) => {
    const currentItems = readCart();
    const incomingItem = normalizeCartItem(item);
    const existingIndex = currentItems.findIndex((cartItem) => cartItem.cart_item_id === incomingItem.cart_item_id);

    if (existingIndex >= 0) {
      const existingItem = currentItems[existingIndex];
      currentItems[existingIndex] = normalizeCartItem({
        ...existingItem,
        quantity: existingItem.quantity + incomingItem.quantity
      });
    } else {
      currentItems.push(incomingItem);
    }

    writeCart(currentItems);
    return currentItems;
  },

  updateQuantity: (cartItemId, quantity) => {
    const nextQuantity = normalizeQuantity(quantity);
    const nextItems = readCart().map((item) =>
      item.cart_item_id === cartItemId ? normalizeCartItem({ ...item, quantity: nextQuantity }) : item
    );

    writeCart(nextItems);
    return nextItems;
  },

  removeItem: (cartItemId) => {
    const nextItems = readCart().filter((item) => item.cart_item_id !== cartItemId);
    writeCart(nextItems);
    return nextItems;
  },

  clearCart: () => {
    getStorage()?.removeItem(CART_STORAGE_KEY);
    return [];
  },

  getSubtotal: (items = readCart()) => items.reduce((total, item) => total + Number(item.item_total || 0), 0),

  getTotalQuantity: (items = readCart()) => items.reduce((total, item) => total + Number(item.quantity || 0), 0)
};
