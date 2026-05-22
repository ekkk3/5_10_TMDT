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
    return buildResult(400, 'Ma voucher khong hop le');
  }

  if (!Number.isFinite(normalizedOrderTotal) || normalizedOrderTotal < 0) {
    return buildResult(400, 'Tong tien don hang khong hop le');
  }

  const voucher = await findVoucherByCode(normalizedCode);

  if (!voucher) {
    return buildResult(404, 'Ma voucher khong ton tai');
  }

  if (voucher.target_type !== 'PUBLIC') {
    return buildResult(403, 'Voucher chi danh cho thanh vien. Vui long dang nhap hoac dang ky de su dung.');
  }

  if (voucher.status === 'EXPIRED') {
    return buildResult(400, 'Voucher da het han');
  }

  if (voucher.status !== 'ACTIVE') {
    return buildResult(400, 'Voucher khong kha dung');
  }

  const now = new Date();
  const startDate = new Date(voucher.start_date);
  const endDate = new Date(voucher.end_date);

  if (now < startDate) {
    return buildResult(400, 'Voucher chua den thoi gian su dung');
  }

  if (now > endDate) {
    return buildResult(400, 'Voucher da het han');
  }

  const usageLimit = voucher.usage_limit === null || voucher.usage_limit === undefined ? null : Number(voucher.usage_limit);
  const usedCount = Number(voucher.used_count || 0);

  if (usageLimit !== null && usedCount >= usageLimit) {
    return buildResult(400, 'Voucher da het luot su dung');
  }

  const minOrderAmount = Number(voucher.min_order_amount || 0);

  if (normalizedOrderTotal < minOrderAmount) {
    return buildResult(400, `Don hang can toi thieu ${minOrderAmount} de ap dung voucher nay`);
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
