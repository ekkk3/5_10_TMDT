import { CartContext } from '../../contexts/CartContext.js';
import { menuService } from '../../services/menuService.js';
import { voucherService } from '../voucher/voucherService.js';
import { foodOptionsService } from '../food-options/foodOptionsService.js';
import { CartSummary } from './components/CartSummary.js';

const moneyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
});

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const formatMoney = (value) => moneyFormatter.format(Number(value || 0));

const isFoodAvailable = (food) => Boolean(food?.is_available) && food.status === 'ACTIVE';

const getFallbackImage = (foodName) => {
  const seed = encodeURIComponent(foodName || 'fast food');
  return `https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=480&q=80&ixid=${seed}`;
};

const renderOptions = (options = []) => {
  if (!options.length) return '<span>Không có tùy chọn</span>';

  return options
    .map((option) => {
      const optionPrice = Number(option.extra_price || 0);
      return `<span>${escapeHtml(option.option_name)}${optionPrice > 0 ? ` (+${formatMoney(optionPrice)})` : ''}</span>`;
    })
    .join('');
};

const flattenOptions = (optionGroups = []) =>
  optionGroups.flatMap((group) =>
    (group.options || []).map((option) => ({
      ...option,
      option_type: option.option_type || group.option_type
    }))
  );

const isSameCartItem = (currentItem, nextItem) =>
  currentItem.food_name === nextItem.food_name &&
  currentItem.image_url === nextItem.image_url &&
  Number(currentItem.base_price || 0) === Number(nextItem.base_price || 0) &&
  JSON.stringify(currentItem.selected_options || []) === JSON.stringify(nextItem.selected_options || []);

const getValidationMessages = (validationState, cartItemId) => validationState[cartItemId]?.messages || [];

const getCheckoutBlockReason = ({ isCheckingCart, validationState }) => {
  if (!CartContext.cartItems.length) return '';
  if (isCheckingCart) return 'Đang kiểm tra lại giỏ hàng...';

  const hasInvalidItem = CartContext.cartItems.some((item) => getValidationMessages(validationState, item.cart_item_id).length > 0);
  return hasInvalidItem ? 'Giỏ hàng có món hết hàng hoặc không hợp lệ. Vui lòng cập nhật trước khi đặt hàng.' : '';
};

const renderCartItem = (item, validationState = {}) => {
  const imageUrl = item.image_url || getFallbackImage(item.food_name);
  const fallbackImage = getFallbackImage(item.food_name);
  const messages = getValidationMessages(validationState, item.cart_item_id);

  return `
    <article class="cart-item ${messages.length ? 'has-warning' : ''}" data-cart-item-id="${escapeHtml(item.cart_item_id)}">
      <img class="cart-item__image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.food_name)}" onerror="this.onerror=null;this.src='${escapeHtml(fallbackImage)}';" />
      <div class="cart-item__info">
        <div class="cart-item__heading">
          <h3>${escapeHtml(item.food_name)}</h3>
          <strong>${formatMoney(item.item_total)}</strong>
        </div>
        <div class="cart-item__options">${renderOptions(item.selected_options)}</div>
        ${item.note ? `<p class="cart-item__note">Ghi chú: ${escapeHtml(item.note)}</p>` : ''}
        <p class="cart-item__price">Đơn giá: ${formatMoney(Number(item.item_total || 0) / Number(item.quantity || 1))}</p>
        ${
          messages.length
            ? `<div class="cart-item__warning">${messages.map((message) => `<p>${escapeHtml(message)}</p>`).join('')}</div>`
            : ''
        }
      </div>
      <div class="cart-item__actions">
        <div class="cart-quantity" aria-label="Cập nhật số lượng">
          <button type="button" data-quantity-step="-1" aria-label="Giam so luong">-</button>
          <input type="number" min="1" step="1" value="${Number(item.quantity || 1)}" data-cart-quantity aria-label="Số lượng ${escapeHtml(item.food_name)}" />
          <button type="button" data-quantity-step="1" aria-label="Tang so luong">+</button>
        </div>
        <button class="button button-secondary cart-remove" type="button" data-remove-cart-item>Xóa</button>
      </div>
    </article>
  `;
};

