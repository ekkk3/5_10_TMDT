import { kitchenService } from '../../services/kitchenService.js';

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const formatDateTime = (value) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
};

const getStatusLabel = (status) =>
  ({
    CONFIRMED: 'Cho nau',
    COOKING: 'Dang nau',
    READY: 'Cho giao',
    CANCELLED: 'Da huy'
  })[status] || status || '';

const pageStyles = `
  <style>
    .kds-page { display: grid; gap: 18px; }
    .kds-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 18px; }
    .kds-header h1 { margin: 0 0 8px; font-size: 34px; }
    .kds-header p { margin: 0; max-width: 720px; color: var(--muted); line-height: 1.5; }
    .kds-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .kds-stat { padding: 10px 12px; border: 1px solid #ffe0aa; border-radius: 8px; background: #fffaf3; font-weight: 900; }
    .kds-stat span { color: var(--muted); font-weight: 700; }
    .kds-message { padding: 13px 15px; border-radius: 8px; font-weight: 900; }
    .kds-message.error { border: 1px solid #f2b8b5; color: #9f1f18; background: #fff7f6; }
    .kds-message.success { border: 1px solid #b8dfca; color: #0f5c36; background: #effaf4; }
    .kds-cancel-alert { padding: 18px; border: 2px solid #c91f1f; border-radius: 8px; color: #fff; background: #9f1f18; box-shadow: 0 14px 32px rgba(159, 31, 24, 0.24); }
    .kds-cancel-alert strong { display: block; margin-bottom: 6px; font-size: 22px; }
    .kds-sections { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 0.45fr); gap: 16px; align-items: start; }
    .kds-section { display: grid; gap: 12px; }
    .kds-section h2 { margin: 0; font-size: 22px; }
    .kds-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px; }
    .kds-card { display: grid; gap: 14px; padding: 16px; border: 1px solid var(--line); border-left: 8px solid var(--gold); border-radius: 8px; background: #fff; box-shadow: 0 12px 28px rgba(116, 36, 0, 0.08); }
    .kds-card.status-COOKING { border-left-color: #128247; background: #f7fffa; }
    .kds-card.status-CANCELLED { border-left-color: #c91f1f; background: #fff7f6; }
    .kds-card.status-READY { border-left-color: #0f5c89; background: #f3fbff; }
    .kds-card__header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .kds-card__header h3 { margin: 0 0 6px; color: var(--red); font-size: 24px; }
    .kds-card__meta { display: block; color: var(--muted); font-size: 13px; line-height: 1.4; }
    .kds-badge { display: inline-flex; align-items: center; min-height: 28px; padding: 5px 9px; border-radius: 6px; background: #fff1cc; color: #7a2d00; font-size: 12px; font-weight: 900; white-space: nowrap; }
    .kds-badge.status-COOKING { color: #0f5c36; background: #e8f7ef; }
    .kds-badge.status-CANCELLED { color: #9f1f18; background: #ffe9e7; }
    .kds-items { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
    .kds-item { display: grid; grid-template-columns: 44px minmax(0, 1fr); gap: 10px; padding-top: 10px; border-top: 1px solid var(--line); }
    .kds-item__qty { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 8px; color: #fff; background: var(--red); font-weight: 900; }
    .kds-item strong { display: block; margin-bottom: 4px; overflow-wrap: anywhere; }
    .kds-item p, .kds-item ul { margin: 5px 0 0; color: var(--muted); line-height: 1.4; }
    .kds-actions { display: flex; gap: 9px; flex-wrap: wrap; }
    .kds-action { border: 0; border-radius: 6px; min-height: 42px; padding: 10px 13px; cursor: pointer; font-weight: 900; }
    .kds-action:disabled { cursor: wait; opacity: 0.6; }
    .kds-action.start { color: #fff; background: #128247; }
    .kds-action.ready { color: #fff; background: #0f5c89; }
    .kds-action.secondary { color: var(--ink); background: var(--gold); }
    .kds-empty { padding: 22px; border: 1px dashed var(--line); border-radius: 8px; color: var(--muted); background: rgba(255, 255, 255, 0.55); font-weight: 900; text-align: center; }
    @media (max-width: 920px) {
      .kds-header, .kds-sections { display: grid; grid-template-columns: 1fr; }
      .kds-toolbar { align-items: stretch; }
      .kds-toolbar .button { width: 100%; }
    }
  </style>
`;

