const pool = require('../../config/database');
const { ORDER_STATUS_FLOW, ORDER_STATUSES, getOrderStatusLabel, isKnownOrderStatus } = require('../../common/orderStatus');
const { generateOrderCode } = require('../../utils/generateOrderCode');
const vouchersService = require('../vouchers/vouchers.service');

const GUEST = 'GUEST';
const PENDING = ORDER_STATUSES.PENDING;
const PAID = 'PAID';
const COD = 'COD';
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

const normalizeOrderCode = (value) => normalizeText(value).toUpperCase();

const isValidOrderCode = (value) => /^[A-Z0-9-]{4,30}$/.test(normalizeOrderCode(value));

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
    errors.guest_name = 'Vui lòng nhập họ tên';
  }

  if (!guestPhone) {
    errors.guest_phone = 'Vui lòng nhập số điện thoại';
  } else if (!isValidPhone(guestPhone)) {
    errors.guest_phone = 'Số điện thoại không đúng định dạng';
  }

  if (!guestAddress) {
    errors.guest_address = 'Vui lòng nhập địa chỉ giao hàng';
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    errors.items = 'Giỏ hàng đang rỗng';
  }

  if (!PAYMENT_METHODS.has(payload.payment_method)) {
    errors.payment_method = 'Phương thức thanh toán không hợp lệ';
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
      errors[`items.${item.index}.food_id`] = 'Món ăn không hợp lệ';
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      errors[`items.${item.index}.quantity`] = 'Số lượng món phải lớn hơn 0';
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
      errors[`items.${item.index}.food_id`] = 'Món ăn không tồn tại hoặc đã ngừng bán';
    }
  });

  if (!Object.keys(errors).length) {
    const [inventoryRows] = await pool.query(
      `
        SELECT food_id, quantity, is_unlimited
        FROM inventory
        WHERE food_id IN (?)
      `,
      [foodIds]
    );

    const inventoryMap = new Map(inventoryRows.map((row) => [Number(row.food_id), row]));
    normalizedItems.forEach((item) => {
      const inventory = inventoryMap.get(item.food_id);

      if (inventory && !Boolean(inventory.is_unlimited) && Number(inventory.quantity || 0) < item.quantity) {
        errors[`items.${item.index}.quantity`] = 'Món ăn tạm hết hàng hoặc không đủ số lượng';
      }
    });
  }

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
        errors[`items.${item.index}.selected_options`] = 'Tùy chọn món ăn không hợp lệ';
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

  throw new Error('Không thể tạo mã đơn hàng duy nhất');
};

const mapStatusLog = (log, currentStatus) => ({
  status: log.new_status,
  label: getOrderStatusLabel(log.new_status),
  note: log.note,
  updated_at: log.created_at,
  is_current: log.new_status === currentStatus
});

const buildFallbackStatusHistory = (order) => {
  const status = order.order_status;
  const updatedAt = order.updated_at || order.created_at;

  if (status === ORDER_STATUSES.CANCELLED) {
    return [
      {
        status,
        label: getOrderStatusLabel(status),
        note: null,
        updated_at: updatedAt,
        is_current: true
      }
    ];
  }

  const currentIndex = ORDER_STATUS_FLOW.indexOf(status);
  const fallbackFlow = currentIndex >= 0 ? ORDER_STATUS_FLOW.slice(0, currentIndex + 1) : [status];

  return fallbackFlow.map((entryStatus) => ({
    status: entryStatus,
    label: getOrderStatusLabel(entryStatus),
    note: null,
    updated_at: entryStatus === status ? updatedAt : null,
    is_current: entryStatus === status
  }));
};

