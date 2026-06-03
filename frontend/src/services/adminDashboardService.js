import { apiService } from './api.service.js';
import { adminAuthService } from './adminAuthService.js';

export const adminDashboardService = {
  getDashboard: async () => {
    const response = await apiService.get('/admin/dashboard', adminAuthService.getAuthorizationOptions());
    return response.data;
  }
};
