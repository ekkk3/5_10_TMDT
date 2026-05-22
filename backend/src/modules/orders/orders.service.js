const pool = require('../../config/database');
const { generateOrderCode } = require('../../utils/generateOrderCode');
const vouchersService = require('../vouchers/vouchers.service');

const GUEST = 'GUEST';
const PENDING = 'PENDING';
const UNPAID = 'UNPAID';
const PAID = 'PAID';
const PAYMENT_METHODS = new Set(['COD', 'ONLINE_MOCK']);

const buildError = (statusCode, message, errors = null) => ({
  ok: false,
  statusCode,
  message,
  errors
});

const toMoney = (value, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? Math.round(numberValue) : fallback;
};

const normalizeText = (value) => String(value || '').trim();

const normalizePhone = (value) => normalizeText(value).replace(/[\s.-]/g, '');

const isValidPhone = (value) => /^(0\d{9}|\+84\d{9})$/.test(normalizePhone(value));

const normalizeSearchText = (value) =>
  normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

const validateRequestShape = (payload = {}) => {
  const errors = {};
  const guestName = normalizeText(payload.guest_name);
  const guestPhone = normalizeText(payload.guest_phone);
  const guestAddress = normalizeText(payload.guest_address);

  if (!guestName) {
    errors.guest_name = 'Vui long nhap ho ten';
  }

  if (!guestPhone) {
    errors.guest_phone = 'Vui long nhap so dien thoai';
  } else if (!isValidPhone(guestPhone)) {
    errors.guest_phone = 'So dien thoai khong dung dinh dang';
  }

  if (!guestAddress) {
    errors.guest_address = 'Vui long nhap dia chi giao hang';
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    errors.items = 'Gio hang dang rong';
  }

  if (!PAYMENT_METHODS.has(payload.payment_method)) {
    errors.payment_method = 'Phuong thuc thanh toan khong hop le';
  }

  return errors;
};

const validateDeliveryArea = async (address) => {
  const [areas] = await pool.query(
    `
      SELECT area_id, area_name, district, city, delivery_fee
      FROM delivery_areas
      WHERE is_active = TRUE
      ORDER BY delivery_fee ASC
    `
  );

  const normalizedAddress = normalizeSearchText(address);

  return (
    areas.find((area) => {
      const district = normalizeSearchText(area.district);
      const city = normalizeSearchText(area.city);
      return normalizedAddress.includes(district) && (!city || normalizedAddress.includes(city));
    }) ||
    areas.find((area) => {
      const district = normalizeSearchText(area.district);
      return district && normalizedAddress.includes(district);
    }) ||
    null
  );
};

const loadAndValidateItems = async (items = []) => {
  const errors = {};
  const normalizedItems = items.map((item, index) => ({
    index,
    food_id: Number(item.food_id),
    quantity: Number.parseInt(item.quantity, 10),
    note: normalizeText(item.note).slice(0, 255),
    selected_options: Array.isArray(item.selected_options) ? item.selected_options : []
  }));

  normalizedItems.forEach((item) => {
    if (!Number.isInteger(item.food_id) || item.food_id <= 0) {
      errors[`items.${item.index}.food_id`] = 'Mon an khong hop le';
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      errors[`items.${item.index}.quantity`] = 'So luong mon phai lon hon 0';
    }
  });

  if (Object.keys(errors).length) {
    return { ok: false, errors };
  }

  const foodIds = [...new Set(normalizedItems.map((item) => item.food_id))];
  const [foods] = await pool.query(
    `
      SELECT food_id, food_name, price
      FROM foods
      WHERE food_id IN (?) AND status = 'ACTIVE'
    `,
    [foodIds]
  );

  const foodMap = new Map(foods.map((food) => [Number(food.food_id), food]));
  normalizedItems.forEach((item) => {
    if (!foodMap.has(item.food_id)) {
      errors[`items.${item.index}.food_id`] = 'Mon an khong ton tai hoac da ngung ban';
    }
  });

  const optionIds = [
    ...new Set(
      normalizedItems.flatMap((item) =>
        item.selected_options.map((option) => Number(option.option_id)).filter((optionId) => Number.isInteger(optionId) && optionId > 0)
      )
    )
  ];

  const optionMap = new Map();
  if (optionIds.length) {
    const [options] = await pool.query(
      `
        SELECT option_id, food_id, option_name, extra_price
        FROM food_options
        WHERE option_id IN (?) AND status = 'ACTIVE'
      `,
      [optionIds]
    );

    options.forEach((option) => optionMap.set(Number(option.option_id), option));
  }

  const orderItems = normalizedItems.map((item) => {
    const food = foodMap.get(item.food_id);
    const selectedOptions = item.selected_options.map((option) => {
      const optionId = Number(option.option_id);
      const optionRow = optionMap.get(optionId);

      if (!Number.isInteger(optionId) || optionId <= 0 || !optionRow || Number(optionRow.food_id) !== item.food_id) {
        errors[`items.${item.index}.selected_options`] = 'Tuy chon mon an khong hop le';
        return null;
      }

      return {
        option_name_snapshot: optionRow.option_name,
        quantity: Math.max(1, Number.parseInt(option.quantity, 10) || 1),
        extra_price: Number(optionRow.extra_price || 0)
      };
    });

    const optionTotal = selectedOptions.reduce((total, option) => total + (option ? Number(option.extra_price || 0) * Number(option.quantity || 1) : 0), 0);
    const unitPrice = Number(food?.price || 0) + optionTotal;
    const totalPrice = unitPrice * item.quantity;

    return {
      food_id: item.food_id,
      food_name_snapshot: food?.food_name || '',
      quantity: item.quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      note: item.note,
      selected_options: selectedOptions.filter(Boolean)
    };
  });

  if (Object.keys(errors).length) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    orderItems,
    subtotal: orderItems.reduce((total, item) => total + Number(item.total_price || 0), 0)
  };
};

