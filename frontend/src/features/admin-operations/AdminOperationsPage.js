import { adminOperationsService } from '../../services/adminOperationsService.js';

const moneyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
});

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const formatMoney = (value) => moneyFormatter.format(Number(value || 0));

const pageStyles = `
  <style>
    .ops-page { display: grid; gap: 18px; }
    .ops-header { display: flex; justify-content: space-between; gap: 18px; align-items: flex-end; padding-bottom: 18px; border-bottom: 1px solid var(--line); }
    .ops-header h1 { margin: 0 0 8px; font-size: 34px; }
    .ops-header p, .ops-card span, .ops-card small { margin: 0; color: var(--muted); line-height: 1.5; }
    .ops-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .ops-card, .ops-panel { border: 1px solid var(--line); border-radius: 8px; background: #fff; box-shadow: var(--shadow-soft); }
    .ops-card { display: grid; gap: 6px; padding: 16px; }
    .ops-card strong { font-size: 26px; }
    .ops-sections { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; align-items: start; }
    .ops-panel { display: grid; gap: 14px; padding: 18px; }
    .ops-panel h2 { margin: 0; font-size: 22px; }
    .ops-form { display: grid; gap: 10px; }
    .ops-form label { display: grid; gap: 6px; color: var(--muted); font-size: 13px; font-weight: 800; }
    .ops-form input, .ops-form select { width: 100%; min-height: 40px; border: 1px solid var(--line); border-radius: 6px; padding: 9px 10px; color: var(--ink); background: #fff; }
    .ops-form-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .ops-list { display: grid; gap: 8px; max-height: 320px; overflow: auto; }
    .ops-item { display: grid; gap: 4px; padding: 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface-soft); }
    .ops-alert { padding: 12px; border-radius: 8px; font-weight: 800; }
    .ops-alert.success { border: 1px solid #bbf7d0; background: #f0fdf4; color: #166534; }
    .ops-alert.error { border: 1px solid #fecaca; background: #fff5f5; color: #991b1b; }
    @media (max-width: 1000px) { .ops-grid, .ops-sections { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 680px) { .ops-header, .ops-grid, .ops-sections, .ops-form-row { grid-template-columns: 1fr; display: grid; } }
  </style>
`;

const renderReport = (report = {}) => {
  const kpis = report.kpis || {};
  return `
    <div class="ops-grid">
      <article class="ops-card"><span>Tổng đơn</span><strong>${Number(kpis.total_orders || 0)}</strong></article>
      <article class="ops-card"><span>Đơn chờ</span><strong>${Number(kpis.pending_orders || 0)}</strong></article>
      <article class="ops-card"><span>Doanh thu hoàn tất</span><strong>${formatMoney(kpis.completed_revenue)}</strong></article>
      <article class="ops-card"><span>Guest / Member</span><strong>${Number(kpis.guest_orders || 0)} / ${Number(kpis.member_orders || 0)}</strong></article>
    </div>
  `;
};

const renderList = (items = [], mapper) =>
  items.length ? items.map(mapper).join('') : '<div class="ops-item"><span>Chưa có dữ liệu.</span></div>';

