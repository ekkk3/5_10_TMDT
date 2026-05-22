import { VoucherInput } from '../../voucher/VoucherInput.js';

const moneyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
});

const formatMoney = (value) => moneyFormatter.format(Number(value || 0));

export const CartSummary = ({
  totalQuantity = 0,
  subtotal = 0,
  appliedVoucher = null,
  discountAmount = 0,
  finalTotal = 0,
  voucherError = '',
  isApplyingVoucher = false
} = {}) => `
  <aside class="cart-summary" aria-label="Tong tien gio hang">
    <h2>Tong gio hang</h2>
    <div class="cart-summary__row">
      <span>So luong mon</span>
      <strong>${totalQuantity}</strong>
    </div>
    <div class="cart-summary__row">
      <span>Tam tinh</span>
      <strong>${formatMoney(subtotal)}</strong>
    </div>
    <div class="cart-summary__row">
      <span>Phi giao hang du kien</span>
      <strong>${formatMoney(0)}</strong>
    </div>
    ${VoucherInput({ appliedVoucher, errorMessage: voucherError, isApplying: isApplyingVoucher })}
    ${
      appliedVoucher
        ? `
          <div class="cart-summary__row cart-summary__discount">
            <span>Giam gia</span>
            <strong>-${formatMoney(discountAmount)}</strong>
          </div>
        `
        : ''
    }
    <div class="cart-summary__total">
      <span>Tong tien</span>
      <strong>${formatMoney(finalTotal)}</strong>
    </div>
    <button class="button button-primary cart-checkout" type="button" data-continue-order>Tiep tuc dat hang</button>
    <button class="button button-secondary cart-clear" type="button" data-clear-cart>Xoa gio hang</button>
  </aside>
`;
