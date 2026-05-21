const API_BASE = 'http://localhost:3000/api';
const token = localStorage.getItem('ff_token');
const user = JSON.parse(localStorage.getItem('ff_user') || 'null');

if (!token || !user || user.role !== 'admin') {
  window.location.href = '../auth/login.html?next=../admin/admin-dashboard.html';
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
    pending: 'Cho xac nhan',
    confirmed: 'Da xac nhan',
    cooking: 'Dang nau',
    ready: 'Cho giao',
    completed: 'Hoan thanh',
    cancelled: 'Da huy',
    active: 'Hien',
    inactive: 'An'
  };
  return labels[status] || status;
}

async function loadCategories() {
  const data = await apiRequest('/admin/categories');
  const select = document.querySelector('[name="category_id"]');
  select.innerHTML = data.categories.map((category) => (
    `<option value="${category.id}">${category.name}</option>`
  )).join('');
}

async function loadProducts() {
  const data = await apiRequest('/admin/products');
  const table = document.querySelector('#productsTable');

  table.innerHTML = data.products.map((product) => `
    <tr>
      <td>#${product.id}</td>
      <td>${product.name}</td>
      <td>${formatCurrency(product.price)}</td>
      <td>${product.category_name}</td>
      <td><span class="badge ${product.status}">${statusLabel(product.status)}</span></td>
      <td>
        <div class="actions">
          <button class="secondary" type="button" data-edit="${product.id}">Sua</button>
          <button class="secondary" type="button" data-toggle="${product.id}" data-status="${product.status === 'active' ? 'inactive' : 'active'}">${product.status === 'active' ? 'An' : 'Hien'}</button>
          <button class="danger" type="button" data-delete="${product.id}">Xoa</button>
        </div>
      </td>
    </tr>
  `).join('');

  table.querySelectorAll('[data-edit]').forEach((button) => {
    const product = data.products.find((item) => item.id === Number(button.dataset.edit));
    button.addEventListener('click', () => fillProductForm(product));
  });

  table.querySelectorAll('[data-toggle]').forEach((button) => {
    button.addEventListener('click', async () => {
      await apiRequest(`/admin/products/${button.dataset.toggle}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: button.dataset.status })
      });
      await loadProducts();
    });
  });

  table.querySelectorAll('[data-delete]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!confirm('Xoa mon nay? Neu mon dang co trong don chua xu ly, he thong se an mon.')) return;
      const data = await apiRequest(`/admin/products/${button.dataset.delete}`, { method: 'DELETE' });
      document.querySelector('#productMessage').textContent = data.message;
      await loadProducts();
    });
  });
}

function fillProductForm(product) {
  const form = document.querySelector('#productForm');
  form.elements.id.value = product.id;
  form.elements.name.value = product.name;
  form.elements.price.value = product.price;
  form.elements.category_id.value = product.category_id;
  form.elements.image.value = product.image || '';
  form.elements.status.value = product.status;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function submitProduct(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form).entries());
  const isEditing = Boolean(payload.id);
  const message = document.querySelector('#productMessage');

  try {
    const path = isEditing ? `/admin/products/${payload.id}` : '/admin/products';
    const method = isEditing ? 'PUT' : 'POST';
    delete payload.id;

    const data = await apiRequest(path, {
      method,
      body: JSON.stringify(payload)
    });

    message.textContent = data.message;
    form.reset();
    form.elements.id.value = '';
    await loadProducts();
  } catch (error) {
    message.textContent = error.message;
  }
}

async function loadOrders() {
  const data = await apiRequest('/admin/orders?status=pending');
  const table = document.querySelector('#ordersTable');

  if (!data.orders.length) {
    table.innerHTML = '<tr><td colspan="6" class="muted">Chua co don moi.</td></tr>';
    return;
  }

  table.innerHTML = data.orders.map((order) => `
    <tr>
      <td>#${order.id}</td>
      <td>
        <strong>${order.customer_name}</strong><br>
        <span class="muted">${order.phone}</span><br>
        <span class="muted">${order.address}</span>
      </td>
      <td>
        <ul class="order-items">
          ${order.items.map((item) => `<li>${item.product_name} x ${item.quantity}</li>`).join('')}
        </ul>
      </td>
      <td>${formatCurrency(order.total_price)}</td>
      <td><span class="badge ${order.status}">${statusLabel(order.status)}</span></td>
      <td>
        <div class="actions">
          <button class="success" type="button" data-confirm="${order.id}">Xac nhan don</button>
          <button class="danger" type="button" data-cancel="${order.id}">Huy</button>
        </div>
      </td>
    </tr>
  `).join('');

  table.querySelectorAll('[data-confirm]').forEach((button) => {
    button.addEventListener('click', async () => {
      await apiRequest(`/admin/orders/${button.dataset.confirm}/confirm`, { method: 'PATCH' });
      await loadOrders();
    });
  });

  table.querySelectorAll('[data-cancel]').forEach((button) => {
    button.addEventListener('click', async () => {
      await apiRequest(`/admin/orders/${button.dataset.cancel}/cancel`, { method: 'PATCH' });
      await loadOrders();
    });
  });
}

document.querySelector('#productForm')?.addEventListener('submit', submitProduct);
document.querySelector('#resetProductForm')?.addEventListener('click', () => {
  const form = document.querySelector('#productForm');
  form.reset();
  form.elements.id.value = '';
});
document.querySelector('#refreshOrders')?.addEventListener('click', loadOrders);
document.querySelector('#logoutButton')?.addEventListener('click', () => {
  localStorage.removeItem('ff_token');
  localStorage.removeItem('ff_user');
  window.location.href = '../auth/login.html';
});

document.querySelectorAll('[data-tab]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-tab]').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    document.querySelector('#productsTab').hidden = button.dataset.tab !== 'products';
    document.querySelector('#ordersTab').hidden = button.dataset.tab !== 'orders';
    if (button.dataset.tab === 'orders') loadOrders();
  });
});

Promise.all([loadCategories(), loadProducts(), loadOrders()]).catch((error) => {
  document.querySelector('#productMessage').textContent = error.message;
});
