import { Navbar } from '../components/Navbar.js';

export const AdminLayout = (content) => `
  <div class="app-shell">
    ${Navbar()}
    <main class="page">${content}</main>
  </div>
`;
