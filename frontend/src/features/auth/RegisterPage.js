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
  const acceptedTerms = formData.get('accepted_terms') === 'on';
  const errors = {};

  if (!fullName) errors.full_name = 'Vui lòng nhập họ tên';
  if (!email && !phone) errors.contact = 'Vui lòng nhập email hoặc số điện thoại';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Email không đúng định dạng';
  if (phone && !/^(0\d{9}|\+84\d{9})$/.test(phone)) errors.phone = 'Số điện thoại không đúng định dạng';
  if (password.length < 8) errors.password = 'Mật khẩu tối thiểu 8 ký tự';
  if (password && !/[a-z]/.test(password)) errors.password = 'Mật khẩu cần có chữ thường';
  if (password && !/[A-Z]/.test(password)) errors.password = 'Mật khẩu cần có chữ hoa';
  if (password && !/\d/.test(password)) errors.password = 'Mật khẩu cần có chữ số';
  if (password && !/[^A-Za-z0-9]/.test(password)) errors.password = 'Mật khẩu cần có ký tự đặc biệt';
  if (password !== confirmPassword) errors.confirm_password = 'Mật khẩu nhập lại không khớp';
  if (!acceptedTerms) errors.accepted_terms = 'Vui lòng đồng ý điều khoản trước khi đăng ký';

  return {
    errors,
    values: { full_name: fullName, email, phone, password }
  };
};

const renderFieldError = (errors, fieldName) =>
  errors[fieldName] ? `<p class="auth-field__error">${escapeHtml(errors[fieldName])}</p>` : '';

const renderDevOtp = (registration) =>
  registration?.dev_otp
    ? `<p class="auth-dev-otp">Mã OTP demo: <strong>${escapeHtml(registration.dev_otp)}</strong></p>`
    : '';

const renderRegisterForm = ({ fieldErrors = {}, submitError = '', isSubmitting = false, values = {} } = {}) => `
  <div class="auth-panel">
    <div class="auth-heading">
      <div class="auth-steps"><span class="auth-step is-active">1. Thông tin</span><span class="auth-step">2. Xác thực</span><span class="auth-step">3. Hoàn tất</span></div>
      <h1>Đăng ký tài khoản</h1>
      <p>Tạo tài khoản thành viên để theo dõi đơn hàng và nhận ưu đãi riêng.</p>
    </div>
    <form class="auth-form" data-register-form novalidate>
      ${submitError ? `<div class="auth-alert auth-alert--error">${escapeHtml(submitError)}</div>` : ''}
      ${fieldErrors.contact ? `<div class="auth-alert auth-alert--error">${escapeHtml(fieldErrors.contact)}</div>` : ''}
      <label class="auth-field ${fieldErrors.full_name ? 'has-error' : ''}">
        <span>Họ tên</span>
        <input name="full_name" type="text" maxlength="100" autocomplete="name" placeholder="Nguyễn Văn A" value="${escapeHtml(values.full_name || '')}" />
        ${renderFieldError(fieldErrors, 'full_name')}
      </label>
      <div class="auth-grid">
        <label class="auth-field ${fieldErrors.email ? 'has-error' : ''}">
          <span>Email</span>
          <input name="email" type="email" maxlength="100" autocomplete="email" placeholder="name@example.com" value="${escapeHtml(values.email || '')}" />
          ${renderFieldError(fieldErrors, 'email')}
        </label>
        <label class="auth-field ${fieldErrors.phone ? 'has-error' : ''}">
          <span>Số điện thoại</span>
          <input name="phone" type="tel" maxlength="20" autocomplete="tel" placeholder="0900000000" value="${escapeHtml(values.phone || '')}" />
          ${renderFieldError(fieldErrors, 'phone')}
        </label>
      </div>
      <label class="auth-field ${fieldErrors.password ? 'has-error' : ''}">
        <span>Mật khẩu</span>
        <input name="password" type="password" autocomplete="new-password" placeholder="Tối thiểu 8 ký tự" />
        ${renderFieldError(fieldErrors, 'password')}
      </label>
      <label class="auth-field ${fieldErrors.confirm_password ? 'has-error' : ''}">
        <span>Nhập lại mật khẩu</span>
        <input name="confirm_password" type="password" autocomplete="new-password" placeholder="••••••••" />
        ${renderFieldError(fieldErrors, 'confirm_password')}
      </label>
      <label class="auth-check ${fieldErrors.accepted_terms ? 'has-error' : ''}">
        <input name="accepted_terms" type="checkbox" />
        <span>Tôi đồng ý với điều khoản sử dụng và chính sách bảo mật của cửa hàng.</span>
      </label>
      ${renderFieldError(fieldErrors, 'accepted_terms')}
      <button class="button button-primary auth-submit" type="submit" ${isSubmitting ? 'disabled' : ''}>
        ${isSubmitting ? 'Đang gửi mã...' : 'Đăng ký'}
      </button>
      <p class="auth-alt">Đã có tài khoản? <a href="#/login">Đăng nhập</a></p>
    </form>
  </div>
`;

