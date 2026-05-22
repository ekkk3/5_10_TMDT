import { orderService } from '../../services/orderService.js';
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

const validateTrackingForm = (values = {}) => {
  const errors = {};
  const orderCode = String(values.orderCode || '').trim();
  const phone = normalizePhone(values.phone);

  if (!orderCode) {
    errors.orderCode = 'Vui long nhap ma don';
  } else if (!/^[A-Za-z0-9-]{4,30}$/.test(orderCode)) {
    errors.orderCode = 'Ma don khong dung dinh dang';
  }

  if (!phone) {
    errors.phone = 'Vui long nhap so dien thoai';
  } else if (!/^(0\d{9}|\+84\d{9})$/.test(phone)) {
    errors.phone = 'So dien thoai khong dung dinh dang';
  }

  return errors;
};

const pageStyles = `
  <style>
    .guest-tracking-page { display: grid; gap: 22px; }
    .tracking-header { display: flex; justify-content: space-between; gap: 18px; align-items: flex-end; }
    .tracking-header h1 { margin: 0 0 8px; font-size: 34px; }
    .tracking-header p { margin: 0; max-width: 680px; color: var(--muted); line-height: 1.55; }
    .tracking-form { display: grid; grid-template-columns: minmax(180px, 1fr) minmax(180px, 1fr) auto; gap: 12px; align-items: end; padding: 18px; border: 1px solid var(--line); border-radius: 8px; background: #fff; box-shadow: 0 12px 28px rgba(116, 36, 0, 0.08); }
    .tracking-field { display: grid; gap: 7px; color: var(--muted); font-weight: 800; }
    .tracking-field input { width: 100%; min-height: 46px; border: 1px solid var(--line); border-radius: 6px; padding: 11px 12px; color: var(--ink); font: inherit; background: #fff; }
    .tracking-field.has-error input { border-color: var(--red); box-shadow: 0 0 0 2px rgba(201, 31, 31, 0.1); }
    .tracking-field__error { margin: 0; color: #b3261e; font-size: 13px; line-height: 1.35; }
    .tracking-form__submit { min-height: 46px; white-space: nowrap; }
    .tracking-message { padding: 14px 16px; border: 1px solid #f2b8b5; border-radius: 8px; background: #fff7f6; color: #9f1f18; font-weight: 800; }
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
    .tracking-cancel { padding: 14px; border: 1px solid #f2b8b5; border-radius: 8px; background: #fff7f6; }
    .tracking-cancel p { margin: 6px 0 0; color: #9f1f18; line-height: 1.45; }
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
      .tracking-form, .tracking-summary { grid-template-columns: 1fr 1fr; }
      .tracking-form__submit { grid-column: 1 / -1; }
      .tracking-timeline { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    @media (max-width: 640px) {
      .tracking-header, .tracking-result__header { display: block; }
      .tracking-form, .tracking-summary, .tracking-timeline { grid-template-columns: 1fr; }
      .tracking-result__amount { display: block; margin-top: 10px; }
      .tracking-items__row { display: grid; }
    }
  </style>
`;

const renderTrackingPageBody = ({ values = {}, fieldErrors = {}, submitError = '', isLoading = false, result = null } = {}) => `
  <div class="tracking-header">
    <div>
      <h1>Tra cuu don hang</h1>
      <p>Nhap ma don va so dien thoai da dung khi dat hang de xem trang thai, tong quan mon va lan cap nhat gan nhat.</p>
    </div>
    <a class="button button-secondary" href="#/menu">Dat mon moi</a>
  </div>
  ${TrackingForm({ values, fieldErrors, isLoading })}
  ${submitError ? `<div class="tracking-message" role="alert">${escapeHtml(submitError)}</div>` : ''}
  ${result ? TrackingResult(result) : ''}
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

  let values = {};
  let fieldErrors = {};
  let submitError = '';
  let isLoading = false;
  let result = null;

  const render = () => {
    root.innerHTML = renderTrackingPageBody({ values, fieldErrors, submitError, isLoading, result });
  };

  root.addEventListener('submit', async (event) => {
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
      submitError = error?.message || 'Khong the tra cuu don hang. Vui long thu lai.';
    } finally {
      isLoading = false;
      render();
    }
  });
};
