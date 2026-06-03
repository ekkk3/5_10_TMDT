const API_BASE_URL =
  typeof window !== 'undefined' && window.API_BASE_URL ? window.API_BASE_URL : 'http://localhost:3000/api';

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw payload || new Error('API request failed');
  }

  return payload;
};

export const apiService = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body: JSON.stringify(body || {}) }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' })
};
