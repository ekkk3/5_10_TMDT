import { adminAuthService } from '../../services/adminAuthService.js';

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const validateIdentifier = (identifier) => {
  const value = String(identifier || '').trim();

  if (!value) return 'Vui lòng nhập tài khoản nội bộ';

  if (value.includes('@')) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Email không đúng định dạng';
  }

  return /^(0\d{9}|\+84\d{9})$/.test(value.replace(/[\s.-]/g, '')) ? null : 'Số điện thoại không đúng định dạng';
};

const renderFieldError = (errors, fieldName) =>
  errors[fieldName] ? `<p class="admin-login-field__error">${escapeHtml(errors[fieldName])}</p>` : '';

const renderDevOtp = (loginOtp) =>
  loginOtp?.dev_otp ? `<p class="admin-login-dev-otp">Mã OTP demo: <strong>${escapeHtml(loginOtp.dev_otp)}</strong></p>` : '';

const renderForm = ({ mode = 'password', values = {}, errors = {}, submitError = '', successMessage = '', loginOtp = null, isSubmitting = false } = {}) => `
  <div class="admin-login-panel">
    <div class="admin-login-badge">🔐 QUẢN TRỊ NỘI BỘ</div>
    <div class="admin-login-heading">
      <h1>Đăng nhập quản trị</h1>
      <p>Dành cho nhân viên nội bộ đã được phân quyền. Không dành cho khách hàng.</p>
    </div>
    <div class="admin-login-tabs" role="tablist" aria-label="Phương thức đăng nhập quản trị">
      <button class="admin-login-tab ${mode === 'password' ? 'is-active' : ''}" type="button" data-admin-login-mode="password">🔑 Mật khẩu</button>
      <button class="admin-login-tab ${mode === 'otp' ? 'is-active' : ''}" type="button" data-admin-login-mode="otp">📱 OTP</button>
    </div>
    <form class="admin-login-form" data-admin-login-form novalidate>
      ${submitError ? `<div class="admin-login-alert admin-login-alert--error">${escapeHtml(submitError)}</div>` : ''}
      ${successMessage ? `<div class="admin-login-alert admin-login-alert--success">${escapeHtml(successMessage)}</div>` : ''}
      <label class="admin-login-field ${errors.identifier ? 'has-error' : ''}">
        <span>Email hoặc số điện thoại</span>
        <input name="identifier" type="text" autocomplete="username" placeholder="admin@fastfood.vn" value="${escapeHtml(values.identifier || '')}" />
        ${renderFieldError(errors, 'identifier')}
      </label>
      ${
        mode === 'password'
          ? `
            <label class="admin-login-field ${errors.password ? 'has-error' : ''}">
              <span>Mật khẩu</span>
              <input name="password" type="password" autocomplete="current-password" placeholder="••••••••" />
              ${renderFieldError(errors, 'password')}
            </label>
            <div class="admin-login-inline"><a href="#/forgot-password">Quên mật khẩu?</a></div>
          `
          : `
            ${renderDevOtp(loginOtp)}
            ${
              loginOtp?.verification_token
                ? `
                  <label class="admin-login-field ${errors.otp ? 'has-error' : ''}">
                    <span>Mã OTP</span>
                    <input name="otp" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="123456" />
                    ${renderFieldError(errors, 'otp')}
                  </label>
                `
                : ''
            }
          `
      }
      <button class="button button-primary admin-login-submit" type="submit" ${isSubmitting ? 'disabled' : ''}>
        ${mode === 'password' ? (isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập quản trị') : loginOtp?.verification_token ? (isSubmitting ? 'Đang xác thực...' : 'Xác thực OTP') : (isSubmitting ? 'Đang gửi OTP...' : 'Gửi OTP')}
      </button>
      ${mode === 'otp' && loginOtp?.verification_token ? '<button class="button button-secondary admin-login-submit" type="button" data-admin-resend-otp>Gửi lại OTP</button>' : ''}
    </form>
    <div class="admin-login-footer">
      <a href="#/">← Quay về cổng khách hàng</a>
    </div>
  </div>
`;

