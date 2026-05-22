import { CustomerLayout } from '../layouts/CustomerLayout.js';
import { AdminLayout } from '../layouts/AdminLayout.js';
import { AuthLayout } from '../layouts/AuthLayout.js';
import { HomePage } from '../features/home/HomePage.js';

const PlaceholderPage = (title) => `
  <section class="placeholder-page">
    <h1>${title}</h1>
    <p>Trang dang duoc chuan bi trong cac buoc phat trien tiep theo.</p>
  </section>
`;

const routes = {
  '/': () => CustomerLayout(HomePage()),
  '/menu': () => CustomerLayout(PlaceholderPage('Thuc don')),
  '/cart': () => CustomerLayout(PlaceholderPage('Gio hang')),
  '/orders/search': () => CustomerLayout(PlaceholderPage('Tra cuu don')),
  '/login': () => AuthLayout(PlaceholderPage('Dang nhap')),
  '/admin': () => AdminLayout(PlaceholderPage('Quan tri'))
};

const getPath = () => window.location.hash.replace('#', '') || '/';

export const AppRoutes = () => {
  const render = () => {
    const app = document.querySelector('#app');
    const route = routes[getPath()] || routes['/'];
    app.innerHTML = route();
  };

  window.addEventListener('hashchange', render);
  render();
};
