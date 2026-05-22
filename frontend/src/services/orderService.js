import { apiService } from './api.service.js';

export const orderService = {
  createGuestOrder: async (payload) => {
    const response = await apiService.post('/orders/guest', payload);
    return response.data;
  },

  trackGuestOrder: async ({ orderCode, phone }) => {
    const query = new URLSearchParams({
      orderCode: String(orderCode || '').trim(),
      phone: String(phone || '').trim()
    });
    const response = await apiService.get(`/orders/tracking?${query.toString()}`);
    return response.data;
  }
};
