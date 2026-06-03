const pool = require('../../config/database');

const normalizeCode = (code) => String(code || '').trim().toUpperCase();

const isValidVoucherCode = (code) => /^[A-Z0-9_-]{3,50}$/.test(code);

const buildResult = (statusCode, message) => ({
  ok: false,
  statusCode,
  message
});

const findVoucherByCode = async (code) => {
  const [rows] = await pool.query(
    `
      SELECT
        voucher_id,
        voucher_code,
        discount_type,
        discount_value,
        min_order_amount,
        max_discount_amount,
        usage_limit,
        used_count,
        target_type,
        start_date,
        end_date,
        status
      FROM vouchers
      WHERE voucher_code = ?
      LIMIT 1
    `,
    [code]
  );

  return rows[0] || null;
};

const calculateDiscountAmount = (voucher, orderTotal) => {
  const discountValue = Number(voucher.discount_value || 0);
  const maxDiscountAmount =
    voucher.max_discount_amount === null || voucher.max_discount_amount === undefined
      ? null
      : Number(voucher.max_discount_amount);

  if (voucher.discount_type === 'PERCENT') {
    const percentDiscount = (orderTotal * discountValue) / 100;
    const cappedDiscount = maxDiscountAmount === null ? percentDiscount : Math.min(percentDiscount, maxDiscountAmount);
    return Math.min(cappedDiscount, orderTotal);
  }

  return Math.min(discountValue, orderTotal);
};

const applyPublicVoucher = async ({ code, orderTotal }) => {
  const normalizedCode = normalizeCode(code);
  const normalizedOrderTotal = Number(orderTotal);

  if (!isValidVoucherCode(normalizedCode)) {
    return buildResult(400, 'Mã voucher không hợp lệ');
  }

  if (!Number.isFinite(normalizedOrderTotal) || normalizedOrderTotal < 0) {
    return buildResult(400, 'Tổng tiền đơn hàng không hợp lệ');
  }

  const voucher = await findVoucherByCode(normalizedCode);

  if (!voucher) {
    return buildResult(404, 'Mã voucher không tồn tại');
  }

  if (voucher.target_type !== 'PUBLIC') {
    return buildResult(403, 'Voucher chỉ dành cho thành viên. Vui lòng đăng nhập hoặc đăng ký để sử dụng.');
  }

  if (voucher.status === 'EXPIRED') {
    return buildResult(400, 'Voucher đã hết hạn');
  }

  if (voucher.status !== 'ACTIVE') {
    return buildResult(400, 'Voucher không khả dụng');
  }

  const now = new Date();
  const startDate = new Date(voucher.start_date);
  const endDate = new Date(voucher.end_date);

  if (now < startDate) {
    return buildResult(400, 'Voucher chưa đến thời gian sử dụng');
  }

  if (now > endDate) {
    return buildResult(400, 'Voucher đã hết hạn');
  }

  const usageLimit = voucher.usage_limit === null || voucher.usage_limit === undefined ? null : Number(voucher.usage_limit);
  const usedCount = Number(voucher.used_count || 0);

  if (usageLimit !== null && usedCount >= usageLimit) {
    return buildResult(400, 'Voucher đã hết lượt sử dụng');
  }

  const minOrderAmount = Number(voucher.min_order_amount || 0);

  if (normalizedOrderTotal < minOrderAmount) {
    return buildResult(400, `Đơn hàng cần tối thiểu ${minOrderAmount} để áp dụng voucher này`);
  }

  const discountAmount = Math.round(calculateDiscountAmount(voucher, normalizedOrderTotal));
  const finalTotal = Math.max(0, Math.round(normalizedOrderTotal) - discountAmount);

  return {
    ok: true,
    data: {
      voucher_id: voucher.voucher_id,
      code: voucher.voucher_code,
      discount_type: voucher.discount_type,
      discount_value: Number(voucher.discount_value || 0),
      discount_amount: discountAmount,
      final_total: finalTotal
    }
  };
};

module.exports = {
  applyPublicVoucher
};
