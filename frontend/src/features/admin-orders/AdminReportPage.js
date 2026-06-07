import { adminReportService } from '../../services/adminReportService.js';

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const formatMoney = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const formatMoneyRaw = (value) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(value || 0));

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
};

const formatReportPeriod = (value, groupBy = 'day', periodEnd = '') => {
  if (!value) return '-';

  const raw = String(value).trim();

  if (groupBy === 'month') {
    const monthMatch = raw.match(/^(\d{4})-(\d{2})$/);
    if (monthMatch) return `${monthMatch[2]}/${monthMatch[1]}`;
  }

  const dateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const parsedDate = dateMatch
    ? new Date(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]))
    : new Date(raw);

  if (Number.isNaN(parsedDate.getTime())) return raw;

  const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const formattedDate = dateFormatter.format(parsedDate);

  if (groupBy === 'week') {
    const endRaw = String(periodEnd || '').trim();
    const endMatch = endRaw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const parsedEndDate = endMatch
      ? new Date(Number(endMatch[1]), Number(endMatch[2]) - 1, Number(endMatch[3]))
      : new Date(endRaw);
    const formattedEndDate = Number.isNaN(parsedEndDate.getTime()) ? '' : dateFormatter.format(parsedEndDate);

    return formattedEndDate
      ? `Tu\u1ea7n t\u1eeb ${formattedDate} \u0111\u1ebfn ${formattedEndDate}`
      : `Tu\u1ea7n t\u1eeb ${formattedDate}`;
  }

  return groupBy === 'week' ? `Tuần từ ${formattedDate}` : formattedDate;
};

const getErrorMessage = (error, fallback) => error?.message || fallback;

const getDefaultFrom = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
};

const getDefaultTo = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/* ─────────────────────────── STYLES ─────────────────────────── */

