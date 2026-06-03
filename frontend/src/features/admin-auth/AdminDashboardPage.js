import { adminAuthService } from '../../services/adminAuthService.js';
import { adminDashboardService } from '../../services/adminDashboardService.js';

const escapeHtml = (value = '') =>
  String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

const formatMoney = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
};

const renderLoginRequired = (message = 'Phiên quản trị đã hết hạn. Vui lòng đăng nhập lại.') => `
  <section class="admin-dashboard-panel" style="text-align:center;max-width:440px;margin:40px auto;padding:40px;">
    <div style="font-size:48px;margin-bottom:16px;">🔒</div>
    <h1>Cần đăng nhập quản trị</h1>
    <p>${escapeHtml(message)}</p>
    <a class="button button-primary" href="#/admin/login">Đăng nhập quản trị</a>
  </section>
`;

const renderLoading = () => `
  <div class="admin-dashboard-page">
    <div class="admin-dashboard-heading">
      <div>
        <h1>Dashboard quản trị</h1>
        <p>Đang tải dữ liệu...</p>
      </div>
    </div>
    <div class="admin-kpis">
      <article class="kpi-skeleton"><span>Đơn mới</span><strong>--</strong><small>Đang tải...</small></article>
      <article class="kpi-skeleton"><span>Doanh thu hôm nay</span><strong>--</strong><small>Đang tải...</small></article>
      <article class="kpi-skeleton"><span>Đơn hoàn thành</span><strong>--</strong><small>Đang tải...</small></article>
      <article class="kpi-skeleton"><span>Tỷ lệ hủy</span><strong>--</strong><small>Đang tải...</small></article>
    </div>
  </div>
`;

const getChangeIndicator = (todayRevenue, yesterdayRevenue) => {
  if (!yesterdayRevenue || yesterdayRevenue === 0) return { text: 'Không có dữ liệu hôm qua', class: 'neutral', icon: '➖' };
  const change = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1);
  if (change > 0) return { text: `+${change}% so với hôm qua`, class: 'positive', icon: '📈' };
  if (change < 0) return { text: `${change}% so với hôm qua`, class: 'negative', icon: '📉' };
  return { text: 'Bằng hôm qua', class: 'neutral', icon: '➖' };
};

const renderBar = (label, revenue, maxRevenue, count) => {
  const height = maxRevenue > 0 ? Math.max(20, Math.round((revenue / maxRevenue) * 180)) : 20;
  return `
    <div class="admin-chart__bar" style="height: ${height}px" title="${label}h: ${formatMoney(revenue)} (${count} đơn)">
      <span>${escapeHtml(label)}h</span>
      <strong>${revenue >= 1000000 ? (revenue / 1000000).toFixed(1) + 'M' : revenue >= 1000 ? (revenue / 1000).toFixed(0) + 'K' : revenue}</strong>
    </div>
  `;
};

const renderStatusBadge = (status) => {
  const statusMap = {
    PENDING: { label: 'Chờ xử lý', class: 'pending' },
    CONFIRMED: { label: 'Đã xác nhận', class: 'confirmed' },
    COOKING: { label: 'Đang nấu', class: 'cooking' },
    READY: { label: 'Sẵn sàng', class: 'ready' },
    DELIVERING: { label: 'Đang giao', class: 'delivering' },
    COMPLETED: { label: 'Hoàn thành', class: 'completed' },
    CANCELLED: { label: 'Đã hủy', class: 'cancelled' }
  };
  const info = statusMap[status] || { label: status, class: 'unknown' };
  return `<span class="dash-status-badge dash-status-${info.class}">${escapeHtml(info.label)}</span>`;
};

