import { getOrderStatusLabel, OrderStatusTimeline } from './OrderStatusTimeline.js';

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

const formatDateTime = (value) => {
  if (!value) return 'Chua co cap nhat';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chua co cap nhat';

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

const renderOptions = (options = []) => {
  if (!options.length) return '';

  return `
    <ul class="tracking-items__options">
      ${options
        .map(
          (option) => `
            <li>
              ${escapeHtml(option.option_name)} x ${Number(option.quantity || 0)}
              ${Number(option.extra_price || 0) > 0 ? `(+${formatMoney(option.extra_price)})` : ''}
            </li>
          `
        )
        .join('')}
    </ul>
  `;
};

const renderItems = (items = []) => {
  if (!items.length) {
    return '<p class="tracking-result__muted">Don hang chua co du lieu mon.</p>';
  }

  return `
    <ul class="tracking-items">
      ${items
        .map(
          (item) => `
            <li class="tracking-items__row">
              <div>
                <strong>${escapeHtml(item.food_name)}</strong>
                <span>So luong: ${Number(item.quantity || 0)}</span>
                <span>Don gia: ${formatMoney(item.unit_price)}</span>
                ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ''}
                ${renderOptions(item.options || [])}
              </div>
              <strong>${formatMoney(item.total_price)}</strong>
            </li>
          `
        )
        .join('')}
    </ul>
  `;
};

export const TrackingResult = (order) => {
  if (!order) return '';

  return `
    <section class="tracking-result" aria-live="polite">
      <div class="tracking-result__header">
        <div>
          <span class="tracking-result__eyebrow">Ma don ${escapeHtml(order.order_code)}</span>
          <h2>${escapeHtml(getOrderStatusLabel(order.order_status))}</h2>
        </div>
        <strong class="tracking-result__amount">${formatMoney(order.total_amount)}</strong>
      </div>

      <div class="tracking-summary">
        <div>
          <span>Khach hang</span>
          <strong>${escapeHtml(order.guest_name)}</strong>
        </div>
        <div>
          <span>So dien thoai</span>
          <strong>${escapeHtml(order.guest_phone)}</strong>
        </div>
        <div>
          <span>Thanh toan</span>
          <strong>${escapeHtml(order.payment_method || '-')} / ${escapeHtml(order.payment_status || '-')}</strong>
        </div>
        <div>
          <span>Cap nhat gan nhat</span>
          <strong>${escapeHtml(formatDateTime(order.updated_at))}</strong>
        </div>
      </div>

      <div class="tracking-detail-grid">
        <div>
          <span>Dia chi giao hang</span>
          <strong>${escapeHtml(order.delivery_address || 'Chua co dia chi')}</strong>
        </div>
        <div>
          <span>Ghi chu don</span>
          <strong>${escapeHtml(order.note || 'Khong co ghi chu')}</strong>
        </div>
      </div>

      <div class="tracking-money">
        <div>
          <span>Tam tinh</span>
          <strong>${formatMoney(order.subtotal)}</strong>
        </div>
        <div>
          <span>Phi giao hang</span>
          <strong>${formatMoney(order.delivery_fee)}</strong>
        </div>
        <div>
          <span>Giam gia</span>
          <strong>-${formatMoney(order.discount_amount)}</strong>
        </div>
        <div class="tracking-money__total">
          <span>Tong thanh toan</span>
          <strong>${formatMoney(order.total_amount)}</strong>
        </div>
      </div>

      ${
        order.order_status === 'CANCELLED'
          ? `
            <div class="tracking-cancel">
              <strong>Ly do huy</strong>
              <p>${escapeHtml(order.cancel_reason || 'Chua co ly do huy.')}</p>
            </div>
          `
          : ''
      }

      <div class="tracking-section">
        <h3>Trang thai don</h3>
        ${OrderStatusTimeline({ orderStatus: order.order_status, statusHistory: order.status_history || [] })}
      </div>

      <div class="tracking-section">
        <h3>Tong quan mon</h3>
        ${renderItems(order.items || [])}
      </div>
    </section>
  `;
};