const pageStyles = `
  <style>
    /* ── Animations ── */
    @keyframes reportSlideUp {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes reportPulse {
      0%, 100% { opacity: 1; }
      50%      { opacity: .55; }
    }
    @keyframes reportShimmer {
      0%   { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }

    /* ── Page Layout ── */
    .report-page {
      display: grid;
      gap: 24px;
      animation: reportSlideUp 400ms var(--ease, cubic-bezier(.22,1,.36,1));
    }

    /* ── Header ── */
    .report-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
    }
    .report-header h1 {
      margin: 0 0 6px;
      font-size: 32px;
      background: linear-gradient(135deg, var(--accent, #e65100), #ff8f00);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .report-header p {
      margin: 0;
      color: var(--text-muted, #777);
      line-height: 1.5;
    }

    /* ── Filter Bar ── */
    .report-filters {
      display: grid;
      grid-template-columns: repeat(6, minmax(140px, 1fr));
      gap: 14px 16px;
      align-items: end;
      padding: 20px;
      border: 1px solid var(--border, #ffe0aa);
      border-radius: var(--radius-lg, 12px);
      background: var(--bg-glass, rgba(255,255,255,.85));
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: 0 4px 24px rgba(116, 36, 0, .06);
    }
    .report-field {
      display: grid;
      gap: 6px;
      color: var(--text-muted, #777);
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .5px;
    }
    .report-field input,
    .report-field select {
      width: 100%;
      border: 1px solid var(--border, #ffe0aa);
      border-radius: var(--radius-sm, 8px);
      padding: 10px 12px;
      color: var(--text, #1a1a1a);
      font: inherit;
      font-size: 14px;
      font-weight: 600;
      background: #fff;
      transition: border-color .2s var(--ease, ease), box-shadow .2s var(--ease, ease);
    }
    .report-field input:focus,
    .report-field select:focus {
      outline: none;
      border-color: var(--accent, #e65100);
      box-shadow: 0 0 0 3px var(--focus, rgba(230,81,0,.12));
    }
    .report-filter-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      grid-column: 1 / -1;
      align-items: end;
      justify-content: flex-end;
      padding-top: 4px;
    }
    .report-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 40px;
      min-width: 128px;
      padding: 10px 16px;
      border: 0;
      border-radius: var(--radius-sm, 8px);
      font: inherit;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
      white-space: nowrap;
      transition: all .2s var(--ease, ease);
    }
    .report-btn:active { transform: scale(.97); }
    .report-btn.primary {
      color: #fff;
      background: linear-gradient(135deg, var(--accent, #e65100), var(--accent-hover, #bf4500));
      box-shadow: 0 4px 14px rgba(230,81,0,.25);
    }
    .report-btn.primary:hover {
      box-shadow: 0 6px 20px rgba(230,81,0,.35);
      transform: translateY(-1px);
    }
    .report-btn.secondary {
      color: #ffffff;                /* chữ trắng */
      background: #d97706;           /* nền cam đậm (hoặc #b45309 nâu cam) */
      border: 1px solid #f59e0b;
    }
    .report-btn.secondary:hover {
      background: #b45309;           /* tối hơn khi hover */
      transform: translateY(-1px);
    }

    /* ── KPI Cards ── */
    .report-kpi-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 14px;
    }
    .report-kpi-card {
      position: relative;
      padding: 20px 16px 16px;
      border: 1px solid var(--border, #ffe0aa);
      border-radius: var(--radius-lg, 12px);
      background: var(--bg-elevated, #fff);
      overflow: hidden;
      transition: all .25s var(--ease, ease);
      animation: reportSlideUp 400ms var(--ease, ease) backwards;
    }
    .report-kpi-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      border-radius: 4px 0 0 4px;
    }
    .report-kpi-card:nth-child(1)::before { background: linear-gradient(180deg, #e65100, #ff8f00); }
    .report-kpi-card:nth-child(2)::before { background: linear-gradient(180deg, #2e7d32, #66bb6a); }
    .report-kpi-card:nth-child(3)::before { background: linear-gradient(180deg, #1565c0, #42a5f5); }
    .report-kpi-card:nth-child(4)::before { background: linear-gradient(180deg, #6a1b9a, #ab47bc); }
    .report-kpi-card:nth-child(5)::before { background: linear-gradient(180deg, #c62828, #ef5350); }
    .report-kpi-card:nth-child(6)::before { background: linear-gradient(180deg, #f57f17, #ffb300); }
    .report-kpi-card:nth-child(1) { animation-delay: 0ms; }
    .report-kpi-card:nth-child(2) { animation-delay: 50ms; }
    .report-kpi-card:nth-child(3) { animation-delay: 100ms; }
    .report-kpi-card:nth-child(4) { animation-delay: 150ms; }
    .report-kpi-card:nth-child(5) { animation-delay: 200ms; }
    .report-kpi-card:nth-child(6) { animation-delay: 250ms; }
    .report-kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 28px rgba(116, 36, 0, .10);
    }
    .report-kpi-icon {
      font-size: 22px;
      margin-bottom: 8px;
      display: block;
    }
    .report-kpi-label {
      display: block;
      margin-bottom: 6px;
      color: var(--text-muted, #777);
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .5px;
    }
    .report-kpi-value {
      font-size: 22px;
      font-weight: 900;
      color: var(--text, #1a1a1a);
      line-height: 1.2;
      word-break: break-word;
    }

    /* ── Extra Stats Row ── */
    .report-extra-stats {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .report-extra-stat {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border: 1px solid var(--border, #ffe0aa);
      border-radius: var(--radius-sm, 8px);
      background: var(--bg-glass, rgba(255,255,255,.85));
      font-weight: 800;
      font-size: 14px;
    }
    .report-extra-stat span {
      color: var(--text-muted, #777);
      font-weight: 700;
      font-size: 13px;
    }

    /* ── Table Panels ── */
    .report-panel {
      overflow-x: auto;
      border: 1px solid var(--border, #ffe0aa);
      border-radius: var(--radius-lg, 12px);
      background: var(--bg-elevated, #fff);
      box-shadow: 0 12px 28px rgba(116, 36, 0, .06);
      animation: reportSlideUp 400ms var(--ease, ease);
    }
    .report-panel-title {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0;
      padding: 18px 20px 0;
      font-size: 18px;
      color: var(--text, #1a1a1a);
    }
    .report-panel-title .panel-icon {
      font-size: 20px;
    }
    .report-table {
      width: 100%;
      min-width: 600px;
      border-collapse: collapse;
    }
    .report-table th,
    .report-table td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border, #ffe0aa);
      text-align: left;
      vertical-align: middle;
    }
    .report-table th {
      color: var(--text-muted, #777);
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .5px;
      white-space: nowrap;
      background: linear-gradient(180deg, #fffaf3 0%, #fff7ed 100%);
      position: sticky;
      top: 0;
      z-index: 1;
    }
    .report-table td {
      font-size: 14px;
      line-height: 1.4;
      font-weight: 600;
    }
    .report-table tr:last-child td { border-bottom: 0; }
    .report-table tr:hover td { background: rgba(255, 248, 240, .5); }
    .report-table .total-row td {
      font-weight: 900;
      background: linear-gradient(180deg, #fff8f0, #fff3e0);
      border-top: 2px solid var(--accent, #e65100);
      color: var(--text, #1a1a1a);
      font-size: 15px;
    }
    .report-table .money { font-variant-numeric: tabular-nums; white-space: nowrap; }
    .report-table .rank {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      font-size: 12px;
      font-weight: 900;
    }
    .report-table .rank-1 { background: linear-gradient(135deg, #ffd700, #ffb300); color: #5d4037; }
    .report-table .rank-2 { background: linear-gradient(135deg, #e0e0e0, #bdbdbd); color: #424242; }
    .report-table .rank-3 { background: linear-gradient(135deg, #ffab91, #ff8a65); color: #4e342e; }
    .report-table .rank-default { background: #f5f5f5; color: #757575; }

    /* ── Breakdown Grid ── */
    .report-breakdown-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
    }
    .report-breakdown-grid .report-table { min-width: 300px; }

    /* ── Messages ── */
    .report-message {
      padding: 14px 18px;
      border-radius: var(--radius-sm, 8px);
      font-weight: 800;
      font-size: 14px;
      animation: reportSlideUp 300ms var(--ease, ease);
    }
    .report-message.error {
      border: 1px solid #f2b8b5;
      color: #9f1f18;
      background: #fff7f6;
    }
    .report-empty {
      padding: 40px 20px;
      text-align: center;
      color: var(--text-muted, #777);
      font-weight: 800;
      font-size: 15px;
    }

    /* ── Loading ── */
    .report-loading {
      padding: 60px 20px;
      text-align: center;
      color: var(--text-muted, #777);
      font-weight: 800;
      font-size: 15px;
      animation: reportPulse 1.5s ease-in-out infinite;
    }
    .report-skeleton-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 14px;
    }
    .report-skeleton-card {
      height: 110px;
      border-radius: var(--radius-lg, 12px);
      background: linear-gradient(90deg, #f5f5f5 25%, #eeeeee 50%, #f5f5f5 75%);
      background-size: 400px 100%;
      animation: reportShimmer 1.5s ease-in-out infinite;
    }

    /* ── Responsive ── */
    @media (max-width: 1200px) {
      .report-filters { grid-template-columns: repeat(3, minmax(160px, 1fr)); }
      .report-kpi-grid,
      .report-skeleton-grid { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 860px) {
      .report-header { display: block; }
      .report-filters { grid-template-columns: 1fr 1fr; }
      .report-filter-actions { justify-content: stretch; }
      .report-filter-actions .report-btn { flex: 1 1 0; }
      .report-kpi-grid,
      .report-skeleton-grid { grid-template-columns: repeat(2, 1fr); }
      .report-breakdown-grid { grid-template-columns: 1fr; }
      .report-extra-stats { flex-direction: column; }
    }
    @media (max-width: 540px) {
      .report-filters { grid-template-columns: 1fr; }
      .report-kpi-grid,
      .report-skeleton-grid { grid-template-columns: 1fr; }
      .report-filter-actions { width: 100%; }
      .report-filter-actions .report-btn { flex: 1 1 100%; justify-content: center; }
    }
  </style>
`;

