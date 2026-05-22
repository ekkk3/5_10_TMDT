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

  if (!value) return 'Vui long nhap tai khoan noi bo';

  if (value.includes('@')) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Email khong dung dinh dang';
  }

  return /^(0\d{9}|\+84\d{9})$/.test(value.replace(/[\s.-]/g, '')) ? null : 'So dien thoai khong dung dinh dang';
};

const renderFieldError = (errors, fieldName) =>
  errors[fieldName] ? `<p class="admin-login-field__error">${escapeHtml(errors[fieldName])}</p>` : '';

const renderDevOtp = (loginOtp) =>
  loginOtp?.dev_otp ? `<p class="admin-login-dev-otp">Ma OTP demo: <strong>${escapeHtml(loginOtp.dev_otp)}</strong></p>` : '';

const renderForm = ({ mode = 'password', values = {}, errors = {}, submitError = '', successMessage = '', loginOtp = null, isSubmitting = false } = {}) => `
  <div class="admin-login-panel">
    <div class="admin-login-heading">
      <h1>Dang nhap quan tri</h1>
      <p>Danh cho nhan vien noi bo da duoc phan quyen.</p>
    </div>
    <div class="admin-login-tabs" role="tablist" aria-label="Phuong thuc dang nhap quan tri">
      <button class="admin-login-tab ${mode === 'password' ? 'is-active' : ''}" type="button" data-admin-login-mode="password">Mat khau</button>
      <button class="admin-login-tab ${mode === 'otp' ? 'is-active' : ''}" type="button" data-admin-login-mode="otp">OTP</button>
    </div>
    <form class="admin-login-form" data-admin-login-form novalidate>
      ${submitError ? `<div class="admin-login-alert admin-login-alert--error">${escapeHtml(submitError)}</div>` : ''}
      ${successMessage ? `<div class="admin-login-alert admin-login-alert--success">${escapeHtml(successMessage)}</div>` : ''}
      <label class="admin-login-field ${errors.identifier ? 'has-error' : ''}">
        <span>Email hoac so dien thoai</span>
        <input name="identifier" type="text" autocomplete="username" value="${escapeHtml(values.identifier || '')}" />
        ${renderFieldError(errors, 'identifier')}
      </label>
      ${
        mode === 'password'
          ? `
            <label class="admin-login-field ${errors.password ? 'has-error' : ''}">
              <span>Mat khau</span>
              <input name="password" type="password" autocomplete="current-password" />
              ${renderFieldError(errors, 'password')}
            </label>
            <div class="admin-login-inline"><a href="#/forgot-password">Quen mat khau?</a></div>
          `
          : `
            ${renderDevOtp(loginOtp)}
            ${
              loginOtp?.verification_token
                ? `
                  <label class="admin-login-field ${errors.otp ? 'has-error' : ''}">
                    <span>Ma OTP</span>
                    <input name="otp" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="123456" />
                    ${renderFieldError(errors, 'otp')}
                  </label>
                `
                : ''
            }
          `
      }
      <button class="button button-primary admin-login-submit" type="submit" ${isSubmitting ? 'disabled' : ''}>
        ${mode === 'password' ? (isSubmitting ? 'Dang dang nhap...' : 'Dang nhap') : loginOtp?.verification_token ? (isSubmitting ? 'Dang xac thuc...' : 'Xac thuc OTP') : (isSubmitting ? 'Dang gui OTP...' : 'Gui OTP')}
      </button>
      ${mode === 'otp' && loginOtp?.verification_token ? '<button class="button button-secondary admin-login-submit" type="button" data-admin-resend-otp>Gui lai OTP</button>' : ''}
    </form>
  </div>
`;

const pageStyles = `
  <style>
    .admin-login-page { display: flex; justify-content: center; padding: 4px 0 28px; }
    .admin-login-panel { width: min(560px, 100%); border: 1px solid var(--line); border-radius: 8px; background: #fff; box-shadow: 0 12px 28px rgba(116, 36, 0, 0.08); padding: 24px; }
    .admin-login-heading { margin-bottom: 18px; }
    .admin-login-heading h1 { margin: 0 0 8px; font-size: 34px; line-height: 1.15; }
    .admin-login-heading p { margin: 0; color: var(--muted); line-height: 1.5; }
    .admin-login-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 16px; }
    .admin-login-tab { min-height: 40px; border: 1px solid var(--line); border-radius: 6px; background: #fff8ef; color: var(--muted); font: inherit; font-weight: 800; cursor: pointer; }
    .admin-login-tab.is-active { border-color: var(--red); background: var(--red); color: #fff; }
    .admin-login-form { display: grid; gap: 14px; }
    .admin-login-field { display: grid; gap: 7px; color: var(--muted); font-weight: 800; }
    .admin-login-field input { width: 100%; min-height: 44px; border: 1px solid var(--line); border-radius: 6px; padding: 10px 12px; color: var(--ink); font: inherit; background: #fff; }
    .admin-login-field.has-error input { border-color: var(--red); box-shadow: 0 0 0 2px rgba(201, 31, 31, 0.1); }
    .admin-login-field__error { margin: 0; color: #b3261e; font-size: 13px; line-height: 1.35; }
    .admin-login-alert { padding: 12px; border-radius: 8px; font-weight: 800; line-height: 1.4; }
    .admin-login-alert--error { border: 1px solid #f2b8b5; color: #b3261e; background: #fff7f6; }
    .admin-login-alert--success { border: 1px solid #9bd6ad; color: #146c2e; background: #f4fff6; }
    .admin-login-dev-otp { margin: 0; padding: 10px 12px; border: 1px dashed var(--orange); border-radius: 8px; background: #fff8ef; color: var(--muted); }
    .admin-login-submit { width: 100%; min-height: 46px; }
    .admin-login-inline { display: flex; justify-content: flex-end; }
    .admin-login-inline a { color: var(--red); font-weight: 800; }
    @media (max-width: 640px) {
      .admin-login-panel { padding: 18px; }
      .admin-login-heading h1 { font-size: 28px; }
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
      successMessage = 'Da gui lai OTP dang nhap quan tri.';
    } catch (error) {
      errors = error?.errors && typeof error.errors === 'object' ? error.errors : {};
      submitError = error?.message || 'Khong the gui OTP. Vui long thu lai.';
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
          errors.password = 'Vui long nhap mat khau';
          return;
        }

        const session = await adminAuthService.login({ identifier: values.identifier, password });
        redirectToDashboard(session);
        return;
      }

      if (!loginOtp?.verification_token) {
        loginOtp = await adminAuthService.requestLoginOtp(values.identifier);
        successMessage = 'Ma OTP quan tri da duoc gui.';
        return;
      }

      const otp = String(formData.get('otp') || '').trim();

      if (!/^\d{6}$/.test(otp)) {
        errors.otp = 'Ma OTP gom 6 chu so';
        return;
      }

      const session = await adminAuthService.verifyLoginOtp({
        verificationToken: loginOtp.verification_token,
        otp
      });
      redirectToDashboard(session);
    } catch (error) {
      errors = error?.errors && typeof error.errors === 'object' ? error.errors : {};
      submitError = error?.message || 'Dang nhap quan tri that bai.';
    } finally {
      isSubmitting = false;
      render();
    }
  });
};
