import { CartContext } from '../../contexts/CartContext.js';
import { orderService } from '../../services/orderService.js';
import { authService } from '../../services/authService.js';
import { accountService } from '../../services/accountService.js';

const LAST_GUEST_ORDER_KEY = 'fast-food-last-guest-order';

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

const normalizeAddress = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

const estimateDeliveryFee = (address = '') => {
  const normalizedAddress = normalizeAddress(address);
  const areas = [
    { keywords: ['quan 1', 'q1'], fee: 15000 },
    { keywords: ['quan 3', 'q3'], fee: 18000 },
    { keywords: ['binh thanh'], fee: 22000 }
  ];

  const area = areas.find((entry) => entry.keywords.some((keyword) => normalizedAddress.includes(keyword)));
  return area ? area.fee : 0;
};

const validateForm = (form) => {
  const formData = new FormData(form);
  const errors = {};
  const phone = String(formData.get('guest_phone') || '').trim().replace(/[\s.-]/g, '');

  if (!String(formData.get('guest_name') || '').trim()) {
    errors.guest_name = 'Vui lòng nhập họ tên';
  }

  if (!phone) {
    errors.guest_phone = 'Vui lòng nhập số điện thoại';
  } else if (!/^(0\d{9}|\+84\d{9})$/.test(phone)) {
    errors.guest_phone = 'Số điện thoại không đúng định dạng';
  }

  if (!String(formData.get('guest_address') || '').trim()) {
    errors.guest_address = 'Vui lòng nhập địa chỉ giao hàng';
  }

  return errors;
};

const renderFieldError = (fieldErrors, fieldName) =>
  fieldErrors[fieldName] ? `<p class="checkout-field__error">${escapeHtml(fieldErrors[fieldName])}</p>` : '';

const renderSummaryItems = () =>
  CartContext.cartItems
    .map(
      (item) => `
        <li class="checkout-summary__item">
          <span>${escapeHtml(item.food_name)} x ${Number(item.quantity || 0)}</span>
          <strong>${formatMoney(item.item_total)}</strong>
        </li>
      `
    )
    .join('');

const renderOrderSummary = (deliveryFee = 0) => {
  const subtotal = CartContext.getSubtotal();
  const discountAmount = CartContext.discountAmount;
  const totalAmount = Math.max(0, subtotal - discountAmount + deliveryFee);

  return `
    <aside class="checkout-summary" aria-label="Tóm tắt đơn hàng">
      <h2>Tóm tắt đơn hàng</h2>
      <ul>${renderSummaryItems()}</ul>
      <div class="checkout-summary__row">
        <span>Tạm tính</span>
        <strong>${formatMoney(subtotal)}</strong>
      </div>
      ${
        CartContext.appliedVoucher
          ? `
            <div class="checkout-summary__row checkout-summary__discount">
              <span>Voucher ${escapeHtml(CartContext.appliedVoucher.code || '')}</span>
              <strong>-${formatMoney(discountAmount)}</strong>
            </div>
          `
          : ''
      }
      <div class="checkout-summary__row">
        <span>Phí giao hàng</span>
        <strong>${deliveryFee > 0 ? formatMoney(deliveryFee) : 'Nhập địa chỉ'}</strong>
      </div>
      <div class="checkout-summary__total">
        <span>Tổng thanh toán</span>
        <strong>${formatMoney(totalAmount)}</strong>
      </div>
    </aside>
  `;
};