/* ─────────────────────────── RENDER HELPERS ─────────────────────────── */

const renderFilters = (filters = {}) => `
  <form class="report-filters" data-report-filters>
    <label class="report-field">
      Từ ngày
      <input type="date" name="from" value="${escapeHtml(filters.from || '')}" />
    </label>
    <label class="report-field">
      Đến ngày
      <input type="date" name="to" value="${escapeHtml(filters.to || '')}" />
    </label>
    <label class="report-field">
      Nhóm theo
      <select name="group_by">
        <option value="day"   ${filters.group_by === 'day' ? 'selected' : ''}>Ngày</option>
        <option value="week"  ${filters.group_by === 'week' ? 'selected' : ''}>Tuần</option>
        <option value="month" ${filters.group_by === 'month' ? 'selected' : ''}>Tháng</option>
      </select>
    </label>
    <label class="report-field">
      Trạng thái đơn
      <select name="status">
        <option value="COMPLETED" ${filters.status === 'COMPLETED' ? 'selected' : ''}>COMPLETED</option>
        <option value=""           ${!filters.status ? 'selected' : ''}>Tất cả</option>
        <option value="CANCELLED"  ${filters.status === 'CANCELLED' ? 'selected' : ''}>CANCELLED</option>
      </select>
    </label>
    <label class="report-field">
      Loại khách
      <select name="customerType">
        <option value=""       ${!filters.customerType ? 'selected' : ''}>Tất cả</option>
        <option value="GUEST"  ${filters.customerType === 'GUEST' ? 'selected' : ''}>GUEST</option>
        <option value="MEMBER" ${filters.customerType === 'MEMBER' ? 'selected' : ''}>MEMBER</option>
      </select>
    </label>
    <label class="report-field">
      Thanh toán
      <select name="paymentMethod">
        <option value=""            ${!filters.paymentMethod ? 'selected' : ''}>Tất cả</option>
        <option value="COD"         ${filters.paymentMethod === 'COD' ? 'selected' : ''}>COD</option>
        <option value="ONLINE_MOCK" ${filters.paymentMethod === 'ONLINE_MOCK' ? 'selected' : ''}>ONLINE_MOCK</option>
      </select>
    </label>
    <div class="report-filter-actions">
      <button class="report-btn primary" type="submit"> 🔍︎ Lọc báo cáo</button>
      <button class="report-btn secondary" type="button" data-export-csv> Xuất CSV</button>
      <button class="report-btn secondary" type="button" data-export-excel> Xuất Excel</button>
    </div>
  </form>
`;

