const pool = require('../../config/database');

const buildError = (statusCode, message, errors = null) => ({
  ok: false,
  statusCode,
  message,
  errors
});

const normalizeText = (value) => String(value || '').trim();
const normalizeUpper = (value) => normalizeText(value).toUpperCase();
const toMoney = (value) => Math.max(0, Math.round(Number(value || 0)));

const getReportSummary = async (filters = {}) => {
  const from = normalizeText(filters.from);
  const to = normalizeText(filters.to);
  const params = [];
  const where = [];

  if (from) {
    where.push('created_at >= ?');
    params.push(`${from} 00:00:00`);
  }
  if (to) {
    where.push('created_at <= ?');
    params.push(`${to} 23:59:59`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [kpis] = await pool.query(
    `
      SELECT
        COUNT(*) AS total_orders,
        SUM(CASE WHEN order_status = 'PENDING' THEN 1 ELSE 0 END) AS pending_orders,
        SUM(CASE WHEN order_status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_orders,
        SUM(CASE WHEN order_status = 'COMPLETED' THEN total_amount ELSE 0 END) AS completed_revenue,
        SUM(CASE WHEN customer_type = 'GUEST' THEN 1 ELSE 0 END) AS guest_orders,
        SUM(CASE WHEN customer_type = 'MEMBER' THEN 1 ELSE 0 END) AS member_orders
      FROM orders
      ${whereSql}
    `,
    params
  );

  const [topFoods] = await pool.query(
    `
      SELECT oi.food_id, oi.food_name_snapshot AS food_name, SUM(oi.quantity) AS quantity, SUM(oi.total_price) AS revenue
      FROM order_items oi
      JOIN orders o ON o.order_id = oi.order_id
      ${whereSql ? whereSql.replaceAll('created_at', 'o.created_at') : ''}
      GROUP BY oi.food_id, oi.food_name_snapshot
      ORDER BY quantity DESC, revenue DESC
      LIMIT 8
    `,
    params
  );

  return {
    ok: true,
    data: {
      kpis: {
        total_orders: Number(kpis[0]?.total_orders || 0),
        pending_orders: Number(kpis[0]?.pending_orders || 0),
        cancelled_orders: Number(kpis[0]?.cancelled_orders || 0),
        completed_revenue: Number(kpis[0]?.completed_revenue || 0),
        guest_orders: Number(kpis[0]?.guest_orders || 0),
        member_orders: Number(kpis[0]?.member_orders || 0)
      },
      top_foods: topFoods.map((food) => ({
        food_id: Number(food.food_id),
        food_name: food.food_name,
        quantity: Number(food.quantity || 0),
        revenue: Number(food.revenue || 0)
      }))
    }
  };
};

const listCatalog = async () => {
  const [categories] = await pool.query('SELECT * FROM categories ORDER BY category_name ASC');
  const [foods] = await pool.query(
    `
      SELECT f.*, c.category_name, i.inventory_id, i.quantity AS inventory_quantity, i.is_unlimited
      FROM foods f
      JOIN categories c ON c.category_id = f.category_id
      LEFT JOIN inventory i ON i.food_id = f.food_id
      ORDER BY f.created_at DESC, f.food_id DESC
      LIMIT 200
    `
  );

  return {
    ok: true,
    data: {
      categories: categories.map((category) => ({
        ...category,
        category_id: Number(category.category_id)
      })),
      foods: foods.map((food) => ({
        ...food,
        food_id: Number(food.food_id),
        category_id: Number(food.category_id),
        price: Number(food.price || 0),
        inventory_id: food.inventory_id ? Number(food.inventory_id) : null,
        inventory_quantity: food.inventory_quantity === null || food.inventory_quantity === undefined ? null : Number(food.inventory_quantity),
        is_unlimited: Boolean(food.is_unlimited)
      }))
    }
  };
};

const saveCategory = async (payload = {}) => {
  const categoryId = Number.parseInt(payload.category_id, 10);
  const categoryName = normalizeText(payload.category_name).slice(0, 100);
  const description = normalizeText(payload.description).slice(0, 255) || null;
  const status = normalizeUpper(payload.status || 'ACTIVE');

  if (!categoryName) return buildError(400, 'Vui lòng nhập tên danh mục');
  if (!['ACTIVE', 'HIDDEN'].includes(status)) return buildError(400, 'Trạng thái danh mục không hợp lệ');

  if (Number.isInteger(categoryId) && categoryId > 0) {
    await pool.query('UPDATE categories SET category_name = ?, description = ?, status = ? WHERE category_id = ?', [
      categoryName,
      description,
      status,
      categoryId
    ]);
    return { ok: true, data: { category_id: categoryId } };
  }

  const [result] = await pool.query('INSERT INTO categories (category_name, description, status) VALUES (?, ?, ?)', [
    categoryName,
    description,
    status
  ]);
  return { ok: true, data: { category_id: Number(result.insertId) } };
};

const saveFood = async (payload = {}) => {
  const foodId = Number.parseInt(payload.food_id, 10);
  const categoryId = Number.parseInt(payload.category_id, 10);
  const foodName = normalizeText(payload.food_name).slice(0, 150);
  const description = normalizeText(payload.description) || null;
  const imageUrl = normalizeText(payload.image_url).slice(0, 255) || null;
  const price = toMoney(payload.price);
  const status = normalizeUpper(payload.status || 'ACTIVE');
  const quantity = Number.parseInt(payload.quantity, 10);
  const isUnlimited = Boolean(payload.is_unlimited);
  const errors = {};

  if (!Number.isInteger(categoryId) || categoryId <= 0) errors.category_id = 'Danh mục không hợp lệ';
  if (!foodName) errors.food_name = 'Vui lòng nhập tên món';
  if (!price) errors.price = 'Vui lòng nhập giá món';
  if (!['ACTIVE', 'HIDDEN', 'OUT_OF_STOCK'].includes(status)) errors.status = 'Trạng thái món không hợp lệ';

  if (Object.keys(errors).length) return buildError(400, 'Thông tin món ăn không hợp lệ', errors);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let nextFoodId = foodId;
    if (Number.isInteger(foodId) && foodId > 0) {
      await connection.query(
        `
          UPDATE foods
          SET category_id = ?, food_name = ?, description = ?, price = ?, image_url = ?, status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE food_id = ?
        `,
        [categoryId, foodName, description, price, imageUrl, status, foodId]
      );
    } else {
      const [result] = await connection.query(
        `
          INSERT INTO foods (category_id, food_name, description, price, image_url, status)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [categoryId, foodName, description, price, imageUrl, status]
      );
      nextFoodId = Number(result.insertId);
    }

    const [inventoryRows] = await connection.query('SELECT inventory_id FROM inventory WHERE food_id = ? LIMIT 1', [nextFoodId]);
    if (inventoryRows.length) {
      await connection.query('UPDATE inventory SET quantity = ?, is_unlimited = ?, updated_at = CURRENT_TIMESTAMP WHERE food_id = ?', [
        Number.isInteger(quantity) && quantity >= 0 ? quantity : 0,
        isUnlimited,
        nextFoodId
      ]);
    } else {
      await connection.query('INSERT INTO inventory (food_id, quantity, is_unlimited, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)', [
        nextFoodId,
        Number.isInteger(quantity) && quantity >= 0 ? quantity : 0,
        isUnlimited
      ]);
    }

    await connection.commit();
    return { ok: true, data: { food_id: nextFoodId } };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const listMarketing = async () => {
  const [vouchers] = await pool.query('SELECT * FROM vouchers ORDER BY start_date DESC, voucher_id DESC LIMIT 200');
  const [campaigns] = await pool.query(
    `
      SELECT mc.*, v.voucher_code
      FROM marketing_campaigns mc
      LEFT JOIN vouchers v ON v.voucher_id = mc.voucher_id
      ORDER BY mc.start_date DESC, mc.campaign_id DESC
      LIMIT 200
    `
  );

  return {
    ok: true,
    data: {
      vouchers: vouchers.map((voucher) => ({
        ...voucher,
        voucher_id: Number(voucher.voucher_id),
        discount_value: Number(voucher.discount_value || 0),
        min_order_amount: Number(voucher.min_order_amount || 0),
        max_discount_amount: voucher.max_discount_amount === null ? null : Number(voucher.max_discount_amount || 0)
      })),
      campaigns: campaigns.map((campaign) => ({
        ...campaign,
        campaign_id: Number(campaign.campaign_id),
        voucher_id: campaign.voucher_id ? Number(campaign.voucher_id) : null
      }))
    }
  };
};

const saveVoucher = async (payload = {}) => {
  const code = normalizeUpper(payload.voucher_code || payload.code).slice(0, 50);
  const name = normalizeText(payload.voucher_name || payload.name).slice(0, 150);
  const discountType = normalizeUpper(payload.discount_type || 'AMOUNT');
  const targetType = normalizeUpper(payload.target_type || 'PUBLIC');
  const status = normalizeUpper(payload.status || 'ACTIVE');
  const discountValue = Number(payload.discount_value || 0);
  const minOrderAmount = toMoney(payload.min_order_amount);
  const maxDiscountAmount = payload.max_discount_amount === '' || payload.max_discount_amount === undefined ? null : toMoney(payload.max_discount_amount);
  const usageLimit = payload.usage_limit === '' || payload.usage_limit === undefined ? null : Number.parseInt(payload.usage_limit, 10);
  const startDate = normalizeText(payload.start_date) || new Date().toISOString().slice(0, 19).replace('T', ' ');
  const endDate = normalizeText(payload.end_date);
  const errors = {};

  if (!code) errors.voucher_code = 'Vui lòng nhập mã voucher';
  if (!name) errors.voucher_name = 'Vui lòng nhập tên voucher';
  if (!['PERCENT', 'AMOUNT'].includes(discountType)) errors.discount_type = 'Loại giảm giá không hợp lệ';
  if (!['PUBLIC', 'MEMBER', 'PERSONAL'].includes(targetType)) errors.target_type = 'Đối tượng voucher không hợp lệ';
  if (!['DRAFT', 'ACTIVE', 'EXPIRED', 'DISABLED'].includes(status)) errors.status = 'Trạng thái voucher không hợp lệ';
  if (!(discountValue > 0)) errors.discount_value = 'Giá trị giảm giá phải lớn hơn 0';
  if (!endDate) errors.end_date = 'Vui lòng nhập ngày kết thúc';

  if (Object.keys(errors).length) return buildError(400, 'Thông tin voucher không hợp lệ', errors);

  const [result] = await pool.query(
    `
      INSERT INTO vouchers (
        voucher_code, voucher_name, discount_type, discount_value, min_order_amount, max_discount_amount,
        usage_limit, target_type, start_date, end_date, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        voucher_name = VALUES(voucher_name),
        discount_type = VALUES(discount_type),
        discount_value = VALUES(discount_value),
        min_order_amount = VALUES(min_order_amount),
        max_discount_amount = VALUES(max_discount_amount),
        usage_limit = VALUES(usage_limit),
        target_type = VALUES(target_type),
        start_date = VALUES(start_date),
        end_date = VALUES(end_date),
        status = VALUES(status)
    `,
    [code, name, discountType, discountValue, minOrderAmount, maxDiscountAmount, usageLimit, targetType, startDate, endDate, status]
  );

  return { ok: true, data: { voucher_code: code, voucher_id: Number(result.insertId || 0) || null } };
};

const saveCampaign = async (payload = {}, actor = null) => {
  const name = normalizeText(payload.campaign_name).slice(0, 150);
  const type = normalizeUpper(payload.campaign_type || 'VOUCHER');
  const targetType = normalizeUpper(payload.target_type || 'ALL');
  const status = normalizeUpper(payload.status || 'DRAFT');
  const voucherId = payload.voucher_id ? Number.parseInt(payload.voucher_id, 10) : null;
  const bannerUrl = normalizeText(payload.banner_url).slice(0, 255) || null;
  const startDate = normalizeText(payload.start_date);
  const endDate = normalizeText(payload.end_date);

  if (!name || !startDate || !endDate) return buildError(400, 'Vui lòng nhập tên và thời gian chiến dịch');
  if (!['VOUCHER', 'BANNER', 'EMAIL', 'LOYALTY'].includes(type)) return buildError(400, 'Loại chiến dịch không hợp lệ');
  if (!['ALL', 'MEMBER', 'GUEST'].includes(targetType)) return buildError(400, 'Tập khách hàng không hợp lệ');
  if (!['DRAFT', 'ACTIVE', 'SCHEDULED', 'EXPIRED', 'DISABLED'].includes(status)) return buildError(400, 'Trạng thái chiến dịch không hợp lệ');

  const [result] = await pool.query(
    `
      INSERT INTO marketing_campaigns (campaign_name, campaign_type, voucher_id, banner_url, target_type, start_date, end_date, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [name, type, voucherId, bannerUrl, targetType, startDate, endDate, status, actor?.user_id || 1]
  );

  return { ok: true, data: { campaign_id: Number(result.insertId) } };
};

const listLoyaltyPrograms = async () => {
  const [rows] = await pool.query('SELECT * FROM loyalty_programs ORDER BY start_date DESC, program_id DESC LIMIT 100');
  return {
    ok: true,
    data: rows.map((program) => ({
      ...program,
      program_id: Number(program.program_id),
      point_rate: Number(program.point_rate || 0),
      min_order_amount: Number(program.min_order_amount || 0),
      required_points: Number(program.required_points || 0)
    }))
  };
};

const saveLoyaltyProgram = async (payload = {}, actor = null) => {
  const name = normalizeText(payload.program_name).slice(0, 150);
  const pointRate = Number(payload.point_rate || 0);
  const minOrderAmount = toMoney(payload.min_order_amount);
  const rewardType = normalizeUpper(payload.reward_type || 'VOUCHER');
  const requiredPoints = Number.parseInt(payload.required_points, 10);
  const rewardDescription = normalizeText(payload.reward_description).slice(0, 255);
  const startDate = normalizeText(payload.start_date);
  const endDate = normalizeText(payload.end_date);
  const status = normalizeUpper(payload.status || 'ACTIVE');

  if (!name || !pointRate || !requiredPoints || !rewardDescription || !startDate || !endDate) {
    return buildError(400, 'Thông tin chương trình điểm thưởng chưa đầy đủ');
  }
  if (!['VOUCHER', 'GIFT', 'DISCOUNT'].includes(rewardType)) return buildError(400, 'Loại phần thưởng không hợp lệ');
  if (!['DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED'].includes(status)) return buildError(400, 'Trạng thái không hợp lệ');

  const [result] = await pool.query(
    `
      INSERT INTO loyalty_programs (
        program_name, point_rate, min_order_amount, reward_type, required_points, reward_description, start_date, end_date, status, created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [name, pointRate, minOrderAmount, rewardType, requiredPoints, rewardDescription, startDate, endDate, status, actor?.user_id || 1]
  );

  return { ok: true, data: { program_id: Number(result.insertId) } };
};

const listFulfillment = async () => {
  const [deliveries] = await pool.query(
    `
      SELECT d.*, o.order_code, o.order_status, o.total_amount
      FROM delivery_orders d
      JOIN orders o ON o.order_id = d.order_id
      ORDER BY d.created_at DESC, d.delivery_order_id DESC
      LIMIT 150
    `
  );
  const [reconciliations] = await pool.query('SELECT * FROM reconciliations ORDER BY created_at DESC, reconciliation_id DESC LIMIT 100');

  return {
    ok: true,
    data: {
      deliveries: deliveries.map((delivery) => ({
        ...delivery,
        delivery_order_id: Number(delivery.delivery_order_id),
        order_id: Number(delivery.order_id),
        shipping_fee: Number(delivery.shipping_fee || 0),
        total_amount: Number(delivery.total_amount || 0)
      })),
      reconciliations: reconciliations.map((row) => ({
        ...row,
        reconciliation_id: Number(row.reconciliation_id),
        system_amount: Number(row.system_amount || 0),
        actual_amount: Number(row.actual_amount || 0),
        difference_amount: Number(row.difference_amount || 0)
      }))
    }
  };
};

const createDeliveryOrder = async (payload = {}) => {
  const orderId = Number.parseInt(payload.order_id, 10);
  const providerName = normalizeText(payload.provider_name || 'INTERNAL_SHIPPER').slice(0, 100);
  const shippingFee = toMoney(payload.shipping_fee);

  if (!Number.isInteger(orderId) || orderId <= 0) return buildError(400, 'Đơn hàng không hợp lệ');

  const [result] = await pool.query(
    `
      INSERT INTO delivery_orders (order_id, provider_name, provider_order_code, shipping_fee, driver_name, driver_phone, vehicle_number, delivery_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      orderId,
      providerName,
      normalizeText(payload.provider_order_code).slice(0, 100) || `SHIP-${Date.now()}`,
      shippingFee,
      normalizeText(payload.driver_name).slice(0, 100) || null,
      normalizeText(payload.driver_phone).slice(0, 20) || null,
      normalizeText(payload.vehicle_number).slice(0, 30) || null,
      normalizeUpper(payload.delivery_status || 'FINDING_DRIVER')
    ]
  );

  return { ok: true, data: { delivery_order_id: Number(result.insertId) } };
};

const createReconciliation = async (payload = {}, actor = null) => {
  const periodFrom = normalizeText(payload.period_from);
  const periodTo = normalizeText(payload.period_to);
  const sourceType = normalizeUpper(payload.source_type || 'COD');
  const systemAmount = toMoney(payload.system_amount);
  const actualAmount = toMoney(payload.actual_amount);
  const differenceAmount = actualAmount - systemAmount;
  const status = differenceAmount === 0 ? 'MATCHED' : 'DIFFERENCE';

  if (!periodFrom || !periodTo) return buildError(400, 'Vui lòng nhập kỳ đối soát');
  if (!['COD', 'ONLINE', 'BANK', 'E_WALLET', '3PL'].includes(sourceType)) return buildError(400, 'Nguồn đối soát không hợp lệ');

  const [result] = await pool.query(
    `
      INSERT INTO reconciliations (period_from, period_to, source_type, system_amount, actual_amount, difference_amount, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [periodFrom, periodTo, sourceType, systemAmount, actualAmount, differenceAmount, status, actor?.user_id || 1]
  );

  return { ok: true, data: { reconciliation_id: Number(result.insertId), status, difference_amount: differenceAmount } };
};

module.exports = {
  getReportSummary,
  listCatalog,
  saveCategory,
  saveFood,
  listMarketing,
  saveVoucher,
  saveCampaign,
  listLoyaltyPrograms,
  saveLoyaltyProgram,
  listFulfillment,
  createDeliveryOrder,
  createReconciliation
};
