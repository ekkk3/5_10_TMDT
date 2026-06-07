const pool = require('../../config/database');

const VALID_GROUP_BY = new Set(['day', 'week', 'month']);
const VALID_STATUSES = new Set(['PENDING', 'CONFIRMED', 'COOKING', 'READY', 'DELIVERING', 'COMPLETED', 'CANCELLED']);
const VALID_CUSTOMER_TYPES = new Set(['GUEST', 'MEMBER']);
const VALID_PAYMENT_METHODS = new Set(['COD', 'ONLINE_MOCK']);
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VAT_RATE = 0.08;

const formatSqlDate = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(value);
};

const buildError = (statusCode, message, errors = null) => ({
  ok: false,
  statusCode,
  message,
  errors
});

const getRevenueReport = async (filters = {}) => {
  const { from, to, group_by = 'day', status, customerType, paymentMethod } = filters;

  if (!from || !to) {
    return buildError(400, 'Ngày bắt đầu và kết thúc là bắt buộc', {
      from: !from ? 'Ngày bắt đầu là bắt buộc' : undefined,
      to: !to ? 'Ngày kết thúc là bắt buộc' : undefined
    });
  }

  if (!DATE_REGEX.test(from) || !DATE_REGEX.test(to)) {
    return buildError(400, 'Định dạng ngày không hợp lệ, sử dụng YYYY-MM-DD');
  }

  if (from > to) {
    return buildError(400, 'Ngày bắt đầu phải trước ngày kết thúc');
  }

  if (!VALID_GROUP_BY.has(group_by)) {
    return buildError(400, 'group_by không hợp lệ, chỉ hỗ trợ day/week/month');
  }

  const where = ['o.created_at >= ?', 'o.created_at < DATE_ADD(?, INTERVAL 1 DAY)'];
  const params = [from, to];

  const hasStatusFilter = Object.prototype.hasOwnProperty.call(filters, 'status');
  const orderStatus = hasStatusFilter ? String(status || '').trim().toUpperCase() : 'COMPLETED';

  if (orderStatus && !VALID_STATUSES.has(orderStatus)) {
    return buildError(400, 'Trạng thái đơn hàng không hợp lệ');
  }

  if (orderStatus) {
    where.push('o.order_status = ?');
    params.push(orderStatus);
  }

  const normalizedCustomerType = customerType ? String(customerType).trim().toUpperCase() : '';
  if (normalizedCustomerType) {
    if (!VALID_CUSTOMER_TYPES.has(normalizedCustomerType)) {
      return buildError(400, 'Loại khách hàng không hợp lệ');
    }
    where.push('o.customer_type = ?');
    params.push(normalizedCustomerType);
  }

  const normalizedPaymentMethod = paymentMethod ? String(paymentMethod).trim().toUpperCase() : '';
  if (normalizedPaymentMethod) {
    if (!VALID_PAYMENT_METHODS.has(normalizedPaymentMethod)) {
      return buildError(400, 'Phương thức thanh toán không hợp lệ');
    }
    where.push('o.payment_method = ?');
    params.push(normalizedPaymentMethod);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const dateWhereParams = [from, to];

  const [summaryRows] = await pool.query(
    `
      SELECT
        COALESCE(SUM(o.subtotal + o.delivery_fee), 0) AS total_gross_revenue,
        COALESCE(SUM(o.subtotal), 0) AS total_subtotal,
        COALESCE(SUM(o.delivery_fee), 0) AS total_delivery_fee,
        COALESCE(SUM(o.discount_amount), 0) AS total_discount,
        COUNT(*) AS order_count,
        COALESCE(SUM(CASE WHEN o.customer_type = 'GUEST' THEN o.total_amount ELSE 0 END), 0) AS guest_revenue,
        COALESCE(SUM(CASE WHEN o.customer_type = 'MEMBER' THEN o.total_amount ELSE 0 END), 0) AS member_revenue,
        COALESCE(SUM(CASE WHEN o.payment_method = 'COD' THEN o.total_amount ELSE 0 END), 0) AS cod_revenue,
        COALESCE(SUM(CASE WHEN o.payment_method = 'ONLINE_MOCK' THEN o.total_amount ELSE 0 END), 0) AS online_revenue
      FROM orders o
      ${whereSql}
    `,
    params
  );

  const [statusCountRows] = await pool.query(
    `
      SELECT
        COALESCE(SUM(CASE WHEN o.order_status = 'COMPLETED' THEN 1 ELSE 0 END), 0) AS completed_count,
        COALESCE(SUM(CASE WHEN o.order_status = 'CANCELLED' THEN 1 ELSE 0 END), 0) AS cancelled_count
      FROM orders o
      WHERE o.created_at >= ? AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)
    `,
    dateWhereParams
  );

  const s = summaryRows[0];
  const sc = statusCountRows[0];
  const totalGrossRevenue = Number(s.total_gross_revenue);
  const totalDiscount = Number(s.total_discount);
  const totalNetRevenue = totalGrossRevenue - totalDiscount;
  const estimatedVat = totalNetRevenue * (VAT_RATE / (1 + VAT_RATE));
  const orderCount = Number(s.order_count);

  const summary = {
    total_gross_revenue: totalGrossRevenue,
    total_subtotal: Number(s.total_subtotal),
    total_delivery_fee: Number(s.total_delivery_fee),
    total_discount: totalDiscount,
    total_net_revenue: totalNetRevenue,
    estimated_vat: Math.round(estimatedVat * 100) / 100,
    total_after_vat: Math.round((totalNetRevenue - estimatedVat) * 100) / 100,
    order_count: orderCount,
    completed_count: Number(sc.completed_count),
    cancelled_count: Number(sc.cancelled_count),
    avg_order_value: orderCount > 0 ? Math.round((totalNetRevenue / orderCount) * 100) / 100 : 0,
    guest_revenue: Number(s.guest_revenue),
    member_revenue: Number(s.member_revenue),
    cod_revenue: Number(s.cod_revenue),
    online_revenue: Number(s.online_revenue)
  };

  let periodExpr;
  let periodEndExpr = 'NULL';
  let groupByExpr;
  let orderByExpr;

  if (group_by === 'week') {
    const weekStartExpr = 'DATE_SUB(DATE(o.created_at), INTERVAL WEEKDAY(o.created_at) DAY)';
    periodExpr = `MIN(${weekStartExpr})`;
    periodEndExpr = `DATE_ADD(MIN(${weekStartExpr}), INTERVAL 6 DAY)`;
    groupByExpr = weekStartExpr;
    orderByExpr = weekStartExpr;
  } else if (group_by === 'month') {
    periodExpr = "DATE_FORMAT(o.created_at, '%Y-%m')";
    groupByExpr = "DATE_FORMAT(o.created_at, '%Y-%m')";
    orderByExpr = "DATE_FORMAT(o.created_at, '%Y-%m')";
  } else {
    periodExpr = 'DATE(o.created_at)';
    groupByExpr = 'DATE(o.created_at)';
    orderByExpr = 'DATE(o.created_at)';
  }

  const [timelineRows] = await pool.query(
    `
      SELECT
        ${periodExpr} AS period,
        ${periodEndExpr} AS period_end,
        COUNT(*) AS order_count,
        COALESCE(SUM(o.subtotal + o.delivery_fee), 0) AS gross_revenue,
        COALESCE(SUM(o.discount_amount), 0) AS discount,
        COALESCE(SUM(o.delivery_fee), 0) AS delivery_fee
      FROM orders o
      ${whereSql}
      GROUP BY ${groupByExpr}
      ORDER BY ${orderByExpr} ASC
    `,
    params
  );

  const timeline = timelineRows.map((row) => {
    const grossRevenue = Number(row.gross_revenue);
    const discount = Number(row.discount);
    const netRevenue = grossRevenue - discount;
    return {
      period: group_by === 'month' ? String(row.period) : formatSqlDate(row.period),
      period_end: group_by === 'week' ? formatSqlDate(row.period_end) : null,
      order_count: Number(row.order_count),
      gross_revenue: grossRevenue,
      discount,
      delivery_fee: Number(row.delivery_fee),
      net_revenue: netRevenue,
      estimated_vat: Math.round(netRevenue * (VAT_RATE / (1 + VAT_RATE)) * 100) / 100
    };
  });

  const [topProducts] = await pool.query(
    `
      SELECT
        oi.food_name_snapshot AS food_name,
        SUM(oi.quantity) AS total_quantity,
        SUM(oi.total_price) AS total_revenue
      FROM order_items oi
      INNER JOIN orders o ON o.order_id = oi.order_id
      ${whereSql}
      GROUP BY oi.food_name_snapshot
      ORDER BY total_revenue DESC
      LIMIT 20
    `,
    params
  );

  const top_products = topProducts.map((row) => ({
    food_name: row.food_name,
    total_quantity: Number(row.total_quantity),
    total_revenue: Number(row.total_revenue)
  }));

  const [paymentRows] = await pool.query(
    `
      SELECT
        o.payment_method AS method,
        COUNT(*) AS order_count,
        COALESCE(SUM(o.total_amount), 0) AS total_revenue
      FROM orders o
      ${whereSql}
      GROUP BY o.payment_method
    `,
    params
  );

  const payment_breakdown = paymentRows.map((row) => ({
    method: row.method,
    order_count: Number(row.order_count),
    total_revenue: Number(row.total_revenue)
  }));

  const [customerRows] = await pool.query(
    `
      SELECT
        o.customer_type AS type,
        COUNT(*) AS order_count,
        COALESCE(SUM(o.total_amount), 0) AS total_revenue
      FROM orders o
      ${whereSql}
      GROUP BY o.customer_type
    `,
    params
  );

  const customer_breakdown = customerRows.map((row) => ({
    type: row.type,
    order_count: Number(row.order_count),
    total_revenue: Number(row.total_revenue)
  }));

  return {
    ok: true,
    data: {
      summary,
      timeline,
      top_products,
      payment_breakdown,
      customer_breakdown
    }
  };
};

module.exports = {
  getRevenueReport
};
