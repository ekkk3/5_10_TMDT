import { adminOrderService } from '../../services/adminOrderService.js';

const STATUSES = ['PENDING', 'CONFIRMED', 'COOKING', 'READY', 'DELIVERING', 'COMPLETED', 'CANCELLED'];
const CUSTOMER_TYPES = ['GUEST', 'MEMBER'];
const CANCELLABLE_STATUSES = new Set(['PENDING', 'CONFIRMED', 'COOKING']);

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const formatMoney = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const formatDateTime = (value) => {
  if (!value) return '-';

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
};

const getErrorMessage = (error, fallback) => error?.message || fallback;

const pageStyles = `
  <style>
    .admin-orders-page { display: grid; gap: 18px; }
    .admin-orders-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
    .admin-orders-header h1 { margin: 0 0 8px; font-size: 32px; }
    .admin-orders-header p { margin: 0; color: var(--muted); line-height: 1.5; }
    .admin-orders-filters { display: grid; grid-template-columns: minmax(190px, 1fr) 170px 170px auto; gap: 10px; align-items: end; padding: 16px; border: 1px solid var(--line); border-radius: 8px; background: #fff; }
    .admin-orders-field { display: grid; gap: 6px; color: var(--muted); font-size: 13px; font-weight: 800; }
    .admin-orders-field input, .admin-orders-field select, .admin-cancel-form textarea { width: 100%; border: 1px solid var(--line); border-radius: 6px; padding: 10px 11px; color: var(--ink); font: inherit; background: #fff; }
    .admin-orders-stats { display: flex; gap: 10px; flex-wrap: wrap; }
    .admin-orders-stat { padding: 10px 12px; border: 1px solid #ffe0aa; border-radius: 8px; background: #fffaf3; font-weight: 800; }
    .admin-orders-stat span { color: var(--muted); font-weight: 700; }
    .admin-orders-panel { overflow-x: auto; border: 1px solid var(--line); border-radius: 8px; background: #fff; box-shadow: 0 12px 28px rgba(116, 36, 0, 0.08); }
    .admin-orders-table { width: 100%; min-width: 920px; border-collapse: collapse; }
    .admin-orders-table th, .admin-orders-table td { padding: 12px 14px; border-bottom: 1px solid #ffe0aa; text-align: left; vertical-align: top; }
    .admin-orders-table th { color: var(--muted); font-size: 13px; white-space: nowrap; background: #fffaf3; }
    .admin-orders-table td { line-height: 1.4; }
    .admin-orders-table tr:last-child td { border-bottom: 0; }
    .admin-order-code { color: var(--red); font-weight: 900; }
    .admin-order-muted { display: block; margin-top: 4px; color: var(--muted); font-size: 13px; }
    .admin-order-badge { display: inline-flex; align-items: center; min-height: 26px; padding: 4px 8px; border-radius: 6px; color: #7a2d00; background: #fff1cc; font-size: 12px; font-weight: 900; }
    .admin-order-badge.status-CANCELLED { color: #9f1f18; background: #fff0ef; }
    .admin-order-badge.status-CONFIRMED, .admin-order-badge.status-COOKING { color: #0f5c36; background: #e8f7ef; }
    .admin-order-actions { display: flex; gap: 7px; flex-wrap: wrap; min-width: 210px; }
    .admin-order-action { min-height: 34px; padding: 8px 10px; border-radius: 6px; border: 0; font-weight: 800; cursor: pointer; }
    .admin-order-action:disabled { cursor: not-allowed; opacity: 0.45; }
    .admin-order-action.view { color: var(--ink); background: var(--gold); }
    .admin-order-action.confirm { color: #fff; background: #128247; }
    .admin-order-action.cancel { color: #fff; background: var(--red); }
    .admin-orders-message { padding: 12px 14px; border-radius: 8px; font-weight: 800; }
    .admin-orders-message.error { border: 1px solid #f2b8b5; color: #9f1f18; background: #fff7f6; }
    .admin-orders-message.success { border: 1px solid #b8dfca; color: #0f5c36; background: #effaf4; }
    .admin-orders-empty { padding: 22px; color: var(--muted); font-weight: 800; text-align: center; }
    .admin-modal-backdrop { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 18px; background: rgba(36, 19, 10, 0.52); }
    .admin-modal { width: min(920px, 100%); max-height: calc(100vh - 36px); overflow: auto; border-radius: 8px; background: #fff; box-shadow: 0 22px 60px rgba(36, 19, 10, 0.24); }
    .admin-modal.small { width: min(520px, 100%); }
    .admin-modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 18px; border-bottom: 1px solid var(--line); }
    .admin-modal-header h2 { margin: 0 0 6px; font-size: 24px; }
    .admin-modal-header p { margin: 0; color: var(--muted); }
    .admin-modal-close { min-width: 36px; min-height: 36px; border: 0; border-radius: 6px; color: var(--ink); background: #fff1cc; cursor: pointer; font-weight: 900; }
    .admin-modal-body { display: grid; gap: 16px; padding: 18px; }
    .admin-detail-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .admin-detail-cell { padding: 12px; border: 1px solid #ffe0aa; border-radius: 8px; background: #fffaf3; }
    .admin-detail-cell span { display: block; margin-bottom: 6px; color: var(--muted); font-size: 13px; font-weight: 800; }
    .admin-detail-cell strong { overflow-wrap: anywhere; }
    .admin-detail-section { display: grid; gap: 10px; }
    .admin-detail-section h3 { margin: 0; font-size: 18px; }
    .admin-detail-items { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
    .admin-detail-item { display: flex; justify-content: space-between; gap: 14px; padding: 12px 0; border-top: 1px solid var(--line); }
    .admin-detail-item p, .admin-detail-item ul { margin: 6px 0 0; color: var(--muted); }
    .admin-detail-item > strong { white-space: nowrap; }
    .admin-detail-warning { padding: 12px; border: 1px solid #f2b8b5; border-radius: 8px; color: #9f1f18; background: #fff7f6; font-weight: 800; }
    .admin-status-history { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
    .admin-status-history li { padding: 10px 0; border-top: 1px solid var(--line); }
    .admin-cancel-form { display: grid; gap: 12px; }
    .admin-cancel-form textarea { min-height: 110px; resize: vertical; }
    .admin-modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
    @media (max-width: 860px) {
      .admin-orders-header { display: block; }
      .admin-orders-filters, .admin-detail-grid { grid-template-columns: 1fr; }
      .admin-orders-filters .button { width: 100%; }
      .admin-detail-item { display: grid; }
    }
  </style>
`;

