import { authService } from '../../services/authService.js';

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const normalizePhone = (phone = '') => String(phone).trim().replace(/[\s.-]/g, '');

const validateRegistrationForm = (form) => {
  const formData = new FormData(form);
  const fullName = String(formData.get('full_name') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const phone = normalizePhone(formData.get('phone'));
  const password = String(formData.get('password') || '');
  const confirmPassword = String(formData.get('confirm_password') || '');
  const errors = {};

  if (!fullName) errors.full_name = 'Vui long nhap ho ten';
  if (!email && !phone) errors.contact = 'Vui long nhap email hoac so dien thoai';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Email khong dung dinh dang';
  if (phone && !/^(0\d{9}|\+84\d{9})$/.test(phone)) errors.phone = 'So dien thoai khong dung dinh dang';
  if (password.length < 8) errors.password = 'Mat khau toi thieu 8 ky tu';
  if (password && !/[a-z]/.test(password)) errors.password = 'Mat khau can co chu thuong';
  if (password && !/[A-Z]/.test(password)) errors.password = 'Mat khau can co chu hoa';
  if (password && !/\d/.test(password)) errors.password = 'Mat khau can co chu so';
  if (password && !/[^A-Za-z0-9]/.test(password)) errors.password = 'Mat khau can co ky tu dac biet';
  if (password !== confirmPassword) errors.confirm_password = 'Mat khau nhap lai khong khop';

  return {
    errors,
    values: {
      full_name: fullName,
      email,
      phone,
      password
    }
  };
};

const renderFieldError = (errors, fieldName) =>
  errors[fieldName] ? `<p class="auth-field__error">${escapeHtml(errors[fieldName])}</p>` : '';

const renderDevOtp = (registration) =>
  registration?.dev_otp
    ? `<p class="auth-dev-otp">Ma OTP demo: <strong>${escapeHtml(registration.dev_otp)}</strong></p>`
    : '';

const renderRegisterForm = ({ fieldErrors = {}, submitError = '', isSubmitting = false, values = {} } = {}) => `
  <div class="auth-panel">
    <div class="auth-heading">
      <h1>Dang ky tai khoan</h1>
      <p>Tao tai khoan thanh vien de theo doi don hang va nhan uu dai rieng.</p>
    </div>
    <form class="auth-form" data-register-form novalidate>
      ${submitError ? `<div class="auth-alert auth-alert--error">${escapeHtml(submitError)}</div>` : ''}
      ${fieldErrors.contact ? `<div class="auth-alert auth-alert--error">${escapeHtml(fieldErrors.contact)}</div>` : ''}
      <label class="auth-field ${fieldErrors.full_name ? 'has-error' : ''}">
        <span>Ho ten</span>
        <input name="full_name" type="text" maxlength="100" autocomplete="name" value="${escapeHtml(values.full_name || '')}" />
        ${renderFieldError(fieldErrors, 'full_name')}
      </label>
      <div class="auth-grid">
        <label class="auth-field ${fieldErrors.email ? 'has-error' : ''}">
          <span>Email</span>
          <input name="email" type="email" maxlength="100" autocomplete="email" placeholder="name@example.com" value="${escapeHtml(values.email || '')}" />
          ${renderFieldError(fieldErrors, 'email')}
        </label>
        <label class="auth-field ${fieldErrors.phone ? 'has-error' : ''}">
          <span>So dien thoai</span>
          <input name="phone" type="tel" maxlength="20" autocomplete="tel" placeholder="0900000000" value="${escapeHtml(values.phone || '')}" />
          ${renderFieldError(fieldErrors, 'phone')}
        </label>
      </div>
      <label class="auth-field ${fieldErrors.password ? 'has-error' : ''}">
        <span>Mat khau</span>
        <input name="password" type="password" autocomplete="new-password" />
        ${renderFieldError(fieldErrors, 'password')}
      </label>
      <label class="auth-field ${fieldErrors.confirm_password ? 'has-error' : ''}">
        <span>Nhap lai mat khau</span>
        <input name="confirm_password" type="password" autocomplete="new-password" />
        ${renderFieldError(fieldErrors, 'confirm_password')}
      </label>
      <button class="button button-primary auth-submit" type="submit" ${isSubmitting ? 'disabled' : ''}>
        ${isSubmitting ? 'Dang gui ma...' : 'Dang ky'}
      </button>
      <p class="auth-alt">Da co tai khoan? <a href="#/login">Dang nhap</a></p>
    </form>
  </div>
`;

const renderOtpForm = ({ registration, fieldErrors = {}, submitError = '', successMessage = '', isSubmitting = false } = {}) => `
  <div class="auth-panel">
    <div class="auth-heading">
      <h1>Xac thuc dang ky</h1>
      <p>Nhap ma OTP da gui den ${escapeHtml(registration?.receiver || 'email/so dien thoai cua ban')}.</p>
    </div>
    <form class="auth-form" data-otp-form novalidate>
      ${submitError ? `<div class="auth-alert auth-alert--error">${escapeHtml(submitError)}</div>` : ''}
      ${successMessage ? `<div class="auth-alert auth-alert--success">${escapeHtml(successMessage)}</div>` : ''}
      ${renderDevOtp(registration)}
      <label class="auth-field ${fieldErrors.otp ? 'has-error' : ''}">
        <span>Ma OTP</span>
        <input name="otp" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="123456" />
        ${renderFieldError(fieldErrors, 'otp')}
      </label>
      <button class="button button-primary auth-submit" type="submit" ${isSubmitting ? 'disabled' : ''}>
        ${isSubmitting ? 'Dang xac thuc...' : 'Xac thuc tai khoan'}
      </button>
      <div class="auth-actions">
        <button class="button button-secondary" type="button" data-resend-otp ${isSubmitting ? 'disabled' : ''}>Gui lai ma</button>
        <button class="auth-link-button" type="button" data-back-register>Nhap lai thong tin</button>
      </div>
    </form>
  </div>
`;

const renderSuccess = (account) => `
  <div class="auth-panel auth-panel--success">
    <div class="auth-heading">
      <h1>Dang ky thanh cong</h1>
      <p>Tai khoan ${escapeHtml(account?.full_name || '')} da duoc tao. Ban co the dang nhap hoac tiep tuc mua hang voi quyen thanh vien.</p>
    </div>
    <div class="auth-success-actions">
      <a class="button button-primary" href="#/login">Dang nhap</a>
      <a class="button button-secondary" href="#/menu">Xem thuc don</a>
    </div>
  </div>
`;

const pageStyles = `
  <style>
    .register-page { display: flex; justify-content: center; padding: 4px 0 28px; }
    .auth-panel { width: min(680px, 100%); border: 1px solid var(--line); border-radius: 8px; background: #fff; box-shadow: 0 12px 28px rgba(116, 36, 0, 0.08); padding: 24px; }
    .auth-heading { margin-bottom: 18px; }
    .auth-heading h1 { margin: 0 0 8px; font-size: 34px; line-height: 1.15; }
    .auth-heading p { margin: 0; color: var(--muted); line-height: 1.5; }
    .auth-form { display: grid; gap: 14px; }
    .auth-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .auth-field { display: grid; gap: 7px; color: var(--muted); font-weight: 800; }
    .auth-field input { width: 100%; min-height: 44px; border: 1px solid var(--line); border-radius: 6px; padding: 10px 12px; color: var(--ink); font: inherit; background: #fff; }
    .auth-field.has-error input { border-color: var(--red); box-shadow: 0 0 0 2px rgba(201, 31, 31, 0.1); }
    .auth-field__error { margin: 0; color: #b3261e; font-size: 13px; line-height: 1.35; }
    .auth-alert { padding: 12px; border-radius: 8px; font-weight: 800; line-height: 1.4; }
    .auth-alert--error { border: 1px solid #f2b8b5; color: #b3261e; background: #fff7f6; }
    .auth-alert--success { border: 1px solid #9bd6ad; color: #146c2e; background: #f4fff6; }
    .auth-submit { min-height: 46px; width: 100%; }
    .auth-alt { margin: 0; color: var(--muted); text-align: center; }
    .auth-alt a, .auth-link-button { color: var(--red); font-weight: 800; }
    .auth-dev-otp { margin: 0; padding: 10px 12px; border: 1px dashed var(--orange); border-radius: 8px; background: #fff8ef; color: var(--muted); }
    .auth-actions, .auth-success-actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; justify-content: center; }
    .auth-link-button { border: 0; background: transparent; cursor: pointer; font: inherit; }
    .auth-panel--success { text-align: center; }
    @media (max-width: 640px) {
      .auth-panel { padding: 18px; }
      .auth-heading h1 { font-size: 28px; }
      .auth-grid { grid-template-columns: 1fr; }
      .auth-actions .button, .auth-success-actions .button { width: 100%; text-align: center; }
    }
  </style>
`;

export const RegisterPage = () => `
  ${pageStyles}
  <section class="register-page" data-register-page>
    ${renderRegisterForm()}
  </section>
`;

export const mountRegisterPage = () => {
  const root = document.querySelector('[data-register-page]');
  if (!root) return;

  let step = 'register';
  let fieldErrors = {};
  let submitError = '';
  let successMessage = '';
  let isSubmitting = false;
  let formValues = {};
  let registration = null;

  const render = () => {
    if (step === 'success') {
      root.innerHTML = renderSuccess(registration?.account);
      return;
    }

    root.innerHTML =
      step === 'otp'
        ? renderOtpForm({ registration, fieldErrors, submitError, successMessage, isSubmitting })
        : renderRegisterForm({ fieldErrors, submitError, isSubmitting, values: formValues });
  };

  root.addEventListener('submit', async (event) => {
    const registerForm = event.target.closest('[data-register-form]');
    const otpForm = event.target.closest('[data-otp-form]');

    if (!registerForm && !otpForm) return;
    event.preventDefault();

    if (registerForm) {
      const validated = validateRegistrationForm(registerForm);
      fieldErrors = validated.errors;
      formValues = validated.values;
      submitError = '';
      successMessage = '';

      if (Object.keys(fieldErrors).length) {
        render();
        return;
      }

      try {
        isSubmitting = true;
        render();
        registration = await authService.requestRegistration(formValues);
        step = 'otp';
        fieldErrors = {};
        submitError = '';
        successMessage = 'Ma xac thuc da duoc gui. Vui long kiem tra email hoac dien thoai.';
      } catch (error) {
        fieldErrors = error?.errors && typeof error.errors === 'object' ? error.errors : {};
        submitError = error?.message || 'Khong the dang ky. Vui long thu lai.';
      } finally {
        isSubmitting = false;
        render();
      }
    }

    if (otpForm) {
      const formData = new FormData(otpForm);
      const otp = String(formData.get('otp') || '').trim();
      fieldErrors = {};
      submitError = '';
      successMessage = '';

      if (!/^\d{6}$/.test(otp)) {
        fieldErrors.otp = 'Ma OTP gom 6 chu so';
        render();
        return;
      }

      try {
        isSubmitting = true;
        render();
        const account = await authService.verifyRegistration({
          verificationToken: registration?.verification_token,
          otp
        });
        registration = { ...registration, account };
        step = 'success';
      } catch (error) {
        fieldErrors = error?.errors && typeof error.errors === 'object' ? error.errors : {};
        submitError = error?.message || 'Khong the xac thuc OTP. Vui long thu lai.';
      } finally {
        isSubmitting = false;
        render();
      }
    }
  });

  root.addEventListener('click', async (event) => {
    if (event.target.closest('[data-back-register]')) {
      step = 'register';
      fieldErrors = {};
      submitError = '';
      successMessage = '';
      render();
      return;
    }

    if (!event.target.closest('[data-resend-otp]')) return;

    try {
      isSubmitting = true;
      fieldErrors = {};
      submitError = '';
      successMessage = '';
      render();
      registration = await authService.resendRegistrationOtp(registration?.verification_token);
      successMessage = 'Da gui lai ma xac thuc. Vui long kiem tra lai.';
    } catch (error) {
      submitError = error?.message || 'Khong the gui lai OTP. Vui long thu lai.';
    } finally {
      isSubmitting = false;
      render();
    }
  });
};