const pageStyles = `
  <style>
    .admin-login-page { display: flex; justify-content: center; padding: 4px 0 28px; animation: slideUp 400ms var(--ease); }
    .admin-login-panel { width: min(520px, 100%); border: 1px solid var(--border-accent); border-radius: var(--radius-lg); background: var(--bg-glass); backdrop-filter: blur(16px); padding: 36px; position: relative; overflow: hidden; }
    .admin-login-panel::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--accent), var(--accent-hover), var(--accent)); }
    .admin-login-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: var(--radius-full); background: var(--accent); color: #fff; font-size: 12px; font-weight: 800; letter-spacing: 0.06em; margin-bottom: 20px; box-shadow: 0 4px 16px rgba(225,29,72,0.3); }
    .admin-login-heading { margin-bottom: 24px; }
    .admin-login-heading h1 { margin: 0 0 8px; font-size: 30px; line-height: 1.15; color: var(--text); }
    .admin-login-heading p { margin: 0; color: var(--text-muted); line-height: 1.5; font-size: 14px; }
    .admin-login-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; margin-bottom: 20px; padding: 4px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-sm); }
    .admin-login-tab { min-height: 42px; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--text-muted); font: inherit; font-weight: 700; cursor: pointer; transition: all var(--transition); }
    .admin-login-tab:hover { color: var(--text-secondary); }
    .admin-login-tab.is-active { border-color: var(--accent); background: var(--accent); color: #fff; box-shadow: 0 4px 12px rgba(225,29,72,0.3); }
    .admin-login-form { display: grid; gap: 16px; }
    .admin-login-field { display: grid; gap: 8px; color: var(--text-muted); font-weight: 700; font-size: 14px; }
    .admin-login-field input { width: 100%; min-height: 48px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px 14px; color: var(--text); font: inherit; background: var(--bg-elevated); transition: border-color var(--transition), box-shadow var(--transition); }
    .admin-login-field input::placeholder { color: var(--text-subtle); }
    .admin-login-field input:focus { border-color: var(--accent); outline: 0; box-shadow: var(--focus); }
    .admin-login-field.has-error input { border-color: var(--error); box-shadow: 0 0 0 3px rgba(239,68,68,0.15); }
    .admin-login-field__error { margin: 0; color: var(--error); font-size: 13px; line-height: 1.35; }
    .admin-login-alert { padding: 14px; border-radius: var(--radius-sm); font-weight: 700; line-height: 1.4; font-size: 14px; }
    .admin-login-alert--error { border: 1px solid var(--error-border); color: var(--error); background: var(--error-bg); }
    .admin-login-alert--success { border: 1px solid var(--success-border); color: var(--success); background: var(--success-bg); }
    .admin-login-dev-otp { margin: 0; padding: 12px; border: 1px dashed var(--border-hover); border-radius: var(--radius-sm); background: var(--bg-elevated); color: var(--text-muted); }
    .admin-login-dev-otp strong { color: var(--accent-light); }
    .admin-login-submit { width: 100%; min-height: 48px; }
    .admin-login-inline { display: flex; justify-content: flex-end; }
    .admin-login-inline a { color: var(--accent-light); font-weight: 700; font-size: 14px; }
    .admin-login-footer { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border); text-align: center; }
    .admin-login-footer a { color: var(--text-subtle); font-size: 14px; font-weight: 600; transition: color var(--transition); }
    .admin-login-footer a:hover { color: var(--text-muted); }
    @media (max-width: 640px) {
      .admin-login-panel { padding: 24px; }
      .admin-login-heading h1 { font-size: 24px; }
    }
  </style>
`;

export const AdminLoginPage = () => `
  ${pageStyles}
  <section class="admin-login-page" data-admin-login-page>
    ${renderForm()}
  </section>
`;

export const mountAdminLoginPage = () => {
  const root = document.querySelector('[data-admin-login-page]');
  if (!root) return;

  let mode = 'password';
  let values = {};
  let errors = {};
  let submitError = '';
  let successMessage = '';
  let loginOtp = null;
  let isSubmitting = false;

  const render = () => {
    root.innerHTML = renderForm({ mode, values, errors, submitError, successMessage, loginOtp, isSubmitting });
  };

  const redirectToDashboard = (session) => {
    window.location.hash = `#${session.dashboard_path || '/admin'}`;
  };

  root.addEventListener('click', async (event) => {
    const modeButton = event.target.closest('[data-admin-login-mode]');
    if (modeButton) {
      mode = modeButton.dataset.adminLoginMode;
      errors = {};
      submitError = '';
      successMessage = '';
      loginOtp = null;
      render();
      return;
    }

    if (!event.target.closest('[data-admin-resend-otp]')) return;

    try {
      isSubmitting = true;
      errors = {};
      submitError = '';
      successMessage = '';
      render();
      loginOtp = await adminAuthService.requestLoginOtp(values.identifier);
      successMessage = 'Đã gửi lại OTP đăng nhập quản trị.';
    } catch (error) {
      errors = error?.errors && typeof error.errors === 'object' ? error.errors : {};
      submitError = error?.message || 'Không thể gửi OTP. Vui lòng thử lại.';
    } finally {
      isSubmitting = false;
      render();
    }
  });

  root.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-admin-login-form]');
    if (!form) return;

    event.preventDefault();
    const formData = new FormData(form);
    values = {
      identifier: String(formData.get('identifier') || '').trim()
    };
    errors = {};
    submitError = '';
    successMessage = '';

    const identifierError = validateIdentifier(values.identifier);
    if (identifierError) {
      errors.identifier = identifierError;
      render();
      return;
    }

    try {
      isSubmitting = true;
      render();

      if (mode === 'password') {
        const password = String(formData.get('password') || '');

        if (!password) {
          errors.password = 'Vui lòng nhập mật khẩu';
          return;
        }

        const session = await adminAuthService.login({ identifier: values.identifier, password });
        redirectToDashboard(session);
        return;
      }

      if (!loginOtp?.verification_token) {
        loginOtp = await adminAuthService.requestLoginOtp(values.identifier);
        successMessage = 'Mã OTP quản trị đã được gửi.';
        return;
      }

      const otp = String(formData.get('otp') || '').trim();

      if (!/^\d{6}$/.test(otp)) {
        errors.otp = 'Mã OTP gồm 6 chữ số';
        return;
      }

      const session = await adminAuthService.verifyLoginOtp({
        verificationToken: loginOtp.verification_token,
        otp
      });
      redirectToDashboard(session);
    } catch (error) {
      errors = error?.errors && typeof error.errors === 'object' ? error.errors : {};
      submitError = error?.message || 'Đăng nhập quản trị that bai.';
    } finally {
      isSubmitting = false;
      render();
    }
  });
};