const renderOptions = (options, selectedValue = '') =>
  options
    .map((option) => `<option value="${option}" ${selectedValue === option ? 'selected' : ''}>${option}</option>`)
    .join('');

const renderFilters = (filters = {}) => `
  <form class="admin-orders-filters" data-admin-order-filters>
    <label class="admin-orders-field">
      Tìm mã đơn / khách
      <input name="keyword" value="${escapeHtml(filters.keyword || '')}" placeholder="VD: FF-123, 090..." />
    </label>
    <label class="admin-orders-field">
      Trạng thái
      <select name="status">
        <option value="">Tất cả</option>
        ${renderOptions(STATUSES, filters.status)}
      </select>
    </label>
    <label class="admin-orders-field">
      Loại khách
      <select name="customerType">
        <option value="">Tất cả</option>
        ${renderOptions(CUSTOMER_TYPES, filters.customerType)}
      </select>
    </label>
    <button class="button button-primary" type="submit">Lọc đơn</button>
  </form>
`;

const renderOrderRows = (orders = []) => {
  if (!orders.length) {
    return `<tr><td colspan="7"><div class="admin-orders-empty">Chưa có đơn hàng phù hợp.</div></td></tr>`;
  }

  return orders
    .map((order) => {
      const canConfirm = order.order_status === 'PENDING';
      const canCancel = CANCELLABLE_STATUSES.has(order.order_status);

      return `
        <tr>
          <td><span class="admin-order-code">${escapeHtml(order.order_code)}</span></td>
          <td><span class="admin-order-badge">${escapeHtml(order.customer_type)}</span></td>
          <td>
            <strong>${escapeHtml(order.customer_name || 'Khách hàng')}</strong>
            <span class="admin-order-muted">${escapeHtml(order.customer_phone || '-')}</span>
          </td>
          <td><strong>${formatMoney(order.total_amount)}</strong></td>
          <td>
            <span class="admin-order-badge status-${escapeHtml(order.order_status)}">${escapeHtml(order.order_status)}</span>
            <span class="admin-order-muted">${escapeHtml(order.payment_method || '-')}/${escapeHtml(order.payment_status || '-')}</span>
          </td>
          <td>${formatDateTime(order.created_at)}</td>
          <td>
            <div class="admin-order-actions">
              <button class="admin-order-action view" type="button" data-view-order="${order.order_id}">Chi tiết</button>
              <button class="admin-order-action confirm" type="button" data-confirm-order="${order.order_id}" ${canConfirm ? '' : 'disabled'}>Xác nhận</button>
              <button class="admin-order-action cancel" type="button" data-open-cancel="${order.order_id}" data-order-code="${escapeHtml(order.order_code)}" ${canCancel ? '' : 'disabled'}>Hủy</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
};

const renderTable = (orders = []) => `
  <div class="admin-orders-panel">
    <table class="admin-orders-table">
      <thead>
        <tr>
          <th>Mã đơn</th>
          <th>Loại khách</th>
          <th>Khách hàng</th>
          <th>Tổng tiền</th>
          <th>Trạng thái</th>
          <th>Thời gian tạo</th>
          <th>Thao tác</th>
        </tr>
      </thead>
      <tbody>${renderOrderRows(orders)}</tbody>
    </table>
  </div>
`;

const renderDetailModal = ({ detail = null, isLoading = false, error = '' } = {}) => `
  <div class="admin-modal-backdrop" data-admin-modal>
    <article class="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-order-detail-title">
      <header class="admin-modal-header">
        <div>
          <h2 id="admin-order-detail-title">${detail ? escapeHtml(detail.order_code) : 'Chi tiết đơn hàng'}</h2>
          <p>${detail ? `${escapeHtml(detail.customer_type)} - ${escapeHtml(detail.order_status)}` : 'Đang tải thông tin đơn hàng'}</p>
        </div>
        <button class="admin-modal-close" type="button" data-close-modal aria-label="Đóng">X</button>
      </header>
      <div class="admin-modal-body">
        ${isLoading ? '<div class="admin-orders-empty">Đang tải chi tiết...</div>' : ''}
        ${error ? `<div class="admin-orders-message error">${escapeHtml(error)}</div>` : ''}
        ${detail ? renderDetailBody(detail) : ''}
      </div>
    </article>
  </div>
`;

const renderDetailBody = (detail) => `
  ${
    detail.unavailable_items?.length
      ? `<div class="admin-detail-warning">Đơn có món hết hàng: ${detail.unavailable_items
          .map((item) => escapeHtml(item.food_name))
          .join(', ')}. Can de xuat thay mon hoặc hủy đơn.</div>`
      : ''
  }
  <section class="admin-detail-grid">
    <div class="admin-detail-cell"><span>Khách hàng</span><strong>${escapeHtml(detail.customer_name || '-')}</strong><small class="admin-order-muted">${escapeHtml(detail.customer_phone || '-')}</small></div>
    <div class="admin-detail-cell"><span>Thanh toán</span><strong>${escapeHtml(detail.payment_method || '-')} / ${escapeHtml(detail.payment_status || '-')}</strong></div>
    <div class="admin-detail-cell"><span>Tổng tiền</span><strong>${formatMoney(detail.total_amount)}</strong></div>
    <div class="admin-detail-cell"><span>Địa chỉ giao hàng</span><strong>${escapeHtml(detail.delivery_address || '-')}</strong></div>
    <div class="admin-detail-cell"><span>Tạm tính</span><strong>${formatMoney(detail.subtotal)}</strong></div>
    <div class="admin-detail-cell"><span>Phí / Giảm giá</span><strong>${formatMoney(detail.delivery_fee)} / ${formatMoney(detail.discount_amount)}</strong></div>
  </section>
  <section class="admin-detail-section">
    <h3>Món ăn</h3>
    <ul class="admin-detail-items">
      ${detail.items
        .map(
          (item) => `
            <li class="admin-detail-item">
              <div>
                <strong>${escapeHtml(item.food_name)} x ${item.quantity}</strong>
                <p>${escapeHtml(item.food_status || 'UNKNOWN')} - bep: ${escapeHtml(item.kitchen_status || '-')}</p>
                ${item.note ? `<p>Ghi chú: ${escapeHtml(item.note)}</p>` : ''}
                ${
                  item.options?.length
                    ? `<ul>${item.options
                        .map((option) => `<li>${escapeHtml(option.option_name)} x ${option.quantity} (${formatMoney(option.extra_price)})</li>`)
                        .join('')}</ul>`
                    : ''
                }
              </div>
              <strong>${formatMoney(item.total_price)}</strong>
            </li>
          `
        )
        .join('')}
    </ul>
  </section>
  <section class="admin-detail-section">
    <h3>Lịch sử trạng thái</h3>
    <ul class="admin-status-history">
      ${
        detail.status_history?.length
          ? detail.status_history
              .map(
                (entry) => `
                  <li>
                    <strong>${escapeHtml(entry.old_status || 'NEW')} -> ${escapeHtml(entry.new_status)}</strong>
                    <span class="admin-order-muted">${formatDateTime(entry.created_at)}${entry.note ? ` - ${escapeHtml(entry.note)}` : ''}</span>
                  </li>
                `
              )
              .join('')
          : '<li>Chưa có lịch sử trạng thái.</li>'
      }
    </ul>
  </section>
`;

const renderCancelModal = ({ orderCode = '', reason = '', error = '', isSubmitting = false } = {}) => `
  <div class="admin-modal-backdrop" data-admin-modal>
    <article class="admin-modal small" role="dialog" aria-modal="true" aria-labelledby="admin-cancel-title">
      <header class="admin-modal-header">
        <div>
          <h2 id="admin-cancel-title">Hủy đơn ${escapeHtml(orderCode)}</h2>
          <p>Nhập lý do để gửi thông báo hủy đơn cho khách.</p>
        </div>
        <button class="admin-modal-close" type="button" data-close-modal aria-label="Đóng">X</button>
      </header>
      <div class="admin-modal-body">
        ${error ? `<div class="admin-orders-message error">${escapeHtml(error)}</div>` : ''}
        <form class="admin-cancel-form" data-cancel-form>
          <label class="admin-orders-field">
            Lý do hủy
            <textarea name="cancelReason" required>${escapeHtml(reason)}</textarea>
          </label>
          <div class="admin-modal-actions">
            <button class="button button-secondary" type="button" data-close-modal>Đóng</button>
            <button class="button button-primary" type="submit" ${isSubmitting ? 'disabled' : ''}>${isSubmitting ? 'Đang hủy...' : 'Xác nhận hủy'}</button>
          </div>
        </form>
      </div>
    </article>
  </div>
`;

const renderPageBody = ({ filters = {}, orders = [], groups = {}, isLoading = false, error = '', success = '' } = {}) => `
  <div class="admin-orders-header">
    <div>
      <h1>Xử lý đơn hàng</h1>
      <p>Quản lý đơn mới, phân loại khách vãng lai/thành viên, xác nhận chuyển bếp hoặc hủy đơn có lý do.</p>
    </div>
    <button class="button button-secondary" type="button" data-refresh-orders>${isLoading ? 'Đang tải...' : 'Làm mới'}</button>
  </div>
  ${renderFilters(filters)}
  <div class="admin-orders-stats">
    <div class="admin-orders-stat">${orders.length} <span>đơn đang hiển thị</span></div>
    <div class="admin-orders-stat">${groups.guest || 0} <span>GUEST</span></div>
    <div class="admin-orders-stat">${groups.member || 0} <span>MEMBER</span></div>
  </div>
  ${error ? `<div class="admin-orders-message error" role="alert">${escapeHtml(error)}</div>` : ''}
  ${success ? `<div class="admin-orders-message success">${escapeHtml(success)}</div>` : ''}
  ${renderTable(orders)}
`;

export const AdminOrderListPage = () => `
  ${pageStyles}
  <section class="admin-orders-page" data-admin-orders-page>
    ${renderPageBody({ isLoading: true })}
  </section>
`;

export const mountAdminOrderListPage = () => {
  const root = document.querySelector('[data-admin-orders-page]');
  if (!root) return;

  document.querySelector('[data-admin-orders-modal-root]')?.remove();
  const modalRoot = document.createElement('div');
  modalRoot.dataset.adminOrdersModalRoot = '';
  document.body.appendChild(modalRoot);

  let filters = { status: 'PENDING', customerType: '', keyword: '' };
  let orders = [];
  let groups = {};
  let isLoading = false;
  let error = '';
  let success = '';
  let modal = null;
  let cancelTarget = null;

  const render = () => {
    root.innerHTML = renderPageBody({ filters, orders, groups, isLoading, error, success });
    modalRoot.innerHTML = modal || '';
  };

  const closeModal = () => {
    modal = null;
    cancelTarget = null;
    render();
  };

  window.addEventListener(
    'hashchange',
    () => {
      modalRoot.remove();
    },
    { once: true }
  );

  const loadOrders = async () => {
    isLoading = true;
    error = '';
    render();

    try {
      const data = await adminOrderService.getOrders(filters);
      orders = data.orders || [];
      groups = data.groups || {};
    } catch (requestError) {
      error = getErrorMessage(requestError, 'Không thể tải danh sách đơn hàng.');
    } finally {
      isLoading = false;
      render();
    }
  };

  const showDetail = async (orderId) => {
    modal = renderDetailModal({ isLoading: true });
    render();

    try {
      const detail = await adminOrderService.getOrderDetail(orderId);
      modal = renderDetailModal({ detail });
    } catch (requestError) {
      modal = renderDetailModal({ error: getErrorMessage(requestError, 'Không thể tải chi tiết đơn hàng.') });
    }

    render();
  };

  const confirmOrder = async (orderId) => {
    error = '';
    success = '';
    render();

    try {
      const result = await adminOrderService.confirmOrder(orderId);
      success = `Đã xác nhận đơn ${result.order_code}. Đơn sẵn sàng cho UC-23 lấy CONFIRMED.`;
      await loadOrders();
    } catch (requestError) {
      error = getErrorMessage(requestError, 'Không thể xác nhận đơn hàng.');
      render();
    }
  };

  const openCancelModal = (orderId, orderCode) => {
    cancelTarget = { orderId, orderCode };
    modal = renderCancelModal({ orderCode });
    render();
  };

  root.addEventListener('submit', async (event) => {
    const filtersForm = event.target.closest('[data-admin-order-filters]');

    if (filtersForm) {
      event.preventDefault();
      const formData = new FormData(filtersForm);
      filters = {
        keyword: String(formData.get('keyword') || '').trim(),
        status: String(formData.get('status') || '').trim(),
        customerType: String(formData.get('customerType') || '').trim()
      };
      success = '';
      await loadOrders();
      return;
    }
  });

  modalRoot.addEventListener('submit', async (event) => {
    const cancelForm = event.target.closest('[data-cancel-form]');
    if (cancelForm) {
      event.preventDefault();
      const formData = new FormData(cancelForm);
      const cancelReason = String(formData.get('cancelReason') || '').trim();

      if (!cancelReason) {
        modal = renderCancelModal({ orderCode: cancelTarget?.orderCode, error: 'Vui lòng nhập lý do hủy đơn.' });
        render();
        return;
      }

      modal = renderCancelModal({ orderCode: cancelTarget?.orderCode, reason: cancelReason, isSubmitting: true });
      render();

      try {
        const result = await adminOrderService.cancelOrder(cancelTarget.orderId, cancelReason);
        modal = null;
        cancelTarget = null;
        success = `Đã hủy đơn ${result.order_code}.`;
        await loadOrders();
      } catch (requestError) {
        modal = renderCancelModal({
          orderCode: cancelTarget?.orderCode,
          reason: cancelReason,
          error: getErrorMessage(requestError, 'Không thể hủy đơn hàng.')
        });
        render();
      }
    }
  });

  root.addEventListener('click', async (event) => {
    const viewButton = event.target.closest('[data-view-order]');
    const confirmButton = event.target.closest('[data-confirm-order]');
    const cancelButton = event.target.closest('[data-open-cancel]');
    const refreshButton = event.target.closest('[data-refresh-orders]');

    if (viewButton) {
      await showDetail(viewButton.dataset.viewOrder);
      return;
    }

    if (confirmButton) {
      await confirmOrder(confirmButton.dataset.confirmOrder);
      return;
    }

    if (cancelButton) {
      openCancelModal(cancelButton.dataset.openCancel, cancelButton.dataset.orderCode);
      return;
    }

    if (refreshButton) {
      success = '';
      await loadOrders();
    }
  });

  modalRoot.addEventListener('click', (event) => {
    const closeButton = event.target.closest('[data-close-modal]');
    const modalBackdrop = event.target.matches('[data-admin-modal]');

    if (closeButton || modalBackdrop) {
      closeModal();
    }
  });

  loadOrders();
};
