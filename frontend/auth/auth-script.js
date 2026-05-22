const API_BASE = 'http://localhost:3000/api';

function setAuth(data) {
  localStorage.setItem('ff_token', data.token);
  localStorage.setItem('ff_user', JSON.stringify(data.user));
}

function redirectByRole(role) {
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');

  if (next) {
    window.location.href = next;
    return;
  }

  if (role === 'admin') {
    window.location.href = '../admin/admin-dashboard.html';
    return;
  }

  if (role === 'kitchen') {
    window.location.href = '../kds/kds.html';
    return;
  }

  window.location.href = '../user/index.html';
}

async function submitAuth(endpoint, payload) {
  const response = await fetch(`${API_BASE}/auth/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Co loi xay ra.');
  }

  return data;
}

const loginForm = document.querySelector('#loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = document.querySelector('#authMessage');
    const formData = new FormData(loginForm);

    try {
      const data = await submitAuth('login', Object.fromEntries(formData.entries()));
      setAuth(data);
      redirectByRole(data.user.role);
    } catch (error) {
      message.textContent = error.message;
    }
  });
}

const registerForm = document.querySelector('#registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = document.querySelector('#authMessage');
    const formData = new FormData(registerForm);

    try {
      const data = await submitAuth('register', Object.fromEntries(formData.entries()));
      setAuth(data);
      redirectByRole(data.user.role);
    } catch (error) {
      message.textContent = error.message;
    }
  });
}
