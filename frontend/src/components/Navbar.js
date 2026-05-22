import { authService } from '../services/authService.js';
import { adminAuthService } from '../services/adminAuthService.js';

const guestLinks = [
  { label: 'Thuc don', href: '#/menu' },
  { label: 'Gio hang', href: '#/cart' },
  { label: 'Tra cuu don', href: '#/orders/search' },
  { label: 'Dang ky', href: '#/register' },
  { label: 'Dang nhap', href: '#/login' }
];

const memberLinks = [
  { label: 'Thuc don', href: '#/menu' },
  { label: 'Gio hang', href: '#/cart' },
  { label: 'Tra cuu don', href: '#/orders/search' },
  { label: 'Tai khoan', href: '#/account' }
];

const adminLinks = [
  { label: 'Dashboard', href: '#/admin' },
  { label: 'Don hang', href: '#/admin/orders' },
  { label: 'KDS bep', href: '#/kitchen' }
];

const getPath = () => window.location.hash.replace('#', '') || window.location.pathname || '/';

const getSessionMode = () => {
  const path = getPath();
  const adminSession = adminAuthService.getCurrentSession();
  const customerSession = authService.getCurrentSession();
  const isAdminPath = path.startsWith('/admin') || path.startsWith('/kitchen');

  if (adminSession || isAdminPath) {
    return {
      label: 'Phien 3',
      title: 'Quan tri & Van hanh noi bo',
      className: 'navbar--admin',
      links: adminSession ? adminLinks : [{ label: 'Dang nhap quan tri', href: '#/admin/login' }]
    };
  }

  if (customerSession) {
    return {
      label: 'Phien 2',
      title: 'Khach thanh vien',
      className: 'navbar--member',
      links: memberLinks
    };
  }

  return {
    label: 'Phien 1',
    title: 'Khach vang lai',
    className: 'navbar--guest',
    links: guestLinks
  };
};

export const Navbar = () => {
  const mode = getSessionMode();

  return `
    <header class="navbar ${mode.className}">
      <a class="brand" href="#/">
        <span>FastFood</span>
        <small>${mode.label} - ${mode.title}</small>
      </a>
      <nav class="nav-links" aria-label="Dieu huong ${mode.title}">
        ${mode.links.map((link) => `<a class="nav-link" href="${link.href}">${link.label}</a>`).join('')}
        ${mode.className === 'navbar--admin' ? '<a class="nav-link nav-link--switch" href="#/">Cong khach hang</a>' : '<a class="nav-link nav-link--switch" href="#/admin/login">Cong quan tri</a>'}
      </nav>
    </header>
  `;
};
