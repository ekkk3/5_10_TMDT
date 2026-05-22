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

const getLastGuestOrder = () => {
  try {
    return JSON.parse(window.sessionStorage.getItem(LAST_GUEST_ORDER_KEY) || 'null');
  } catch (error) {
    return null;
  }
};

const pageStyles = `
  <style>
    .guest-result { max-width: 720px; margin: 0 auto; padding: 30px; border: 1px solid var(--line); border-radius: 8px; background: #fff; box-shadow: 0 12px 28px rgba(116, 36, 0, 0.08); }
    .guest-result h1 { margin: 0 0 10px; font-size: 34px; }
    .guest-result p { color: var(--muted); line-height: 1.55; }
    .guest-result__code { margin: 18px 0; padding: 18px; border: 1px solid #f0c372; border-radius: 8px; background: #fffaf3; }
    .guest-result__code span { display: block; color: var(--muted); font-weight: 800; }
    .guest-result__code strong { display: block; margin-top: 6px; color: var(--red); font-size: 30px; letter-spacing: 0; }
    .guest-result__meta { display: grid; gap: 10px; margin: 18px 0; }
    .guest-result__meta div { display: flex; justify-content: space-between; gap: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--line); color: var(--muted); }
    .guest-result__meta strong { color: var(--ink); }
    .guest-result__actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
  </style>
`;

export const GuestOrderResultPage = () => {
  const order = getLastGuestOrder();

  if (!order) {
    return `
      ${pageStyles}
      <section class="guest-result">
        <h1>Chua co thong tin don hang</h1>
        <p>Khong tim thay don vang lai vua tao trong phien hien tai.</p>
        <div class="guest-result__actions">
          <a class="button button-primary" href="#/menu">Dat mon</a>
          <a class="button button-secondary" href="#/orders/search">Tra cuu don</a>
        </div>
      </section>
    `;
  }

  return `
    ${pageStyles}
    <section class="guest-result">
      <h1>Dat mon thanh cong</h1>
      <p>Don hang da duoc tao va chuyen sang buoc cho thanh toan. Hay luu ma don va so dien thoai de tra cuu trang thai.</p>
      <div class="guest-result__code">
        <span>Ma don vang lai</span>
        <strong>${escapeHtml(order.order_code)}</strong>
      </div>
      <div class="guest-result__meta">
        <div>
          <span>So dien thoai</span>
          <strong>${escapeHtml(order.guest_phone)}</strong>
        </div>
        <div>
          <span>Trang thai</span>
          <strong>${escapeHtml(order.order_status)}</strong>
        </div>
        <div>
          <span>Tong thanh toan</span>
          <strong>${formatMoney(order.total_amount)}</strong>
        </div>
      </div>
      <p>Tra cuu don bang ma don <strong>${escapeHtml(order.order_code)}</strong> va so dien thoai vua dat.</p>
      <div class="guest-result__actions">
        <a class="button button-primary" href="#/orders/search">Tra cuu don</a>
        <a class="button button-secondary" href="#/menu">Tiep tuc dat mon</a>
      </div>
    </section>
  `;
};
