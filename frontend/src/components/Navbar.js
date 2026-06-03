import { authService } from '../services/authService.js';
import { adminAuthService } from '../services/adminAuthService.js';

const guestLinks = [
  { label: 'Thực đơn', href: '#/menu', icon: '🧾' },
  { label: 'Giỏ hàng', href: '#/cart', icon: '🛒' },
  { label: 'Tra cứu đơn', href: '#/orders/search', icon: '🔍︎' }
];

const memberLinks = [
  { label: 'Thực đơn', href: '#/menu', icon: '🧾' },
  { label: 'Giỏ hàng', href: '#/cart', icon: '🛒' },
  { label: 'Tra cứu đơn', href: '#/orders/search', icon: '🔍︎' },
  { label: 'Tài khoản', href: '#/account', icon: '👤' }
];

const adminLinks = [];

const kitchenLinks = [
  { label: 'KDS bếp', href: '#/kitchen', icon: '👩🏻‍🍳' }
];

const getPath = () => window.location.hash.replace('#', '') || window.location.pathname || '/';

const getUserInitial = (name) => {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
};

const getSessionMode = () => {
  const path = getPath();
  const adminSession = adminAuthService.getCurrentSession();
  const customerSession = authService.getCurrentSession();
  const isAdminPath = path.startsWith('/admin') || path.startsWith('/kitchen');

  if (adminSession || isAdminPath) {
    const userName = adminSession?.user?.full_name || adminSession?.full_name || '';
    const roleName = adminSession?.user?.role_name || adminSession?.role_name || 'Quản trị';
    const permissions = adminSession?.permissions || adminSession?.user?.permissions || [];
    const isKitchenOnly = permissions.length > 0 && permissions.every(p => p === 'KITCHEN_KDS' || p === 'ADMIN_ACCESS');
    return {
      mode: 'admin',
      className: 'navbar--admin',
      links: adminSession ? (isKitchenOnly ? kitchenLinks : adminLinks) : [{ label: 'Đăng nhập quản trị', href: '#/admin/login', icon: '🔐' }],
      userName,
      roleName,
      isLoggedIn: Boolean(adminSession)
    };
  }

  if (customerSession) {
    const userName = customerSession?.user?.full_name || customerSession?.full_name || 'Thành viên';
    return {
      mode: 'member',
      className: 'navbar--member',
      links: memberLinks,
      userName,
      roleName: 'Thành viên',
      isLoggedIn: true
    };
  }

  return {
    mode: 'guest',
    className: 'navbar--guest',
    links: guestLinks,
    userName: '',
    roleName: '',
    isLoggedIn: false
  };
};

export const Navbar = () => {
  const session = getSessionMode();
  const path = getPath();

  const linksHtml = session.links
    .map((link) => {
      const linkPath = link.href.replace('#', '') || '/';
      const isActive = path === linkPath || (linkPath !== '/' && path.startsWith(linkPath));
      return `<a class="nav-link ${isActive ? 'is-active' : ''}" href="${link.href}">${link.label}</a>`;
    })
    .join('');

  const renderRightSection = () => {
    if (session.mode === 'guest') {
      return `
        <div class="nav-right">
          <a class="nav-btn" href="#/login">Đăng nhập</a>
          <a class="nav-btn nav-btn--accent" href="#/register">Đăng ký</a>
        </div>
      `;
    }

    if (session.mode === 'member') {
      return `
        <div class="nav-right">
          <div class="nav-user">
            <span class="nav-avatar">${getUserInitial(session.userName)}</span>
            ${session.userName}
          </div>
          <a class="nav-btn nav-btn--danger" href="#/login" onclick="localStorage.removeItem('fast-food-auth-session');window.dispatchEvent(new CustomEvent('auth:changed'));">
            ⏻ Đăng xuất
          </a>
        </div>
      `;
    }

    // Admin
    if (session.isLoggedIn) {
      return `
        <div class="nav-right">
          <span class="nav-badge">QUẢN TRỊ</span>
          <div class="nav-user">
            <span class="nav-avatar">${getUserInitial(session.userName)}</span>
            ${session.userName || session.roleName}
          </div>
          <a class="nav-btn nav-btn--danger" href="#/admin/login" onclick="localStorage.removeItem('fast-food-admin-session');window.dispatchEvent(new CustomEvent('admin-auth:changed'));">
            ⏻ Đăng xuất
          </a>
        </div>
      `;
    }

    return `
      <div class="nav-right">
        <a class="nav-btn nav-btn--accent" href="#/admin/login">🔐 Đăng nhập quản trị</a>
      </div>
    `;
  };

  return `
    <header class="navbar ${session.className}">
      <a class="brand" href="${session.mode === 'admin' ? '#/admin' : '#/'}">
        <span class="brand-icon">🍔</span>
        <span class="brand-text">
          FastFood
          <small>${session.mode === 'admin' ? 'Quản trị nội bộ' : session.mode === 'member' ? 'Thành viên' : 'Đặt món nhanh'}</small>
        </span>
      </a>

      <button class="nav-toggle" onclick="this.closest('.navbar').classList.toggle('is-open')" aria-label="Toggle menu">
        <span></span><span></span><span></span>
      </button>

      ${linksHtml ? `<nav class="nav-center" aria-label="Điều hướng chính">${linksHtml}</nav>` : ''}

      ${renderRightSection()}
    </header>
  `;
};
