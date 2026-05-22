const pool = require('../../config/database');
const { ORDER_STATUSES } = require('../../common/orderStatus');

const KDS_ACTIVE_STATUSES = [ORDER_STATUSES.CONFIRMED, ORDER_STATUSES.COOKING];

const buildError = (statusCode, message, errors = null) => ({
  ok: false,
  statusCode,
  message,
  errors
});

const normalizeText = (value) => String(value || '').trim();

const resolveOrderWhereClause = (idOrCode) => {
  const normalized = normalizeText(idOrCode);
  const orderId = Number.parseInt(normalized, 10);

  if (Number.isInteger(orderId) && String(orderId) === normalized) {
    return { clause: 'o.order_id = ?', value: orderId };
  }

  return { clause: 'o.order_code = ?', value: normalized.toUpperCase() };
};

const mapOrderRow = (order) => ({
  order_id: Number(order.order_id),
  order_code: order.order_code,
  customer_type: order.customer_type,
  customer_name: order.customer_name,
  customer_phone: order.customer_phone,
  order_status: order.order_status,
  payment_status: order.payment_status,
  total_amount: Number(order.total_amount || 0),
  note: order.note,
  created_at: order.created_at,
  updated_at: order.updated_at,
  cancelled_at: order.cancelled_at || null,
  cancel_reason: order.cancel_reason || null,
  items: []
});

const attachItems = async (orders) => {
  if (!orders.length) {
    return orders;
  }

  const orderIds = orders.map((order) => order.order_id);
  const [items] = await pool.query(
    `
      SELECT
        oi.order_item_id,
        oi.order_id,
        oi.food_name_snapshot,
        oi.quantity,
        oi.unit_price,
        oi.total_price,
        oi.note,
        oi.kitchen_status
      FROM order_items oi
      WHERE oi.order_id IN (?)
      ORDER BY oi.order_item_id ASC
    `,
    [orderIds]
  );

  const itemIds = items.map((item) => item.order_item_id);
  const optionsByItemId = new Map();

  if (itemIds.length) {
    const [options] = await pool.query(
      `
        SELECT order_item_id, option_name_snapshot, quantity, extra_price
        FROM order_item_options
        WHERE order_item_id IN (?)
        ORDER BY order_item_option_id ASC
      `,
      [itemIds]
    );

    options.forEach((option) => {
      const itemOptions = optionsByItemId.get(option.order_item_id) || [];
      itemOptions.push({
        option_name: option.option_name_snapshot,
        quantity: Number(option.quantity || 0),
        extra_price: Number(option.extra_price || 0)
      });
      optionsByItemId.set(option.order_item_id, itemOptions);
    });
  }

  const ordersById = new Map(orders.map((order) => [order.order_id, order]));

  items.forEach((item) => {
    const order = ordersById.get(Number(item.order_id));
    if (!order) return;

    order.items.push({
      order_item_id: Number(item.order_item_id),
      food_name: item.food_name_snapshot,
      quantity: Number(item.quantity || 0),
      unit_price: Number(item.unit_price || 0),
      total_price: Number(item.total_price || 0),
      note: item.note,
      kitchen_status: item.kitchen_status,
      options: optionsByItemId.get(item.order_item_id) || []
    });
  });

  return orders;
};

const findNew = async ({ includeCancelled = false } = {}) => {
  const params = [...KDS_ACTIVE_STATUSES];
  let cancelledSql = '';

  if (includeCancelled) {
    cancelledSql = `
      OR (
        o.order_status = ?
        AND EXISTS (
          SELECT 1
          FROM order_status_logs osl
          WHERE osl.order_id = o.order_id
            AND osl.new_status = ?
            AND osl.old_status IN (?, ?)
            AND osl.created_at >= DATE_SUB(NOW(), INTERVAL 12 HOUR)
        )
      )
    `;
    params.push(ORDER_STATUSES.CANCELLED, ORDER_STATUSES.CANCELLED, ORDER_STATUSES.CONFIRMED, ORDER_STATUSES.COOKING);
  }

  const [rows] = await pool.query(
    `
      SELECT
        o.order_id,
        o.order_code,
        o.customer_type,
        COALESCE(o.guest_name, u.full_name) AS customer_name,
        COALESCE(o.guest_phone, u.phone) AS customer_phone,
        o.order_status,
        o.payment_status,
        o.total_amount,
        o.note,
        o.created_at,
        o.updated_at,
        cancel_log.created_at AS cancelled_at,
        cancel_log.note AS cancel_reason
      FROM orders o
      LEFT JOIN users u ON u.user_id = o.user_id
      LEFT JOIN (
        SELECT order_id, MAX(log_id) AS latest_cancel_log_id
        FROM order_status_logs
        WHERE new_status = 'CANCELLED'
        GROUP BY order_id
      ) latest_cancel ON latest_cancel.order_id = o.order_id
      LEFT JOIN order_status_logs cancel_log ON cancel_log.log_id = latest_cancel.latest_cancel_log_id
      WHERE o.order_status IN (?, ?)
      ${cancelledSql}
      ORDER BY
        CASE o.order_status
          WHEN 'CANCELLED' THEN 0
          WHEN 'COOKING' THEN 1
          ELSE 2
        END,
        o.created_at ASC,
        o.order_id ASC
    `,
    params
  );

  return attachItems(rows.map(mapOrderRow));
};