const renderEmptyState = () => `
  <section class="cart-empty">
    <h2>Giỏ hàng đang trống</h2>
    <p>Chọn món trong thực đơn để thêm vào giỏ hàng tạm của khách vãng lai.</p>
    <a class="button button-primary" href="#/menu">Xem thực đơn</a>
  </section>
`;

const renderCartContent = ({ voucherError = '', isApplyingVoucher = false, validationState = {}, isCheckingCart = false } = {}) => {
  const cartItems = CartContext.cartItems;
  if (!cartItems.length) return renderEmptyState();

  const subtotal = CartContext.getSubtotal();
  const checkoutBlockReason = getCheckoutBlockReason({ isCheckingCart, validationState });
  const canCheckout = !checkoutBlockReason;

  return `
    <div class="cart-layout">
      <section class="cart-list" aria-label="Danh sách món trong giỏ">
        ${cartItems.map((item) => renderCartItem(item, validationState)).join('')}
      </section>
      ${CartSummary({
        totalQuantity: CartContext.getTotalQuantity(),
        subtotal,
        appliedVoucher: CartContext.appliedVoucher,
        discountAmount: CartContext.discountAmount,
        finalTotal: CartContext.getFinalTotal(),
        voucherError,
        isApplyingVoucher,
        canCheckout,
        checkoutBlockReason
      })}
    </div>
  `;
};

const validateCartItem = async (item) => {
  try {
    const [food, optionGroups] = await Promise.all([
      menuService.getFoodById(item.food_id),
      foodOptionsService.getFoodOptions(item.food_id)
    ]);
    const messages = [];

    if (!isFoodAvailable(food)) {
      messages.push('Món này hiện đang hết hàng hoặc tạm ngừng bán.');
    }

    const inventory = food.inventory || {};
    if (!inventory.is_unlimited && inventory.quantity !== null && inventory.quantity !== undefined && Number(item.quantity || 0) > Number(inventory.quantity || 0)) {
      messages.push(`Số lượng vượt tồn kho hiện tại. Chỉ còn ${Number(inventory.quantity || 0)} phần.`);
    }

    const optionMap = new Map(flattenOptions(optionGroups).map((option) => [Number(option.option_id), option]));
    const refreshedOptions = [];
    let hasInvalidOption = false;

    for (const option of item.selected_options || []) {
      const currentOption = optionMap.get(Number(option.option_id));

      if (!currentOption || currentOption.status !== 'ACTIVE') {
        messages.push(`Tùy chọn "${option.option_name || option.option_id}" không còn khả dụng.`);
        hasInvalidOption = true;
        continue;
      }

      refreshedOptions.push({
        option_id: Number(currentOption.option_id),
        option_name: currentOption.option_name,
        option_type: currentOption.option_type,
        extra_price: Number(currentOption.extra_price || 0)
      });
    }

    const refreshedItem = {
      ...item,
      food_name: food.food_name,
      image_url: food.image_url || item.image_url,
      base_price: Number(food.price || 0),
      selected_options: hasInvalidOption ? item.selected_options : refreshedOptions
    };

    return {
      cart_item_id: item.cart_item_id,
      messages,
      refreshedItem,
      changed: !isSameCartItem(item, refreshedItem)
    };
  } catch (error) {
    return {
      cart_item_id: item.cart_item_id,
      messages: ['Món trong giỏ không còn tồn tại hoặc không thể kiểm tra.'],
      refreshedItem: item,
      changed: false
    };
  }
};

