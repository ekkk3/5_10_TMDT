import { Navbar } from '../components/Navbar.js';

export const AuthLayout = (content) => `
  <div class="app-shell">
    ${Navbar()}
    <main class="page">${content}</main>
  </div>
`;
