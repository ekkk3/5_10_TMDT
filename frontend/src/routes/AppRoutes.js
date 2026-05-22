import { CustomerLayout } from '../layouts/CustomerLayout.js';
import { AdminLayout } from '../layouts/AdminLayout.js';
import { AuthLayout } from '../layouts/AuthLayout.js';
import { HomePage } from '../features/home/HomePage.js';
import { MenuPage, mountMenuPage } from '../features/menu/MenuPage.js';
import { CartPage, mountCartPage } from '../features/cart/CartPage.js';
import { GuestCheckoutPage, mountGuestCheckoutPage } from '../features/guest-order/GuestCheckoutPage.js';
import { GuestOrderResultPage } from '../features/guest-order/GuestOrderResultPage.js';
import { GuestTrackingPage, mountGuestTrackingPage } from '../features/guest-tracking/GuestTrackingPage.js';


const PlaceholderPage = (title) => `
  <section class="placeholder-page">
    <h1>${title}</h1>
    <p>Trang dang duoc chuan bi trong cac buoc phat trien tiep theo.</p>
  </section>
`;


const routes = {
  '/': () => CustomerLayout(HomePage()),
  '/menu': {
    render: () => CustomerLayout(MenuPage()),
    afterRender: mountMenuPage
  },
  '/cart': {
    render: () => CustomerLayout(CartPage()),
    afterRender: mountCartPage
  },
  '/checkout': {
    render: () => CustomerLayout(GuestCheckoutPage()),
    afterRender: mountGuestCheckoutPage
  },
  '/guest-order/result': () => CustomerLayout(GuestOrderResultPage()),
  '/orders/search': {
    render: () => CustomerLayout(GuestTrackingPage()),
    afterRender: mountGuestTrackingPage
  },
  '/login': () => AuthLayout(PlaceholderPage('Dang nhap')),
  '/admin': () => AdminLayout(PlaceholderPage('Quan tri'))
};


const getPath = () => window.location.hash.replace('#', '') || '/';


export const AppRoutes = () => {
  const render = () => {
    const app = document.querySelector('#app');
    const route = routes[getPath()] || routes['/'];
    const page = typeof route === 'function' ? { render: route } : route;
    app.innerHTML = page.render();
    page.afterRender?.();
  };


  window.addEventListener('hashchange', render);
  render();
};
