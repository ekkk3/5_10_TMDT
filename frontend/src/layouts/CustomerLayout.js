import { Navbar } from '../components/Navbar.js';

const Footer = () => `
  <footer class="site-footer">
    <div class="footer-grid">
      <div class="footer-brand">
        <strong>🍔 FastFood</strong>
        <p>Đặt món nhanh, giao hàng tận nơi. Trải nghiệm ẩm thực hiện đại với giao diện tối giản và dịch vụ chuyên nghiệp.</p>
      </div>
      <div class="footer-col">
        <h4>Khám phá</h4>
        <a href="#/menu">Thực đơn</a>
        <a href="#/cart">Giỏ hàng</a>
        <a href="#/orders/search">Tra cứu đơn</a>
      </div>
      <div class="footer-col">
        <h4>Tài khoản</h4>
        <a href="#/login">Đăng nhập</a>
        <a href="#/register">Đăng ký</a>
        <a href="#/account">Quản lý tài khoản</a>
      </div>
      <div class="footer-col">
        <h4>Liên hệ</h4>
        <a href="tel:0900000001">0900 000 001</a>
        <a href="mailto:hello@fastfood.vn">hello@fastfood.vn</a>
        <a href="#">08:00 – 22:00 hằng ngày</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2026 FastFood. All rights reserved.</span>
      <span>Thiết kế bởi Nhóm 5_10</span>
    </div>
  </footer>
`;

export const CustomerLayout = (content) => `
  <div class="app-shell">
    ${Navbar()}
    <main class="page">${content}</main>
    ${Footer()}
  </div>
`;