const pageStyles = `
  <style>
    .cart-page { padding: 6px 0 24px; }
    .cart-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; margin-bottom: 22px; }
    .cart-header h1 { margin: 0 0 8px; font-size: 34px; }
    .cart-header p { margin: 0; max-width: 1040px; color: var(--muted); line-height: 1.5; }
    .cart-layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 18px; align-items: flex-start; }
    .cart-list { display: grid; gap: 12px; }
    .cart-item { display: grid; grid-template-columns: 130px minmax(0, 1fr) 172px; gap: 14px; padding: 14px; border: 1px solid var(--line); border-radius: 8px; background: #fff; box-shadow: 0 12px 28px rgba(116, 36, 0, 0.08); }
    .cart-item.has-warning { border-color: #f2b8b5; box-shadow: 0 0 0 2px rgba(179, 38, 30, 0.08); }
    .cart-item__image { width: 130px; height: 110px; border-radius: 6px; object-fit: cover; background: #f5d3a4; }
    .cart-item__heading { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .cart-item__heading h3 { margin: 0; font-size: 18px; line-height: 1.25; }
    .cart-item__heading strong { color: var(--red); white-space: nowrap; }
    .cart-item__options { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0; }
    .cart-item__options span { display: inline-flex; min-height: 28px; align-items: center; border: 1px solid #f0c372; border-radius: 6px; padding: 5px 8px; background: #fffaf3; color: var(--muted); font-size: 13px; font-weight: 700; }
    .cart-item__note, .cart-item__price { margin: 6px 0 0; color: var(--muted); line-height: 1.45; }
    .cart-item__warning { display: grid; gap: 4px; margin-top: 10px; padding: 10px; border: 1px solid #f2b8b5; border-radius: 8px; background: #fff7f6; color: #b3261e; font-size: 13px; font-weight: 800; }
    .cart-item__warning p { margin: 0; }
    .cart-item__actions { display: grid; align-content: space-between; gap: 10px; }
    .cart-quantity { display: grid; grid-template-columns: 38px minmax(56px, 1fr) 38px; gap: 6px; }
    .cart-quantity button, .cart-quantity input { min-height: 38px; border: 1px solid var(--line); border-radius: 6px; background: #fff; color: var(--ink); font: inherit; font-weight: 800; text-align: center; }
    .cart-quantity button { cursor: pointer; }
    .cart-remove, .cart-clear, .cart-checkout { width: 100%; }
    .cart-summary { position: sticky; top: 86px; display: grid; gap: 12px; padding: 16px; border: 1px solid var(--line); border-radius: 8px; background: #fff; box-shadow: 0 12px 28px rgba(116, 36, 0, 0.08); }
    .cart-summary h2 { margin: 0 0 4px; font-size: 22px; }
    .cart-summary__row, .cart-summary__total { display: flex; justify-content: space-between; gap: 12px; color: var(--muted); }
    .cart-summary__row strong { color: var(--ink); }
    .cart-summary__discount strong { color: #16803a; }
    .cart-summary__total { border-top: 1px solid var(--line); padding-top: 12px; color: var(--ink); font-size: 18px; font-weight: 800; }
    .cart-summary__total strong { color: var(--red); }
    .cart-summary__warning { margin: 0; padding: 10px; border: 1px solid #f2b8b5; border-radius: 8px; background: #fff7f6; color: #b3261e; font-size: 13px; font-weight: 800; line-height: 1.35; }
    .voucher-form { display: grid; gap: 8px; padding: 12px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
    .voucher-form label, .voucher-box__label { color: var(--muted); font-size: 13px; font-weight: 800; }
    .voucher-form__controls { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
    .voucher-form__controls input { min-width: 0; border: 1px solid var(--line); border-radius: 6px; padding: 10px 12px; color: var(--ink); font: inherit; text-transform: uppercase; }
    .voucher-form__controls button { min-width: 86px; }
    .voucher-form__error { margin: 0; color: #b3261e; font-size: 13px; line-height: 1.35; }
    .voucher-box { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 12px; border: 1px solid #9bd4aa; border-radius: 8px; background: #f3fbf5; }
    .voucher-box strong { display: block; margin-top: 3px; color: #166534; }
    .voucher-box__remove { padding-inline: 10px; white-space: nowrap; }
    .cart-empty { padding: 32px; border: 1px dashed var(--line); border-radius: 8px; background: #fff; text-align: center; }
    .cart-empty h2 { margin: 0 0 10px; font-size: 26px; }
    .cart-empty p { margin: 0 auto 18px; max-width: 520px; color: var(--muted); line-height: 1.5; }
    @media (max-width: 900px) {
      .cart-layout { grid-template-columns: 1fr; }
      .cart-summary { position: static; }
    }
    @media (max-width: 660px) {
      .cart-header { display: block; }
      .cart-item { grid-template-columns: 92px minmax(0, 1fr); }
      .cart-item__image { width: 92px; height: 92px; }
      .cart-item__actions { grid-column: 1 / -1; }
      .voucher-form__controls { grid-template-columns: 1fr; }
    }
  </style>
`;

