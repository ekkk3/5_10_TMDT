import { apiService } from './api.service.js';

const ADMIN_SESSION_KEY = 'fast-food-admin-session';

const readSession = () => {
  try {
    return JSON.parse(window.localStorage.getItem(ADMIN_SESSION_KEY) || 'null');
  } catch (error) {
    return null;
  }
};

const decodeJwtPayload = (token) => {
  try {
    const payload = token.split('.')[1];
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(normalizedPayload));
  } catch (error) {
    return null;
  }
};

const isSessionExpired = (session) => {
  const payload = session?.token ? decodeJwtPayload(session.token) : null;

  return !payload?.exp || payload.exp * 1000 <= Date.now();
};

const saveSession = (session) => {
  window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent('admin-auth:changed'));
};

const clearSession = () => {
  window.localStorage.removeItem(ADMIN_SESSION_KEY);
  window.dispatchEvent(new CustomEvent('admin-auth:changed'));
};

const getCurrentSession = () => {
  const session = readSession();

  if (!session) return null;

  if (isSessionExpired(session)) {
    clearSession();
    return null;
  }

  return session;
};

const authorizationOptions = () => {
  const session = getCurrentSession();

  return session?.token
    ? {
        headers: {
          Authorization: `Bearer ${session.token}`
        }
      }
    : null;
};

export const adminAuthService = {
  login: async (payload) => {
    const response = await apiService.post('/auth/admin/login', payload);
    saveSession(response.data);
    return response.data;
  },

  requestLoginOtp: async (identifier) => {
    const response = await apiService.post('/auth/admin/login/request-otp', { identifier });
    return response.data;
  },

  verifyLoginOtp: async ({ verificationToken, otp }) => {
    const response = await apiService.post('/auth/admin/login/verify-otp', {
      verification_token: verificationToken,
      otp
    });
    saveSession(response.data);
    return response.data;
  },

  getCurrentSession,
  getAuthorizationOptions: authorizationOptions,

  getCurrentAdmin: async () => {
    const options = authorizationOptions();

    if (!options) {
      throw new Error('ADMIN_SESSION_EXPIRED');
    }

    try {
      const response = await apiService.get('/auth/admin/me', options);
      saveSession({ ...getCurrentSession(), ...response.data });
      return response.data;
    } catch (error) {
      if (error?.statusCode === 401 || error?.message?.includes('Phiên đăng nhập quản trị')) {
        clearSession();
      }

      throw error;
    }
  },

  logout: async () => {
    const options = authorizationOptions();
    clearSession();

    try {
      await apiService.post('/auth/logout', {}, options || undefined);
    } catch (error) {
      // Local admin session is already cleared.
    }
  }
};