const renderOptions = (options = []) => {
  if (!options.length) return '';

  return `
    <ul>
      ${options.map((option) => `<li>${escapeHtml(option.option_name)} x ${Number(option.quantity || 0)}</li>`).join('')}
    </ul>
  `;
};

const renderItems = (items = []) => {
  if (!items.length) {
    return '<div class="kds-empty">Don chua co mon can nau.</div>';
  }

  return `
    <ul class="kds-items">
      ${items
        .map(
          (item) => `
            <li class="kds-item">
              <span class="kds-item__qty">x${Number(item.quantity || 0)}</span>
              <div>
                <strong>${escapeHtml(item.food_name)}</strong>
                <span class="kds-card__meta">Trang thai mon: ${escapeHtml(item.kitchen_status || '-')}</span>
                ${item.note ? `<p>Ghi chu: ${escapeHtml(item.note)}</p>` : ''}
                ${renderOptions(item.options || [])}
              </div>
            </li>
          `
        )
        .join('')}
    </ul>
  `;
};

const renderOrderCard = (order, { isUpdating = false } = {}) => {
  const isCancelled = order.order_status === 'CANCELLED';
  const canStart = order.order_status === 'CONFIRMED';
  const canReady = order.order_status === 'COOKING';

  return `
    <article class="kds-card status-${escapeHtml(order.order_status)}">
      <header class="kds-card__header">
        <div>
          <h3>${escapeHtml(order.order_code)}</h3>
          <span class="kds-card__meta">${escapeHtml(order.customer_name || 'Khach hang')} - ${formatDateTime(order.created_at)}</span>
        </div>
        <span class="kds-badge status-${escapeHtml(order.order_status)}">${escapeHtml(getStatusLabel(order.order_status))}</span>
      </header>
      ${
        isCancelled
          ? `<div class="kds-message error">Don da bi huy - dung xu ly.${order.cancel_reason ? ` Ly do: ${escapeHtml(order.cancel_reason)}` : ''}</div>`
          : ''
      }
      ${order.note ? `<div class="kds-message success">Ghi chu don: ${escapeHtml(order.note)}</div>` : ''}
      ${renderItems(order.items || [])}
      <div class="kds-actions">
        ${
          canStart
            ? `<button class="kds-action start" type="button" data-mark-cooking="${order.order_id}" ${isUpdating ? 'disabled' : ''}>Nhan mon / Bat dau nau</button>`
            : ''
        }
        ${
          canReady
            ? `<button class="kds-action ready" type="button" data-mark-ready="${order.order_id}" ${isUpdating ? 'disabled' : ''}>Hoan thanh</button>`
            : ''
        }
        ${
          !isCancelled && (canStart || canReady)
            ? `<button class="kds-action secondary" type="button" data-request-stock-alert="${order.order_id}">Bao het nguyen lieu</button>`
            : ''
        }
      </div>
    </article>
  `;
};

const renderPageBody = ({ orders = [], readyOrders = [], summary = {}, isLoading = false, updatingOrderId = null, error = '', success = '' } = {}) => {
  const cancelledOrders = orders.filter((order) => order.order_status === 'CANCELLED');
  const activeOrders = orders.filter((order) => order.order_status !== 'CANCELLED');

  return `
    <div class="kds-header">
      <div>
        <h1>KDS bep</h1>
        <p>Theo doi ticket bep theo thu tu thoi gian, nhan mon, cap nhat Dang nau va Hoan thanh de dong bo timeline cho admin/khach hang.</p>
      </div>
      <div class="kds-toolbar">
        <div class="kds-stat">${summary.confirmed || 0} <span>cho nau</span></div>
        <div class="kds-stat">${summary.cooking || 0} <span>dang nau</span></div>
        <button class="button button-secondary" type="button" data-refresh-kds>${isLoading ? 'Dang tai...' : 'Tai lai man hinh'}</button>
      </div>
    </div>
    ${error ? `<div class="kds-message error" role="alert">${escapeHtml(error)}</div>` : ''}
    ${success ? `<div class="kds-message success">${escapeHtml(success)}</div>` : ''}
    ${
      cancelledOrders.length
        ? `<div class="kds-cancel-alert"><strong>DON HUY - DUNG NAU</strong>${cancelledOrders
            .map((order) => `${escapeHtml(order.order_code)}${order.cancel_reason ? `: ${escapeHtml(order.cancel_reason)}` : ''}`)
            .join('<br>')}</div>`
        : ''
    }
    <div class="kds-sections">
      <section class="kds-section">
        <h2>Dang xu ly</h2>
        ${
          activeOrders.length
            ? `<div class="kds-grid">${activeOrders.map((order) => renderOrderCard(order, { isUpdating: updatingOrderId === order.order_id })).join('')}</div>`
            : `<div class="kds-empty">${isLoading ? 'Dang tai don cho bep...' : 'Khong co don CONFIRMED/COOKING.'}</div>`
        }
      </section>
      <section class="kds-section">
        <h2>Cho giao</h2>
        ${
          readyOrders.length
            ? `<div class="kds-grid">${readyOrders.map((order) => renderOrderCard({ ...order, order_status: 'READY' })).join('')}</div>`
            : '<div class="kds-empty">Don hoan thanh se hien tai day trong phien lam viec.</div>'
        }
      </section>
    </div>
  `;
};

