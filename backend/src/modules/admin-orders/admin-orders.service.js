const pool = require('../../config/database');
const { ORDER_STATUSES, isKnownOrderStatus } = require('../../common/orderStatus');

const CUSTOMER_TYPES = new Set(['GUEST', 'MEMBER']);
const CONFIRMABLE_STATUS = ORDER_STATUSES.PENDING;
const CANCELLABLE_STATUSES = new Set([ORDER_STATUSES.PENDING, ORDER_STATUSES.CONFIRMED, ORDER_STATUSES.COOKING]);

const buildError = (statusCode, message, errors = null) => ({
  ok: false,
  statusCode,
  message,
  errors
});

const normalizeText = (value) => String(value || '').trim();

const normalizeStatus = (value) => normalizeText(value).toUpperCase();

const normalizeCustomerType = (value) => normalizeText(value).toUpperCase();

const resolveOrderWhereClause = (idOrCode) => {
  const normalized = normalizeText(idOrCode);
  const orderId = Number.parseInt(normalized, 10);

  if (Number.isInteger(orderId) && String(orderId) === normalized) {
    return { clause: 'o.order_id = ?', value: orderId };
  }

  return { clause: 'o.order_code = ?', value: normalized.toUpperCase() };
};

const mapOrderSummary = (order) => ({
  order_id: Number(order.order_id),
  order_code: order.order_code,
  customer_type: order.customer_type,
  customer_name: order.customer_name,
  customer_phone: order.customer_phone,
  total_amount: Number(order.total_amount || 0),
  order_status: order.order_status,
  payment_status: order.payment_status,
  payment_method: order.payment_method,
  created_at: order.created_at,
  updated_at: order.updated_at
});

