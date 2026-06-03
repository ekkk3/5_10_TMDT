const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

export const VoucherInput = ({ appliedVoucher = null, errorMessage = '', isApplying = false } = {}) => {
  if (appliedVoucher) {
    return `
      <div class="voucher-box voucher-box--applied">
        <div>
          <span class="voucher-box__label">Voucher đang áp dụng</span>
          <strong>${escapeHtml(appliedVoucher.code)}</strong>
        </div>
        <button class="button button-secondary voucher-box__remove" type="button" data-remove-voucher>Gỡ voucher</button>
      </div>
    `;
  }

  return `
    <form class="voucher-form" data-voucher-form>
      <label for="public-voucher-code">Mã giảm giá</label>
      <div class="voucher-form__controls">
        <input id="public-voucher-code" name="voucherCode" type="text" maxlength="50" placeholder="Nhập mã voucher" autocomplete="off" ${isApplying ? 'disabled' : ''} />
        <button class="button button-secondary" type="submit" ${isApplying ? 'disabled' : ''}>${isApplying ? 'Đang áp dụng' : 'Áp dụng'}</button>
      </div>
      ${errorMessage ? `<p class="voucher-form__error" role="alert">${escapeHtml(errorMessage)}</p>` : ''}
    </form>
  `;
};