const renderKpiCards = (summary = {}) => `
  <div class="report-kpi-grid">
    <div class="report-kpi-card">
      <span class="report-kpi-icon">$</span>
      <span class="report-kpi-label">Doanh thu gộp</span>
      <div class="report-kpi-value">${formatMoney(summary.total_gross_revenue)}</div>
    </div>
    <div class="report-kpi-card">
      <span class="report-kpi-icon">$</span>
      <span class="report-kpi-label">Doanh thu thuần</span>
      <div class="report-kpi-value">${formatMoney(summary.total_net_revenue)}</div>
    </div>
    <div class="report-kpi-card">
      <span class="report-kpi-icon">∑</span>
      <span class="report-kpi-label">Tổng đơn hàng</span>
      <div class="report-kpi-value">${Number(summary.order_count || 0).toLocaleString('vi-VN')}</div>
    </div>
    <div class="report-kpi-card">
      <span class="report-kpi-icon">☰</span>
      <span class="report-kpi-label">Giá trị TB/đơn</span>
      <div class="report-kpi-value">${formatMoney(summary.avg_order_value)}</div>
    </div>
    <div class="report-kpi-card">
      <span class="report-kpi-icon">#</span>
      <span class="report-kpi-label">Tổng giảm giá</span>
      <div class="report-kpi-value">${formatMoney(summary.total_discount)}</div>
    </div>
    <div class="report-kpi-card">
      <span class="report-kpi-icon">☰</span>
      <span class="report-kpi-label">Thuế GTGT 8%</span>
      <div class="report-kpi-value">${formatMoney(summary.estimated_vat)}</div>
    </div>
  </div>
  <div class="report-extra-stats">
    <div class="report-extra-stat">
      ${formatMoney(summary.total_after_vat)} <span>Doanh thu chưa VAT</span>
    </div>
    <div class="report-extra-stat">
      ${formatMoney(summary.total_delivery_fee)} <span>Phí giao hàng</span>
    </div>
    <div class="report-extra-stat">
      ${Number(summary.completed_count || 0).toLocaleString('vi-VN')} <span>Đơn hoàn thành</span>
    </div>
    <div class="report-extra-stat">
      ${Number(summary.cancelled_count || 0).toLocaleString('vi-VN')} <span>Đơn hủy</span>
    </div>
  </div>
`;

