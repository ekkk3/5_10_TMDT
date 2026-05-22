const links = [
  { label: 'Thuc don', href: '#/menu' },
  { label: 'Gio hang', href: '#/cart' },
  { label: 'Tra cuu don', href: '#/orders/search' },
  { label: 'Dang nhap', href: '#/login' },
  { label: 'Admin', href: '#/admin' }
];

export const Navbar = () => `
  <header class="navbar">
    <a class="brand" href="#/">FastFood</a>
    <nav class="nav-links" aria-label="Dieu huong chinh">
      ${links.map((link) => `<a class="nav-link" href="${link.href}">${link.label}</a>`).join('')}
    </nav>
  </header>
`;
