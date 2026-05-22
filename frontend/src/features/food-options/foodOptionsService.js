import { apiService } from '../../services/api.service.js';

export const foodOptionsService = {
  getFoodOptions: async (foodId) => {
    const response = await apiService.get(`/food-options/${foodId}`);
    return response.data || [];
  }
};