const renderTimelineTable = (timeline = [], groupBy = 'day') => {
  if (!timeline.length) {
    return `
      <div class="report-panel">
        <h3 class="report-panel-title"><span class="panel-icon">📈</span> Doanh thu theo thời gian</h3>
        <div class="report-empty">Không có dữ liệu trong khoảng thời gian đã chọn.</div>
      </div>
    `;
  }

  const totals = timeline.reduce(
    (acc, row) => ({
      order_count: acc.order_count + Number(row.order_count || 0),
      gross_revenue: acc.gross_revenue + Number(row.gross_revenue || 0),
      discount: acc.discount + Number(row.discount || 0),
      delivery_fee: acc.delivery_fee + Number(row.delivery_fee || 0),
      net_revenue: acc.net_revenue + Number(row.net_revenue || 0),
      estimated_vat: acc.estimated_vat + Number(row.estimated_vat || 0)
    }),
    { order_count: 0, gross_revenue: 0, discount: 0, delivery_fee: 0, net_revenue: 0, estimated_vat: 0 }
  );

  const rows = timeline
    .map(
      (row) => `
        <tr>
          <td><strong>${escapeHtml(formatReportPeriod(row.period, groupBy, row.period_end))}</strong></td>
          <td>${Number(row.order_count || 0).toLocaleString('vi-VN')}</td>
          <td class="money">${formatMoney(row.gross_revenue)}</td>
          <td class="money">${formatMoney(row.discount)}</td>
          <td class="money">${formatMoney(row.delivery_fee)}</td>
          <td class="money">${formatMoney(row.net_revenue)}</td>
          <td class="money">${formatMoney(row.estimated_vat)}</td>
        </tr>
      `
    )
    .join('');

  return `
    <div class="report-panel">
      <h3 class="report-panel-title"><span class="panel-icon">📈</span> Doanh thu theo thời gian</h3>
      <table class="report-table">
        <thead>
          <tr>
            <th>Thời gian</th>
            <th>Số đơn</th>
            <th>Doanh thu gộp</th>
            <th>Giảm giá</th>
            <th>Phí ship</th>
            <th>Doanh thu thuần</th>
            <th>Thuế GTGT</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="total-row">
            <td>TỔNG CỘNG</td>
            <td>${totals.order_count.toLocaleString('vi-VN')}</td>
            <td class="money">${formatMoney(totals.gross_revenue)}</td>
            <td class="money">${formatMoney(totals.discount)}</td>
            <td class="money">${formatMoney(totals.delivery_fee)}</td>
            <td class="money">${formatMoney(totals.net_revenue)}</td>
            <td class="money">${formatMoney(totals.estimated_vat)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
};

const renderBreakdownSection = (paymentBreakdown = [], customerBreakdown = []) => `
  <div class="report-breakdown-grid">
    <div class="report-panel">
      <h3 class="report-panel-title"><span class="panel-icon"></span> Theo phương thức thanh toán</h3>
      <table class="report-table">
        <thead>
          <tr>
            <th>Phương thức</th>
            <th>Số đơn</th>
            <th>Doanh thu</th>
          </tr>
        </thead>
        <tbody>
          ${
            paymentBreakdown.length
              ? paymentBreakdown
                  .map(
                    (row) => `
                      <tr>
                        <td><strong>${escapeHtml(row.payment_method || row.method || '-')}</strong></td>
                        <td>${Number(row.order_count || 0).toLocaleString('vi-VN')}</td>
                        <td class="money">${formatMoney(row.revenue || row.total_revenue)}</td>
                      </tr>
                    `
                  )
                  .join('')
              : '<tr><td colspan="3"><div class="report-empty">Không có dữ liệu.</div></td></tr>'
          }
        </tbody>
      </table>
    </div>
    <div class="report-panel">
      <h3 class="report-panel-title"><span class="panel-icon"></span> Theo loại khách hàng</h3>
      <table class="report-table">
        <thead>
          <tr>
            <th>Loại khách</th>
            <th>Số đơn</th>
            <th>Doanh thu</th>
          </tr>
        </thead>
        <tbody>
          ${
            customerBreakdown.length
              ? customerBreakdown
                  .map(
                    (row) => `
                      <tr>
                        <td><strong>${escapeHtml(row.customer_type || row.type || '-')}</strong></td>
                        <td>${Number(row.order_count || 0).toLocaleString('vi-VN')}</td>
                        <td class="money">${formatMoney(row.revenue || row.total_revenue)}</td>
                      </tr>
                    `
                  )
                  .join('')
              : '<tr><td colspan="3"><div class="report-empty">Không có dữ liệu.</div></td></tr>'
          }
        </tbody>
      </table>
    </div>
  </div>
`;

const renderTopProducts = (products = []) => {
  if (!products.length) {
    return `
      <div class="report-panel">
        <h3 class="report-panel-title"><span class="panel-icon"></span> Top sản phẩm bán chạy</h3>
        <div class="report-empty">Không có dữ liệu sản phẩm.</div>
      </div>
    `;
  }

  const rows = products
    .slice(0, 20)
    .map((product, index) => {
      const rank = index + 1;
      let rankClass = 'rank-default';
      if (rank === 1) rankClass = 'rank-1';
      else if (rank === 2) rankClass = 'rank-2';
      else if (rank === 3) rankClass = 'rank-3';

      return `
        <tr>
          <td><span class="rank ${rankClass}">${rank}</span></td>
          <td><strong>${escapeHtml(product.food_name || product.name || '-')}</strong></td>
          <td>${Number(product.total_quantity || product.quantity || 0).toLocaleString('vi-VN')}</td>
          <td class="money">${formatMoney(product.total_revenue || product.revenue)}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <div class="report-panel">
      <h3 class="report-panel-title"><span class="panel-icon">🏆</span> Top sản phẩm bán chạy</h3>
      <table class="report-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Tên món</th>
            <th>Số lượng bán</th>
            <th>Doanh thu</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
};

