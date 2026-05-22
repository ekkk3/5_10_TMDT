import { authService } from '../services/authService.js';

const links = [
  { label: 'Thuc don', href: '#/menu' },
  { label: 'Gio hang', href: '#/cart' },
  { label: 'Tra cuu don', href: '#/orders/search' }
];

const adminLinks = [
  { label: 'Admin', href: '#/admin' },
  { label: 'KDS', href: '#/kitchen' }
];

export const Navbar = () => `
  <header class="navbar">
    <a class="brand" href="#/">FastFood</a>
    <nav class="nav-links" aria-label="Dieu huong chinh">
      ${[
        ...links,
        ...(authService.getCurrentSession()
          ? [{ label: 'Tai khoan', href: '#/account' }]
          : [
              { label: 'Dang ky', href: '#/register' },
              { label: 'Dang nhap', href: '#/login' }
            ]),
        ...adminLinks
      ]
        .map((link) => `<a class="nav-link" href="${link.href}">${link.label}</a>`)
        .join('')}
    </nav>
  </header>
`;
