const pool = require('../config/db');

async function hydrateOrderItems(orders) {
  if (!orders.length) {
    return [];
  }

  const orderIds = orders.map((order) => order.id);
  const [items] = await pool.query(
    `SELECT
       oi.order_id,
       oi.food_id AS product_id,
       oi.quantity,
       oi.unit_price AS price,
       oi.food_name_snapshot AS product_name
     FROM order_items oi
     WHERE oi.order_id IN (${orderIds.map(() => '?').join(',')})
     ORDER BY oi.order_item_id ASC`,
    orderIds
  );

  const itemMap = new Map();
  for (const item of items) {
    if (!itemMap.has(item.order_id)) {
      itemMap.set(item.order_id, []);
    }
    itemMap.get(item.order_id).push(item);
  }

  return orders.map((order) => ({
    ...order,
    items: itemMap.get(order.id) || []
  }));
}

async function getCategories(req, res, next) {
  try {
    const [categories] = await pool.query(
      `SELECT category_id AS id, category_name AS name
       FROM categories
       WHERE status = 'ACTIVE'
       ORDER BY category_name`
    );
    return res.json({ categories });
  } catch (error) {
    return next(error);
  }
}

async function getProducts(req, res, next) {
  try {
    const [products] = await pool.query(`
      SELECT
        f.food_id AS id,
        f.food_name AS name,
        f.price,
        f.category_id,
        f.image_url AS image,
        CASE WHEN f.status = 'ACTIVE' THEN 'active' ELSE 'inactive' END AS status,
        c.category_name AS category_name
      FROM foods f
      JOIN categories c ON c.category_id = f.category_id
      ORDER BY f.created_at DESC
    `);

    return res.json({ products });
  } catch (error) {
    return next(error);
  }
}

async function createProduct(req, res, next) {
  try {
    const { name, price, category_id, image = '', status = 'active' } = req.body;

    if (!name || !price || !category_id) {
      return res.status(400).json({ message: 'Ten mon, gia va danh muc la bat buoc.' });
    }

    if (Number(price) <= 0) {
      return res.status(400).json({ message: 'Gia mon phai lon hon 0.' });
    }

    const dbStatus = status === 'active' ? 'ACTIVE' : 'HIDDEN';
    const [result] = await pool.query(
      `INSERT INTO foods (food_name, price, category_id, image_url, status)
       VALUES (?, ?, ?, ?, ?)`,
      [name, Number(price), Number(category_id), image, dbStatus]
    );

    return res.status(201).json({
      message: 'Them mon thanh cong.',
      product: { id: result.insertId, name, price: Number(price), category_id: Number(category_id), image, status }
    });
  } catch (error) {
    return next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const { name, price, category_id, image = '', status = 'active' } = req.body;

    if (!name || !price || !category_id) {
      return res.status(400).json({ message: 'Ten mon, gia va danh muc la bat buoc.' });
    }

    const dbStatus = status === 'active' ? 'ACTIVE' : 'HIDDEN';
    await pool.query(
      `UPDATE foods
       SET food_name = ?, price = ?, category_id = ?, image_url = ?, status = ?, updated_at = NOW()
       WHERE food_id = ?`,
      [name, Number(price), Number(category_id), image, dbStatus, Number(id)]
    );

    return res.json({ message: 'Cap nhat mon thanh cong.' });
  } catch (error) {
    return next(error);
  }
}

async function toggleProductStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Trang thai mon khong hop le.' });
    }

    const dbStatus = status === 'active' ? 'ACTIVE' : 'HIDDEN';
    await pool.query('UPDATE foods SET status = ?, updated_at = NOW() WHERE food_id = ?', [dbStatus, Number(id)]);
    return res.json({ message: status === 'active' ? 'Da hien mon.' : 'Da an mon.' });
  } catch (error) {
    return next(error);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    const [activeOrders] = await pool.query(
      `SELECT oi.id
       FROM order_items oi
       JOIN orders o ON o.order_id = oi.order_id
       WHERE oi.food_id = ? AND o.order_status IN ('PENDING', 'CONFIRMED', 'COOKING')
       LIMIT 1`,
      [Number(id)]
    );

    if (activeOrders.length) {
      await pool.query('UPDATE foods SET status = ?, updated_at = NOW() WHERE food_id = ?', ['HIDDEN', Number(id)]);
      return res.json({
        message: 'Mon dang nam trong don chua xu ly nen he thong chi an mon thay vi xoa cung.'
      });
    }

    await pool.query('DELETE FROM foods WHERE food_id = ?', [Number(id)]);
    return res.json({ message: 'Xoa mon thanh cong.' });
  } catch (error) {
    return next(error);
  }
}

async function getAdminOrders(req, res, next) {
  try {
    const { status = 'pending' } = req.query;
    const statusMap = {
      pending: 'PENDING',
      confirmed: 'CONFIRMED',
      cooking: 'COOKING',
      ready: 'READY',
      completed: 'COMPLETED',
      cancelled: 'CANCELLED'
    };
    const statuses = status === 'all'
      ? Object.values(statusMap)
      : status.split(',').map((item) => statusMap[item.trim()] || item.trim().toUpperCase()).filter(Boolean);

    const [orders] = await pool.query(
      `SELECT
         order_id AS id,
         guest_name AS customer_name,
         guest_phone AS phone,
         delivery_address AS address,
         total_amount AS total_price,
         LOWER(order_status) AS status,
         created_at,
         updated_at
       FROM orders
       WHERE order_status IN (${statuses.map(() => '?').join(',')})
       ORDER BY created_at DESC`,
      statuses
    );

    return res.json({ orders: await hydrateOrderItems(orders) });
  } catch (error) {
    return next(error);
  }
}

async function confirmOrder(req, res, next) {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      `UPDATE orders
       SET order_status = 'CONFIRMED', updated_at = NOW()
       WHERE order_id = ? AND order_status = 'PENDING'`,
      [Number(id)]
    );

    if (!result.affectedRows) {
      return res.status(409).json({ message: 'Chi co the xac nhan don dang cho xac nhan.' });
    }

    // Sau buoc nay KDS se lay duoc don vi KDS chi hien confirmed/cooking.
    return res.json({ message: 'Da xac nhan don va day xuong bep.', status: 'confirmed' });
  } catch (error) {
    return next(error);
  }
}

async function cancelOrder(req, res, next) {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      `UPDATE orders
       SET order_status = 'CANCELLED', updated_at = NOW()
       WHERE order_id = ? AND order_status IN ('PENDING', 'CONFIRMED')`,
      [Number(id)]
    );

    if (!result.affectedRows) {
      return res.status(409).json({ message: 'Khong the huy don o trang thai hien tai.' });
    }

    return res.json({ message: 'Da huy don.', status: 'cancelled' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getCategories,
  getProducts,
  createProduct,
  updateProduct,
  toggleProductStatus,
  deleteProduct,
  getAdminOrders,
  confirmOrder,
  cancelOrder,
  hydrateOrderItems
};
