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

const renderDashboard = ({ user, permissions, dashboard_path: dashboardPath }) => `
  <section class="admin-dashboard-panel">
    <div class="admin-dashboard-heading">
      <div>
        <h1>Dashboard quan tri</h1>
        <p>${escapeHtml(user.full_name)} - ${escapeHtml(user.role_name)} - ${escapeHtml(dashboardPath)}</p>
      </div>
      <button class="button button-secondary" type="button" data-admin-logout>Dang xuat</button>
    </div>
    <div class="admin-permissions">
      ${(permissions || [])
        .map((permission) => `<span>${escapeHtml(permissionLabels[permission] || permission)}</span>`)
        .join('')}
    </div>
    <div class="admin-dashboard-actions">
      ${permissions.includes('ORDER_MANAGE') ? '<a class="button button-primary" href="#/admin/orders">Quan ly don hang</a>' : ''}
      ${permissions.includes('KITCHEN_KDS') ? '<a class="button button-primary" href="#/kitchen">KDS bep</a>' : ''}
    </div>
  </section>
`;

const pageStyles = `
  <style>
    .admin-dashboard-panel { border: 1px solid var(--line); border-radius: 8px; background: #fff; box-shadow: 0 12px 28px rgba(116, 36, 0, 0.08); padding: 24px; }
    .admin-dashboard-heading { display: flex; justify-content: space-between; gap: 14px; align-items: flex-start; margin-bottom: 18px; }
    .admin-dashboard-panel h1 { margin: 0 0 8px; font-size: 34px; line-height: 1.15; }
    .admin-dashboard-panel p { margin: 0 0 18px; color: var(--muted); line-height: 1.5; }
    .admin-permissions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
    .admin-permissions span { display: inline-flex; align-items: center; min-height: 34px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 6px; background: #fff8ef; color: var(--muted); font-weight: 800; }
    .admin-dashboard-actions { display: flex; flex-wrap: wrap; gap: 10px; }
    @media (max-width: 640px) {
      .admin-dashboard-panel { padding: 18px; }
      .admin-dashboard-heading { display: grid; }
      .admin-dashboard-panel h1 { font-size: 28px; }
      .admin-dashboard-actions .button { width: 100%; text-align: center; }
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