const buildTrackingStatusHistory = (order, statusLogs = []) => {
  const fallbackHistory = buildFallbackStatusHistory(order);

  if (!statusLogs.length) {
    return fallbackHistory;
  }

  const historyByStatus = new Map(fallbackHistory.map((entry) => [entry.status, entry]));

  statusLogs.forEach((log) => {
    historyByStatus.set(log.new_status, mapStatusLog(log, order.order_status));
  });

  if (order.order_status === ORDER_STATUSES.CANCELLED) {
    const pending = historyByStatus.get(ORDER_STATUSES.PENDING);
    const cancelled = historyByStatus.get(ORDER_STATUSES.CANCELLED);
    return [pending, cancelled].filter(Boolean);
  }

  return ORDER_STATUS_FLOW.filter((status) => historyByStatus.has(status)).map((status) => ({
    ...historyByStatus.get(status),
    is_current: status === order.order_status
  }));
};

const buildTrackingErrors = ({ orderCode, phone }) => {
  const errors = {};

  if (!orderCode) {
    errors.orderCode = 'Vui lòng nhập mã đơn';
  } else if (!isValidOrderCode(orderCode)) {
    errors.orderCode = 'Mã đơn không đúng định dạng';
  }

  if (!phone) {
    errors.phone = 'Vui lòng nhập số điện thoại';
  } else if (!isValidPhone(phone)) {
    errors.phone = 'Số điện thoại không đúng định dạng';
  }

  return errors;
};

