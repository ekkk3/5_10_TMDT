import { authService } from '../../services/authService.js';
import { accountService } from '../../services/accountService.js';

const moneyFormatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

const escapeHtml = (value = '') =>
  String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

const formatMoney = (value) => moneyFormatter.format(Number(value || 0));

const renderGuestState = (message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.') => `
  <div class="account-panel" style="text-align:center;max-width:440px;margin:40px auto;padding:40px;">
    <div style="font-size:48px;margin-bottom:16px;">🔒</div>
    <h1>Cần đăng nhập</h1>
    <p>${escapeHtml(message)}</p>
    <a class="button button-primary" href="#/login" style="margin-top:8px;">Đăng nhập</a>
  </div>
`;

const renderAddresses = (addresses = []) => {
  if (!addresses.length) return '<div class="account-empty">Chưa có địa chỉ giao hàng.</div>';
  return addresses.map((address) => `
    <article class="account-row" data-address-id="${address.address_id}">
      <div><strong>${escapeHtml(address.receiver_name)}</strong><span>${escapeHtml(address.receiver_phone)}</span></div>
      <p>${escapeHtml([address.address_detail, address.ward, address.district, address.city].filter(Boolean).join(', '))}</p>
      <div class="account-actions">
        ${address.is_default ? '<span class="account-badge">Mặc định</span>' : `<button class="account-text-button" type="button" data-default-address="${address.address_id}">Đặt mặc định</button>`}
        <button class="account-text-button" type="button" data-delete-address="${address.address_id}">Xóa</button>
      </div>
    </article>
  `).join('');
};

const renderVouchers = ({ wallet = [], member_available: memberAvailable = [] } = {}) => {
  const vouchers = [...wallet, ...memberAvailable];
  if (!vouchers.length) return '<div class="account-empty">Chưa có voucher khả dụng.</div>';
  return vouchers.map((v) => `
    <article class="account-mini-card">
      <strong>${escapeHtml(v.voucher_code)}</strong>
      <span>${escapeHtml(v.voucher_name)}</span>
      <small>${v.discount_type === 'PERCENT' ? `${Number(v.discount_value)}%` : formatMoney(v.discount_value)} - ${escapeHtml(v.target_type)}</small>
    </article>
  `).join('');
};

const renderPoints = (points = {}) => `
  <div class="account-points"><strong>${Number(points.total_points || 0)}</strong><span>điểm hiện có</span></div>
  <div class="account-mini-grid">
    ${(points.programs || []).map((p) => `
      <article class="account-mini-card"><strong>${escapeHtml(p.program_name)}</strong><span>${Number(p.required_points || 0)} điểm</span><small>${escapeHtml(p.reward_description || '')}</small></article>
    `).join('') || '<div class="account-empty">Chưa có chương trình đổi thưởng đang mở.</div>'}
  </div>
`;

const renderAccount = ({ profile, addresses, vouchers, points, message = '', error = '' }) => `
  <div class="account-layout">
    <aside class="account-sidebar" aria-label="Tài khoản">
      <div class="account-avatar">${(profile.full_name || '?').charAt(0).toUpperCase()}</div>
      <strong>${escapeHtml(profile.full_name)}</strong>
      <span>${escapeHtml(profile.email || profile.phone || 'Thành viên')}</span>
      <nav>
        <a class="is-active" href="#/account">👤 Hồ sơ</a>
        <a href="#/checkout">🛒 Đặt món thành viên</a>
        <a href="#/support">💬 Hỗ trợ</a>
      </nav>
      <button class="button button-danger account-logout" type="button" data-logout>⏻ Đăng xuất</button>
    </aside>

    <div class="account-main">
      ${message ? `<div class="account-alert success">${escapeHtml(message)}</div>` : ''}
      ${error ? `<div class="account-alert error">${escapeHtml(error)}</div>` : ''}

      <section class="account-panel">
        <div class="account-heading"><div><h1>Hồ sơ cá nhân</h1><p>Cập nhật thông tin thành viên dùng cho đặt hàng, thông báo và tích điểm.</p></div></div>
        <form class="account-form" data-profile-form>
          <label><span>Họ tên</span><input name="full_name" value="${escapeHtml(profile.full_name || '')}" /></label>
          <label><span>Email</span><input name="email" type="email" value="${escapeHtml(profile.email || '')}" /></label>
          <label><span>Số điện thoại</span><input name="phone" type="tel" value="${escapeHtml(profile.phone || '')}" /></label>
          <label><span>Trạng thái</span><input value="${escapeHtml(profile.status || '')}" readonly /></label>
          <button class="button button-primary" type="submit">Lưu hồ sơ</button>
        </form>
      </section>

      <section class="account-panel">
        <div class="account-heading"><div><h2>Sổ địa chỉ</h2><p>Lưu nhiều địa chỉ nhận hàng và chọn địa chỉ mặc định khi thanh toán.</p></div></div>
        <form class="account-form" data-address-form>
          <label><span>Người nhận</span><input name="receiver_name" value="${escapeHtml(profile.full_name || '')}" /></label>
          <label><span>SĐT</span><input name="receiver_phone" value="${escapeHtml(profile.phone || '')}" /></label>
          <label class="account-form-wide"><span>Địa chỉ</span><input name="address_detail" placeholder="12 Nguyễn Huệ" /></label>
          <label><span>Phường/Xã</span><input name="ward" /></label>
          <label><span>Quận/Huyện</span><input name="district" placeholder="Quận 1" /></label>
          <label><span>Tỉnh/TP</span><input name="city" placeholder="TP HCM" /></label>
          <label class="account-check"><input name="is_default" type="checkbox" /> Đặt làm mặc định</label>
          <button class="button button-secondary" type="submit">Thêm địa chỉ</button>
        </form>
        <div class="account-list">${renderAddresses(addresses)}</div>
      </section>

      <section class="account-grid">
        <div class="account-panel"><h2>🎫 Ví voucher</h2><div class="account-mini-grid">${renderVouchers(vouchers)}</div></div>
        <div class="account-panel"><h2>⭐ Điểm thưởng</h2>${renderPoints(points)}</div>
      </section>

    </div>
  </div>
`;

const pageStyles = `
  <style>
    .account-page { padding: 4px 0 28px; animation: slideUp 400ms var(--ease); }
    .account-layout { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 20px; align-items: start; }
    .account-sidebar, .account-panel, .account-alert { border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--bg-glass); backdrop-filter: blur(10px); }
    .account-sidebar { position: sticky; top: 86px; display: grid; gap: 14px; padding: 24px; text-align: center; }
    .account-avatar { width: 64px; height: 64px; margin: 0 auto; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--accent-subtle); border: 2px solid var(--accent); font-size: 24px; font-weight: 800; color: var(--accent-light); }
    .account-sidebar strong { font-size: 18px; line-height: 1.25; color: var(--text); }
    .account-sidebar span { color: var(--text-muted); font-size: 14px; }
    .account-sidebar nav { display: grid; gap: 6px; padding: 14px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); text-align: left; }
    .account-sidebar a { min-height: 40px; display: flex; align-items: center; border-radius: var(--radius-sm); padding: 8px 12px; color: var(--text-muted); font-weight: 700; font-size: 14px; transition: all var(--transition); }
    .account-sidebar a.is-active, .account-sidebar a:hover { background: var(--accent); color: #fff; }
    .account-logout { width: 100%; }
    .account-main { display: grid; gap: 20px; }
    .account-panel { padding: 28px; }
    .account-heading { display: flex; justify-content: space-between; gap: 14px; align-items: flex-start; margin-bottom: 20px; }
    .account-panel h1, .account-panel h2 { margin: 0 0 8px; line-height: 1.15; color: var(--text); }
    .account-panel h1 { font-size: 28px; }
    .account-panel h2 { font-size: 22px; }
    .account-panel p { margin: 0; line-height: 1.5; color: var(--text-muted); font-size: 14px; }
    .account-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .account-form label { display: grid; gap: 8px; color: var(--text-muted); font-weight: 700; font-size: 14px; }
    .account-form input { width: 100%; min-height: 46px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 14px; color: var(--text); font: inherit; background: var(--bg-elevated); transition: border-color var(--transition), box-shadow var(--transition); }
    .account-form input:focus { border-color: var(--accent); outline: 0; box-shadow: var(--focus); }
    .account-form input::placeholder { color: var(--text-subtle); }
    .account-form-wide, .account-form .button { grid-column: 1 / -1; }
    .account-check { display: flex !important; align-items: center; gap: 8px; }
    .account-check input { width: 18px; min-height: 18px; accent-color: var(--accent); }
    .account-list { display: grid; gap: 10px; margin-top: 14px; }
    .account-row { display: grid; grid-template-columns: 1fr 1.5fr auto; gap: 12px; align-items: center; padding: 14px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg-elevated); }
    .account-row strong { color: var(--text); }
    .account-row p { margin: 0; line-height: 1.4; color: var(--text-muted); font-size: 14px; }
    .account-row span { color: var(--text-subtle); font-size: 13px; }
    .account-actions { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 8px; }
    .account-text-button { border: 0; background: transparent; color: var(--accent-light); cursor: pointer; font: inherit; font-weight: 700; font-size: 14px; transition: color var(--transition); }
    .account-text-button:hover { color: var(--accent); }
    .account-badge { display: inline-flex; align-items: center; min-height: 26px; padding: 4px 10px; border-radius: var(--radius-full); background: var(--accent); color: #fff; font-size: 12px; font-weight: 800; }
    .account-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .account-mini-grid { display: grid; gap: 10px; }
    .account-mini-card { display: grid; gap: 4px; padding: 14px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg-elevated); }
    .account-mini-card strong { color: var(--text); }
    .account-mini-card span, .account-mini-card small { color: var(--text-muted); font-size: 13px; }
    .account-points { display: flex; align-items: baseline; gap: 8px; margin-bottom: 14px; }
    .account-points strong { font-size: 36px; color: var(--accent-light); }
    .account-points span { color: var(--text-muted); }
    .account-empty { padding: 16px; border: 1px dashed var(--border-hover); border-radius: var(--radius-sm); color: var(--text-subtle); font-size: 14px; }
    .account-alert { padding: 14px 16px; font-weight: 700; font-size: 14px; }
    .account-alert.success { border-color: var(--success-border); background: var(--success-bg); color: var(--success); }
    .account-alert.error { border-color: var(--error-border); background: var(--error-bg); color: var(--error); }
    @media (max-width: 900px) {
      .account-layout, .account-grid, .account-form, .account-row { grid-template-columns: 1fr; }
      .account-sidebar { position: static; }
      .account-actions { justify-content: flex-start; }
    }
  </style>
