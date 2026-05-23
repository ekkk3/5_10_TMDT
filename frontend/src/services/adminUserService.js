import { apiService } from './api.service.js';
import { adminAuthService } from './adminAuthService.js';

const buildQuery = (filters = {}) => {
  const query = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    const normalizedValue = String(value || '').trim();

    if (normalizedValue) {
      query.set(key, normalizedValue);
    }
  });

  return query.toString();
};

export const adminUserService = {
  getUsers: async (filters = {}) => {
    const query = buildQuery(filters);
    const response = await apiService.get(`/admin/users${query ? `?${query}` : ''}`, adminAuthService.getAuthorizationOptions());
    return response.data;
  },

  createUser: async (payload) => {
    const response = await apiService.post('/admin/users', payload, adminAuthService.getAuthorizationOptions());
    return response.data;
  },

  updateUser: async (id, payload) => {
    const response = await apiService.patch(`/admin/users/${encodeURIComponent(id)}`, payload, adminAuthService.getAuthorizationOptions());
    return response.data;
  },

  lockUser: async (id) => {
    const response = await apiService.patch(`/admin/users/${encodeURIComponent(id)}/lock`, {}, adminAuthService.getAuthorizationOptions());
    return response.data;
  },

  unlockUser: async (id) => {
    const response = await apiService.patch(`/admin/users/${encodeURIComponent(id)}/unlock`, {}, adminAuthService.getAuthorizationOptions());
    return response.data;
  }
};
