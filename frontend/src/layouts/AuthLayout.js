import { Navbar } from '../components/Navbar.js';

export const AuthLayout = (content) => `
  <div class="app-shell" style="background:linear-gradient(135deg, #f8f9fb 0%, #fff5f5 50%, #f8f9fb 100%);min-height:100vh;">
    ${Navbar()}
    <main class="page" style="display:flex;align-items:flex-start;justify-content:center;padding-top:40px;padding-bottom:60px;">
      ${content}
    </main>
  </div>
`;