const getGuestOrderTracking = async ({ orderCode, phone } = {}) => {
  const normalizedOrderCode = normalizeOrderCode(orderCode);
  const normalizedPhone = normalizePhone(phone);
  const errors = buildTrackingErrors({ orderCode: normalizedOrderCode, phone: normalizedPhone });

  if (Object.keys(errors).length) {
    return buildError(400, 'Thông tin tra cứu không hợp lệ', errors);
  }

  const [orders] = await pool.query(
    `
      SELECT
        order_id,
        order_code,
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
        note,
        created_at,
        updated_at
      FROM orders
      WHERE order_code = ? AND customer_type = ?
      LIMIT 1
    `,
    [normalizedOrderCode, GUEST]
  );

  if (!orders.length) {
    return buildError(404, 'Không tìm thấy đơn hàng. Vui lòng kiểm tra lại mã đơn hoặc số điện thoại.');
  }

  const order = orders[0];

  if (normalizePhone(order.guest_phone) !== normalizedPhone) {
    return buildError(403, 'Số điện thoại không khớp với đơn hàng. Hệ thống từ chối hiển thị chi tiết đơn.');
  }

  const [items] = await pool.query(
    `
      SELECT
        order_item_id,
        food_name_snapshot,
        quantity,
        unit_price,
        total_price,
        note
      FROM order_items
      WHERE order_id = ?
      ORDER BY order_item_id ASC
    `,
    [order.order_id]
  );

  const itemIds = items.map((item) => item.order_item_id);
  const optionsByItemId = new Map();

  if (itemIds.length) {
    const [options] = await pool.query(
      `
        SELECT
          order_item_id,
          option_name_snapshot,
          quantity,
          extra_price
        FROM order_item_options
        WHERE order_item_id IN (?)
        ORDER BY order_item_option_id ASC
      `,
      [itemIds]
    );

    options.forEach((option) => {
      const optionsForItem = optionsByItemId.get(option.order_item_id) || [];
      optionsForItem.push({
        option_name: option.option_name_snapshot,
        quantity: Number(option.quantity || 0),
        extra_price: Number(option.extra_price || 0)
      });
      optionsByItemId.set(option.order_item_id, optionsForItem);
    });
  }

  const [statusLogs] = await pool.query(
    `
      SELECT new_status, note, created_at
      FROM order_status_logs
      WHERE order_id = ?
      ORDER BY created_at ASC, log_id ASC
    `,
    [order.order_id]
  );

  const statusHistory = buildTrackingStatusHistory(order, statusLogs);

  const statusUpdateTimes = statusHistory.map((entry) => entry.updated_at).filter(Boolean);
  const latestStatusAt = statusUpdateTimes[statusUpdateTimes.length - 1] || order.updated_at || order.created_at;

  const cancelLog = [...statusLogs].reverse().find((log) => log.new_status === ORDER_STATUSES.CANCELLED && log.note);
  const cancelReason = order.order_status === ORDER_STATUSES.CANCELLED ? cancelLog?.note || null : null;

  if (!isKnownOrderStatus(order.order_status)) {
    statusHistory.push({
      status: order.order_status,
      label: order.order_status,
      note: null,
      updated_at: order.updated_at || order.created_at,
      is_current: true
    });
  }

  return {
    ok: true,
    data: {
      order_code: order.order_code,
      guest_name: order.guest_name,
      guest_phone: order.guest_phone,
      delivery_address: order.delivery_address,
      subtotal: Number(order.subtotal || 0),
      delivery_fee: Number(order.delivery_fee || 0),
      discount_amount: Number(order.discount_amount || 0),
      order_status: order.order_status,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      total_amount: Number(order.total_amount || 0),
      note: order.note,
      items: items.map((item) => ({
        food_name: item.food_name_snapshot,
        quantity: Number(item.quantity || 0),
        unit_price: Number(item.unit_price || 0),
        total_price: Number(item.total_price || 0),
        note: item.note,
        options: optionsByItemId.get(item.order_item_id) || []
      })),
      status_history: statusHistory,
      cancel_reason: cancelReason,
      updated_at: latestStatusAt
    }
  };
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
      error: buildError(400, 'Giá trị giảm giá không khớp với voucher hiện tại')
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
    return buildError(400, 'Thông tin đặt hàng không hợp lệ', shapeErrors);
  }

  const itemResult = await loadAndValidateItems(payload.items);
  if (!itemResult.ok) {
    return buildError(400, 'Giỏ hàng không hợp lệ', itemResult.errors);
  }

  const deliveryArea = await validateDeliveryArea(payload.guest_address);
  if (!deliveryArea) {
    return buildError(400, 'Địa chỉ nằm ngoài khu vực phục vụ', {
      guest_address: 'Hiện chưa hỗ trợ giao hàng tại địa chỉ này'
    });
  }

  const subtotal = Math.round(itemResult.subtotal);
  const requestedSubtotal = toMoney(payload.subtotal);
  if (requestedSubtotal !== subtotal) {
    return buildError(400, 'Tạm tính giỏ hàng đã thay đổi. Vui lòng quay lại giỏ hàng để cập nhật.', {
      subtotal: 'Tạm tính không khớp với dữ liệu món ăn hiện tại'
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
  const paymentStatus = payload.payment_method === 'ONLINE_MOCK' ? PAID : COD;
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
        INSERT INTO payments (
          order_id,
          payment_method,
          provider,
          transaction_code,
          amount,
          payment_status,
          paid_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        orderId,
        payload.payment_method === 'ONLINE_MOCK' ? 'ONLINE' : 'COD',
        payload.payment_method === 'ONLINE_MOCK' ? 'ONLINE_MOCK' : null,
        payload.payment_method === 'ONLINE_MOCK' ? `MOCK-${orderCode}` : null,
        totalAmount,
        payload.payment_method === 'ONLINE_MOCK' ? 'SUCCESS' : 'PENDING',
        payload.payment_method === 'ONLINE_MOCK' ? new Date() : null
      ]
    );

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
        payment_method: payload.payment_method,
        payment_status: paymentStatus,
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

const createGuestNotification = async (connection, order, title, content) => {
  const receiver = order.guest_phone || order.guest_email;

  if (!receiver) {
    return;
  }

  await connection.query(
    `
      INSERT INTO notifications (user_id, order_id, channel, receiver, title, content, send_status)
      VALUES (NULL, ?, ?, ?, ?, ?, 'PENDING')
    `,
    [order.order_id, receiver.includes('@') ? 'EMAIL' : 'SMS', receiver, title, content]
  );
};

const buildGuestCancelErrors = (orderCode, payload = {}) => {
  const errors = {};
  const normalizedOrderCode = normalizeOrderCode(orderCode);
  const phone = normalizePhone(payload.phone || payload.guest_phone);
  const cancelReason = normalizeText(payload.cancel_reason);

  if (!normalizedOrderCode) {
    errors.orderCode = 'Vui lòng nhập mã đơn';
  } else if (!isValidOrderCode(normalizedOrderCode)) {
    errors.orderCode = 'Mã đơn không đúng định dạng';
  }

  if (!phone) {
    errors.phone = 'Vui lòng nhập số điện thoại';
  } else if (!isValidPhone(phone)) {
    errors.phone = 'Số điện thoại không đúng định dạng';
  }

  if (!cancelReason) {
    errors.cancel_reason = 'Vui lòng nhập lý do hủy đơn';
  }

  return {
    errors,
    normalizedOrderCode,
    phone,
    cancelReason
  };
};

const cancelGuestOrder = async (orderCode, payload = {}) => {
  const { errors, normalizedOrderCode, phone, cancelReason } = buildGuestCancelErrors(orderCode, payload);

  if (Object.keys(errors).length) {
    return buildError(400, 'Thông tin hủy đơn không hợp lệ', errors);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [orders] = await connection.query(
      `
        SELECT *
        FROM orders
        WHERE order_code = ? AND customer_type = ?
        LIMIT 1
        FOR UPDATE
      `,
      [normalizedOrderCode, GUEST]
    );

    if (!orders.length) {
      await connection.rollback();
      return buildError(404, 'Không tìm thấy đơn hàng. Vui lòng kiểm tra lại mã đơn hoặc số điện thoại.');
    }

    const order = orders[0];

    if (normalizePhone(order.guest_phone) !== phone) {
      await connection.rollback();
      return buildError(403, 'Số điện thoại không khớp với đơn hàng. Hệ thống từ chối thao tác hủy.');
    }

    if (order.order_status === ORDER_STATUSES.CANCELLED) {
      await connection.rollback();
      return buildError(409, 'Đơn hàng đã được hủy trước đó', { order_status: order.order_status });
    }

    if (order.order_status !== ORDER_STATUSES.PENDING) {
      await connection.rollback();
      return buildError(409, 'Chỉ có thể tự hủy đơn khi đơn đang ở trạng thái PENDING', {
        order_status: order.order_status
      });
    }

    const nextPaymentStatus = order.payment_status === PAID ? 'REFUNDED' : order.payment_status;

    await connection.query(
      'UPDATE orders SET order_status = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?',
      [ORDER_STATUSES.CANCELLED, nextPaymentStatus, order.order_id]
    );

    if (order.payment_status === PAID) {
      await connection.query(
        `
          UPDATE payments
          SET payment_status = 'REFUNDED'
          WHERE order_id = ? AND payment_status = 'SUCCESS'
        `,
        [order.order_id]
      );
    } else {
      await connection.query(
        `
          UPDATE payments
          SET payment_status = 'CANCELLED'
          WHERE order_id = ? AND payment_status = 'PENDING'
        `,
        [order.order_id]
      );
    }

    await connection.query(
      `
        INSERT INTO order_status_logs (order_id, old_status, new_status, changed_by, note)
        VALUES (?, ?, ?, NULL, ?)
      `,
      [order.order_id, order.order_status, ORDER_STATUSES.CANCELLED, cancelReason.slice(0, 255)]
    );

    await createGuestNotification(
      connection,
      order,
      'Đơn hàng đã bị hủy',
      `Đơn hàng ${order.order_code} đã bị hủy. Lý do: ${cancelReason.slice(0, 180)}`
    );

    await connection.commit();

    return {
      ok: true,
      data: {
        order_id: Number(order.order_id),
        order_code: order.order_code,
        guest_phone: order.guest_phone,
        order_status: ORDER_STATUSES.CANCELLED,
        payment_status: nextPaymentStatus,
        cancel_reason: cancelReason
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
  createGuestOrder,
  getGuestOrderTracking,
  cancelGuestOrder
};