const renderCheckoutForm = ({ fieldErrors = {}, submitError = '', isSubmitting = false, deliveryFee = 0, values = {}, isMember = false } = {}) => {
  if (!CartContext.cartItems.length) {
    return `
      <section class="checkout-empty">
        <h1>Giỏ hàng không hợp lệ</h1>
        <p>Vui lòng quay lại giỏ hàng để thêm món hoặc cập nhật số lượng trước khi thanh toán.</p>
        <a class="button button-primary" href="#/cart">Quay lại giỏ hàng</a>
      </section>
    `;
  }

  return `
    <div class="checkout-header">
      <div>
        <h1>${isMember ? 'Thanh toán thành viên' : 'Thanh toán khách vãng lai'}</h1>
        <p>${isMember ? 'Thông tin tài khoản được điền sẵn, đơn hàng sẽ được lưu vào lịch sử và tích điểm.' : 'Nhập thông tin nhận hàng để tạo mã đơn vãng lai và tiếp tục bước thanh toán.'}</p>
      </div>
      ${isMember ? '<a class="button button-secondary" href="#/account">Tài khoản</a>' : '<a class="button button-secondary" href="#/login">Đăng nhập / Đăng ký</a>'}
    </div>

    <div class="checkout-layout">
      <form class="checkout-form" data-guest-checkout-form novalidate>
        ${submitError ? `<div class="checkout-error">${escapeHtml(submitError)}</div>` : ''}
        <label class="checkout-field ${fieldErrors.guest_name ? 'has-error' : ''}">
          <span>Họ tên</span>
          <input name="guest_name" type="text" maxlength="100" autocomplete="name" value="${escapeHtml(values.guest_name || '')}" />
          ${renderFieldError(fieldErrors, 'guest_name')}
        </label>
        <label class="checkout-field ${fieldErrors.guest_phone ? 'has-error' : ''}">
          <span>Số điện thoại</span>
          <input name="guest_phone" type="tel" maxlength="20" autocomplete="tel" placeholder="0900000000" value="${escapeHtml(values.guest_phone || '')}" />
          ${renderFieldError(fieldErrors, 'guest_phone')}
        </label>
        <label class="checkout-field ${fieldErrors.guest_address ? 'has-error' : ''}">
          <span>Địa chỉ giao hàng</span>
          <textarea name="guest_address" rows="3" maxlength="255" autocomplete="street-address" placeholder="Ví dụ: 12 Nguyễn Huệ, Quận 1, TP HCM">${escapeHtml(values.guest_address || '')}</textarea>
          ${renderFieldError(fieldErrors, 'guest_address')}
        </label>
        <label class="checkout-field">
          <span>Ghi chú</span>
          <textarea name="note" rows="2" maxlength="255" placeholder="Vi du: goi truoc khi giao">${escapeHtml(values.note || '')}</textarea>
        </label>
        <fieldset class="checkout-payment">
          <legend>Phương thức thanh toán</legend>
          <label>
            <input type="radio" name="payment_method" value="COD" ${values.payment_method !== 'ONLINE_MOCK' ? 'checked' : ''} />
            <span>COD</span>
          </label>
          <label>
            <input type="radio" name="payment_method" value="ONLINE_MOCK" ${values.payment_method === 'ONLINE_MOCK' ? 'checked' : ''} />
            <span>Online mock</span>
          </label>
        </fieldset>
        <button class="button button-primary checkout-submit" type="submit" ${isSubmitting ? 'disabled' : ''}>
          ${isSubmitting ? 'Đang tạo đơn...' : 'Xác nhận đặt món'}
        </button>
      </form>
      <div data-checkout-summary>${renderOrderSummary(deliveryFee)}</div>
    </div>
  `;
};

const pageStyles = `
  <style>
    .guest-checkout-page { padding: 6px 0 24px; }
    .checkout-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; margin-bottom: 22px; }
    .checkout-header h1 { margin: 0 0 8px; font-size: 34px; }
    .checkout-header p { margin: 0; max-width: 1040px; color: var(--muted); line-height: 1.5; }
    .checkout-layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 18px; align-items: flex-start; }
    .checkout-form, .checkout-summary, .checkout-empty { border: 1px solid var(--line); border-radius: 8px; background: #fff; box-shadow: 0 12px 28px rgba(116, 36, 0, 0.08); }
    .checkout-form { display: grid; gap: 14px; padding: 18px; }
    .checkout-field { display: grid; gap: 7px; color: var(--muted); font-weight: 800; }
    .checkout-field input, .checkout-field textarea { width: 100%; border: 1px solid var(--line); border-radius: 6px; padding: 11px 12px; color: var(--ink); font: inherit; background: #fff; }
    .checkout-field.has-error input, .checkout-field.has-error textarea { border-color: var(--red); box-shadow: 0 0 0 2px rgba(201, 31, 31, 0.1); }
    .checkout-field__error, .checkout-error { margin: 0; color: #b3261e; font-size: 13px; line-height: 1.35; }
    .checkout-error { padding: 12px; border: 1px solid #f2b8b5; border-radius: 8px; background: #fff7f6; font-weight: 800; }
    .checkout-payment { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 0; padding: 12px; border: 1px solid var(--line); border-radius: 8px; }
    .checkout-payment legend { padding: 0 6px; color: var(--muted); font-weight: 800; }
    .checkout-payment label { min-height: 44px; display: flex; align-items: center; gap: 9px; padding: 10px; border: 1px solid #f0c372; border-radius: 8px; cursor: pointer; font-weight: 800; }
    .checkout-payment input { accent-color: var(--red); }
    .checkout-submit { width: 100%; min-height: 46px; }
    .checkout-summary { position: sticky; top: 86px; padding: 16px; }
    .checkout-summary h2 { margin: 0 0 12px; font-size: 22px; }
    .checkout-summary ul { display: grid; gap: 10px; margin: 0 0 14px; padding: 0 0 14px; border-bottom: 1px solid var(--line); list-style: none; }
    .checkout-summary__item, .checkout-summary__row, .checkout-summary__total { display: flex; justify-content: space-between; gap: 12px; }
    .checkout-summary__item span { color: var(--muted); line-height: 1.35; }
    .checkout-summary__item strong, .checkout-summary__row strong { white-space: nowrap; }
    .checkout-summary__row { margin-top: 10px; color: var(--muted); }
    .checkout-summary__discount strong { color: #16803a; }
    .checkout-summary__total { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); font-size: 18px; font-weight: 800; }
    .checkout-summary__total strong { color: var(--red); }
    .checkout-empty { padding: 32px; text-align: center; }
    .checkout-empty h1 { margin: 0 0 10px; font-size: 30px; }
    .checkout-empty p { margin: 0 auto 18px; max-width: 560px; color: var(--muted); line-height: 1.5; }
    @media (max-width: 900px) {
      .checkout-layout { grid-template-columns: 1fr; }
      .checkout-summary { position: static; }
    }
    @media (max-width: 640px) {
      .checkout-header { display: block; }
      .checkout-header .button { margin-top: 14px; }
      .checkout-payment { grid-template-columns: 1fr; }
    }
  </style>
`;

