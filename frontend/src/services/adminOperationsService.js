import { apiService } from './api.service.js';
import { adminAuthService } from './adminAuthService.js';

const options = () => adminAuthService.getAuthorizationOptions();

export const adminOperationsService = {
  getReportSummary: async (filters = {}) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    const response = await apiService.get(`/admin/operations/reports/summary${query.toString() ? `?${query.toString()}` : ''}`, options());
    return response.data;
  },

  getCatalog: async () => {
    const response = await apiService.get('/admin/operations/catalog', options());
    return response.data;
  },

  saveCategory: async (payload) => {
    const response = await apiService.post('/admin/operations/catalog/categories', payload, options());
    return response.data;
  },

  saveFood: async (payload) => {
    const response = await apiService.post('/admin/operations/catalog/foods', payload, options());
    return response.data;
  },

  getMarketing: async () => {
    const response = await apiService.get('/admin/operations/marketing', options());
    return response.data;
  },

  saveVoucher: async (payload) => {
    const response = await apiService.post('/admin/operations/marketing/vouchers', payload, options());
    return response.data;
  },

  saveCampaign: async (payload) => {
    const response = await apiService.post('/admin/operations/marketing/campaigns', payload, options());
    return response.data;
  },

  getLoyalty: async () => {
    const response = await apiService.get('/admin/operations/loyalty', options());
    return response.data;
  },

  saveLoyaltyProgram: async (payload) => {
    const response = await apiService.post('/admin/operations/loyalty/programs', payload, options());
    return response.data;
  },

  getFulfillment: async () => {
    const response = await apiService.get('/admin/operations/fulfillment', options());
    return response.data;
  },

  createDeliveryOrder: async (payload) => {
    const response = await apiService.post('/admin/operations/fulfillment/deliveries', payload, options());
    return response.data;
  },

  createReconciliation: async (payload) => {
    const response = await apiService.post('/admin/operations/fulfillment/reconciliations', payload, options());
    return response.data;
  },

  getSupportTickets: async (filters = {}) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    const response = await apiService.get(`/admin/support/tickets${query.toString() ? `?${query.toString()}` : ''}`, options());
    return response.data;
  },

  updateSupportTicket: async (id, payload) => {
    const response = await apiService.patch(`/admin/support/tickets/${encodeURIComponent(id)}`, payload, options());
    return response.data;
  }
};