const renderLoadingState = () => `
  <div class="report-skeleton-grid">
    ${Array.from({ length: 6 }, () => '<div class="report-skeleton-card"></div>').join('')}
  </div>
  <div class="report-loading">⏳ Đang tải dữ liệu báo cáo...</div>
`;

const renderPageBody = ({ filters = {}, reportData = null, isLoading = false, error = '' } = {}) => `
  <div class="report-header">
    <div>
      <h1>📊 Báo cáo doanh thu</h1>
      <p>Phân tích doanh thu, đơn hàng, phương thức thanh toán và sản phẩm bán chạy theo khoảng thời gian.</p>
    </div>
  </div>
  ${renderFilters(filters)}
  ${error ? `<div class="report-message error" role="alert">❌ ${escapeHtml(error)}</div>` : ''}
  ${isLoading ? renderLoadingState() : ''}
  ${
    !isLoading && reportData
      ? `
        ${renderKpiCards(reportData.summary || {})}
        ${renderTimelineTable(reportData.timeline || [], filters.group_by)}
        ${renderBreakdownSection(reportData.payment_breakdown || [], reportData.customer_breakdown || [])}
        ${renderTopProducts(reportData.top_products || [])}
      `
      : ''
  }
  ${!isLoading && !reportData && !error ? '<div class="report-empty">Chọn bộ lọc và nhấn "Lọc báo cáo" để xem dữ liệu.</div>' : ''}
`;

/* ─────────────────────────── EXPORTS ─────────────────────────── */

export const AdminReportPage = () => `
  ${pageStyles}
  <section class="report-page" data-report-page>
    ${renderPageBody({ filters: { from: getDefaultFrom(), to: getDefaultTo(), group_by: 'day', status: 'COMPLETED', customerType: '', paymentMethod: '' }, isLoading: true })}
  </section>
`;