const renderDashboard = ({ user, dashboard }) => {
  const d = dashboard;
  const change = getChangeIndicator(d.today_revenue, d.yesterday_revenue);
  const maxHourlyRevenue = d.hourly_revenue?.length ? Math.max(...d.hourly_revenue.map(h => h.revenue)) : 0;

  const allHours = [];
  for (let h = 7; h <= 23; h++) {
    const found = d.hourly_revenue?.find(hr => hr.hour === h);
    allHours.push({ hour: h, revenue: found?.revenue || 0, order_count: found?.order_count || 0 });
  }

  return `
    <section class="admin-dashboard-page">
      <div class="admin-dashboard-heading">
        <div>
          <h1>Dashboard quản trị</h1>
          <p>Xin chào <strong>${escapeHtml(user?.full_name || 'Admin')}</strong> — Cập nhật lúc ${new Intl.DateTimeFormat('vi-VN', { timeStyle: 'medium' }).format(new Date())}</p>
        </div>
        <div class="dash-heading-actions">
          <button class="button button-secondary" type="button" data-refresh-dashboard> ⟳ Làm mới</button>
          <button class="button button-danger" type="button" data-admin-logout>⏻ Đăng xuất</button>
        </div>
      </div>

      <div class="admin-kpis">
        <article class="kpi-card kpi-accent-orange">
          <span>Đơn chờ xử lý</span>
          <strong>${d.pending_orders || 0}</strong>
          <small>Đang chờ xác nhận</small>
        </article>
        <article class="kpi-card kpi-accent-green">
          <span>Doanh thu hôm nay</span>
          <strong>${formatMoney(d.today_revenue)}</strong>
          <small class="change-${change.class}">${change.icon} ${change.text}</small>
        </article>
        <article class="kpi-card kpi-accent-blue">
          <span>Đơn hoàn thành</span>
          <strong>${d.today_orders || 0}</strong>
          <small>Hoàn thành hôm nay</small>
        </article>
        <article class="kpi-card kpi-accent-red">
          <span>Tỷ lệ hủy</span>
          <strong>${d.cancel_rate || 0}%</strong>
          <small>${d.today_cancelled || 0} đơn hủy hôm nay</small>
        </article>
      </div>

      <div class="dash-revenue-summary">
        <div class="dash-rev-item">
          <span>📅 7 ngày qua</span>
          <strong>${formatMoney(d.week_revenue)}</strong>
        </div>
        <div class="dash-rev-item">
          <span>📆 Tháng này</span>
          <strong>${formatMoney(d.month_revenue)}</strong>
        </div>
        <div class="dash-rev-item">
          <span>Hôm qua</span>
          <strong>${formatMoney(d.yesterday_revenue)}</strong>
        </div>
        <div class="dash-rev-item">
          <span>Khách mới hôm nay</span>
          <strong>${d.new_customers_today || 0}</strong>
        </div>
      </div>

      <div class="admin-dashboard-grid">
        <section class="admin-dashboard-panel">
          <h2>Doanh thu theo khung giờ hôm nay</h2>
          <div class="admin-chart" aria-label="Biểu đồ doanh thu theo giờ">
            ${allHours.length > 0
              ? allHours.map(h => renderBar(String(h.hour).padStart(2, '0'), h.revenue, maxHourlyRevenue, h.order_count)).join('')
              : '<div class="dash-empty">Chưa có dữ liệu doanh thu hôm nay</div>'}
          </div>
        </section>

        <section class="admin-dashboard-panel">
          <h2>Trạng thái đơn hàng hôm nay</h2>
          <div class="dash-status-list">
            ${(d.order_status_summary || []).map(s => `
              <div class="dash-status-row">
                ${renderStatusBadge(s.status)}
                <strong>${s.count}</strong>
              </div>
            `).join('')}
            ${(!d.order_status_summary?.length) ? '<div class="dash-empty">Chưa có đơn hàng hôm nay</div>' : ''}
          </div>
          <div class="admin-dashboard-actions" style="margin-top: 16px;">
            <a class="button button-primary" href="#/admin/orders">Quản lý đơn hàng</a>
            <a class="button button-secondary" href="#/admin/reports">📈 Báo cáo doanh thu</a>
          </div>
        </section>
      </div>

      <div class="admin-dashboard-grid">
        <section class="admin-dashboard-panel">
          <h2>Đơn hàng gần nhất</h2>
          <div class="dash-recent-table">
            ${(d.recent_orders || []).length > 0 ? `
              <div class="dash-recent-row dash-recent-head">
                <span>Mã đơn</span>
                <span>Khách hàng</span>
                <span>Tổng tiền</span>
                <span>Trạng thái</span>
                <span>Thời gian</span>
              </div>
              ${d.recent_orders.map(o => `
                <div class="dash-recent-row">
                  <span class="dash-order-code">${escapeHtml(o.order_code)}</span>
                  <span>${escapeHtml(o.customer_name || 'Khách')}</span>
                  <span><strong>${formatMoney(o.total_amount)}</strong></span>
                  <span>${renderStatusBadge(o.order_status)}</span>
                  <span class="dash-time">${formatDateTime(o.created_at)}</span>
                </div>
              `).join('')}
            ` : '<div class="dash-empty">Chưa có đơn hàng</div>'}
          </div>
        </section>

        <section class="admin-dashboard-panel">
          <h2>Top 5 món bán chạy hôm nay</h2>
          <div class="dash-top-products">
            ${(d.top_products || []).length > 0
              ? d.top_products.map((p, i) => `
                <div class="dash-product-row">
                  <span class="dash-product-rank">${i + 1}</span>
                  <div class="dash-product-info">
                    <strong>${escapeHtml(p.food_name)}</strong>
                    <small>${p.total_quantity} phần · ${formatMoney(p.total_revenue)}</small>
                  </div>
                </div>
              `).join('')
              : '<div class="dash-empty">Chưa có dữ liệu bán hàng hôm nay</div>'}
          </div>
        </section>
      </div>
    </section>
  `;
};

