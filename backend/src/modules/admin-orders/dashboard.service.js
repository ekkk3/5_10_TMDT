const pool = require('../../config/database');

const getAdminDashboard = async () => {
  const [[countsRow]] = await pool.query(
    `
      SELECT
        SUM(order_status = 'PENDING') AS pending_orders,
        SUM(order_status = 'COMPLETED' AND DATE(created_at) = CURDATE()) AS today_orders,
        SUM(order_status = 'CANCELLED' AND DATE(created_at) = CURDATE()) AS today_cancelled,
        SUM(CASE WHEN order_status = 'COMPLETED' AND DATE(created_at) = CURDATE() THEN total_amount ELSE 0 END) AS today_revenue,
        SUM(CASE WHEN order_status = 'COMPLETED' AND DATE(created_at) = CURDATE() - INTERVAL 1 DAY THEN total_amount ELSE 0 END) AS yesterday_revenue,
        SUM(CASE WHEN order_status = 'COMPLETED' AND created_at >= CURDATE() - INTERVAL 6 DAY THEN total_amount ELSE 0 END) AS week_revenue,
        SUM(CASE WHEN order_status = 'COMPLETED' AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE()) THEN total_amount ELSE 0 END) AS month_revenue,
        SUM(DATE(created_at) = CURDATE()) AS today_total_orders
      FROM orders
    `
  );

  const pendingOrders = Number(countsRow.pending_orders || 0);
  const todayOrders = Number(countsRow.today_orders || 0);
  const todayCancelled = Number(countsRow.today_cancelled || 0);
  const todayTotalOrders = Number(countsRow.today_total_orders || 0);
  const todayRevenue = Number(countsRow.today_revenue || 0);
  const yesterdayRevenue = Number(countsRow.yesterday_revenue || 0);
  const weekRevenue = Number(countsRow.week_revenue || 0);
  const monthRevenue = Number(countsRow.month_revenue || 0);
  const cancelRate = todayTotalOrders > 0 ? Math.round((todayCancelled / todayTotalOrders) * 10000) / 100 : 0;

  const [hourlyRevenue] = await pool.query(
    `
      SELECT
        HOUR(created_at) AS hour,
        SUM(total_amount) AS revenue,
        COUNT(*) AS order_count
      FROM orders
      WHERE order_status = 'COMPLETED' AND DATE(created_at) = CURDATE()
      GROUP BY HOUR(created_at)
      ORDER BY hour ASC
    `
  );

  const [topProducts] = await pool.query(
    `
      SELECT
        oi.food_name_snapshot AS food_name,
        SUM(oi.quantity) AS total_quantity,
        SUM(oi.total_price) AS total_revenue
      FROM order_items oi
      INNER JOIN orders o ON o.order_id = oi.order_id
      WHERE o.order_status = 'COMPLETED' AND DATE(o.created_at) = CURDATE()
      GROUP BY oi.food_name_snapshot
      ORDER BY total_quantity DESC
      LIMIT 5
    `
  );

  const [recentOrders] = await pool.query(
    `
      SELECT
        o.order_id,
        o.order_code,
        COALESCE(o.guest_name, u.full_name) AS customer_name,
        o.total_amount,
        o.order_status,
        o.created_at
      FROM orders o
      LEFT JOIN users u ON u.user_id = o.user_id
      ORDER BY o.created_at DESC, o.order_id DESC
      LIMIT 5
    `
  );

  const [orderStatusSummary] = await pool.query(
    `
      SELECT
        order_status,
        COUNT(*) AS count
      FROM orders
      WHERE DATE(created_at) = CURDATE()
      GROUP BY order_status
    `
  );

  const [[newCustomersRow]] = await pool.query(
    `
      SELECT COUNT(*) AS count
      FROM users
      WHERE DATE(created_at) = CURDATE()
    `
  );

  return {
    ok: true,
    data: {
      pending_orders: pendingOrders,
      today_revenue: todayRevenue,
      today_orders: todayOrders,
      today_cancelled: todayCancelled,
      cancel_rate: cancelRate,
      yesterday_revenue: yesterdayRevenue,
      week_revenue: weekRevenue,
      month_revenue: monthRevenue,
      hourly_revenue: hourlyRevenue.map((row) => ({
        hour: Number(row.hour),
        revenue: Number(row.revenue || 0),
        order_count: Number(row.order_count || 0)
      })),
      top_products: topProducts.map((row) => ({
        food_name: row.food_name,
        total_quantity: Number(row.total_quantity || 0),
        total_revenue: Number(row.total_revenue || 0)
      })),
      recent_orders: recentOrders.map((row) => ({
        order_id: Number(row.order_id),
        order_code: row.order_code,
        customer_name: row.customer_name,
        total_amount: Number(row.total_amount || 0),
        order_status: row.order_status,
        created_at: row.created_at
      })),
      order_status_summary: orderStatusSummary.map((row) => ({
        status: row.order_status,
        count: Number(row.count || 0)
      })),
      new_customers_today: Number(newCustomersRow.count || 0)
    }
  };
};

module.exports = {
  getAdminDashboard
};
