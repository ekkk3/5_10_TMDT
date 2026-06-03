import { orderService } from '../../services/orderService.js';
import { authService } from '../../services/authService.js';
import { accountService } from '../../services/accountService.js';
import { TrackingForm } from './TrackingForm.js';
import { TrackingResult } from './TrackingResult.js';

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const normalizePhone = (value = '') => String(value).trim().replace(/[\s.-]/g, '');

const formatMoney = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const formatDateTime = (value) => {
  if (!value) return 'Chưa có cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa có cập nhật';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const validateTrackingForm = (values = {}) => {
  const errors = {};
  const orderCode = String(values.orderCode || '').trim();
  const phone = normalizePhone(values.phone);

  if (!orderCode) {
    errors.orderCode = 'Vui lòng nhập mã đơn';
  } else if (!/^[A-Za-z0-9-]{4,30}$/.test(orderCode)) {
    errors.orderCode = 'Mã đơn không đúng định dạng';
  }

  if (!phone) {
    errors.phone = 'Vui lòng nhập số điện thoại';
  } else if (!/^(0\d{9}|\+84\d{9})$/.test(phone)) {
    errors.phone = 'Số điện thoại không đúng định dạng';
  }

  return errors;
};

const renderCancelOrderForm = ({
  order,
  cancelReason = '',
  cancelError = '',
  fieldErrors = {},
  isCancelling = false,
  cancelMessage = '',
  formAttribute = 'data-guest-cancel-form'
}) => {
  if (!order) {
    return '';
  }

  if (order.order_status !== 'PENDING') {
    return cancelMessage ? `<div class="tracking-cancel-message success">${escapeHtml(cancelMessage)}</div>` : '';
  }

  return `
    <section class="tracking-cancel-form-panel">
      <div>
        <h3>Hủy đơn hàng</h3>
        <p>Đơn đang chờ xác nhận nên bạn có thể tự hủy. Hệ thống sẽ ghi lại lý do hủy vào lịch sử đơn hàng.</p>
      </div>
      ${cancelMessage ? `<div class="tracking-cancel-message success">${escapeHtml(cancelMessage)}</div>` : ''}
      ${cancelError ? `<div class="tracking-cancel-message" role="alert">${escapeHtml(cancelError)}</div>` : ''}
      <form class="tracking-cancel-form" ${formAttribute}>
        <label class="tracking-field ${fieldErrors.cancel_reason ? 'has-error' : ''}">
          <span>Lý do hủy</span>
          <textarea name="cancelReason" maxlength="255" rows="3" placeholder="Ví dụ: Tôi muốn đổi món khác">${escapeHtml(cancelReason)}</textarea>
          ${fieldErrors.cancel_reason ? `<p class="tracking-field__error">${escapeHtml(fieldErrors.cancel_reason)}</p>` : ''}
        </label>
        <button class="button button-danger tracking-cancel-submit" type="submit" ${isCancelling ? 'disabled' : ''}>
          ${isCancelling ? 'Đang hủy đơn...' : 'Hủy đơn'}
        </button>
      </form>
    </section>
  `;
};

const pageStyles = `
  <style>
    .guest-tracking-page { display: grid; gap: 22px; }
    .tracking-header { display: flex; justify-content: space-between; gap: 18px; align-items: flex-end; }
    .tracking-header h1 { margin: 0 0 8px; font-size: 34px; }
    .tracking-header p { margin: 0; max-width: 1040px; color: var(--muted); line-height: 1.55; }
    .tracking-form { display: grid; grid-template-columns: minmax(180px, 1fr) minmax(180px, 1fr) auto; gap: 12px; align-items: end; padding: 18px; border: 1px solid var(--line); border-radius: 8px; background: #fff; box-shadow: 0 12px 28px rgba(116, 36, 0, 0.08); }
    .tracking-field { display: grid; gap: 7px; color: var(--muted); font-weight: 800; }
    .tracking-field input { width: 100%; min-height: 46px; border: 1px solid var(--line); border-radius: 6px; padding: 11px 12px; color: var(--ink); font: inherit; background: #fff; }
    .tracking-field.has-error input, .tracking-field.has-error textarea { border-color: var(--red); box-shadow: 0 0 0 2px rgba(201, 31, 31, 0.1); }
    .tracking-field__error { margin: 0; color: #b3261e; font-size: 13px; line-height: 1.35; }
    .tracking-form__submit { min-height: 46px; white-space: nowrap; }
    .tracking-message { padding: 14px 16px; border: 1px solid #f2b8b5; border-radius: 8px; background: #fff7f6; color: #9f1f18; font-weight: 800; }
    .tracking-message--neutral { border-color: var(--line); background: #fff; color: var(--muted); }
    .member-orders { display: grid; gap: 12px; }
    .member-order-card { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 14px; align-items: center; padding: 16px; border: 1px solid var(--line); border-radius: 8px; background: #fff; box-shadow: 0 12px 28px rgba(116, 36, 0, 0.08); }
    .member-order-card strong { color: var(--ink); }
    .member-order-card span, .member-order-card p, .member-order-card time { display: block; margin-top: 6px; color: var(--muted); line-height: 1.4; font-size: 14px; }
    .member-order-card__meta { text-align: right; }
    .member-order-card__meta strong { color: var(--red); white-space: nowrap; }
    .member-order-card__detail { margin-top: 10px; min-height: 38px; }
    .tracking-result { display: grid; gap: 18px; padding: 20px; border: 1px solid var(--line); border-radius: 8px; background: #fff; box-shadow: 0 12px 28px rgba(116, 36, 0, 0.08); }
    .tracking-result__header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
    .tracking-result__eyebrow { color: var(--muted); font-weight: 800; }
    .tracking-result h2, .tracking-section h3 { margin: 0; }
    .tracking-result h2 { margin-top: 6px; color: var(--red); font-size: 30px; }
    .tracking-result__amount { color: var(--red); font-size: 24px; white-space: nowrap; }
    .tracking-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
    .tracking-summary div { padding: 12px; border: 1px solid #ffe0aa; border-radius: 8px; background: #fffaf3; }
    .tracking-summary span { display: block; margin-bottom: 6px; color: var(--muted); font-size: 13px; font-weight: 800; }
    .tracking-summary strong { overflow-wrap: anywhere; }
    .tracking-detail-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 10px; }
    .tracking-detail-grid div, .tracking-money { padding: 14px; border: 1px solid var(--line); border-radius: 8px; background: #fff; }
    .tracking-detail-grid span, .tracking-money span { display: block; margin-bottom: 6px; color: var(--muted); font-size: 13px; font-weight: 800; }
    .tracking-detail-grid strong { line-height: 1.45; overflow-wrap: anywhere; }
    .tracking-money { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .tracking-money div { min-width: 0; }
    .tracking-money strong { color: var(--ink); white-space: nowrap; }
    .tracking-money__total strong { color: var(--red); }
    .tracking-cancel { padding: 14px; border: 1px solid #f2b8b5; border-radius: 8px; background: #fff7f6; }
    .tracking-cancel p { margin: 6px 0 0; color: #9f1f18; line-height: 1.45; }
    .tracking-cancel-form-panel { display: grid; gap: 14px; padding: 18px; border: 1px solid #f2b8b5; border-radius: 8px; background: #fff7f6; box-shadow: 0 12px 28px rgba(116, 36, 0, 0.08); }
    .tracking-cancel-form-panel h3 { margin: 0 0 6px; }
    .tracking-cancel-form-panel p { margin: 0; color: #7a2f2a; line-height: 1.45; }
    .tracking-cancel-form { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: end; }
    .tracking-cancel-form textarea { width: 100%; border: 1px solid var(--line); border-radius: 6px; padding: 11px 12px; color: var(--ink); font: inherit; resize: vertical; background: #fff; }
    .tracking-cancel-submit { min-height: 46px; white-space: nowrap; color: #fff !important; background: var(--error) !important; box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3); }
    .tracking-cancel-submit:hover:not(:disabled), .tracking-cancel-submit:focus-visible { color: #fff !important; background: #dc2626 !important; }
    .tracking-cancel-message { padding: 12px; border: 1px solid #f2b8b5; border-radius: 8px; color: #9f1f18; background: #fff; font-weight: 800; }
    .tracking-cancel-message.success { border-color: #9bd2ad; color: #176a38; background: #f1fff5; }
    .tracking-section { display: grid; gap: 12px; }
    .tracking-timeline { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; margin: 0; padding: 0; list-style: none; }
    .tracking-timeline__item { display: grid; gap: 8px; min-width: 0; color: var(--muted); }
    .tracking-timeline__marker { width: 100%; height: 8px; border-radius: 999px; background: #ead8bc; }
    .tracking-timeline__item.is-done .tracking-timeline__marker { background: var(--gold); }
    .tracking-timeline__item.is-current .tracking-timeline__marker { background: var(--red); }
    .tracking-timeline__item strong { display: block; color: var(--ink); font-size: 14px; overflow-wrap: anywhere; }
    .tracking-timeline__item time, .tracking-timeline__item p { display: block; margin: 4px 0 0; font-size: 12px; line-height: 1.35; }
    .tracking-items { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
    .tracking-items__row { display: flex; justify-content: space-between; gap: 14px; padding: 12px 0; border-top: 1px solid var(--line); }
    .tracking-items__row span, .tracking-items__row p, .tracking-result__muted { display: block; margin: 5px 0 0; color: var(--muted); line-height: 1.4; }
    .tracking-items__row > strong { white-space: nowrap; }
    .tracking-items__options { margin: 8px 0 0; padding-left: 18px; color: var(--muted); }
    @media (max-width: 900px) {
      .tracking-form, .tracking-summary, .tracking-detail-grid, .tracking-money { grid-template-columns: 1fr 1fr; }
      .tracking-form__submit { grid-column: 1 / -1; }
      .tracking-cancel-form { grid-template-columns: 1fr; }
      .tracking-timeline { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    @media (max-width: 640px) {
      .tracking-header, .tracking-result__header { display: block; }
      .member-order-card { grid-template-columns: 1fr; }
      .member-order-card__meta { text-align: left; }
      .tracking-form, .tracking-summary, .tracking-detail-grid, .tracking-money, .tracking-timeline { grid-template-columns: 1fr; }
      .tracking-result__amount { display: block; margin-top: 10px; }
      .tracking-items__row { display: grid; }
    }
  </style>
`;

const renderTrackingPageBody = ({
  values = {},
  fieldErrors = {},
  submitError = '',
  isLoading = false,
  result = null,
  cancelReason = '',
  cancelError = '',
  cancelFieldErrors = {},
  isCancelling = false,
  cancelMessage = ''
} = {}) => `
  <div class="tracking-header">
    <div>
      <h1>Tra cứu đơn hàng</h1>
      <p>Nhập mã đơn và số điện thoại đã dùng khi đặt hàng để xem trạng thái, tổng quan món và lần cập nhật gần nhất.</p>
    </div>
    <a class="button button-secondary" href="#/menu">Đặt món mới</a>
  </div>
  ${TrackingForm({ values, fieldErrors, isLoading })}
  ${submitError ? `<div class="tracking-message" role="alert">${escapeHtml(submitError)}</div>` : ''}
  ${result ? TrackingResult(result) : ''}
  ${renderCancelOrderForm({ order: result, cancelReason, cancelError, fieldErrors: cancelFieldErrors, isCancelling, cancelMessage })}
`;

const renderMemberOrders = ({
  orders = [],
  isLoading = false,
  error = '',
  detail = null,
  detailError = '',
  isDetailLoading = false,
  cancelReason = '',
  cancelError = '',
  cancelFieldErrors = {},
  isCancelling = false,
  cancelMessage = ''
} = {}) => `
  <div class="tracking-header">
    <div>
      <h1>Đơn hàng của tôi</h1>
      <p>Các đơn hàng đã đặt bằng tài khoản thành viên được hiển thị tự động, không cần nhập mã đơn và số điện thoại.</p>
    </div>
    <a class="button button-secondary" href="#/menu">Đặt món mới</a>
  </div>
  ${error ? `<div class="tracking-message" role="alert">${escapeHtml(error)}</div>` : ''}
  ${
    isLoading
      ? '<div class="tracking-message tracking-message--neutral">Đang tải đơn hàng...</div>'
      : orders.length
        ? `
          <section class="member-orders" aria-live="polite">
            ${orders
              .map(
                (order) => `
                  <article class="member-order-card">
                    <div>
                      <strong>${escapeHtml(order.order_code)}</strong>
                      <span>${escapeHtml(order.order_status || '-')} / ${escapeHtml(order.payment_status || '-')}</span>
                      <p>${escapeHtml(order.delivery_address || 'Chưa có địa chỉ giao hàng')}</p>
                    </div>
                    <div class="member-order-card__meta">
                      <strong>${formatMoney(order.total_amount)}</strong>
                      <time>${escapeHtml(formatDateTime(order.updated_at || order.created_at))}</time>
                      <button class="button button-secondary member-order-card__detail" type="button" data-member-order-detail="${escapeHtml(order.order_id)}">
                        Xem chi tiết
                      </button>
                    </div>
                  </article>
                `
              )
              .join('')}
          </section>
        `
        : '<div class="tracking-message tracking-message--neutral">Bạn chưa có đơn hàng thành viên nào.</div>'
  }
  ${isDetailLoading ? '<div class="tracking-message tracking-message--neutral">Dang tai chi tiet don hang...</div>' : ''}
  ${detailError ? `<div class="tracking-message" role="alert">${escapeHtml(detailError)}</div>` : ''}
  ${detail ? TrackingResult(detail) : ''}
  ${renderCancelOrderForm({
    order: detail,
    cancelReason,
    cancelError,
    fieldErrors: cancelFieldErrors,
    isCancelling,
    cancelMessage,
    formAttribute: 'data-member-cancel-form'
  })}
`;

export const GuestTrackingPage = () => `
  ${pageStyles}
  <section class="guest-tracking-page" data-guest-tracking-page>
    ${renderTrackingPageBody()}
  </section>
`;

export const mountGuestTrackingPage = () => {
  const root = document.querySelector('[data-guest-tracking-page]');
  if (!root) return;

  if (authService.getCurrentSession()?.token) {
    let memberOrders = [];
    let memberProfile = authService.getCurrentSession()?.user || {};
    let memberError = '';
    let isMemberLoading = true;
    let memberDetail = null;
    let memberDetailError = '';
    let isMemberDetailLoading = false;
    let memberCancelReason = '';
    let memberCancelError = '';
    let memberCancelFieldErrors = {};
    let isMemberCancelling = false;
    let memberCancelMessage = '';

    const renderMember = () => {
      root.innerHTML = renderMemberOrders({
        orders: memberOrders,
        isLoading: isMemberLoading,
        error: memberError,
        detail: memberDetail,
        detailError: memberDetailError,
        isDetailLoading: isMemberDetailLoading,
        cancelReason: memberCancelReason,
        cancelError: memberCancelError,
        cancelFieldErrors: memberCancelFieldErrors,
        isCancelling: isMemberCancelling,
        cancelMessage: memberCancelMessage
      });
    };

    const loadMemberOrders = async () => {
      renderMember();
      try {
        const [profile, orders] = await Promise.all([accountService.getProfile(), accountService.getOrders()]);
        memberProfile = profile || memberProfile;
        memberOrders = orders;
        memberError = '';
      } catch (error) {
        memberError = error?.message || 'Không thể tải danh sách đơn hàng. Vui lòng thử lại.';
      } finally {
        isMemberLoading = false;
        renderMember();
      }
    };

    root.addEventListener('click', async (event) => {
      const detailButton = event.target.closest('[data-member-order-detail]');
      if (!detailButton) return;

      try {
        isMemberDetailLoading = true;
        memberDetail = null;
        memberDetailError = '';
        memberCancelReason = '';
        memberCancelError = '';
        memberCancelFieldErrors = {};
        memberCancelMessage = '';
        renderMember();

        const detail = await accountService.getOrderDetail(detailButton.dataset.memberOrderDetail);
        memberDetail = {
          ...detail,
          guest_name: memberProfile.full_name || '',
          guest_phone: memberProfile.phone || ''
        };
      } catch (error) {
        memberDetailError = error?.message || 'Khong the tai chi tiet don hang. Vui long thu lai.';
      } finally {
        isMemberDetailLoading = false;
        renderMember();
      }
    });

    root.addEventListener('submit', async (event) => {
      const cancelForm = event.target.closest('[data-member-cancel-form]');
      if (!cancelForm) return;

      event.preventDefault();
      const formData = new FormData(cancelForm);
      memberCancelReason = String(formData.get('cancelReason') || '').trim();
      memberCancelError = '';
      memberCancelFieldErrors = {};
      memberCancelMessage = '';

      if (!memberCancelReason) {
        memberCancelFieldErrors = { cancel_reason: 'Vui lòng nhập lý do hủy đơn' };
        renderMember();
        return;
      }

      if (!memberDetail?.order_id) {
        memberCancelError = 'Cần chọn đơn hàng trước khi hủy.';
        renderMember();
        return;
      }

      try {
        isMemberCancelling = true;
        renderMember();

        const cancelResult = await accountService.cancelOrder(memberDetail.order_id, memberCancelReason);
        const detail = await accountService.getOrderDetail(memberDetail.order_id);
        memberDetail = {
          ...detail,
          guest_name: memberProfile.full_name || '',
          guest_phone: memberProfile.phone || '',
          cancel_reason: cancelResult.cancel_reason || memberCancelReason
        };
        memberCancelReason = '';
        memberCancelMessage = 'Đơn hàng đã được hủy thành công.';
        await loadMemberOrders();
      } catch (error) {
        memberCancelFieldErrors = error?.errors && typeof error.errors === 'object' ? error.errors : {};
        memberCancelError = error?.message || 'Không thể hủy đơn hàng. Vui lòng thử lại.';
      } finally {
        isMemberCancelling = false;
        renderMember();
      }
    });

    loadMemberOrders();
    return;
  }

  let values = {};
  let fieldErrors = {};
  let submitError = '';
  let isLoading = false;
  let result = null;
  let cancelReason = '';
  let cancelError = '';
  let cancelFieldErrors = {};
  let isCancelling = false;
  let cancelMessage = '';

  const render = () => {
    root.innerHTML = renderTrackingPageBody({
      values,
      fieldErrors,
      submitError,
      isLoading,
      result,
      cancelReason,
      cancelError,
      cancelFieldErrors,
      isCancelling,
      cancelMessage
    });
  };

  root.addEventListener('submit', async (event) => {
    const cancelForm = event.target.closest('[data-guest-cancel-form]');
    if (cancelForm) {
      event.preventDefault();
      const formData = new FormData(cancelForm);
      cancelReason = String(formData.get('cancelReason') || '').trim();
      cancelError = '';
      cancelMessage = '';
      cancelFieldErrors = {};

      if (!cancelReason) {
        cancelFieldErrors = { cancel_reason: 'Vui lòng nhập lý do hủy đơn' };
        render();
        return;
      }

      if (!result?.order_code || !values.phone) {
        cancelError = 'Cần tra cứu đơn bằng mã đơn và số điện thoại trước khi hủy.';
        render();
        return;
      }

      try {
        isCancelling = true;
        render();

        await orderService.cancelGuestOrder({
          orderCode: result.order_code,
          phone: values.phone,
          cancelReason
        });

        result = await orderService.trackGuestOrder({
          orderCode: result.order_code,
          phone: values.phone
        });
        cancelReason = '';
        cancelMessage = 'Đơn hàng đã được hủy thành công.';
      } catch (error) {
        cancelFieldErrors = error?.errors && typeof error.errors === 'object' ? error.errors : {};
        cancelError = error?.message || 'Không thể hủy đơn hàng. Vui lòng thử lại.';
      } finally {
        isCancelling = false;
        render();
      }

      return;
    }

    const form = event.target.closest('[data-tracking-form]');
    if (!form) return;

    event.preventDefault();
    const formData = new FormData(form);
    values = {
      orderCode: String(formData.get('orderCode') || '').trim(),
      phone: String(formData.get('phone') || '').trim()
    };
    fieldErrors = validateTrackingForm(values);
    submitError = '';
    result = null;
    cancelReason = '';
    cancelError = '';
    cancelFieldErrors = {};
    cancelMessage = '';

    if (Object.keys(fieldErrors).length) {
      render();
      return;
    }

    try {
      isLoading = true;
      render();

      result = await orderService.trackGuestOrder(values);
    } catch (error) {
      fieldErrors = error?.errors && typeof error.errors === 'object' ? error.errors : {};
      submitError = error?.message || 'Không thể tra cứu đơn hàng. Vui lòng thử lại.';
    } finally {
      isLoading = false;
      render();
    }
  });
};