const pageStyles = `
  <style>
    .admin-dashboard-page { display: grid; gap: 20px; animation: slideUp 400ms var(--ease); }
    .admin-dashboard-heading { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
    .admin-dashboard-heading h1 { margin: 0 0 8px; font-size: 30px; line-height: 1.15; color: var(--text); }
    .admin-dashboard-heading p { margin: 0; color: var(--text-muted); line-height: 1.5; font-size: 14px; }
    .dash-heading-actions { display: flex; gap: 10px; flex-shrink: 0; }
    .admin-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
    .kpi-card { display: grid; gap: 8px; padding: 22px; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--bg-glass); transition: all var(--transition); position: relative; overflow: hidden; }
    .kpi-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; border-radius: var(--radius-lg) 0 0 var(--radius-lg); }
    .kpi-accent-orange::before { background: linear-gradient(180deg, #f59e0b, #f97316); }
    .kpi-accent-green::before { background: linear-gradient(180deg, #10b981, #059669); }
    .kpi-accent-blue::before { background: linear-gradient(180deg, #3b82f6, #6366f1); }
    .kpi-accent-red::before { background: linear-gradient(180deg, #ef4444, #dc2626); }
    .kpi-card:hover { border-color: var(--border-hover); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
    .kpi-card span { color: var(--text-muted); font-weight: 700; font-size: 14px; }
    .kpi-card small { color: var(--text-subtle); font-size: 13px; }
    .kpi-card strong { color: var(--accent-light); font-size: 28px; line-height: 1.1; }
    .kpi-skeleton { opacity: 0.5; }
    .change-positive { color: #059669 !important; }
    .change-negative { color: #dc2626 !important; }
    .change-neutral { color: var(--text-subtle) !important; }

    .dash-revenue-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .dash-rev-item { display: flex; flex-direction: column; gap: 6px; padding: 16px 18px; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--bg-glass); transition: all var(--transition); }
    .dash-rev-item:hover { border-color: var(--border-hover); }
    .dash-rev-item span { color: var(--text-subtle); font-size: 13px; font-weight: 700; }
    .dash-rev-item strong { color: var(--text); font-size: 18px; }

    .admin-dashboard-grid { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.6fr); gap: 20px; align-items: stretch; }
    .admin-dashboard-panel { padding: 24px; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--bg-glass); }
    .admin-dashboard-panel h2 { margin: 0 0 16px; font-size: 20px; line-height: 1.15; color: var(--text); }
    .admin-dashboard-actions { display: flex; flex-wrap: wrap; gap: 10px; }

    .admin-chart { min-height: 210px; display: flex; align-items: end; gap: 6px; padding-top: 20px; border-bottom: 1px solid var(--border); }
    .admin-chart__bar { min-width: 36px; flex: 1; display: grid; align-content: space-between; justify-items: center; padding: 8px 4px; border-radius: var(--radius-sm) var(--radius-sm) 0 0; color: #fff; background: linear-gradient(180deg, var(--accent), var(--accent-hover)); font-size: 11px; font-weight: 800; transition: all var(--transition); cursor: default; }
    .admin-chart__bar:hover { filter: brightness(1.1); transform: scaleY(1.05); transform-origin: bottom; }
    .admin-chart__bar strong { font-size: 11px; }

    .dash-status-list { display: grid; gap: 8px; }
    .dash-status-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg-elevated); }
    .dash-status-row strong { font-size: 18px; color: var(--text); }
    .dash-status-badge { display: inline-flex; align-items: center; min-height: 26px; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 800; }
    .dash-status-pending { color: #92400e; background: #fef3c7; }
    .dash-status-confirmed { color: #065f46; background: #d1fae5; }
    .dash-status-cooking { color: #9a3412; background: #fed7aa; }
    .dash-status-ready { color: #1e40af; background: #dbeafe; }
    .dash-status-delivering { color: #5b21b6; background: #ede9fe; }
    .dash-status-completed { color: #065f46; background: #d1fae5; }
    .dash-status-cancelled { color: #991b1b; background: #fee2e2; }
    .dash-status-unknown { color: var(--text-muted); background: var(--bg-elevated); }

    .dash-recent-table { overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius-sm); }
    .dash-recent-row {
      display: grid;
      grid-template-columns: minmax(110px, auto) minmax(130px, 1fr) minmax(110px, auto) minmax(110px, auto) minmax(140px, auto);
      gap: 10px;
      padding: 12px 14px;
      border-top: 1px solid var(--border);
      align-items: center;
      font-size: 14px;
    }

    .dash-recent-row span {
      word-break: break-word;
      white-space: normal;
      overflow-wrap: break-word;
    }

    .dash-order-code {
      color: var(--accent-light);
      font-weight: 900;
      font-size: 13px;
      word-break: break-all;  /* cho phép ngắt giữa ký tự nếu cần */
    }
    .dash-recent-row:first-child { border-top: 0; }
    .dash-recent-head { color: var(--text-subtle); background: var(--bg-elevated); font-size: 13px; font-weight: 800; }
    .dash-order-code { color: var(--accent-light); font-weight: 900; font-size: 13px; }
    .dash-time { color: var(--text-subtle); font-size: 13px; }

    .dash-top-products { display: grid; gap: 8px; }
    .dash-product-row { display: flex; align-items: center; gap: 14px; padding: 12px 14px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg-elevated); transition: all var(--transition); }
    .dash-product-row:hover { border-color: var(--border-hover); transform: translateX(4px); }
    .dash-product-rank { min-width: 32px; min-height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: linear-gradient(135deg, var(--accent), var(--accent-hover)); color: #fff; font-size: 14px; font-weight: 900; flex-shrink: 0; }
    .dash-product-info { display: grid; gap: 4px; }
    .dash-product-info strong { color: var(--text); font-size: 14px; }
    .dash-product-info small { color: var(--text-subtle); font-size: 13px; }

    .dash-empty { padding: 24px; color: var(--text-subtle); font-weight: 700; text-align: center; font-size: 14px; }
    .dash-error { padding: 16px; border: 1px solid #fca5a5; border-radius: var(--radius-sm); color: #991b1b; background: #fef2f2; font-weight: 700; }

    @media (max-width: 980px) {
      .admin-dashboard-grid { grid-template-columns: 1fr; }
      .admin-kpis, .dash-revenue-summary { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 640px) {
      .admin-dashboard-heading { display: grid; gap: 12px; }
      .dash-heading-actions { justify-content: stretch; }
      .dash-heading-actions .button { flex: 1; text-align: center; }
      .admin-kpis, .dash-revenue-summary { grid-template-columns: 1fr; }
      .dash-recent-row { grid-template-columns: 80px 1fr 100px; }
      .dash-recent-row span:nth-child(4), .dash-recent-row span:nth-child(5) { display: none; }
      .dash-recent-head span:nth-child(4), .dash-recent-head span:nth-child(5) { display: none; }
    }
  </style>
`;

