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

  if (!value) return 'Vui lòng nhập email hoặc số điện thoại';

  if (value.includes('@')) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Email không đúng định dạng';
  }

  return /^(0\d{9}|\+84\d{9})$/.test(value.replace(/[\s.-]/g, '')) ? null : 'Số điện thoại không đúng định dạng';
};

const renderFieldError = (errors, fieldName) =>
  errors[fieldName] ? `<p class="auth-field__error">${escapeHtml(errors[fieldName])}</p>` : '';

const renderDevOtp = (loginOtp) =>
  loginOtp?.dev_otp ? `<p class="auth-dev-otp">Mã OTP demo: <strong>${escapeHtml(loginOtp.dev_otp)}</strong></p>` : '';

const renderLoginForm = ({ mode = 'password', fieldErrors = {}, submitError = '', successMessage = '', values = {}, loginOtp = null, isSubmitting = false } = {}) => `
  <div class="login-layout">
    <div class="auth-panel">
      <div class="auth-heading">
        <span class="auth-label">👤 ĐĂNG NHẬP KHÁCH HÀNG</span>
        <h1>Đăng nhập</h1>
        <p>Đăng nhập bằng email/số điện thoại và mật khẩu, hoặc nhận OTP nếu muốn xác thực nhanh.</p>
      </div>
      <div class="auth-tabs" role="tablist" aria-label="Phương thức đăng nhập">
        <button class="auth-tab ${mode === 'password' ? 'is-active' : ''}" type="button" data-login-mode="password">🔑 Mật khẩu</button>
        <button class="auth-tab ${mode === 'otp' ? 'is-active' : ''}" type="button" data-login-mode="otp">📱 OTP</button>
      </div>
      <form class="auth-form" data-login-form novalidate>
        ${submitError ? `<div class="auth-alert auth-alert--error">${escapeHtml(submitError)}</div>` : ''}
        ${successMessage ? `<div class="auth-alert auth-alert--success">${escapeHtml(successMessage)}</div>` : ''}
        <label class="auth-field ${fieldErrors.identifier ? 'has-error' : ''}">
          <span>Email hoặc số điện thoại</span>
          <input name="identifier" type="text" autocomplete="username" placeholder="name@example.com" value="${escapeHtml(values.identifier || '')}" />
          ${renderFieldError(fieldErrors, 'identifier')}
        </label>
        ${
          mode === 'password'
            ? `
              <label class="auth-field ${fieldErrors.password ? 'has-error' : ''}">
                <span>Mật khẩu</span>
                <input name="password" type="password" autocomplete="current-password" placeholder="••••••••" />
                ${renderFieldError(fieldErrors, 'password')}
              </label>
              <div class="auth-inline">
                <a href="#/forgot-password">Quên mật khẩu?</a>
              </div>
            `
            : `
              ${renderDevOtp(loginOtp)}
              ${
                loginOtp?.verification_token
                  ? `
                    <label class="auth-field ${fieldErrors.otp ? 'has-error' : ''}">
                      <span>Mã OTP</span>
                      <input name="otp" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="123456" />
                      ${renderFieldError(fieldErrors, 'otp')}
                    </label>
                  `
                  : ''
              }
            `
        }
        <button class="button button-primary auth-submit" type="submit" ${isSubmitting ? 'disabled' : ''}>
          ${mode === 'password' ? (isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập') : loginOtp?.verification_token ? (isSubmitting ? 'Đang xác thực...' : 'Xác thực OTP') : (isSubmitting ? 'Đang gửi OTP...' : 'Gửi OTP')}
        </button>
        ${
          mode === 'otp' && loginOtp?.verification_token
            ? '<button class="button button-secondary auth-submit" type="button" data-resend-login-otp>Gửi lại OTP</button>'
            : ''
        }
        <p class="auth-alt">Chưa có tài khoản? <a href="#/register">Đăng ký ngay</a></p>
      </form>
    </div>
    <aside class="auth-recovery-panel">
      <div class="auth-recovery-icon">🔒</div>
      <h2>Khôi phục mật khẩu</h2>
      <p>Nhập email hoặc số điện thoại để nhận mã xác thực, sau đó tạo mật khẩu mới.</p>
      <a class="button button-secondary" href="#/forgot-password">Mở form khôi phục</a>
    </aside>
  </div>
`;

