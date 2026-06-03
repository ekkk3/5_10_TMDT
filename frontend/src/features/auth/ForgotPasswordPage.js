import { authService } from '../../services/authService.js';

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const pageStyles = `
  <style>
    .forgot-page { display: flex; justify-content: center; padding: 4px 0 28px; animation: slideUp 400ms var(--ease); }
    .forgot-panel { width: min(720px, 100%); display: grid; gap: 20px; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--bg-glass); backdrop-filter: blur(10px); padding: 32px; }
    .forgot-heading h1 { margin: 0 0 10px; font-size: 30px; line-height: 1.15; color: var(--text); }
    .forgot-heading p { margin: 0; color: var(--text-muted); line-height: 1.5; font-size: 14px; }
    .forgot-steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .forgot-step { padding: 14px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg-elevated); }
    .forgot-step span { display: block; margin-bottom: 6px; color: var(--accent-light); font-weight: 800; font-size: 14px; }
    .forgot-step strong { display: block; line-height: 1.3; color: var(--text-secondary); font-size: 14px; }
    .forgot-form { display: grid; gap: 16px; }
    .forgot-field { display: grid; gap: 8px; color: var(--text-muted); font-weight: 700; font-size: 14px; }
    .forgot-field input { width: 100%; min-height: 48px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px 14px; color: var(--text); font: inherit; background: var(--bg-elevated); transition: border-color var(--transition), box-shadow var(--transition); }
    .forgot-field input::placeholder { color: var(--text-subtle); }
    .forgot-field input:focus { border-color: var(--accent); outline: 0; box-shadow: var(--focus); }
    .forgot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .forgot-actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .forgot-alert { padding: 14px; border-radius: var(--radius-sm); font-weight: 700; line-height: 1.4; font-size: 14px; }
    .forgot-alert.error { border: 1px solid var(--error-border); background: var(--error-bg); color: var(--error); }
    .forgot-alert.success { border: 1px solid var(--success-border); background: var(--success-bg); color: var(--success); }
    @media (max-width: 640px) {
      .forgot-panel { padding: 24px; }
      .forgot-heading h1 { font-size: 24px; }
      .forgot-steps, .forgot-grid { grid-template-columns: 1fr; }
      .forgot-actions .button { width: 100%; text-align: center; }
    }
  </style>
`;

export const ForgotPasswordPage = () => `
  ${pageStyles}
  <section class="forgot-page" data-forgot-page>
    <div class="forgot-panel">
      <div class="forgot-heading">
        <h1>🔑 Khôi phục mật khẩu</h1>
        <p>Gửi OTP qua email hoặc số điện thoại đã đăng ký, sau đó tạo mật khẩu mới cho tài khoản.</p>
      </div>
      <div data-forgot-message></div>
      <div class="forgot-steps" aria-label="Các bước khôi phục">
        <div class="forgot-step"><span>1</span><strong>Nhập email hoặc số điện thoại</strong></div>
        <div class="forgot-step"><span>2</span><strong>Xác thực OTP</strong></div>
        <div class="forgot-step"><span>3</span><strong>Đặt mật khẩu mới</strong></div>
      </div>
      <form class="forgot-form" data-forgot-form>
        <label class="forgot-field">
          <span>Email hoặc số điện thoại</span>
          <input name="identifier" type="text" autocomplete="username" placeholder="name@example.com hoặc 0900000000" />
        </label>
        <label class="forgot-field">
          <span>Mã OTP</span>
          <input name="otp" type="text" inputmode="numeric" maxlength="6" placeholder="123456" />
        </label>
        <div class="forgot-grid">
          <label class="forgot-field">
            <span>Mật khẩu mới</span>
            <input name="password" type="password" autocomplete="new-password" placeholder="••••••••" />
          </label>
          <label class="forgot-field">
            <span>Nhập lại mật khẩu mới</span>
            <input name="confirm_password" type="password" autocomplete="new-password" placeholder="••••••••" />
          </label>
        </div>
        <div class="forgot-actions">
          <button class="button button-primary" type="button" data-request-reset>Gửi mã</button>
          <button class="button button-secondary" type="submit">Cập nhật mật khẩu</button>
          <a class="button button-ghost" href="#/login">← Quay lại đăng nhập</a>
        </div>
      </form>
    </div>
  </section>
`;

export const mountForgotPasswordPage = () => {
  const root = document.querySelector('[data-forgot-page]');
  if (!root) return;

  let verificationToken = '';
  const messageRoot = root.querySelector('[data-forgot-message]');
  const form = root.querySelector('[data-forgot-form]');

  const setMessage = (message, type = 'success') => {
    messageRoot.innerHTML = message ? `<div class="forgot-alert ${type}">${escapeHtml(message)}</div>` : '';
  };

  root.querySelector('[data-request-reset]')?.addEventListener('click', async () => {
    const identifier = String(new FormData(form).get('identifier') || '').trim();
    if (!identifier) {
      setMessage('Vui lòng nhập email hoặc số điện thoại.', 'error');
      return;
    }

    try {
      const result = await authService.requestPasswordReset(identifier);
      verificationToken = result.verification_token;
      setMessage(`Đã gửi OTP tới ${result.receiver}.${result.dev_otp ? ` OTP demo: ${result.dev_otp}` : ''}`);
    } catch (error) {
      setMessage(error?.message || 'Không thể gửi OTP khôi phục mật khẩu.', 'error');
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const password = String(formData.get('password') || '');
    const confirmPassword = String(formData.get('confirm_password') || '');

    if (!verificationToken) {
      setMessage('Vui lòng gửi OTP trước khi cập nhật mật khẩu.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Mật khẩu nhập lại chưa khớp.', 'error');
      return;
    }

    try {
      await authService.resetPassword({
        verificationToken,
        otp: String(formData.get('otp') || '').trim(),
        password
      });
      setMessage('Đã cập nhật mật khẩu. Bạn có thể đăng nhập lại.');
      window.setTimeout(() => {
        window.location.hash = '#/login';
      }, 900);
    } catch (error) {
      setMessage(error?.message || 'Không thể cập nhật mật khẩu.', 'error');
    }
  });
};