const renderPage = ({ report = {}, catalog = {}, marketing = {}, loyalty = [], fulfillment = {}, support = [], message = '', error = '' } = {}) => `
  <div class="ops-header">
    <div>
      <h1>Vận hành theo use case</h1>
      <p>Bổ sung các nhóm chức năng còn thiếu: catalog, marketing, tích điểm, CSKH, giao vận và đối soát.</p>
    </div>
    <button class="button button-secondary" type="button" data-refresh-ops>Làm mới</button>
  </div>
  ${message ? `<div class="ops-alert success">${escapeHtml(message)}</div>` : ''}
  ${error ? `<div class="ops-alert error">${escapeHtml(error)}</div>` : ''}
  ${renderReport(report)}

  <div class="ops-sections">
    <section class="ops-panel">
      <h2>Catalog & tồn kho</h2>
      <form class="ops-form" data-food-form>
        <div class="ops-form-row">
          <label>Danh mục ID<input name="category_id" placeholder="1" /></label>
          <label>Tên món<input name="food_name" /></label>
        </div>
        <div class="ops-form-row">
          <label>Giá<input name="price" type="number" /></label>
          <label>Tồn kho<input name="quantity" type="number" value="20" /></label>
        </div>
        <label>Ảnh URL<input name="image_url" /></label>
        <button class="button button-primary" type="submit">Lưu món</button>
      </form>
      <div class="ops-list">
        ${renderList(catalog.foods || [], (food) => `<article class="ops-item"><strong>${escapeHtml(food.food_name)}</strong><span>${formatMoney(food.price)} - tồn ${food.is_unlimited ? 'không giới hạn' : Number(food.inventory_quantity || 0)}</span></article>`)}
      </div>
    </section>

    <section class="ops-panel">
      <h2>Marketing & voucher</h2>
      <form class="ops-form" data-voucher-form>
        <div class="ops-form-row">
          <label>Mã<input name="voucher_code" /></label>
          <label>Tên<input name="voucher_name" /></label>
        </div>
        <div class="ops-form-row">
          <label>Loại<select name="discount_type"><option value="AMOUNT">Số tiền</option><option value="PERCENT">Phần trăm</option></select></label>
          <label>Giá trị<input name="discount_value" type="number" /></label>
        </div>
        <div class="ops-form-row">
          <label>Đối tượng<select name="target_type"><option value="PUBLIC">Public</option><option value="MEMBER">Member</option><option value="PERSONAL">Personal</option></select></label>
          <label>Hết hạn<input name="end_date" type="datetime-local" /></label>
        </div>
        <button class="button button-primary" type="submit">Lưu voucher</button>
      </form>
      <div class="ops-list">
        ${renderList(marketing.vouchers || [], (voucher) => `<article class="ops-item"><strong>${escapeHtml(voucher.voucher_code)}</strong><span>${escapeHtml(voucher.target_type)} - ${escapeHtml(voucher.status)}</span></article>`)}
      </div>
    </section>

    <section class="ops-panel">
      <h2>Tích điểm</h2>
      <form class="ops-form" data-loyalty-form>
        <label>Tên chương trình<input name="program_name" /></label>
        <div class="ops-form-row">
          <label>Tỷ lệ điểm<input name="point_rate" type="number" value="1" /></label>
          <label>Điểm đổi thưởng<input name="required_points" type="number" value="100" /></label>
        </div>
        <label>Mô tả thưởng<input name="reward_description" /></label>
        <div class="ops-form-row">
          <label>Bắt đầu<input name="start_date" type="datetime-local" /></label>
          <label>Kết thúc<input name="end_date" type="datetime-local" /></label>
        </div>
        <button class="button button-primary" type="submit">Tạo chương trình</button>
      </form>
      <div class="ops-list">
        ${renderList(loyalty || [], (program) => `<article class="ops-item"><strong>${escapeHtml(program.program_name)}</strong><span>${Number(program.required_points)} điểm - ${escapeHtml(program.status)}</span></article>`)}
      </div>
    </section>

    <section class="ops-panel">
      <h2>CSKH, giao vận, đối soát</h2>
      <form class="ops-form" data-reconciliation-form>
        <div class="ops-form-row">
          <label>Từ ngày<input name="period_from" type="date" /></label>
          <label>Đến ngày<input name="period_to" type="date" /></label>
        </div>
        <div class="ops-form-row">
          <label>Nguồn<select name="source_type"><option>COD</option><option>ONLINE</option><option>3PL</option></select></label>
          <label>Thực thu<input name="actual_amount" type="number" /></label>
        </div>
        <label>Hệ thống ghi nhận<input name="system_amount" type="number" /></label>
        <button class="button button-primary" type="submit">Tạo đối soát</button>
      </form>
      <div class="ops-list">
        ${renderList(support || [], (ticket) => `<article class="ops-item"><strong>${escapeHtml(ticket.ticket_code)}</strong><span>${escapeHtml(ticket.title)} - ${escapeHtml(ticket.status)}</span></article>`)}
        ${renderList(fulfillment.reconciliations || [], (row) => `<article class="ops-item"><strong>${escapeHtml(row.source_type)}</strong><span>${escapeHtml(row.status)} - lệch ${formatMoney(row.difference_amount)}</span></article>`)}
      </div>
    </section>
  </div>
`;

