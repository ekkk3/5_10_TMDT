import { supportService } from '../../services/supportService.js';
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
    .support-page { display: grid; gap: 18px; }
    .support-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 18px; padding-bottom: 18px; border-bottom: 1px solid var(--line); }
    .support-header h1 { margin: 0 0 8px; font-size: 34px; }
    .support-header p { margin: 0; color: var(--muted); line-height: 1.5; }
    .support-layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 18px; align-items: start; }
    .support-panel { display: grid; gap: 14px; padding: 20px; border: 1px solid var(--line); border-radius: 8px; background: #fff; box-shadow: var(--shadow-soft); }
    .support-form { display: grid; gap: 12px; }
    .support-form label { display: grid; gap: 7px; color: var(--muted); font-weight: 800; }
    .support-form input, .support-form select, .support-form textarea { width: 100%; border: 1px solid var(--line); border-radius: 6px; padding: 10px 12px; color: var(--ink); font: inherit; background: #fff; }
    .support-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .support-alert { padding: 12px; border-radius: 8px; font-weight: 800; }
    .support-alert.success { border: 1px solid #bbf7d0; background: #f0fdf4; color: #166534; }
    .support-alert.error { border: 1px solid #fecaca; background: #fff5f5; color: #991b1b; }
    .support-ticket { display: grid; gap: 8px; padding: 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface-soft); }
    .support-ticket span { color: var(--muted); }
    @media (max-width: 860px) {
      .support-header, .support-layout, .support-grid { grid-template-columns: 1fr; display: grid; }
    }
  </style>
`;

const renderTicket = (ticket) => `
  <article class="support-ticket">
    <strong>${escapeHtml(ticket.ticket_code)}</strong>
    <span>${escapeHtml(ticket.ticket_type)} - ${escapeHtml(ticket.status)}</span>
    <p>${escapeHtml(ticket.title)}</p>
  </article>
`;

const renderPage = ({ message = '', error = '', tickets = [], isMember = false } = {}) => `
  <div class="support-header">
    <div>
      <h1>Hỗ trợ & khiếu nại</h1>
      <p>Gửi yêu cầu hỗ trợ, phản hồi đơn hàng hoặc theo dõi trạng thái xử lý từ CSKH.</p>
    </div>
    ${isMember ? '<a class="button button-secondary" href="#/account">Tài khoản</a>' : '<a class="button button-secondary" href="#/login">Đăng nhập</a>'}
  </div>

  ${message ? `<div class="support-alert success">${escapeHtml(message)}</div>` : ''}
  ${error ? `<div class="support-alert error">${escapeHtml(error)}</div>` : ''}

  <div class="support-layout">
    <section class="support-panel">
      <h2>Gửi yêu cầu mới</h2>
      <form class="support-form" data-support-form>
        <div class="support-grid">
          <label><span>Họ tên</span><input name="guest_name" ${isMember ? 'disabled' : ''} /></label>
          <label><span>Số điện thoại</span><input name="guest_phone" ${isMember ? 'disabled' : ''} /></label>
        </div>
        <div class="support-grid">
          <label>
            <span>Loại yêu cầu</span>
            <select name="ticket_type">
              <option value="ORDER_SUPPORT">Hỗ trợ đơn hàng</option>
              <option value="COMPLAINT">Khiếu nại</option>
              <option value="RETURN_REFUND">Đổi trả/hoàn tiền</option>
              <option value="FEEDBACK">Góp ý</option>
              <option value="ACCOUNT_ERROR">Lỗi tài khoản</option>
              <option value="OTHER">Khác</option>
            </select>
          </label>
          <label><span>Mã đơn nếu có</span><input name="order_code" /></label>
        </div>
        <label><span>Tiêu đề</span><input name="title" maxlength="150" /></label>
        <label><span>Nội dung</span><textarea name="content" rows="5"></textarea></label>
        <label><span>Link minh chứng</span><input name="evidence_url" placeholder="https://..." /></label>
        <button class="button button-primary" type="submit">Gửi yêu cầu</button>
      </form>
    </section>

    <aside class="support-panel">
      <h2>Theo dõi yêu cầu</h2>
      <form class="support-form" data-ticket-search>
        <label><span>Mã ticket</span><input name="ticket_code" placeholder="TK..." /></label>
        <label><span>SĐT khách vãng lai</span><input name="phone" /></label>
        <button class="button button-secondary" type="submit">Tra cứu</button>
      </form>
      <div class="support-ticket-list">
        ${(tickets || []).map(renderTicket).join('') || '<div class="support-ticket"><span>Chưa có yêu cầu hiển thị.</span></div>'}
      </div>
    </aside>
  </div>
`;

export const SupportPage = () => `
  ${pageStyles}
  <section class="support-page" data-support-page>
    ${renderPage({ isMember: Boolean(authService.getCurrentSession()?.token) })}
  </section>
`;

export const mountSupportPage = async () => {
  const root = document.querySelector('[data-support-page]');
  if (!root) return;

  let state = {
    message: '',
    error: '',
    tickets: [],
    isMember: Boolean(authService.getCurrentSession()?.token)
  };

  const render = () => {
    root.innerHTML = renderPage(state);
  };

  const loadMine = async () => {
    if (!state.isMember) return;
    try {
      state.tickets = await supportService.getMine();
      render();
    } catch (error) {
      state.tickets = [];
    }
  };

  root.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-support-form]');
    const search = event.target.closest('[data-ticket-search]');
    if (!form && !search) return;

    event.preventDefault();
    state.message = '';
    state.error = '';

    try {
      if (form) {
        const formData = new FormData(form);
        const ticket = await supportService.createTicket({
          guest_name: String(formData.get('guest_name') || '').trim(),
          guest_phone: String(formData.get('guest_phone') || '').trim(),
          ticket_type: String(formData.get('ticket_type') || '').trim(),
          order_code: String(formData.get('order_code') || '').trim(),
          title: String(formData.get('title') || '').trim(),
          content: String(formData.get('content') || '').trim(),
          evidence_url: String(formData.get('evidence_url') || '').trim()
        });
        state.message = `Đã tạo ticket ${ticket.ticket_code}.`;
        await loadMine();
      } else {
        const formData = new FormData(search);
        const ticket = await supportService.getTicket({
          ticketCode: String(formData.get('ticket_code') || '').trim(),
          phone: String(formData.get('phone') || '').trim()
        });
        state.tickets = [ticket];
        render();
      }
    } catch (error) {
      state.error = error?.message || 'Không thể xử lý yêu cầu hỗ trợ.';
      render();
    }
  });

  await loadMine();
};
