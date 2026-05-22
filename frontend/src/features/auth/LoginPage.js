import { authService } from '../../services/authService.js';

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const validateIdentifier = (identifier) => {
  const value = String(identifier || '').trim();

  if (!value) return 'Vui long nhap email hoac so dien thoai';

  if (value.includes('@')) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Email khong dung dinh dang';
  }

  return /^(0\d{9}|\+84\d{9})$/.test(value.replace(/[\s.-]/g, '')) ? null : 'So dien thoai khong dung dinh dang';
};

const renderFieldError = (errors, fieldName) =>
  errors[fieldName] ? `<p class="auth-field__error">${escapeHtml(errors[fieldName])}</p>` : '';

const renderDevOtp = (loginOtp) =>
  loginOtp?.dev_otp ? `<p class="auth-dev-otp">Ma OTP demo: <strong>${escapeHtml(loginOtp.dev_otp)}</strong></p>` : '';

const renderLoginForm = ({ mode = 'password', fieldErrors = {}, submitError = '', successMessage = '', values = {}, loginOtp = null, isSubmitting = false } = {}) => `
  <div class="auth-panel">
    <div class="auth-heading">
      <h1>Dang nhap</h1>
      <p>Dang nhap bang email/so dien thoai va mat khau, hoac nhan OTP neu muon xac thuc nhanh.</p>
    </div>
    <div class="auth-tabs" role="tablist" aria-label="Phuong thuc dang nhap">
      <button class="auth-tab ${mode === 'password' ? 'is-active' : ''}" type="button" data-login-mode="password">Mat khau</button>
      <button class="auth-tab ${mode === 'otp' ? 'is-active' : ''}" type="button" data-login-mode="otp">OTP</button>
    </div>
    <form class="auth-form" data-login-form novalidate>
      ${submitError ? `<div class="auth-alert auth-alert--error">${escapeHtml(submitError)}</div>` : ''}
      ${successMessage ? `<div class="auth-alert auth-alert--success">${escapeHtml(successMessage)}</div>` : ''}
      <label class="auth-field ${fieldErrors.identifier ? 'has-error' : ''}">
        <span>Email hoac so dien thoai</span>
        <input name="identifier" type="text" autocomplete="username" value="${escapeHtml(values.identifier || '')}" />
        ${renderFieldError(fieldErrors, 'identifier')}
      </label>
      ${
        mode === 'password'
          ? `
            <label class="auth-field ${fieldErrors.password ? 'has-error' : ''}">
              <span>Mat khau</span>
              <input name="password" type="password" autocomplete="current-password" />
              ${renderFieldError(fieldErrors, 'password')}
            </label>
            <div class="auth-inline">
              <a href="#/forgot-password">Quen mat khau?</a>
            </div>
          `
          : `
            ${renderDevOtp(loginOtp)}
            ${
              loginOtp?.verification_token
                ? `
                  <label class="auth-field ${fieldErrors.otp ? 'has-error' : ''}">
                    <span>Ma OTP</span>
                    <input name="otp" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="123456" />
                    ${renderFieldError(fieldErrors, 'otp')}
                  </label>
                `
                : ''
            }
          `
      }
      <button class="button button-primary auth-submit" type="submit" ${isSubmitting ? 'disabled' : ''}>
        ${mode === 'password' ? (isSubmitting ? 'Dang dang nhap...' : 'Dang nhap') : loginOtp?.verification_token ? (isSubmitting ? 'Dang xac thuc...' : 'Xac thuc OTP') : (isSubmitting ? 'Dang gui OTP...' : 'Gui OTP')}
      </button>
      ${
        mode === 'otp' && loginOtp?.verification_token
          ? '<button class="button button-secondary auth-submit" type="button" data-resend-login-otp>Gui lai OTP</button>'
          : ''
      }
      <p class="auth-alt">Chua co tai khoan? <a href="#/register">Dang ky</a></p>
    </form>
  </div>
`;

