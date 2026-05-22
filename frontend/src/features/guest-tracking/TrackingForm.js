const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const renderFieldError = (errors = {}, fieldName) =>
  errors[fieldName] ? `<p class="tracking-field__error">${escapeHtml(errors[fieldName])}</p>` : '';

export const TrackingForm = ({ values = {}, fieldErrors = {}, isLoading = false } = {}) => `
  <form class="tracking-form" data-tracking-form novalidate>
    <label class="tracking-field ${fieldErrors.orderCode ? 'has-error' : ''}">
      <span>Mã đơn</span>
      <input
        name="orderCode"
        type="text"
        maxlength="30"
        autocomplete="off"
        placeholder="VD: FF123456"
        value="${escapeHtml(values.orderCode || '')}"
      />
      ${renderFieldError(fieldErrors, 'orderCode')}
    </label>
    <label class="tracking-field ${fieldErrors.phone ? 'has-error' : ''}">
      <span>Số điện thoại</span>
      <input
        name="phone"
        type="tel"
        maxlength="20"
        autocomplete="tel"
        placeholder="0900000000"
        value="${escapeHtml(values.phone || '')}"
      />
      ${renderFieldError(fieldErrors, 'phone')}
    </label>
    <button class="button button-primary tracking-form__submit" type="submit" ${isLoading ? 'disabled' : ''}>
      ${isLoading ? 'Đang tra cứu...' : 'Tra cứu'}
    </button>
  </form>
`;
