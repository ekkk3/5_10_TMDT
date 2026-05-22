import { Navbar } from '../components/Navbar.js';

export const AdminLayout = (content) => `
  <div class="app-shell">
    ${Navbar()}
    <main class="page">
      <nav class="admin-subnav" aria-label="Dieu huong quan tri">
        <a class="admin-subnav__link" href="#/admin/orders">Don hang</a>
        <a class="admin-subnav__link" href="#/kitchen">KDS bep</a>
      </nav>
      ${content}
    </main>
  </div>
`;
