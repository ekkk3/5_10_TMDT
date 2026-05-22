import { apiService } from '../../services/api.service.js';

export const voucherService = {
  applyPublicVoucher: async ({ code, orderTotal }) => {
    const response = await apiService.post('/vouchers/apply-public', {
      code,
      orderTotal
    });

    return response.data;
  }
};