`;

export const AccountPage = () => `
  ${pageStyles}
  <section class="account-page" data-account-page>
    ${renderGuestState('Đang kiểm tra phiên đăng nhập...')}
  </section>
`;

export const mountAccountPage = async () => {
  const root = document.querySelector('[data-account-page]');
  if (!root) return;

  let state = { profile: null, addresses: [], vouchers: {}, points: {}, message: '', error: '' };

  const render = () => {
    root.innerHTML = state.profile ? renderAccount(state) : renderGuestState(state.error || 'Đang kiểm tra phiên đăng nhập...');
  };

  const load = async () => {
    try {
      const [profile, addresses, vouchers, points] = await Promise.all([
        accountService.getProfile(), accountService.getAddresses(), accountService.getVouchers(), accountService.getPoints()
      ]);
      state = { ...state, profile, addresses, vouchers, points, error: '' };
      render();
    } catch (error) {
      state.error = error?.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      state.profile = null;
      render();
    }
  };

  root.addEventListener('submit', async (event) => {
    const profileForm = event.target.closest('[data-profile-form]');
    const addressForm = event.target.closest('[data-address-form]');
    if (!profileForm && !addressForm) return;
    event.preventDefault();
    const formData = new FormData(event.target);
    state.message = '';
    state.error = '';
    try {
      if (profileForm) {
        await accountService.updateProfile({ full_name: String(formData.get('full_name') || '').trim(), email: String(formData.get('email') || '').trim(), phone: String(formData.get('phone') || '').trim() });
        state.message = 'Đã cập nhật hồ sơ.';
      } else {
        await accountService.createAddress({ receiver_name: String(formData.get('receiver_name') || '').trim(), receiver_phone: String(formData.get('receiver_phone') || '').trim(), address_detail: String(formData.get('address_detail') || '').trim(), ward: String(formData.get('ward') || '').trim(), district: String(formData.get('district') || '').trim(), city: String(formData.get('city') || '').trim(), is_default: Boolean(formData.get('is_default')) });
        state.message = 'Đã thêm địa chỉ.';
      }
      await load();
    } catch (error) {
      state.error = error?.message || 'Không thể lưu thông tin.';
      render();
    }
  });

  root.addEventListener('click', async (event) => {
    if (event.target.closest('[data-logout]')) {
      await authService.logout();
      window.location.hash = '#/login';
      return;
    }
    const deleteAddress = event.target.closest('[data-delete-address]');
    const defaultAddress = event.target.closest('[data-default-address]');
    try {
      if (deleteAddress) { await accountService.deleteAddress(deleteAddress.dataset.deleteAddress); state.message = 'Đã xóa địa chỉ.'; await load(); return; }
      if (defaultAddress) { await accountService.setDefaultAddress(defaultAddress.dataset.defaultAddress); state.message = 'Đã đặt địa chỉ mặc định.'; await load(); return; }
    } catch (error) {
      state.error = error?.message || 'Không thể thực hiện thao tác.';
      render();
    }
  });

  await load();
};
