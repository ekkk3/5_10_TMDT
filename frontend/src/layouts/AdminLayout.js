import { Navbar } from '../components/Navbar.js';
import { adminAuthService } from '../services/adminAuthService.js';

const renderAdminGate = (message) => `
  <section class="placeholder-page">
    <h1>Can dang nhap quan tri</h1>
    <p>${message}</p>
    <a class="button button-primary" href="#/admin/login">Dang nhap quan tri</a>
  </section>
`;

export const AdminLayout = (content, options = {}) => {
  const session = adminAuthService.getCurrentSession();

  if (!session) {
    return `
      <div class="app-shell">
        ${Navbar()}
        <main class="page">${renderAdminGate('Phien quan tri da het han hoac chua duoc tao.')}</main>
      </div>
    `;
  }

  if (options.requiredPermission && !session.permissions?.includes(options.requiredPermission)) {
    return `
      <div class="app-shell">
        ${Navbar()}
        <main class="page">${renderAdminGate('Tai khoan chua duoc phan quyen truy cap chuc nang nay.')}</main>
      </div>
    `;
  }

  return `
    <div class="app-shell">
      ${Navbar()}
      <main class="page">
        <nav class="admin-subnav" aria-label="Dieu huong quan tri">
          ${session.permissions?.includes('ORDER_MANAGE') ? '<a class="admin-subnav__link" href="#/admin/orders">Don hang</a>' : ''}
          ${session.permissions?.includes('KITCHEN_KDS') ? '<a class="admin-subnav__link" href="#/kitchen">KDS bep</a>' : ''}
        </nav>
        ${content}
      </main>
    </div>
  `;
};
