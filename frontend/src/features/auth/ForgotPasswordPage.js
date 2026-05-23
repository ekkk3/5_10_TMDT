const pageStyles = `
  <style>
    .forgot-page { display: flex; justify-content: center; padding: 4px 0 28px; }
    .forgot-panel { width: min(760px, 100%); display: grid; gap: 18px; border: 1px solid var(--line); border-radius: 8px; background: #fff; box-shadow: 0 12px 28px rgba(116, 36, 0, 0.08); padding: 24px; }
    .forgot-heading h1 { margin: 0 0 8px; font-size: 34px; line-height: 1.15; }
    .forgot-heading p { margin: 0; color: var(--muted); line-height: 1.5; }
    .forgot-steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .forgot-step { padding: 12px; border: 1px solid #ffe0aa; border-radius: 8px; background: #fffaf3; }
    .forgot-step span { display: block; margin-bottom: 6px; color: var(--red); font-weight: 900; }
    .forgot-step strong { display: block; line-height: 1.3; }
    .forgot-form { display: grid; gap: 14px; }
    .forgot-field { display: grid; gap: 7px; color: var(--muted); font-weight: 800; }
    .forgot-field input { width: 100%; min-height: 44px; border: 1px solid var(--line); border-radius: 6px; padding: 10px 12px; color: var(--ink); font: inherit; background: #fff; }
    .forgot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .forgot-actions { display: flex; gap: 10px; flex-wrap: wrap; }
    @media (max-width: 640px) {
      .forgot-panel { padding: 18px; }
      .forgot-heading h1 { font-size: 28px; }
      .forgot-steps, .forgot-grid { grid-template-columns: 1fr; }
      .forgot-actions .button { width: 100%; text-align: center; }
    }
  </style>
`;

export const ForgotPasswordPage = () => `
  ${pageStyles}
  <section class="forgot-page">
    <div class="forgot-panel">
      <div class="forgot-heading">
        <h1>Khoi phuc mat khau</h1>
        <p>Giao dien theo wireframe UC-30: gui ma xac thuc, nhap OTP va tao mat khau moi. Phan nay chi cap nhat UI, chua ket noi API khoi phuc mat khau.</p>
      </div>
      <div class="forgot-steps" aria-label="Cac buoc khoi phuc">
        <div class="forgot-step"><span>1</span><strong>Nhap email hoac so dien thoai</strong></div>
        <div class="forgot-step"><span>2</span><strong>Xac thuc OTP</strong></div>
        <div class="forgot-step"><span>3</span><strong>Dat mat khau moi</strong></div>
      </div>
      <form class="forgot-form">
        <label class="forgot-field">
          <span>Email hoac so dien thoai</span>
          <input type="text" autocomplete="username" placeholder="name@example.com hoac 0900000000" />
        </label>
        <label class="forgot-field">
          <span>Ma OTP</span>
          <input type="text" inputmode="numeric" maxlength="6" placeholder="123456" />
        </label>
        <div class="forgot-grid">
          <label class="forgot-field">
            <span>Mat khau moi</span>
            <input type="password" autocomplete="new-password" />
          </label>
          <label class="forgot-field">
            <span>Nhap lai mat khau moi</span>
            <input type="password" autocomplete="new-password" />
          </label>
        </div>
        <div class="forgot-actions">
          <button class="button button-primary" type="button">Gui ma</button>
          <button class="button button-secondary" type="button">Cap nhat mat khau</button>
          <a class="button button-secondary" href="#/login">Quay lai dang nhap</a>
        </div>
      </form>
    </div>
  </section>
`;
