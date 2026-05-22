import { adminAuthService } from '../../services/adminAuthService.js';

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const permissionLabels = {
  ADMIN_DASHBOARD: 'Tong quan quan tri',
  ORDER_MANAGE: 'Quan ly don hang',
  KITCHEN_KDS: 'Man hinh bep',
  DELIVERY_MANAGE: 'Dieu phoi giao hang',
  CUSTOMER_SUPPORT: 'Cham soc khach hang',
  MARKETING_MANAGE: 'Marketing'
};

const renderLoginRequired = (message = 'Phien quan tri da het han. Vui long dang nhap lai.') => `
  <section class="admin-dashboard-panel">
    <h1>Can dang nhap quan tri</h1>
    <p>${escapeHtml(message)}</p>
    <a class="button button-primary" href="#/admin/login">Dang nhap quan tri</a>
  </section>
`;

const renderBar = (label, value, height) => `
  <div class="admin-chart__bar" style="height: ${height}px">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(value)}</strong>
  </div>
`;

const renderDashboard = ({ user, permissions, dashboard_path: dashboardPath }) => `
  <section class="admin-dashboard-page">
    <div class="admin-dashboard-heading">
      <div>
        <h1>Dashboard quan tri</h1>
        <p>${escapeHtml(user.full_name)} - ${escapeHtml(user.role_name)} - ${escapeHtml(dashboardPath)}</p>
      </div>
      <button class="button button-secondary" type="button" data-admin-logout>Dang xuat</button>
    </div>

    <form class="admin-report-filters" aria-label="Bo loc bao cao">
      <label>
        <span>Thoi gian</span>
        <select>
          <option>Hom nay</option>
          <option>7 ngay gan nhat</option>
          <option>Thang nay</option>
        </select>
      </label>
      <label>
        <span>Loai khach</span>
        <select>
          <option>Tat ca</option>
          <option>Guest</option>
          <option>Member</option>
        </select>
      </label>
      <label>
        <span>Trang thai</span>
        <select>
          <option>Tat ca</option>
          <option>Pending</option>
          <option>Completed</option>
        </select>
      </label>
      <button class="button button-primary" type="button">Loc du lieu</button>
      <button class="button button-secondary" type="button">Xuat bao cao</button>
    </form>

    <div class="admin-kpis">
      <article><span>Don moi</span><strong>24</strong><small>Dang cho xu ly</small></article>
      <article><span>Doanh thu</span><strong>5.8M</strong><small>Uoc tinh hom nay</small></article>
      <article><span>Mon ban chay</span><strong>Burger</strong><small>Classic Beef Burger</small></article>
      <article><span>Ty le huy</span><strong>3%</strong><small>Theo bo loc hien tai</small></article>
    </div>

    <div class="admin-dashboard-grid">
      <section class="admin-dashboard-panel">
        <h2>Doanh thu theo khung gio</h2>
        <div class="admin-chart" aria-label="Bieu do doanh thu">
          ${renderBar('08h', '0.8M', 72)}
          ${renderBar('11h', '1.6M', 118)}
          ${renderBar('14h', '1.1M', 88)}
          ${renderBar('18h', '2.3M', 156)}
          ${renderBar('21h', '1.4M', 104)}
        </div>
      </section>

      <section class="admin-dashboard-panel">
        <h2>Quyen truy cap</h2>
        <div class="admin-permissions">
          ${(permissions || [])
            .map((permission) => `<span>${escapeHtml(permissionLabels[permission] || permission)}</span>`)
            .join('')}
        </div>
        <div class="admin-dashboard-actions">
          ${(permissions || []).includes('ORDER_MANAGE') ? '<a class="button button-primary" href="#/admin/orders">Quan ly don hang</a>' : ''}
          ${(permissions || []).includes('KITCHEN_KDS') ? '<a class="button button-primary" href="#/kitchen">KDS bep</a>' : ''}
        </div>
      </section>
    </div>

    <section class="admin-dashboard-panel">
      <h2>Bang thong ke nhanh</h2>
      <div class="admin-report-table">
        <div class="admin-report-row admin-report-row--head">
          <span>Nhom du lieu</span>
          <span>So luong</span>
          <span>Gia tri</span>
          <span>Ghi chu</span>
        </div>
        <div class="admin-report-row">
          <strong>Don guest</strong>
          <span>18</span>
          <span>3.9M</span>
          <span>Can uu tien xac nhan</span>
        </div>
        <div class="admin-report-row">
          <strong>Don member</strong>
          <span>6</span>
          <span>1.9M</span>
          <span>Co the ap dung voucher ca nhan</span>
        </div>
      </div>
    </section>
  </section>
`;

