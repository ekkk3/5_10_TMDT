import { apiService } from './api.service.js';

export const orderService = {
  createGuestOrder: async (payload) => {
    const response = await apiService.post('/orders/guest', payload);
    return response.data;
  }
};
