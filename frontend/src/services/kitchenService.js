import { apiService } from './api.service.js';
import { adminAuthService } from './adminAuthService.js';

export const kitchenService = {
  getPendingOrders: async ({ includeCancelled = true } = {}) => {
    const query = new URLSearchParams();

    if (includeCancelled) {
      query.set('includeCancelled', 'true');
    }

    const response = await apiService.get(`/kitchen/orders${query.toString() ? `?${query.toString()}` : ''}`, adminAuthService.getAuthorizationOptions());
    return response.data;
  },

  updateStatus: async (orderId, status) => {
    const endpointByStatus = {
      COOKING: 'cooking',
      READY: 'ready'
    };
    const endpoint = endpointByStatus[status];

    if (!endpoint) {
      throw new Error('Trạng thái KDS không hợp lệ');
    }

    const response = await apiService.patch(`/kitchen/orders/${encodeURIComponent(orderId)}/${endpoint}`, {}, adminAuthService.getAuthorizationOptions());
    return response.data;
  }
};