export const mountAdminReportPage = () => {
  const root = document.querySelector('[data-report-page]');
  if (!root) return;

  let filters = {
    from: getDefaultFrom(),
    to: getDefaultTo(),
    group_by: 'day',
    status: 'COMPLETED',
    customerType: '',
    paymentMethod: ''
  };
  let reportData = null;
  let isLoading = false;
  let error = '';

  const render = () => {
    root.innerHTML = renderPageBody({ filters, reportData, isLoading, error });
  };

  const loadReport = async () => {
    isLoading = true;
    error = '';
    reportData = null;
    render();

    try {
      reportData = await adminReportService.getRevenueReport(filters);
    } catch (requestError) {
      error = getErrorMessage(requestError, 'Không thể tải báo cáo doanh thu. Vui lòng thử lại.');
    } finally {
      isLoading = false;
      render();
    }
  };

  const buildCsvContent = (separator = ',') => {
    const lines = [];
    const sep = separator;
    const q = (val) => {
      const s = String(val ?? '');
      if (s.includes(sep) || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const summary = reportData?.summary || {};
    lines.push(['BÁO CÁO DOANH THU'].join(sep));
    lines.push([`Từ ngày: ${filters.from || '-'}`, `Đến ngày: ${filters.to || '-'}`].join(sep));
    lines.push('');
    lines.push(['CHỈ SỐ TỔNG QUAN'].join(sep));
    lines.push([q('Chỉ số'), q('Giá trị')].join(sep));
    lines.push([q('Doanh thu gộp'), q(formatMoneyRaw(summary.total_gross_revenue))].join(sep));
    lines.push([q('Doanh thu thuần'), q(formatMoneyRaw(summary.total_net_revenue))].join(sep));
    lines.push([q('Tổng đơn hàng'), q(summary.order_count || 0)].join(sep));
    lines.push([q('Giá trị TB/đơn'), q(formatMoneyRaw(summary.avg_order_value))].join(sep));
    lines.push([q('Tổng giảm giá'), q(formatMoneyRaw(summary.total_discount))].join(sep));
    lines.push([q('Thuế GTGT 8%'), q(formatMoneyRaw(summary.estimated_vat))].join(sep));
    lines.push([q('Doanh thu chưa VAT'), q(formatMoneyRaw(summary.total_after_vat))].join(sep));
    lines.push([q('Phí giao hàng'), q(formatMoneyRaw(summary.total_delivery_fee))].join(sep));
    lines.push([q('Đơn hoàn thành'), q(summary.completed_count || 0)].join(sep));
    lines.push([q('Đơn hủy'), q(summary.cancelled_count || 0)].join(sep));
    lines.push('');

    const timeline = reportData?.timeline || [];
    if (timeline.length) {
      lines.push(['DOANH THU THEO THỜI GIAN'].join(sep));
      lines.push(
        [q('Thời gian'), q('Số đơn'), q('Doanh thu gộp'), q('Giảm giá'), q('Phí ship'), q('Doanh thu thuần'), q('Thuế GTGT')].join(sep)
      );
      timeline.forEach((row) => {
        lines.push(
          [
            q(formatReportPeriod(row.period, filters.group_by, row.period_end)),
            q(row.order_count || 0),
            q(formatMoneyRaw(row.gross_revenue)),
            q(formatMoneyRaw(row.discount)),
            q(formatMoneyRaw(row.delivery_fee)),
            q(formatMoneyRaw(row.net_revenue)),
            q(formatMoneyRaw(row.estimated_vat))
          ].join(sep)
        );
      });
      lines.push('');
    }

    const products = reportData?.top_products || [];
    if (products.length) {
      lines.push(['TOP SẢN PHẨM BÁN CHẠY'].join(sep));
      lines.push([q('#'), q('Tên món'), q('Số lượng bán'), q('Doanh thu')].join(sep));
      products.slice(0, 20).forEach((p, i) => {
        lines.push(
          [
            q(i + 1),
            q(p.food_name || p.name || '-'),
            q(p.total_quantity || p.quantity || 0),
            q(formatMoneyRaw(p.total_revenue || p.revenue))
          ].join(sep)
        );
      });
    }

    return '\uFEFF' + lines.join('\r\n');
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getExportFilename = (ext) => {
    const from = filters.from || 'start';
    const to = filters.to || 'end';
    return `bao-cao-doanh-thu-${from}-${to}.${ext}`;
  };

  /* ── Event: form submit ── */
  root.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-report-filters]');
    if (!form) return;
    event.preventDefault();

    const formData = new FormData(form);
    filters = {
      from: String(formData.get('from') || '').trim(),
      to: String(formData.get('to') || '').trim(),
      group_by: String(formData.get('group_by') || 'day').trim(),
      status: String(formData.get('status') || '').trim(),
      customerType: String(formData.get('customerType') || '').trim(),
      paymentMethod: String(formData.get('paymentMethod') || '').trim()
    };

    await loadReport();
  });

  /* ── Event: click ── */
  root.addEventListener('click', (event) => {
    const csvBtn = event.target.closest('[data-export-csv]');
    const excelBtn = event.target.closest('[data-export-excel]');

    if (csvBtn) {
      event.preventDefault();
      if (!reportData) {
        alert('Chưa có dữ liệu để xuất. Vui lòng lọc báo cáo trước.');
        return;
      }
      const csvContent = buildCsvContent(',');
      downloadFile(csvContent, getExportFilename('csv'), 'text/csv;charset=utf-8;');
    }

    if (excelBtn) {
      event.preventDefault();
      if (!reportData) {
        alert('Chưa có dữ liệu để xuất. Vui lòng lọc báo cáo trước.');
        return;
      }
      const tsvContent = buildCsvContent('\t');
      downloadFile(tsvContent, getExportFilename('xls'), 'application/vnd.ms-excel;charset=utf-8;');
    }
  });

  /* ── Initial load ── */
  loadReport();
};
