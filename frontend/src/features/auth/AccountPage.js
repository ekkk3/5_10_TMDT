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
  <div class="account-panel">
    <div class="account-heading">
      <h1>Tai khoan cua toi</h1>
      <button class="button button-secondary" type="button" data-logout>Dang xuat</button>
    </div>
    <dl class="account-details">
      <div><dt>Ho ten</dt><dd>${escapeHtml(user.full_name)}</dd></div>
      <div><dt>Email</dt><dd>${escapeHtml(user.email || 'Chua cap nhat')}</dd></div>
      <div><dt>So dien thoai</dt><dd>${escapeHtml(user.phone || 'Chua cap nhat')}</dd></div>
      <div><dt>Trang thai</dt><dd>${escapeHtml(user.status)}</dd></div>
      <div><dt>Diem thanh vien</dt><dd>${Number(user.total_points || 0)}</dd></div>
    </dl>
  </div>
`;

const pageStyles = `
  <style>
    .account-page { display: flex; justify-content: center; padding: 4px 0 28px; }
    .account-panel { width: min(720px, 100%); border: 1px solid var(--line); border-radius: 8px; background: #fff; box-shadow: 0 12px 28px rgba(116, 36, 0, 0.08); padding: 24px; }
    .account-heading { display: flex; justify-content: space-between; gap: 14px; align-items: center; margin-bottom: 18px; }
    .account-panel h1 { margin: 0; font-size: 34px; line-height: 1.15; }
    .account-panel p { margin: 8px 0 18px; color: var(--muted); line-height: 1.5; }
    .account-details { display: grid; gap: 10px; margin: 0; }
    .account-details div { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 14px; padding: 12px; border: 1px solid var(--line); border-radius: 8px; }
    .account-details dt { color: var(--muted); font-weight: 800; }
    .account-details dd { margin: 0; font-weight: 800; overflow-wrap: anywhere; }
    @media (max-width: 640px) {
      .account-panel { padding: 18px; }
      .account-heading { display: grid; }
      .account-panel h1 { font-size: 28px; }
      .account-details div { grid-template-columns: 1fr; gap: 4px; }
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
