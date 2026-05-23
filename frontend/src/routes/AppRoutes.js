import { CustomerLayout } from '../layouts/CustomerLayout.js';
import { AdminLayout } from '../layouts/AdminLayout.js';
import { AuthLayout } from '../layouts/AuthLayout.js';
import { HomePage } from '../features/home/HomePage.js';
import { MenuPage, mountMenuPage } from '../features/menu/MenuPage.js';
import { CartPage, mountCartPage } from '../features/cart/CartPage.js';
import { GuestCheckoutPage, mountGuestCheckoutPage } from '../features/guest-order/GuestCheckoutPage.js';
import { GuestOrderResultPage } from '../features/guest-order/GuestOrderResultPage.js';
import { GuestTrackingPage, mountGuestTrackingPage } from '../features/guest-tracking/GuestTrackingPage.js';
import { AdminOrderListPage, mountAdminOrderListPage } from '../features/admin-orders/AdminOrderListPage.js';
import { AdminUserListPage, mountAdminUserListPage } from '../features/admin-users/AdminUserListPage.js';
import { KitchenKDSPage, mountKitchenKDSPage } from '../features/kitchen-kds/KitchenKDSPage.js';
import { RegisterPage, mountRegisterPage } from '../features/auth/RegisterPage.js';
import { LoginPage, mountLoginPage } from '../features/auth/LoginPage.js';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage.js';
import { AccountPage, mountAccountPage } from '../features/auth/AccountPage.js';
import { AdminLoginPage, mountAdminLoginPage } from '../features/admin-auth/AdminLoginPage.js';
import { AdminDashboardPage, mountAdminDashboardPage } from '../features/admin-auth/AdminDashboardPage.js';


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
  '/login': {
    render: () => AuthLayout(LoginPage()),
    afterRender: mountLoginPage
  },
  '/register': {
    render: () => AuthLayout(RegisterPage()),
    afterRender: mountRegisterPage
  },
  '/account': {
    render: () => CustomerLayout(AccountPage()),
    afterRender: mountAccountPage
  },
  '/forgot-password': () => AuthLayout(ForgotPasswordPage()),
  '/admin/login': {
    render: () => AuthLayout(AdminLoginPage()),
    afterRender: mountAdminLoginPage
  },
  '/admin': {
    render: () => AdminLayout(AdminDashboardPage()),
    afterRender: mountAdminDashboardPage
  },
  '/admin/orders': {
    render: () => AdminLayout(AdminOrderListPage(), { requiredPermission: 'ORDER_MANAGE' }),
    afterRender: mountAdminOrderListPage
  },
  '/admin/users': {
    render: () => AdminLayout(AdminUserListPage(), { requiredPermission: 'USER_MANAGE' }),
    afterRender: mountAdminUserListPage
  },
  '/kitchen': {
    render: () => AdminLayout(KitchenKDSPage(), { requiredPermission: 'KITCHEN_KDS' }),
    afterRender: mountKitchenKDSPage
  }
};


const getPath = () => {
  const hashPath = window.location.hash.replace('#', '');

  if (hashPath) {
    return hashPath;
  }

  return window.location.pathname === '/' ? '/' : window.location.pathname;
};


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
