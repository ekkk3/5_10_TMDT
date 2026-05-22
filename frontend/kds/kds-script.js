const API_BASE = 'http://localhost:3000/api';
const token = localStorage.getItem('ff_token');
const user = JSON.parse(localStorage.getItem('ff_user') || 'null');

if (!token || !user || !['admin', 'kitchen'].includes(user.role)) {
  window.location.href = '../auth/login.html?next=../kds/kds.html';
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND'
  });
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {})
    }
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'API loi.');
  }

  return data;
}

function statusLabel(status) {
  const labels = {
    confirmed: 'Cho bep lam',
    cooking: 'Dang nau',
    ready: 'Cho giao'
  };
  return labels[status] || status;
}

async function loadKitchenOrders() {
  const board = document.querySelector('#kdsBoard');
  const message = document.querySelector('#kdsMessage');
  const data = await apiRequest('/kds/orders');

  if (!data.orders.length) {
    board.innerHTML = '';
    message.hidden = false;
    message.textContent = 'Chua co don nao duoc Admin xac nhan.';
    return;
  }

  message.hidden = true;
  board.innerHTML = data.orders.map((order) => `
    <article class="order-card ${order.status}">
      <div class="section-header">
        <h2>#${order.id}</h2>
        <span class="badge ${order.status}">${statusLabel(order.status)}</span>
      </div>
      <p><strong>${order.customer_name}</strong> - ${order.phone}</p>
      <ul class="order-items">
        ${order.items.map((item) => `<li>${item.product_name} x ${item.quantity}</li>`).join('')}
      </ul>
      <div class="total-row">
        <span>Tong tien</span>
        <span>${formatCurrency(order.total_price)}</span>
      </div>
      <div class="actions">
        <button class="success" type="button" data-start="${order.id}" ${order.status !== 'confirmed' ? 'disabled' : ''}>Bat dau lam</button>
        <button type="button" data-ready="${order.id}">Hoan thanh</button>
      </div>
    </article>
  `).join('');

  board.querySelectorAll('[data-start]').forEach((button) => {
    button.addEventListener('click', async () => {
      // confirmed -> cooking: bep da nhan don va bat dau che bien.
      await apiRequest(`/kds/orders/${button.dataset.start}/start`, { method: 'PATCH' });
      await loadKitchenOrders();
    });
  });

  board.querySelectorAll('[data-ready]').forEach((button) => {
    button.addEventListener('click', async () => {
      // cooking -> ready: don bien mat khoi KDS, Admin co the chuan bi giao.
      await apiRequest(`/kds/orders/${button.dataset.ready}/ready`, { method: 'PATCH' });
      await loadKitchenOrders();
    });
  });
}

document.querySelector('#refreshKds')?.addEventListener('click', () => {
  loadKitchenOrders().catch((error) => {
    const message = document.querySelector('#kdsMessage');
    message.hidden = false;
    message.textContent = error.message;
  });
});

document.querySelector('#logoutButton')?.addEventListener('click', () => {
  localStorage.removeItem('ff_token');
  localStorage.removeItem('ff_user');
  window.location.href = '../auth/login.html';
});

loadKitchenOrders().catch((error) => {
  const message = document.querySelector('#kdsMessage');
  message.hidden = false;
  message.textContent = error.message;
});

setInterval(() => {
  loadKitchenOrders().catch(() => {});
}, 15000);