const pageStyles = `
  <style>
    .admin-dashboard-page { display: grid; gap: 18px; }
    .admin-dashboard-heading { display: flex; justify-content: space-between; gap: 14px; align-items: flex-start; }
    .admin-dashboard-heading h1 { margin: 0 0 8px; font-size: 34px; line-height: 1.15; }
    .admin-dashboard-heading p { margin: 0; color: var(--muted); line-height: 1.5; }
    .admin-report-filters { display: grid; grid-template-columns: repeat(3, minmax(140px, 1fr)) auto auto; gap: 10px; align-items: end; padding: 16px; border: 1px solid var(--line); border-radius: 8px; background: #fff; }
    .admin-report-filters label { display: grid; gap: 6px; color: var(--muted); font-size: 13px; font-weight: 800; }
    .admin-report-filters select { min-height: 42px; border: 1px solid var(--line); border-radius: 6px; padding: 9px 10px; color: var(--ink); font: inherit; background: #fff; }
    .admin-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .admin-kpis article, .admin-dashboard-panel { border: 1px solid var(--line); border-radius: 8px; background: #fff; box-shadow: 0 12px 28px rgba(116, 36, 0, 0.08); }
    .admin-kpis article { display: grid; gap: 6px; padding: 16px; }
    .admin-kpis span, .admin-kpis small { color: var(--muted); font-weight: 800; }
    .admin-kpis strong { color: var(--red); font-size: 28px; line-height: 1.1; }
    .admin-dashboard-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr); gap: 18px; align-items: stretch; }
    .admin-dashboard-panel { padding: 20px; }
    .admin-dashboard-panel h1, .admin-dashboard-panel h2 { margin: 0 0 14px; line-height: 1.15; }
    .admin-dashboard-panel h1 { font-size: 34px; }
    .admin-dashboard-panel h2 { font-size: 24px; }
    .admin-dashboard-panel p { margin: 0 0 18px; color: var(--muted); line-height: 1.5; }
    .admin-chart { min-height: 210px; display: flex; align-items: end; gap: 12px; padding-top: 20px; border-bottom: 1px solid var(--line); }
    .admin-chart__bar { min-width: 64px; flex: 1; display: grid; align-content: space-between; justify-items: center; padding: 10px 6px; border-radius: 8px 8px 0 0; color: #fff; background: var(--red); font-size: 12px; font-weight: 900; }
    .admin-chart__bar strong { font-size: 13px; }
    .admin-permissions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
    .admin-permissions span { display: inline-flex; align-items: center; min-height: 34px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 6px; background: #fff8ef; color: var(--muted); font-weight: 800; }
    .admin-dashboard-actions { display: flex; flex-wrap: wrap; gap: 10px; }
    .admin-report-table { overflow-x: auto; border: 1px solid var(--line); border-radius: 8px; }
    .admin-report-row { min-width: 720px; display: grid; grid-template-columns: 1.4fr 0.8fr 0.8fr 1.5fr; gap: 12px; padding: 12px 14px; border-top: 1px solid #ffe0aa; }
    .admin-report-row:first-child { border-top: 0; }
    .admin-report-row--head { color: var(--muted); background: #fffaf3; font-size: 13px; font-weight: 900; }
    @media (max-width: 980px) {
      .admin-report-filters, .admin-dashboard-grid, .admin-kpis { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 640px) {
      .admin-dashboard-heading { display: grid; }
      .admin-report-filters, .admin-dashboard-grid, .admin-kpis { grid-template-columns: 1fr; }
      .admin-report-filters .button, .admin-dashboard-actions .button { width: 100%; text-align: center; }
      .admin-chart { overflow-x: auto; }
      .admin-chart__bar { min-width: 72px; }
    }
  </style>
`;

export const AdminDashboardPage = () => `
  ${pageStyles}
  <section data-admin-dashboard-page>
    ${renderLoginRequired('Dang kiem tra phien quan tri...')}
  </section>
`;

export const mountAdminDashboardPage = async () => {
  const root = document.querySelector('[data-admin-dashboard-page]');
  if (!root) return;

  const render = (content) => {
    root.innerHTML = content;
  };

  root.addEventListener('click', async (event) => {
    if (!event.target.closest('[data-admin-logout]')) return;

    await adminAuthService.logout();
    window.location.hash = '#/admin/login';
  });

  try {
    const adminSession = await adminAuthService.getCurrentAdmin();
    render(renderDashboard(adminSession));
  } catch (error) {
    render(renderLoginRequired(error?.message || 'Phien quan tri da het han. Vui long dang nhap lai.'));
  }
};
