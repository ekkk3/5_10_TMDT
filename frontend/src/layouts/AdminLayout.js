import { Navbar } from '../components/Navbar.js';
import { adminAuthService } from '../services/adminAuthService.js';

const renderAdminGate = (message) => `
  <section class="placeholder-page" style="text-align:center;max-width:480px;margin:60px auto;">
    <div style="font-size:48px;margin-bottom:20px;">🔒</div>
    <h1>Cần đăng nhập quản trị</h1>
    <p>${message}</p>
    <a class="button button-primary" href="#/admin/login" style="margin-top:8px;">Đăng nhập quản trị</a>
  </section>
`;

export const AdminLayout = (content, options = {}) => {
  const currentPath = window.location.hash.replace('#', '') || '/';
  const session = adminAuthService.getCurrentSession();

  if (!session) {
    return `
      <div class="app-shell">
        ${Navbar()}
        <main class="page">${renderAdminGate('Phiên quản trị đã hết hạn hoặc chưa được tạo.')}</main>
      </div>
    `;
  }

  if (options.requiredPermission && !session.permissions?.includes(options.requiredPermission)) {
    return `
      <div class="app-shell">
        ${Navbar()}
        <main class="page">${renderAdminGate('Tài khoản chưa được phân quyền truy cập chức năng này.')}</main>
      </div>
    `;
  }

  return `
    <div class="app-shell">
      ${Navbar()}
      <main class="page">
        <nav class="admin-subnav" aria-label="Điều hướng quản trị">
          ${session.permissions?.includes('ADMIN_DASHBOARD') ? `<a class="admin-subnav__link ${currentPath === '/admin' ? 'is-active' : ''}" href="#/admin">📊 Dashboard</a>` : ''}
          ${session.permissions?.includes('ORDER_MANAGE') ? `<a class="admin-subnav__link ${currentPath === '/admin/orders' ? 'is-active' : ''}" href="#/admin/orders">📦 Đơn hàng</a>` : ''}
          ${session.permissions?.includes('ADMIN_DASHBOARD') ? `<a class="admin-subnav__link ${currentPath === '/admin/reports' ? 'is-active' : ''}" href="#/admin/reports">📈 Báo cáo doanh thu</a>` : ''}
          ${session.permissions?.includes('USER_MANAGE') ? `<a class="admin-subnav__link ${currentPath === '/admin/users' ? 'is-active' : ''}" href="#/admin/users">👥 Tài khoản</a>` : ''}
        </nav>
        ${content}
      </main>
    </div>
  `;
};