const getUniqueOrderCode = async (connection) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const orderCode = generateOrderCode();
    const [rows] = await connection.query('SELECT order_id FROM orders WHERE order_code = ? LIMIT 1', [orderCode]);

    if (!rows.length) {
      return orderCode;
    }
  }

  throw new Error('Khong the tao ma don hang duy nhat');
};

const resolveVoucherDiscount = async ({ appliedVoucher, requestedDiscount, subtotal }) => {
  if (!appliedVoucher || requestedDiscount <= 0) {
    return { discountAmount: 0, voucher: null };
  }

  const voucherCode = appliedVoucher.code || appliedVoucher.voucher_code;
  const voucherResult = await vouchersService.applyPublicVoucher({
    code: voucherCode,
    orderTotal: subtotal
  });

  if (!voucherResult.ok) {
    return {
      error: buildError(400, voucherResult.message)
    };
  }

  const discountAmount = Number(voucherResult.data.discount_amount || 0);

  if (discountAmount !== requestedDiscount) {
    return {
      error: buildError(400, 'Gia tri giam gia khong khop voi voucher hien tai')
    };
  }

  return {
    discountAmount,
    voucher: voucherResult.data
  };
};

const createGuestOrder = async (payload = {}) => {
  const shapeErrors = validateRequestShape(payload);

  if (Object.keys(shapeErrors).length) {
    return buildError(400, 'Thong tin dat hang khong hop le', shapeErrors);
  }

  const itemResult = await loadAndValidateItems(payload.items);
  if (!itemResult.ok) {
    return buildError(400, 'Gio hang khong hop le', itemResult.errors);
  }

  const deliveryArea = await validateDeliveryArea(payload.guest_address);
  if (!deliveryArea) {
    return buildError(400, 'Dia chi nam ngoai khu vuc phuc vu', {
      guest_address: 'Hien chua ho tro giao hang tai dia chi nay'
    });
  }

  const subtotal = Math.round(itemResult.subtotal);
  const requestedSubtotal = toMoney(payload.subtotal);
  if (requestedSubtotal !== subtotal) {
    return buildError(400, 'Tam tinh gio hang da thay doi. Vui long quay lai gio hang de cap nhat.', {
      subtotal: 'Tam tinh khong khop voi du lieu mon an hien tai'
    });
  }

  const requestedDiscount = toMoney(payload.discount_amount);
  const voucherResult = await resolveVoucherDiscount({
    appliedVoucher: payload.applied_voucher,
    requestedDiscount,
    subtotal
  });

  if (voucherResult.error) {
    return voucherResult.error;
  }

  const deliveryFee = Math.round(Number(deliveryArea.delivery_fee || 0));
  const totalAmount = Math.max(0, subtotal - voucherResult.discountAmount + deliveryFee);
  const paymentStatus = payload.payment_method === 'ONLINE_MOCK' ? PAID : UNPAID;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const orderCode = await getUniqueOrderCode(connection);
    const [orderResult] = await connection.query(
      `
        INSERT INTO orders (
          order_code,
          user_id,
          customer_type,
          guest_name,
          guest_phone,
          delivery_address,
          subtotal,
          delivery_fee,
          discount_amount,
          total_amount,
          order_status,
          payment_status,
          payment_method,
          note
        )
        VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        orderCode,
        GUEST,
        normalizeText(payload.guest_name),
        normalizePhone(payload.guest_phone),
        normalizeText(payload.guest_address),
        subtotal,
        deliveryFee,
        voucherResult.discountAmount,
        totalAmount,
        PENDING,
        paymentStatus,
        payload.payment_method,
        normalizeText(payload.note).slice(0, 255) || null
      ]
    );

    const orderId = orderResult.insertId;

    for (const item of itemResult.orderItems) {
      const [orderItemResult] = await connection.query(
        `
          INSERT INTO order_items (
            order_id,
            food_id,
            food_name_snapshot,
            quantity,
            unit_price,
            total_price,
            note
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [orderId, item.food_id, item.food_name_snapshot, item.quantity, item.unit_price, item.total_price, item.note || null]
      );

      for (const option of item.selected_options) {
        await connection.query(
          `
            INSERT INTO order_item_options (
              order_item_id,
              option_name_snapshot,
              quantity,
              extra_price
            )
            VALUES (?, ?, ?, ?)
          `,
          [orderItemResult.insertId, option.option_name_snapshot, option.quantity, option.extra_price]
        );
      }
    }

    if (voucherResult.voucher) {
      await connection.query(
        `
          INSERT INTO order_vouchers (order_id, voucher_id, discount_amount)
          VALUES (?, ?, ?)
        `,
        [orderId, voucherResult.voucher.voucher_id, voucherResult.discountAmount]
      );
      await connection.query('UPDATE vouchers SET used_count = used_count + 1 WHERE voucher_id = ?', [voucherResult.voucher.voucher_id]);
    }

    await connection.query(
      `
        INSERT INTO order_status_logs (order_id, old_status, new_status, changed_by, note)
        VALUES (?, NULL, ?, NULL, ?)
      `,
      [orderId, PENDING, 'Guest order created and waiting for payment']
    );

    await connection.commit();

    return {
      ok: true,
      data: {
        order_id: orderId,
        order_code: orderCode,
        guest_phone: normalizePhone(payload.guest_phone),
        order_status: PENDING,
        total_amount: totalAmount
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  createGuestOrder
};