export const KitchenKDSPage = () => `
  ${pageStyles}
  <section class="kds-page" data-kds-page>
    ${renderPageBody({ isLoading: true })}
  </section>
`;

export const mountKitchenKDSPage = () => {
  const root = document.querySelector('[data-kds-page]');
  if (!root) return;

  let orders = [];
  let readyOrders = [];
  let summary = {};
  let isLoading = false;
  let updatingOrderId = null;
  let error = '';
  let success = '';

  const render = () => {
    root.innerHTML = renderPageBody({ orders, readyOrders, summary, isLoading, updatingOrderId, error, success });
  };

  const loadOrders = async () => {
    isLoading = true;
    error = '';
    render();

    try {
      const data = await kitchenService.getPendingOrders({ includeCancelled: true });
      orders = data.orders || [];
      summary = data.summary || {};
    } catch (requestError) {
      error = requestError?.message || 'Loi ket noi mang. Vui long dung quy trinh giay du phong va tai lai man hinh khi co mang.';
    } finally {
      isLoading = false;
      render();
    }
  };

  const updateOrderStatus = async (orderId, nextStatus) => {
    const currentOrder = orders.find((order) => String(order.order_id) === String(orderId));
    updatingOrderId = Number(orderId);
    error = '';
    success = '';
    render();

    try {
      const result = await kitchenService.updateStatus(orderId, nextStatus);
      success =
        nextStatus === 'COOKING'
          ? `Bep bat dau nau don ${result.order_code}.`
          : `Don ${result.order_code} da nau xong va chuyen sang Cho giao.`;

      if (nextStatus === 'READY' && currentOrder) {
        readyOrders = [{ ...currentOrder, order_status: 'READY', updated_at: new Date().toISOString() }, ...readyOrders].slice(0, 6);
      }

      await loadOrders();
    } catch (requestError) {
      error = requestError?.message || 'Khong the cap nhat trang thai KDS.';
      await loadOrders();
    } finally {
      updatingOrderId = null;
      render();
    }
  };

  root.addEventListener('click', async (event) => {
    const refreshButton = event.target.closest('[data-refresh-kds]');
    const cookingButton = event.target.closest('[data-mark-cooking]');
    const readyButton = event.target.closest('[data-mark-ready]');
    const stockAlertButton = event.target.closest('[data-request-stock-alert]');

    if (refreshButton) {
      success = '';
      await loadOrders();
      return;
    }

    if (cookingButton) {
      await updateOrderStatus(cookingButton.dataset.markCooking, 'COOKING');
      return;
    }

    if (readyButton) {
      await updateOrderStatus(readyButton.dataset.markReady, 'READY');
      return;
    }

    if (stockAlertButton) {
      const order = orders.find((item) => String(item.order_id) === String(stockAlertButton.dataset.requestStockAlert));
      success = order
        ? `Da ghi nhan can xu ly het nguyen lieu cho don ${order.order_code}. Admin se xu ly doi/huy don voi khach.`
        : 'Da ghi nhan can xu ly het nguyen lieu.';
      render();
    }
  });

  loadOrders();
};