export const GuestCheckoutPage = () => `
  ${pageStyles}
  <section class="guest-checkout-page" data-guest-checkout-page>
    ${renderCheckoutForm()}
  </section>
`;

export const mountGuestCheckoutPage = () => {
  const root = document.querySelector('[data-guest-checkout-page]');
  if (!root) return;

  let fieldErrors = {};
  let submitError = '';
  let isSubmitting = false;
  let deliveryFee = 0;
  let formValues = {};
  let isMember = Boolean(authService.getCurrentSession()?.token);

  const render = () => {
    root.innerHTML = renderCheckoutForm({ fieldErrors, submitError, isSubmitting, deliveryFee, values: formValues, isMember });
  };

  root.addEventListener('input', (event) => {
    const addressInput = event.target.closest('[name="guest_address"]');
    if (!addressInput) return;

    deliveryFee = estimateDeliveryFee(addressInput.value);
    const summaryRoot = root.querySelector('[data-checkout-summary]');
    if (summaryRoot) {
      summaryRoot.innerHTML = renderOrderSummary(deliveryFee);
    }
  });

  root.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-guest-checkout-form]');
    if (!form) return;

    event.preventDefault();
    const formData = new FormData(form);
    formValues = {
      guest_name: String(formData.get('guest_name') || '').trim(),
      guest_phone: String(formData.get('guest_phone') || '').trim(),
      guest_address: String(formData.get('guest_address') || '').trim(),
      note: String(formData.get('note') || '').trim(),
      payment_method: String(formData.get('payment_method') || 'COD')
    };
    fieldErrors = validateForm(form);
    submitError = '';

    if (Object.keys(fieldErrors).length) {
      render();
      return;
    }

    if (!CartContext.cartItems.length) {
      submitError = 'Giỏ hàng rỗng hoặc không hợp lệ. Vui lòng quay lại giỏ hàng.';
      render();
      return;
    }

    const guestAddress = formValues.guest_address;
    deliveryFee = estimateDeliveryFee(guestAddress);

    const payload = {
      guest_name: formValues.guest_name,
      guest_phone: formValues.guest_phone,
      guest_address: guestAddress,
      note: formValues.note,
      items: CartContext.cartItems.map((item) => ({
        food_id: item.food_id,
        quantity: item.quantity,
        note: item.note,
        selected_options: (item.selected_options || []).map((option) => ({
          option_id: option.option_id,
          quantity: option.quantity || 1
        }))
      })),
      applied_voucher: CartContext.appliedVoucher,
      subtotal: CartContext.getSubtotal(),
      discount_amount: CartContext.discountAmount,
      delivery_fee: deliveryFee,
      total_amount: Math.max(0, CartContext.getSubtotal() - CartContext.discountAmount + deliveryFee),
      payment_method: formValues.payment_method
    };

    try {
      isSubmitting = true;
      render();

      const order = isMember
        ? await accountService.createMemberOrder({
            ...payload,
            delivery_address: payload.guest_address
          })
        : await orderService.createGuestOrder(payload);
      window.sessionStorage.setItem(LAST_GUEST_ORDER_KEY, JSON.stringify(order));
      CartContext.clearCart();
      window.location.hash = isMember ? '#/account' : '#/guest-order/result';
    } catch (error) {
      fieldErrors = error?.errors && typeof error.errors === 'object' ? error.errors : {};
      if (fieldErrors.delivery_address && !fieldErrors.guest_address) {
        fieldErrors.guest_address = fieldErrors.delivery_address;
      }
      submitError = error?.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.';
    } finally {
      isSubmitting = false;
      render();
    }
  });

  const prefillMember = async () => {
    if (!isMember) return;

    try {
      const [profile, addresses] = await Promise.all([accountService.getProfile(), accountService.getAddresses()]);
      const defaultAddress = (addresses || []).find((address) => address.is_default) || addresses?.[0];
      formValues = {
        ...formValues,
        guest_name: profile.full_name || '',
        guest_phone: profile.phone || '',
        guest_address: defaultAddress
          ? [defaultAddress.address_detail, defaultAddress.ward, defaultAddress.district, defaultAddress.city].filter(Boolean).join(', ')
          : '',
        payment_method: 'COD'
      };
      deliveryFee = estimateDeliveryFee(formValues.guest_address);
      render();
    } catch (error) {
      isMember = false;
      render();
    }
  };

  prefillMember();
};