export const CartPage = () => `
  ${pageStyles}
  <section class="cart-page" data-cart-page>
    <div class="cart-header">
      <div>
        <h1>Giỏ hàng</h1>
        <p>Quản lý món đã chọn, cập nhật số lượng và kiểm tra tổng tiền trước khi tiếp tục đặt hàng.</p>
      </div>
      <a class="button button-secondary" href="#/menu">Thêm món</a>
    </div>
    <div data-cart-content>${renderCartContent()}</div>
  </section>
`;

export const mountCartPage = () => {
  const root = document.querySelector('[data-cart-page]');
  if (!root) return;

  const contentRoot = root.querySelector('[data-cart-content]');
  let voucherError = '';
  let isApplyingVoucher = false;
  let isCheckingCart = false;
  let validationState = {};
  let validationRun = 0;

  const render = () => {
    contentRoot.innerHTML = renderCartContent({ voucherError, isApplyingVoucher, validationState, isCheckingCart });
  };

  const validateCart = async () => {
    const cartItems = CartContext.cartItems;
    validationRun += 1;
    const currentRun = validationRun;

    if (!cartItems.length) {
      validationState = {};
      isCheckingCart = false;
      render();
      return;
    }

    isCheckingCart = true;
    render();

    const results = await Promise.all(cartItems.map(validateCartItem));
    if (currentRun !== validationRun) return;

    validationState = results.reduce((state, result) => ({
      ...state,
      [result.cart_item_id]: {
        messages: result.messages
      }
    }), {});

    const nextItems = cartItems.map((item) => results.find((result) => result.cart_item_id === item.cart_item_id)?.refreshedItem || item);
    const shouldRefreshCart = results.some((result) => result.changed);

    if (shouldRefreshCart) {
      CartContext.replaceItems(nextItems);
    }

    isCheckingCart = false;
    render();
  };

  contentRoot.addEventListener('click', (event) => {
    const cartItem = event.target.closest('[data-cart-item-id]');
    const cartItemId = cartItem?.dataset.cartItemId;

    if (event.target.closest('[data-clear-cart]')) {
      voucherError = '';
      CartContext.clearCart();
      validateCart();
      return;
    }

    if (event.target.closest('[data-continue-order]')) {
      if (getCheckoutBlockReason({ isCheckingCart, validationState })) return;
      window.location.hash = '#/checkout';
      return;
    }

    if (!cartItemId) return;

    if (event.target.closest('[data-remove-cart-item]')) {
      voucherError = '';
      CartContext.removeItem(cartItemId);
      validateCart();
      return;
    }

    const stepButton = event.target.closest('[data-quantity-step]');
    if (stepButton) {
      const input = cartItem.querySelector('[data-cart-quantity]');
      const nextQuantity = Math.max(1, Number(input.value || 1) + Number(stepButton.dataset.quantityStep));
      voucherError = '';
      CartContext.updateQuantity(cartItemId, nextQuantity);
      validateCart();
    }
  });

  contentRoot.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-voucher-form]');
    if (!form) return;

    event.preventDefault();
    const code = new FormData(form).get('voucherCode');

    if (!String(code || '').trim()) {
      voucherError = 'Vui lòng nhập mã voucher';
      render();
      return;
    }

    try {
      isApplyingVoucher = true;
      voucherError = '';
      render();

      const voucher = await voucherService.applyPublicVoucher({
        code,
        orderTotal: CartContext.getSubtotal()
      });

      CartContext.applyVoucher(voucher);
      voucherError = '';
    } catch (error) {
      CartContext.removeVoucher();
      voucherError = error?.message || 'Không thể áp dụng voucher';
    } finally {
      isApplyingVoucher = false;
      render();
    }
  });

  contentRoot.addEventListener('change', (event) => {
    const input = event.target.closest('[data-cart-quantity]');
    if (!input) return;

    const cartItem = input.closest('[data-cart-item-id]');
    const nextQuantity = Math.max(1, Number.parseInt(input.value, 10) || 1);
    voucherError = '';
    CartContext.updateQuantity(cartItem.dataset.cartItemId, nextQuantity);
    validateCart();
  });

  contentRoot.addEventListener('click', (event) => {
    if (!event.target.closest('[data-remove-voucher]')) return;

    voucherError = '';
    CartContext.removeVoucher();
    render();
  });

  validateCart();
};
