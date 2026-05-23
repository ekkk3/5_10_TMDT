import { authService } from '../../services/authService.js';
import { adminAuthService } from '../../services/adminAuthService.js';

const renderCurrentSession = () => {
  const adminSession = adminAuthService.getCurrentSession();
  const customerSession = authService.getCurrentSession();

  if (adminSession) {
    return `
      <div class="session-current session-current--admin">
        <span>Dang o Phien 3</span>
        <strong>Quan tri & Van hanh noi bo</strong>
        <a class="button button-primary" href="#/admin">Vao dashboard</a>
      </div>
    `;
  }

  if (customerSession) {
    return `
      <div class="session-current session-current--member">
        <span>Dang o Phien 2</span>
        <strong>Khach thanh vien</strong>
        <a class="button button-primary" href="#/account">Vao tai khoan</a>
      </div>
    `;
  }

  return `
    <div class="session-current">
      <span>Dang o Phien 1</span>
      <strong>Khach vang lai</strong>
      <a class="button button-primary" href="#/menu">Bat dau dat mon</a>
    </div>
  `;
};

export const HomePage = () => `
  <section class="session-home">
    <div class="session-hero">
      <div>
        <span class="session-eyebrow">FastFood System</span>
        <h1>3 phien giao dien rieng cho tung vai tro</h1>
        <p>Khach vang lai dat mon nhanh, co the dang ky de nang cap tai khoan, dang nhap de vao phien thanh vien, va nhan su noi bo dung cong quan tri rieng.</p>
      </div>
      ${renderCurrentSession()}
    </div>

    <div class="session-grid">
      <article class="session-card session-card--active">
        <span>Phien 1</span>
        <h2>Khach vang lai</h2>
        <p>Xem thuc don, tuy chinh mon, quan ly gio, ap voucher cong khai, dat mon nhanh, tra cuu don va dang ky tai khoan khi can nang cap.</p>
        <div class="session-card__actions">
          <a class="button button-primary" href="#/menu">Xem thuc don</a>
          <a class="button button-secondary" href="#/register">Dang ky</a>
        </div>
      </article>

      <article class="session-card">
        <span>Phien 2</span>
        <h2>Khach thanh vien</h2>
        <p>Sau khi dang nhap thanh cong, nguoi dung vao khu tai khoan thanh vien de xem ho so va so dia chi.</p>
        <div class="session-card__actions">
          <a class="button button-primary" href="#/login">Dang nhap</a>
          <a class="button button-secondary" href="#/account">Tai khoan</a>
        </div>
      </article>

      <article class="session-card session-card--admin">
        <span>Phien 3</span>
        <h2>Quan tri & Van hanh noi bo</h2>
        <p>Cong rieng cho admin, quan ly don hang tong hop va man hinh KDS bep theo phan quyen noi bo.</p>
        <div class="session-card__actions">
          <a class="button button-primary" href="#/admin/login">Dang nhap quan tri</a>
          <a class="button button-secondary" href="#/kitchen">KDS bep</a>
        </div>
      </article>
    </div>
  </section>
`;