const toSqlDateTime = (value) => (value ? String(value).replace('T', ' ') : '');

export const AdminOperationsPage = () => `
  ${pageStyles}
  <section class="ops-page" data-admin-ops-page>
    ${renderPage()}
  </section>
`;

export const mountAdminOperationsPage = () => {
  const root = document.querySelector('[data-admin-ops-page]');
  if (!root) return;

  let state = {};

  const render = () => {
    root.innerHTML = renderPage(state);
  };

  const load = async () => {
    try {
      const [report, catalog, marketing, loyalty, fulfillment, support] = await Promise.all([
        adminOperationsService.getReportSummary(),
        adminOperationsService.getCatalog(),
        adminOperationsService.getMarketing(),
        adminOperationsService.getLoyalty(),
        adminOperationsService.getFulfillment(),
        adminOperationsService.getSupportTickets()
      ]);
      state = { ...state, report, catalog, marketing, loyalty, fulfillment, support, error: '' };
      render();
    } catch (error) {
      state = { ...state, error: error?.message || 'Không thể tải dữ liệu vận hành.' };
      render();
    }
  };

  root.addEventListener('submit', async (event) => {
    const foodForm = event.target.closest('[data-food-form]');
    const voucherForm = event.target.closest('[data-voucher-form]');
    const loyaltyForm = event.target.closest('[data-loyalty-form]');
    const reconciliationForm = event.target.closest('[data-reconciliation-form]');
    if (!foodForm && !voucherForm && !loyaltyForm && !reconciliationForm) return;

    event.preventDefault();
    const formData = new FormData(event.target);

    try {
      if (foodForm) {
        await adminOperationsService.saveFood({
          category_id: formData.get('category_id'),
          food_name: formData.get('food_name'),
          price: formData.get('price'),
          quantity: formData.get('quantity'),
          image_url: formData.get('image_url'),
          status: 'ACTIVE'
        });
        state.message = 'Đã lưu món ăn.';
      } else if (voucherForm) {
        await adminOperationsService.saveVoucher({
          voucher_code: formData.get('voucher_code'),
          voucher_name: formData.get('voucher_name'),
          discount_type: formData.get('discount_type'),
          discount_value: formData.get('discount_value'),
          target_type: formData.get('target_type'),
          start_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
          end_date: toSqlDateTime(formData.get('end_date')),
          status: 'ACTIVE'
        });
        state.message = 'Đã lưu voucher.';
      } else if (loyaltyForm) {
        await adminOperationsService.saveLoyaltyProgram({
          program_name: formData.get('program_name'),
          point_rate: formData.get('point_rate'),
          required_points: formData.get('required_points'),
          reward_description: formData.get('reward_description'),
          reward_type: 'VOUCHER',
          start_date: toSqlDateTime(formData.get('start_date')),
          end_date: toSqlDateTime(formData.get('end_date')),
          status: 'ACTIVE'
        });
        state.message = 'Đã tạo chương trình điểm.';
      } else {
        await adminOperationsService.createReconciliation({
          period_from: formData.get('period_from'),
          period_to: formData.get('period_to'),
          source_type: formData.get('source_type'),
          system_amount: formData.get('system_amount'),
          actual_amount: formData.get('actual_amount')
        });
        state.message = 'Đã tạo phiên đối soát.';
      }
      await load();
    } catch (error) {
      state.error = error?.message || 'Không thể lưu dữ liệu.';
      render();
    }
  });

  root.addEventListener('click', async (event) => {
    if (event.target.closest('[data-refresh-ops]')) {
      await load();
    }
  });

  load();
};
