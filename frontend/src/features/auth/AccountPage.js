import { authService } from '../../services/authService.js';

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const renderGuestState = (message = 'Phien dang nhap da het han. Vui long dang nhap lai.') => `
  <div class="account-panel">
    <h1>Can dang nhap</h1>
    <p>${escapeHtml(message)}</p>
    <a class="button button-primary" href="#/login">Dang nhap</a>
  </div>
`;

const renderAccount = (user) => `
  <div class="account-layout">
    <aside class="account-sidebar" aria-label="Tai khoan">
      <strong>${escapeHtml(user.full_name)}</strong>
      <span>${escapeHtml(user.email || user.phone || 'Thanh vien')}</span>
      <nav>
        <a class="is-active" href="#/account">Ho so</a>
        <a href="#/account">So dia chi</a>
        <a href="#/orders/search">Theo doi don</a>
      </nav>
      <button class="button button-secondary" type="button" data-logout>Dang xuat</button>
    </aside>

    <div class="account-main">
      <section class="account-panel">
        <div class="account-heading">
          <div>
            <h1>Ho so ca nhan</h1>
            <p>Thong tin tai khoan thanh vien hien tai. Cac truong sua nhanh duoc bo tri theo mockup UC-09.</p>
          </div>
          <button class="button button-primary" type="button">Luu thay doi</button>
        </div>
        <form class="account-form">
          <label>
            <span>Ho ten</span>
            <input type="text" value="${escapeHtml(user.full_name)}" />
          </label>
          <label>
            <span>Email</span>
            <input type="email" value="${escapeHtml(user.email || '')}" placeholder="Chua cap nhat" />
          </label>
          <label>
            <span>So dien thoai</span>
            <input type="tel" value="${escapeHtml(user.phone || '')}" placeholder="Chua cap nhat" />
          </label>
          <label>
            <span>Trang thai</span>
            <input type="text" value="${escapeHtml(user.status)}" readonly />
          </label>
          <label>
            <span>Diem thanh vien</span>
            <input type="text" value="${Number(user.total_points || 0)}" readonly />
          </label>
        </form>
      </section>

      <section class="account-panel">
        <div class="account-heading">
          <div>
            <h2>So dia chi</h2>
            <p>Bang dia chi giao hang theo wireframe. Phan nay chua ket noi API luu/sua dia chi.</p>
          </div>
          <button class="button button-secondary" type="button">Them dia chi</button>
        </div>
        <div class="account-address-table">
          <div class="account-address-row account-address-row--head">
            <span>Nguoi nhan</span>
            <span>So dien thoai</span>
            <span>Dia chi</span>
            <span>Mac dinh</span>
            <span>Thao tac</span>
          </div>
          <div class="account-address-row">
            <strong>${escapeHtml(user.full_name)}</strong>
            <span>${escapeHtml(user.phone || 'Chua cap nhat')}</span>
            <span>Chua co dia chi mac dinh</span>
            <span>-</span>
            <span><button class="account-text-button" type="button">Sua</button></span>
          </div>
        </div>
      </section>
    </div>
  </div>
`;

const pageStyles = `
  <style>
    .account-page { padding: 4px 0 28px; }
    .account-layout { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 18px; align-items: start; }
    .account-sidebar, .account-panel { border: 1px solid var(--line); border-radius: 8px; background: #fff; box-shadow: 0 12px 28px rgba(116, 36, 0, 0.08); }
    .account-sidebar { position: sticky; top: 86px; display: grid; gap: 12px; padding: 18px; }
    .account-sidebar strong { font-size: 20px; line-height: 1.25; }
    .account-sidebar span { color: var(--muted); overflow-wrap: anywhere; }
    .account-sidebar nav { display: grid; gap: 8px; padding: 10px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
    .account-sidebar a { min-height: 38px; display: flex; align-items: center; border-radius: 6px; padding: 8px 10px; color: var(--ink); text-decoration: none; font-weight: 800; }
    .account-sidebar a.is-active, .account-sidebar a:hover { background: #fff1cc; color: var(--red); }
    .account-main { display: grid; gap: 18px; }
    .account-panel { padding: 24px; }
    .account-heading { display: flex; justify-content: space-between; gap: 14px; align-items: flex-start; margin-bottom: 18px; }
    .account-panel h1, .account-panel h2 { margin: 0 0 8px; line-height: 1.15; }
    .account-panel h1 { font-size: 34px; }
    .account-panel h2 { font-size: 26px; }
    .account-panel p { margin: 0; color: var(--muted); line-height: 1.5; }
    .account-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .account-form label { display: grid; gap: 7px; color: var(--muted); font-weight: 800; }
    .account-form input { width: 100%; min-height: 44px; border: 1px solid var(--line); border-radius: 6px; padding: 10px 12px; color: var(--ink); font: inherit; background: #fff; }
    .account-address-table { overflow-x: auto; border: 1px solid var(--line); border-radius: 8px; }
    .account-address-row { min-width: 820px; display: grid; grid-template-columns: 1.1fr 1fr 2fr 0.7fr 0.8fr; gap: 12px; align-items: center; padding: 12px 14px; border-top: 1px solid #ffe0aa; }
    .account-address-row:first-child { border-top: 0; }
    .account-address-row--head { color: var(--muted); background: #fffaf3; font-size: 13px; font-weight: 900; }
    .account-text-button { border: 0; background: transparent; color: var(--red); cursor: pointer; font: inherit; font-weight: 900; }
    @media (max-width: 820px) {
      .account-layout, .account-form { grid-template-columns: 1fr; }
      .account-sidebar { position: static; }
      .account-heading { display: grid; }
    }
    @media (max-width: 640px) {
      .account-panel, .account-sidebar { padding: 18px; }
      .account-panel h1 { font-size: 28px; }
    }
  </style>
`;

export const AccountPage = () => `
  ${pageStyles}
  <section class="account-page" data-account-page>
    ${renderGuestState('Dang kiem tra phien dang nhap...')}
  </section>
`;

export const mountAccountPage = async () => {
  const root = document.querySelector('[data-account-page]');
  if (!root) return;

  const render = (content) => {
    root.innerHTML = content;
  };

  root.addEventListener('click', async (event) => {
    if (!event.target.closest('[data-logout]')) return;

    await authService.logout();
    render(renderGuestState('Ban da dang xuat. Trang thai hien tai la khach vang lai.'));
    window.location.hash = '#/login';
  });

  try {
    const user = await authService.getCurrentUser();
    render(renderAccount(user));
  } catch (error) {
    render(renderGuestState(error?.message || 'Phien dang nhap da het han. Vui long dang nhap lai.'));
  }
};