export const AdminDashboardPage = () => `
  ${pageStyles}
  <section data-admin-dashboard-page>
    ${renderLoading()}
  </section>
`;

export const mountAdminDashboardPage = async () => {
  const root = document.querySelector('[data-admin-dashboard-page]');
  if (!root) return;

  let dashboardData = null;
  let user = null;
  let error = null;

  const render = (content) => { root.innerHTML = content; };

  const loadDashboard = async () => {
    error = null;
    render(renderLoading());

    try {
      const adminSession = await adminAuthService.getCurrentAdmin();
      user = adminSession?.user;

      try {
        dashboardData = await adminDashboardService.getDashboard();
      } catch (dashError) {
        dashboardData = {
          pending_orders: 0, today_revenue: 0, today_orders: 0, today_cancelled: 0,
          cancel_rate: 0, yesterday_revenue: 0, week_revenue: 0, month_revenue: 0,
          hourly_revenue: [], top_products: [], recent_orders: [],
          order_status_summary: [], new_customers_today: 0
        };
      }

      render(renderDashboard({ user, dashboard: dashboardData }));
    } catch (authError) {
      render(renderLoginRequired(authError?.message || 'Phiên quản trị đã hết hạn. Vui lòng đăng nhập lại.'));
    }
  };

  root.addEventListener('click', async (event) => {
    if (event.target.closest('[data-admin-logout]')) {
      await adminAuthService.logout();
      window.location.hash = '#/admin/login';
      return;
    }
    if (event.target.closest('[data-refresh-dashboard]')) {
      await loadDashboard();
    }
  });

  await loadDashboard();
};
