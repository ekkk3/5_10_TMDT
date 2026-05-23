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

export const adminOrderService = {
  getOrders: async (filters = {}) => {
    const query = buildQuery(filters);
    const response = await apiService.get(`/admin/orders${query ? `?${query}` : ''}`, adminAuthService.getAuthorizationOptions());
    return response.data;
  },

  getOrderDetail: async (id) => {
    const response = await apiService.get(`/admin/orders/${encodeURIComponent(id)}`, adminAuthService.getAuthorizationOptions());
    return response.data;
  },

  confirmOrder: async (id) => {
    const response = await apiService.patch(`/admin/orders/${encodeURIComponent(id)}/confirm`, {}, adminAuthService.getAuthorizationOptions());
    return response.data;
  },

  cancelOrder: async (id, cancelReason) => {
    const response = await apiService.patch(`/admin/orders/${encodeURIComponent(id)}/cancel`, {
      cancel_reason: cancelReason
    }, adminAuthService.getAuthorizationOptions());
    return response.data;
  }
};
