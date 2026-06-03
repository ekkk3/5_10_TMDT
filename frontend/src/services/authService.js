import { apiService } from './api.service.js';

const AUTH_SESSION_KEY = 'fast-food-auth-session';

const readSession = () => {
  try {
    return JSON.parse(window.localStorage.getItem(AUTH_SESSION_KEY) || 'null');
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
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent('auth:changed'));
};

const clearSession = () => {
  window.localStorage.removeItem(AUTH_SESSION_KEY);
  window.dispatchEvent(new CustomEvent('auth:changed'));
};

const getValidSession = () => {
  const session = readSession();

  if (!session) return null;

  if (isSessionExpired(session)) {
    clearSession();
    return null;
  }

  return session;
};

export const authService = {
  login: async (payload) => {
    const response = await apiService.post('/auth/login', payload);
    saveSession(response.data);
    return response.data;
  },

  requestLoginOtp: async (identifier) => {
    const response = await apiService.post('/auth/login/request-otp', { identifier });
    return response.data;
  },

  verifyLoginOtp: async ({ verificationToken, otp }) => {
    const response = await apiService.post('/auth/login/verify-otp', {
      verification_token: verificationToken,
      otp
    });
    saveSession(response.data);
    return response.data;
  },

  logout: async () => {
    const session = readSession();
    clearSession();

    try {
      await apiService.post(
        '/auth/logout',
        {},
        session?.token
          ? {
              headers: {
                Authorization: `Bearer ${session.token}`
              }
            }
          : undefined
      );
    } catch (error) {
      // Client-side session is already cleared; logout must remain idempotent.
    }
  },

  getCurrentSession: getValidSession,

  getCurrentUser: async () => {
    const session = getValidSession();

    if (!session?.token) {
      throw new Error('SESSION_EXPIRED');
    }

    try {
      const response = await apiService.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${session.token}`
        }
      });

      saveSession({ ...session, user: response.data });
      return response.data;
    } catch (error) {
      if (error?.statusCode === 401 || error?.message?.includes('Phiên đăng nhập')) {
        clearSession();
      }

      throw error;
    }
  },

  requestRegistration: async (payload) => {
    const response = await apiService.post('/auth/register', payload);
    return response.data;
  },

  resendRegistrationOtp: async (verificationToken) => {
    const response = await apiService.post('/auth/register/resend-otp', {
      verification_token: verificationToken
    });
    return response.data;
  },

  verifyRegistration: async ({ verificationToken, otp }) => {
    const response = await apiService.post('/auth/register/verify', {
      verification_token: verificationToken,
      otp
    });
    return response.data;
  },

  requestPasswordReset: async (identifier) => {
    const response = await apiService.post('/auth/password/forgot', { identifier });
    return response.data;
  },

  resetPassword: async ({ verificationToken, otp, password }) => {
    const response = await apiService.post('/auth/password/reset', {
      verification_token: verificationToken,
      otp,
      password
    });
    return response.data;
  }
};
