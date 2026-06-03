import { apiService } from './api.service.js';
import { authService } from './authService.js';

const authOptions = () => {
  const session = authService.getCurrentSession();
  if (!session?.token) {
    throw new Error('SESSION_EXPIRED');
  }

  return {
    headers: {
      Authorization: `Bearer ${session.token}`
    }
  };
};

export const accountService = {
  getProfile: async () => {
    const response = await apiService.get('/account/profile', authOptions());
    return response.data;
  },

  updateProfile: async (payload) => {
    const response = await apiService.patch('/account/profile', payload, authOptions());
    return response.data;
  },

  getAddresses: async () => {
    const response = await apiService.get('/account/addresses', authOptions());
    return response.data;
  },

  createAddress: async (payload) => {
    const response = await apiService.post('/account/addresses', payload, authOptions());
    return response.data;
  },

  updateAddress: async (id, payload) => {
    const response = await apiService.patch(`/account/addresses/${encodeURIComponent(id)}`, payload, authOptions());
    return response.data;
  },

  deleteAddress: async (id) => {
    const response = await apiService.delete(`/account/addresses/${encodeURIComponent(id)}`, authOptions());
    return response.data;
  },

  setDefaultAddress: async (id) => {
    const response = await apiService.patch(`/account/addresses/${encodeURIComponent(id)}/default`, {}, authOptions());
    return response.data;
  },

  getVouchers: async () => {
    const response = await apiService.get('/account/vouchers', authOptions());
    return response.data;
  },

  applyVoucher: async ({ code, orderTotal }) => {
    const response = await apiService.post('/account/vouchers/apply', { code, orderTotal }, authOptions());
    return response.data;
  },

  getPoints: async () => {
    const response = await apiService.get('/account/points', authOptions());
    return response.data;
  },

  createMemberOrder: async (payload) => {
    const response = await apiService.post('/account/orders', payload, authOptions());
    return response.data;
  },

  getOrders: async () => {
    const response = await apiService.get('/account/orders', authOptions());
    return response.data;
  },

  getOrderDetail: async (id) => {
    const response = await apiService.get(`/account/orders/${encodeURIComponent(id)}`, authOptions());
    return response.data;
  },

  cancelOrder: async (id, cancelReason) => {
    const response = await apiService.patch(
      `/account/orders/${encodeURIComponent(id)}/cancel`,
      { cancel_reason: cancelReason },
      authOptions()
    );
    return response.data;
  },

  reorder: async (id) => {
    const response = await apiService.post(`/account/orders/${encodeURIComponent(id)}/reorder`, {}, authOptions());
    return response.data;
  },

  createReview: async (orderId, payload) => {
    const response = await apiService.post(`/account/orders/${encodeURIComponent(orderId)}/reviews`, payload, authOptions());
    return response.data;
  }
};