const getPendingOrders = async (filters = {}) => {
  const includeCancelled = String(filters.includeCancelled || '').toLowerCase() === 'true';
  const orders = await findNew({ includeCancelled });

  return {
    ok: true,
    data: {
      orders,
      summary: {
        confirmed: orders.filter((order) => order.order_status === ORDER_STATUSES.CONFIRMED).length,
        cooking: orders.filter((order) => order.order_status === ORDER_STATUSES.COOKING).length,
        cancelled: orders.filter((order) => order.order_status === ORDER_STATUSES.CANCELLED).length
      }
    }
  };
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

const sendNotification = async (connection, order, nextStatus) => {
  const adminMessage =
    nextStatus === ORDER_STATUSES.COOKING
      ? `Bep bat dau nau don ${order.order_code}`
      : `Don ${order.order_code} da nau xong`;
  const customerMessage =
    nextStatus === ORDER_STATUSES.COOKING
      ? `Don hang ${order.order_code} dang duoc bep che bien.`
      : `Don hang ${order.order_code} da nau xong va dang cho giao.`;
  const receiver = order.guest_phone || order.guest_email || order.member_phone || order.member_email || 'ADMIN';

  await connection.query(
    `
      INSERT INTO notifications (user_id, order_id, channel, receiver, title, content, send_status)
      VALUES (?, ?, 'PUSH', 'ADMIN', ?, ?, 'PENDING')
    `,
    [null, order.order_id, 'Cap nhat KDS', adminMessage]
  );

  if (receiver !== 'ADMIN') {
    await connection.query(
      `
        INSERT INTO notifications (user_id, order_id, channel, receiver, title, content, send_status)
        VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
      `,
      [order.user_id || null, order.order_id, receiver.includes('@') ? 'EMAIL' : 'SMS', receiver, 'Cap nhat don hang', customerMessage]
    );
  }
};

const saveStatus = async ({ idOrCode, expectedStatus, nextStatus, kitchenStatus, logNote }) => {
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
      return buildError(409, 'Don da bi huy - dung xu ly', {
        order_status: ORDER_STATUSES.CANCELLED
      });
    }

    if (order.order_status !== expectedStatus) {
      await connection.rollback();
      return buildError(409, `Chi co the doi don tu ${expectedStatus} sang ${nextStatus}`, {
        order_status: order.order_status
      });
    }

    await connection.query('UPDATE orders SET order_status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?', [
      nextStatus,
      order.order_id
    ]);

    await connection.query('UPDATE order_items SET kitchen_status = ? WHERE order_id = ?', [kitchenStatus, order.order_id]);

    await connection.query(
      `
        INSERT INTO order_status_logs (order_id, old_status, new_status, changed_by, note)
        VALUES (?, ?, ?, NULL, ?)
      `,
      [order.order_id, order.order_status, nextStatus, logNote]
    );

    await sendNotification(connection, order, nextStatus);

    await connection.commit();

    return {
      ok: true,
      data: {
        order_id: Number(order.order_id),
        order_code: order.order_code,
        order_status: nextStatus,
        kitchen_status: kitchenStatus
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const markCooking = async (idOrCode) =>
  saveStatus({
    idOrCode,
    expectedStatus: ORDER_STATUSES.CONFIRMED,
    nextStatus: ORDER_STATUSES.COOKING,
    kitchenStatus: 'COOKING',
    logNote: 'Kitchen started cooking'
  });

const markReady = async (idOrCode) =>
  saveStatus({
    idOrCode,
    expectedStatus: ORDER_STATUSES.COOKING,
    nextStatus: ORDER_STATUSES.READY,
    kitchenStatus: 'DONE',
    logNote: 'Kitchen completed order and moved it to ready for delivery'
  });

module.exports = {
  getPendingOrders,
  findNew,
  markCooking,
  markReady
};
