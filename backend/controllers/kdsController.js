const pool = require('../config/db');
const { hydrateOrderItems } = require('./adminController');

async function getKitchenOrders(req, res, next) {
  try {
    const [orders] = await pool.query(`
      SELECT
        order_id AS id,
        guest_name AS customer_name,
        guest_phone AS phone,
        delivery_address AS address,
        total_amount AS total_price,
        LOWER(order_status) AS status,
        created_at,
        updated_at
      FROM orders
      WHERE order_status IN ('CONFIRMED', 'COOKING')
      ORDER BY
        CASE order_status WHEN 'CONFIRMED' THEN 0 WHEN 'COOKING' THEN 1 ELSE 2 END,
        created_at ASC
    `);

    return res.json({ orders: await hydrateOrderItems(orders) });
  } catch (error) {
    return next(error);
  }
}

async function startCooking(req, res, next) {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      `UPDATE orders
       SET order_status = 'COOKING', updated_at = NOW()
       WHERE order_id = ? AND order_status = 'CONFIRMED'`,
      [Number(id)]
    );

    if (!result.affectedRows) {
      return res.status(409).json({ message: 'Chi don da xac nhan moi co the bat dau nau.' });
    }

    // KDS doi confirmed -> cooking khi bep bam "Bat dau lam".
    return res.json({ message: 'Bep da bat dau nau don.', status: 'cooking' });
  } catch (error) {
    return next(error);
  }
}

async function markReady(req, res, next) {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      `UPDATE orders
       SET order_status = 'READY', updated_at = NOW()
       WHERE order_id = ? AND order_status IN ('CONFIRMED', 'COOKING')`,
      [Number(id)]
    );

    if (!result.affectedRows) {
      return res.status(409).json({ message: 'Chi don o bep moi co the chuyen sang cho giao.' });
    }

    // KDS doi cooking -> ready; don an khoi man hinh bep va quay ve Admin de giao hang.
    return res.json({ message: 'Don da nau xong va dang cho giao.', status: 'ready' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getKitchenOrders,
  startCooking,
  markReady
};
