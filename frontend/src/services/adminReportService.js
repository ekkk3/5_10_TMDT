import { apiService } from './api.service.js';
import { adminAuthService } from './adminAuthService.js';

export const adminReportService = {
  getRevenueReport: async (filters = {}) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      const v = String(value || '').trim();
      if (v) query.set(key, v);
    });
    const qs = query.toString();
    const response = await apiService.get(`/admin/reports/revenue${qs ? `?${qs}` : ''}`, adminAuthService.getAuthorizationOptions());
    return response.data;
  }
};
