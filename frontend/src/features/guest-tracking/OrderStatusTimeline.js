const ORDER_STATUS_LABELS = {
  PENDING: 'Chờ duyệt',
  CONFIRMED: 'Đã xác nhận',
  COOKING: 'Đang nấu',
  READY: 'Chờ giao',
  DELIVERING: 'Đang giao',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy'
};

const ORDER_STATUS_FLOW = ['PENDING', 'CONFIRMED', 'COOKING', 'READY', 'DELIVERING', 'COMPLETED'];

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const formatDateTime = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

const getLatestHistoryByStatus = (history = []) =>
  history.reduce((result, entry) => {
    if (entry?.status) {
      result.set(entry.status, entry);
    }

    return result;
  }, new Map());

const getTimelineStatuses = (orderStatus) => {
  if (orderStatus === 'CANCELLED') {
    return ['PENDING', 'CANCELLED'];
  }

  return ORDER_STATUS_FLOW;
};

export const getOrderStatusLabel = (status) => ORDER_STATUS_LABELS[status] || status || '';

export const OrderStatusTimeline = ({ orderStatus, statusHistory = [] } = {}) => {
  const historyByStatus = getLatestHistoryByStatus(statusHistory);
  const statuses = getTimelineStatuses(orderStatus);
  const currentIndex = statuses.indexOf(orderStatus);

  return `
    <ol class="tracking-timeline" aria-label="Tiến trình đơn hàng">
      ${statuses
        .map((status, index) => {
          const history = historyByStatus.get(status);
          const isCurrent = status === orderStatus;
          const isDone = orderStatus === 'CANCELLED' ? Boolean(history) || status === 'CANCELLED' : currentIndex >= 0 && index <= currentIndex;
          const itemClass = ['tracking-timeline__item', isDone ? 'is-done' : '', isCurrent ? 'is-current' : '']
            .filter(Boolean)
            .join(' ');

          return `
            <li class="${itemClass}">
              <span class="tracking-timeline__marker" aria-hidden="true"></span>
              <div>
                <strong>${escapeHtml(getOrderStatusLabel(status))}</strong>
                ${history?.updated_at ? `<time>${escapeHtml(formatDateTime(history.updated_at))}</time>` : ''}
                ${history?.note ? `<p>${escapeHtml(history.note)}</p>` : ''}
              </div>
            </li>
          `;
        })
        .join('')}
    </ol>
  `;
};