const pageStyles = `
  <style>
    .login-page { display: flex; justify-content: center; padding: 4px 0 28px; }
    .auth-panel { width: min(560px, 100%); border: 1px solid var(--line); border-radius: 8px; background: #fff; box-shadow: 0 12px 28px rgba(116, 36, 0, 0.08); padding: 24px; }
    .auth-heading { margin-bottom: 18px; }
    .auth-heading h1 { margin: 0 0 8px; font-size: 34px; line-height: 1.15; }
    .auth-heading p { margin: 0; color: var(--muted); line-height: 1.5; }
    .auth-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 16px; }
    .auth-tab { min-height: 40px; border: 1px solid var(--line); border-radius: 6px; background: #fff8ef; color: var(--muted); font: inherit; font-weight: 800; cursor: pointer; }
    .auth-tab.is-active { border-color: var(--red); background: var(--red); color: #fff; }
    .auth-form { display: grid; gap: 14px; }
    .auth-field { display: grid; gap: 7px; color: var(--muted); font-weight: 800; }
    .auth-field input { width: 100%; min-height: 44px; border: 1px solid var(--line); border-radius: 6px; padding: 10px 12px; color: var(--ink); font: inherit; background: #fff; }
    .auth-field.has-error input { border-color: var(--red); box-shadow: 0 0 0 2px rgba(201, 31, 31, 0.1); }
    .auth-field__error { margin: 0; color: #b3261e; font-size: 13px; line-height: 1.35; }
    .auth-alert { padding: 12px; border-radius: 8px; font-weight: 800; line-height: 1.4; }
    .auth-alert--error { border: 1px solid #f2b8b5; color: #b3261e; background: #fff7f6; }
    .auth-alert--success { border: 1px solid #9bd6ad; color: #146c2e; background: #f4fff6; }
    .auth-dev-otp { margin: 0; padding: 10px 12px; border: 1px dashed var(--orange); border-radius: 8px; background: #fff8ef; color: var(--muted); }
    .auth-submit { min-height: 46px; width: 100%; }
    .auth-alt { margin: 0; color: var(--muted); text-align: center; }
    .auth-alt a, .auth-inline a { color: var(--red); font-weight: 800; }
    .auth-inline { display: flex; justify-content: flex-end; }
    @media (max-width: 640px) {
      .auth-panel { padding: 18px; }
      .auth-heading h1 { font-size: 28px; }
    }
  </style>
`;

export const LoginPage = () => `
  ${pageStyles}
  <section class="login-page" data-login-page>
    ${renderLoginForm()}
  </section>
`;

export const mountLoginPage = () => {
  const root = document.querySelector('[data-login-page]');
  if (!root) return;

  let mode = 'password';
  let fieldErrors = {};
  let submitError = '';
  let successMessage = '';
  let values = {};
  let loginOtp = null;
  let isSubmitting = false;

  const redirectAfterLogin = () => {
    window.location.hash = '#/account';
  };

  const render = () => {
    root.innerHTML = renderLoginForm({ mode, fieldErrors, submitError, successMessage, values, loginOtp, isSubmitting });
  };

  root.addEventListener('click', async (event) => {
    const modeButton = event.target.closest('[data-login-mode]');
    if (modeButton) {
      mode = modeButton.dataset.loginMode;
      fieldErrors = {};
      submitError = '';
      successMessage = '';
      loginOtp = null;
      render();
      return;
    }

    if (!event.target.closest('[data-resend-login-otp]')) return;

    try {
      isSubmitting = true;
      submitError = '';
      successMessage = '';
      render();
      loginOtp = await authService.requestLoginOtp(values.identifier);
      successMessage = 'Da gui lai OTP. Vui long kiem tra email hoac dien thoai.';
    } catch (error) {
      fieldErrors = error?.errors && typeof error.errors === 'object' ? error.errors : {};
      submitError = error?.message || 'Khong the gui OTP. Vui long thu lai.';
    } finally {
      isSubmitting = false;
      render();
    }
  });

  root.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-login-form]');
    if (!form) return;

    event.preventDefault();
    const formData = new FormData(form);
    values = {
      identifier: String(formData.get('identifier') || '').trim()
    };
    fieldErrors = {};
    submitError = '';
    successMessage = '';

    const identifierError = validateIdentifier(values.identifier);
    if (identifierError) {
      fieldErrors.identifier = identifierError;
      render();
      return;
    }

    try {
      isSubmitting = true;
      render();

      if (mode === 'password') {
        const password = String(formData.get('password') || '');

        if (!password) {
          fieldErrors.password = 'Vui long nhap mat khau';
          return;
        }

        await authService.login({ identifier: values.identifier, password });
        redirectAfterLogin();
        return;
      }

      if (!loginOtp?.verification_token) {
        loginOtp = await authService.requestLoginOtp(values.identifier);
        successMessage = 'Ma OTP da duoc gui. Vui long kiem tra email hoac dien thoai.';
        return;
      }

      const otp = String(formData.get('otp') || '').trim();

      if (!/^\d{6}$/.test(otp)) {
        fieldErrors.otp = 'Ma OTP gom 6 chu so';
        return;
      }

      await authService.verifyLoginOtp({
        verificationToken: loginOtp.verification_token,
        otp
      });
      redirectAfterLogin();
    } catch (error) {
      fieldErrors = error?.errors && typeof error.errors === 'object' ? error.errors : {};
      submitError = error?.message || 'Khong the dang nhap. Vui long thu lai.';
    } finally {
      isSubmitting = false;
      render();
    }
  });
};