const pageStyles = `
  <style>
    .login-page { display: flex; justify-content: center; padding: 4px 0 28px; animation: slideUp 400ms var(--ease); }
    .login-layout { width: min(980px, 100%); display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 20px; align-items: start; }
    .auth-panel { width: 100%; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--bg-glass); backdrop-filter: blur(10px); padding: 32px; }
    .auth-recovery-panel { display: grid; gap: 14px; padding: 28px; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--bg-glass); backdrop-filter: blur(10px); text-align: center; }
    .auth-recovery-icon { font-size: 36px; margin-bottom: 4px; }
    .auth-recovery-panel h2 { margin: 0; font-size: 20px; color: var(--text); }
    .auth-recovery-panel p { margin: 0; color: var(--text-muted); line-height: 1.5; font-size: 14px; }
    .auth-heading { margin-bottom: 24px; }
    .auth-label { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: var(--radius-full); background: var(--accent-subtle); border: 1px solid rgba(225,29,72,0.12); color: var(--accent-light); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }
    .auth-heading h1 { margin: 0 0 10px; font-size: 32px; line-height: 1.15; color: var(--text); }
    .auth-heading p { margin: 0; color: var(--text-muted); line-height: 1.5; }
    .auth-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; margin-bottom: 20px; padding: 4px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-sm); }
    .auth-tab { min-height: 42px; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--text-muted); font: inherit; font-weight: 700; cursor: pointer; transition: all var(--transition); }
    .auth-tab:hover { color: var(--text-secondary); }
    .auth-tab.is-active { border-color: var(--accent); background: var(--accent); color: #fff; box-shadow: 0 4px 12px rgba(225,29,72,0.3); }
    .auth-form { display: grid; gap: 16px; }
    .auth-field { display: grid; gap: 8px; color: var(--text-muted); font-weight: 700; font-size: 14px; }
    .auth-field input { width: 100%; min-height: 48px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px 14px; color: var(--text); font: inherit; background: var(--bg-elevated); transition: border-color var(--transition), box-shadow var(--transition); }
    .auth-field input::placeholder { color: var(--text-subtle); }
    .auth-field input:focus { border-color: var(--accent); outline: 0; box-shadow: var(--focus); }
    .auth-field.has-error input { border-color: var(--error); box-shadow: 0 0 0 3px rgba(239,68,68,0.15); }
    .auth-field__error { margin: 0; color: var(--error); font-size: 13px; line-height: 1.35; }
    .auth-alert { padding: 14px; border-radius: var(--radius-sm); font-weight: 700; line-height: 1.4; font-size: 14px; }
    .auth-alert--error { border: 1px solid var(--error-border); color: var(--error); background: var(--error-bg); }
    .auth-alert--success { border: 1px solid var(--success-border); color: var(--success); background: var(--success-bg); }
    .auth-dev-otp { margin: 0; padding: 12px 14px; border: 1px dashed var(--border-hover); border-radius: var(--radius-sm); background: var(--bg-elevated); color: var(--text-muted); font-size: 14px; }
    .auth-dev-otp strong { color: var(--accent-light); }
    .auth-submit { min-height: 48px; width: 100%; font-size: 15px; }
    .auth-alt { margin: 0; color: var(--text-muted); text-align: center; font-size: 14px; }
    .auth-alt a, .auth-inline a { color: var(--accent-light); font-weight: 700; transition: color var(--transition); }
    .auth-alt a:hover, .auth-inline a:hover { color: var(--accent); }
    .auth-inline { display: flex; justify-content: flex-end; }
    @media (max-width: 740px) {
      .login-layout { grid-template-columns: 1fr; }
      .auth-panel { padding: 24px; }
      .auth-heading h1 { font-size: 26px; }
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
      successMessage = 'Đã gửi lại OTP. Vui lòng kiểm tra email hoặc điện thoại.';
    } catch (error) {
      fieldErrors = error?.errors && typeof error.errors === 'object' ? error.errors : {};
      submitError = error?.message || 'Không thể gửi OTP. Vui lòng thử lại.';
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
          fieldErrors.password = 'Vui lòng nhập mật khẩu';
          return;
        }

        await authService.login({ identifier: values.identifier, password });
        redirectAfterLogin();
        return;
      }

      if (!loginOtp?.verification_token) {
        loginOtp = await authService.requestLoginOtp(values.identifier);
        successMessage = 'Mã OTP đã được gửi. Vui lòng kiểm tra email hoặc điện thoại.';
        return;
      }

      const otp = String(formData.get('otp') || '').trim();

      if (!/^\d{6}$/.test(otp)) {
        fieldErrors.otp = 'Mã OTP gồm 6 chữ số';
        return;
      }

      await authService.verifyLoginOtp({
        verificationToken: loginOtp.verification_token,
        otp
      });
      redirectAfterLogin();
    } catch (error) {
      fieldErrors = error?.errors && typeof error.errors === 'object' ? error.errors : {};
      submitError = error?.message || 'Không thể đăng nhập. Vui lòng thử lại.';
    } finally {
      isSubmitting = false;
      render();
    }
  });
};