const renderOtpForm = ({ registration, fieldErrors = {}, submitError = '', successMessage = '', isSubmitting = false } = {}) => `
  <div class="auth-panel">
    <div class="auth-heading">
      <div class="auth-steps"><span class="auth-step is-done">1. Thông tin</span><span class="auth-step is-active">2. Xác thực</span><span class="auth-step">3. Hoàn tất</span></div>
      <h1>Xác thực đăng ký</h1>
      <p>Nhập mã OTP đã gửi đến ${escapeHtml(registration?.receiver || 'email/số điện thoại của bạn')}.</p>
    </div>
    <form class="auth-form" data-otp-form novalidate>
      ${submitError ? `<div class="auth-alert auth-alert--error">${escapeHtml(submitError)}</div>` : ''}
      ${successMessage ? `<div class="auth-alert auth-alert--success">${escapeHtml(successMessage)}</div>` : ''}
      ${renderDevOtp(registration)}
      <label class="auth-field ${fieldErrors.otp ? 'has-error' : ''}">
        <span>Mã OTP</span>
        <input name="otp" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="123456" />
        ${renderFieldError(fieldErrors, 'otp')}
      </label>
      <button class="button button-primary auth-submit" type="submit" ${isSubmitting ? 'disabled' : ''}>
        ${isSubmitting ? 'Đang xác thực...' : 'Xác thực tài khoản'}
      </button>
      <div class="auth-actions">
        <button class="button button-secondary" type="button" data-resend-otp ${isSubmitting ? 'disabled' : ''}>Gửi lại mã</button>
        <button class="auth-link-button" type="button" data-back-register>Nhập lại thông tin</button>
      </div>
    </form>
  </div>
`;

const renderSuccess = (account) => `
  <div class="auth-panel auth-panel--success">
    <div class="auth-heading">
      <div class="auth-steps"><span class="auth-step is-done">1. Thông tin</span><span class="auth-step is-done">2. Xác thực</span><span class="auth-step is-active">3. Hoàn tất</span></div>
      <div style="font-size:48px;margin:16px 0;">🎉</div>
      <h1>Đăng ký thành công</h1>
      <p>Tài khoản ${escapeHtml(account?.full_name || '')} đã được tạo. Bạn có thể đăng nhập hoặc tiếp tục mua hàng với quyền thành viên.</p>
    </div>
    <div class="auth-success-actions">
      <a class="button button-primary" href="#/login">Đăng nhập</a>
      <a class="button button-secondary" href="#/menu">Xem thực đơn</a>
    </div>
  </div>
`;

