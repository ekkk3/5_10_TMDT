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
  isApplyingVoucher = false,
  canCheckout = true,
  checkoutBlockReason = ''
} = {}) => `
  <aside class="cart-summary" aria-label="Tổng tiền giỏ hàng">
    <h2>Tổng giỏ hàng</h2>
    <div class="cart-summary__row">
      <span>Số lượng mon</span>
      <strong>${totalQuantity}</strong>
    </div>
    <div class="cart-summary__row">
      <span>Tạm tính</span>
      <strong>${formatMoney(subtotal)}</strong>
    </div>
    <div class="cart-summary__row">
      <span>Phí giao hàng dự kiến</span>
      <strong>${formatMoney(0)}</strong>
    </div>
    ${VoucherInput({ appliedVoucher, errorMessage: voucherError, isApplying: isApplyingVoucher })}
    ${
      appliedVoucher
        ? `
          <div class="cart-summary__row cart-summary__discount">
            <span>Giảm giá</span>
            <strong>-${formatMoney(discountAmount)}</strong>
          </div>
        `
        : ''
    }
    <div class="cart-summary__total">
      <span>Tổng tiền</span>
      <strong>${formatMoney(finalTotal)}</strong>
    </div>
    ${
      checkoutBlockReason
        ? `<p class="cart-summary__warning">${checkoutBlockReason}</p>`
        : ''
    }
    <button class="button button-primary cart-checkout" type="button" data-continue-order ${canCheckout ? '' : 'disabled'}>Tiếp tục đặt hàng</button>
    <button class="button button-secondary cart-clear" type="button" data-clear-cart>Xóa giỏ hàng</button>
  </aside>
`;