const listAdminOrders = async (filters = {}) => {
  const where = [];
  const params = [];
  const status = normalizeStatus(filters.status);
  const customerType = normalizeCustomerType(filters.customerType);
  const keyword = normalizeText(filters.keyword || filters.orderCode);

  if (status) {
    if (!isKnownOrderStatus(status)) {
      return buildError(400, 'Trang thai don hang khong hop le', { status: 'Trang thai khong duoc ho tro' });
    }

    where.push('o.order_status = ?');
    params.push(status);
  }

  if (customerType) {
    if (!CUSTOMER_TYPES.has(customerType)) {
      return buildError(400, 'Loai khach hang khong hop le', { customerType: 'Chi ho tro GUEST hoac MEMBER' });
    }

    where.push('o.customer_type = ?');
    params.push(customerType);
  }

  if (keyword) {
    const likeKeyword = `%${keyword}%`;
    where.push(
      `(
        o.order_code LIKE ?
        OR o.guest_name LIKE ?
        OR o.guest_phone LIKE ?
        OR u.full_name LIKE ?
        OR u.phone LIKE ?
      )`
    );
    params.push(likeKeyword, likeKeyword, likeKeyword, likeKeyword, likeKeyword);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [orders] = await pool.query(
    `
      SELECT
        o.order_id,
        o.order_code,
        o.customer_type,
        COALESCE(o.guest_name, u.full_name) AS customer_name,
        COALESCE(o.guest_phone, u.phone) AS customer_phone,
        o.total_amount,
        o.order_status,
        o.payment_status,
        o.payment_method,
        o.created_at,
        o.updated_at
      FROM orders o
      LEFT JOIN users u ON u.user_id = o.user_id
      ${whereSql}
      ORDER BY o.created_at DESC, o.order_id DESC
      LIMIT 100
    `,
    params
  );

  const mappedOrders = orders.map(mapOrderSummary);

  return {
    ok: true,
    data: {
      orders: mappedOrders,
      groups: {
        guest: mappedOrders.filter((order) => order.customer_type === 'GUEST').length,
        member: mappedOrders.filter((order) => order.customer_type === 'MEMBER').length
      }
    }
  };
};

const loadOrderItems = async (orderId) => {
  const [items] = await pool.query(
    `
      SELECT
        oi.order_item_id,
        oi.food_id,
        oi.food_name_snapshot,
        oi.quantity,
        oi.unit_price,
        oi.total_price,
        oi.note,
        oi.kitchen_status,
        f.status AS food_status,
        i.quantity AS inventory_quantity,
        i.is_unlimited
      FROM order_items oi
      LEFT JOIN foods f ON f.food_id = oi.food_id
      LEFT JOIN inventory i ON i.food_id = oi.food_id
      WHERE oi.order_id = ?
      ORDER BY oi.order_item_id ASC
    `,
    [orderId]
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

  return items.map((item) => ({
    order_item_id: Number(item.order_item_id),
    food_id: Number(item.food_id),
    food_name: item.food_name_snapshot,
    quantity: Number(item.quantity || 0),
    unit_price: Number(item.unit_price || 0),
    total_price: Number(item.total_price || 0),
    note: item.note,
    kitchen_status: item.kitchen_status,
    food_status: item.food_status,
    inventory_quantity: item.inventory_quantity === null || item.inventory_quantity === undefined ? null : Number(item.inventory_quantity),
    is_unlimited: Boolean(item.is_unlimited),
    options: optionsByItemId.get(item.order_item_id) || []
  }));
};

const getAdminOrderDetail = async (idOrCode) => {
  const where = resolveOrderWhereClause(idOrCode);
  const [orders] = await pool.query(
    `
      SELECT
        o.order_id,
        o.order_code,
        o.user_id,
        o.customer_type,
        COALESCE(o.guest_name, u.full_name) AS customer_name,
        COALESCE(o.guest_phone, u.phone) AS customer_phone,
        o.guest_email,
        u.email AS member_email,
        o.delivery_address,
        o.subtotal,
        o.delivery_fee,
        o.discount_amount,
        o.total_amount,
        o.order_status,
        o.payment_status,
        o.payment_method,
        o.note,
        o.created_at,
        o.updated_at
      FROM orders o
      LEFT JOIN users u ON u.user_id = o.user_id
      WHERE ${where.clause}
      LIMIT 1
    `,
    [where.value]
  );

  if (!orders.length) {
    return buildError(404, 'Khong tim thay don hang');
  }

  const order = orders[0];
  const [statusHistory] = await pool.query(
    `
      SELECT old_status, new_status, changed_by, note, created_at
      FROM order_status_logs
      WHERE order_id = ?
      ORDER BY created_at ASC, log_id ASC
    `,
    [order.order_id]
  );

  const items = await loadOrderItems(order.order_id);
  const unavailableItems = items.filter((item) => {
    if (item.food_status && item.food_status !== 'ACTIVE') {
      return true;
    }

    return item.inventory_quantity !== null && !item.is_unlimited && item.inventory_quantity < item.quantity;
  });

  return {
    ok: true,
    data: {
      order_id: Number(order.order_id),
      order_code: order.order_code,
      user_id: order.user_id ? Number(order.user_id) : null,
      customer_type: order.customer_type,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_email: order.guest_email || order.member_email || null,
      delivery_address: order.delivery_address,
      subtotal: Number(order.subtotal || 0),
      delivery_fee: Number(order.delivery_fee || 0),
      discount_amount: Number(order.discount_amount || 0),
      total_amount: Number(order.total_amount || 0),
      order_status: order.order_status,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      note: order.note,
      items,
      unavailable_items: unavailableItems.map((item) => ({
        food_id: item.food_id,
        food_name: item.food_name,
        food_status: item.food_status,
        inventory_quantity: item.inventory_quantity,
        quantity: item.quantity
      })),
      status_history: statusHistory.map((log) => ({
        old_status: log.old_status,
        new_status: log.new_status,
        changed_by: log.changed_by,
        note: log.note,
        created_at: log.created_at
      })),
      created_at: order.created_at,
      updated_at: order.updated_at
    }
  };
};

const createNotification = async (connection, order, title, content) => {
  const receiver = order.guest_phone || order.guest_email || order.member_phone || order.member_email;

  if (!receiver) {
    return;
  }

  await connection.query(
    `
      INSERT INTO notifications (user_id, order_id, channel, receiver, title, content, send_status)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
    `,
    [order.user_id || null, order.order_id, receiver.includes('@') ? 'EMAIL' : 'SMS', receiver, title, content]
  );
};

const loadOrderForUpdate = async (connection, idOrCode) => {
  const where = resolveOrderWhereClause(idOrCode);
  const [orders] = await connection.query(
    `
      SELECT
        o.*,
        u.phone AS member_phone,
        u.email AS member_email
      FROM orders o
      LEFT JOIN users u ON u.user_id = o.user_id
      WHERE ${where.clause}
      LIMIT 1
      FOR UPDATE
    `,
    [where.value]
  );

  return orders[0] || null;
};

const findUnavailableItems = async (connection, orderId) => {
  const [items] = await connection.query(
    `
      SELECT
        oi.food_id,
        oi.food_name_snapshot,
        oi.quantity,
        f.status AS food_status,
        i.quantity AS inventory_quantity,
        i.is_unlimited
      FROM order_items oi
      LEFT JOIN foods f ON f.food_id = oi.food_id
      LEFT JOIN inventory i ON i.food_id = oi.food_id
      WHERE oi.order_id = ?
    `,
    [orderId]
  );

  return items.filter((item) => {
    if (item.food_status && item.food_status !== 'ACTIVE') {
      return true;
    }

    return item.inventory_quantity !== null && item.inventory_quantity !== undefined && !item.is_unlimited && Number(item.inventory_quantity) < Number(item.quantity);
  });
};

const confirmAdminOrder = async (idOrCode, actor = null) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const order = await loadOrderForUpdate(connection, idOrCode);
    if (!order) {
      await connection.rollback();
      return buildError(404, 'Khong tim thay don hang');
    }

    if (order.order_status === ORDER_STATUSES.CANCELLED) {
      await connection.rollback();
      return buildError(409, 'Khong the xac nhan don da huy');
    }

    if (order.order_status !== CONFIRMABLE_STATUS) {
      await connection.rollback();
      return buildError(409, 'Chi co the xac nhan don dang cho xac nhan');
    }

    if (order.payment_method !== 'COD' && order.payment_status !== 'PAID') {
      await connection.rollback();
      return buildError(409, 'Thanh toan online chua duoc xac minh, don chua the chuyen bep', {
        payment_status: order.payment_status
      });
    }

    if (!normalizeText(order.delivery_address)) {
      await connection.rollback();
      return buildError(409, 'Don hang thieu thong tin giao hang');
    }

    const unavailableItems = await findUnavailableItems(connection, order.order_id);
    if (unavailableItems.length) {
      await connection.rollback();
      return buildError(409, 'Don hang co mon het hang, can thay mon hoac huy don', {
        unavailable_items: unavailableItems.map((item) => ({
          food_id: Number(item.food_id),
          food_name: item.food_name_snapshot,
          food_status: item.food_status,
          inventory_quantity: item.inventory_quantity,
          quantity: Number(item.quantity)
        }))
      });
    }

    await connection.query('UPDATE orders SET order_status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?', [
      ORDER_STATUSES.CONFIRMED,
      order.order_id
    ]);

    await connection.query(
      `
        INSERT INTO order_status_logs (order_id, old_status, new_status, changed_by, note)
        VALUES (?, ?, ?, ?, ?)
      `,
      [order.order_id, order.order_status, ORDER_STATUSES.CONFIRMED, actor?.user_id || null, 'Admin confirmed order and sent it to KDS']
    );

    await createNotification(
      connection,
      order,
      'Don hang da duoc xac nhan',
      `Don hang ${order.order_code} da duoc xac nhan va chuyen sang bep.`
    );

    await connection.commit();

    return {
      ok: true,
      data: {
        order_id: Number(order.order_id),
        order_code: order.order_code,
        order_status: ORDER_STATUSES.CONFIRMED
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const cancelAdminOrder = async (idOrCode, payload = {}, actor = null) => {
  const cancelReason = normalizeText(payload.cancel_reason);

  if (!cancelReason) {
    return buildError(400, 'Vui long nhap ly do huy don', { cancel_reason: 'Ly do huy don la bat buoc' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const order = await loadOrderForUpdate(connection, idOrCode);
    if (!order) {
      await connection.rollback();
      return buildError(404, 'Khong tim thay don hang');
    }

    if (order.order_status === ORDER_STATUSES.COMPLETED) {
      await connection.rollback();
      return buildError(409, 'Khong the huy don da hoan thanh');
    }

    if (!CANCELLABLE_STATUSES.has(order.order_status)) {
      await connection.rollback();
      return buildError(409, 'Chi co the huy don PENDING, CONFIRMED hoac COOKING');
    }

    await connection.query('UPDATE orders SET order_status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?', [
      ORDER_STATUSES.CANCELLED,
      order.order_id
    ]);

    await connection.query(
      `
        INSERT INTO order_status_logs (order_id, old_status, new_status, changed_by, note)
        VALUES (?, ?, ?, ?, ?)
      `,
      [order.order_id, order.order_status, ORDER_STATUSES.CANCELLED, actor?.user_id || null, cancelReason.slice(0, 255)]
    );

    await createNotification(
      connection,
      order,
      'Don hang da bi huy',
      `Don hang ${order.order_code} da bi huy. Ly do: ${cancelReason.slice(0, 180)}`
    );

    await connection.commit();

    return {
      ok: true,
      data: {
        order_id: Number(order.order_id),
        order_code: order.order_code,
        order_status: ORDER_STATUSES.CANCELLED,
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
  listAdminOrders,
  getAdminOrderDetail,
  confirmAdminOrder,
  cancelAdminOrder
};