const pageStyles = `
  <style>
    .register-page { display: flex; justify-content: center; padding: 4px 0 28px; animation: slideUp 400ms var(--ease); }
    .auth-panel { width: min(640px, 100%); border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--bg-glass); backdrop-filter: blur(10px); padding: 32px; }
    .auth-heading { margin-bottom: 24px; }
    .auth-heading h1 { margin: 0 0 10px; font-size: 30px; line-height: 1.15; color: var(--text); }
    .auth-heading p { margin: 0; color: var(--text-muted); line-height: 1.5; }
    .auth-steps { display: flex; gap: 8px; margin-bottom: 20px; }
    .auth-step { display: inline-flex; align-items: center; padding: 5px 12px; border-radius: var(--radius-full); background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text-subtle); font-size: 12px; font-weight: 700; }
    .auth-step.is-active { background: var(--accent); border-color: var(--accent); color: #fff; box-shadow: 0 2px 8px rgba(225,29,72,0.3); }
    .auth-step.is-done { background: var(--success-bg); border-color: var(--success-border); color: var(--success); }
    .auth-form { display: grid; gap: 16px; }
    .auth-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .auth-field { display: grid; gap: 8px; color: var(--text-muted); font-weight: 700; font-size: 14px; }
    .auth-field input { width: 100%; min-height: 48px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px 14px; color: var(--text); font: inherit; background: var(--bg-elevated); transition: border-color var(--transition), box-shadow var(--transition); }
    .auth-field input::placeholder { color: var(--text-subtle); }
    .auth-field input:focus { border-color: var(--accent); outline: 0; box-shadow: var(--focus); }
    .auth-field.has-error input { border-color: var(--error); box-shadow: 0 0 0 3px rgba(239,68,68,0.15); }
    .auth-field__error { margin: 0; color: var(--error); font-size: 13px; line-height: 1.35; }
    .auth-check { display: flex; gap: 10px; align-items: flex-start; color: var(--text-muted); font-weight: 600; line-height: 1.45; font-size: 14px; }
    .auth-check input { width: 18px; height: 18px; margin-top: 2px; flex: 0 0 auto; accent-color: var(--accent); }
    .auth-check.has-error span { color: var(--error); }
    .auth-alert { padding: 14px; border-radius: var(--radius-sm); font-weight: 700; line-height: 1.4; font-size: 14px; }
    .auth-alert--error { border: 1px solid var(--error-border); color: var(--error); background: var(--error-bg); }
    .auth-alert--success { border: 1px solid var(--success-border); color: var(--success); background: var(--success-bg); }
    .auth-submit { min-height: 48px; width: 100%; }
    .auth-alt { margin: 0; color: var(--text-muted); text-align: center; font-size: 14px; }
    .auth-alt a, .auth-link-button { color: var(--accent-light); font-weight: 700; }
    .auth-dev-otp { margin: 0; padding: 12px; border: 1px dashed var(--border-hover); border-radius: var(--radius-sm); background: var(--bg-elevated); color: var(--text-muted); }
    .auth-dev-otp strong { color: var(--accent-light); }
    .auth-actions, .auth-success-actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; justify-content: center; }
    .auth-link-button { border: 0; background: transparent; cursor: pointer; font: inherit; }
    .auth-panel--success { text-align: center; }
    @media (max-width: 640px) {
      .auth-panel { padding: 24px; }
      .auth-heading h1 { font-size: 24px; }
      .auth-grid { grid-template-columns: 1fr; }
      .auth-steps { flex-wrap: wrap; }
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
        successMessage = 'Mã xác thực đã được gửi. Vui lòng kiểm tra email hoặc điện thoại.';
      } catch (error) {
        fieldErrors = error?.errors && typeof error.errors === 'object' ? error.errors : {};
        submitError = error?.message || 'Không thể đăng ký. Vui lòng thử lại.';
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
        fieldErrors.otp = 'Mã OTP gồm 6 chữ số';
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
        submitError = error?.message || 'Không thể xác thực OTP. Vui lòng thử lại.';
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
      successMessage = 'Đã gửi lại mã xác thực. Vui lòng kiểm tra lại.';
    } catch (error) {
      submitError = error?.message || 'Không thể gửi lại OTP. Vui lòng thử lại.';
    } finally {
      isSubmitting = false;
      render();
    }
  });
};
