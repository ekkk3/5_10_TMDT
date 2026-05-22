import { apiService } from './api.service.js';


const buildQuery = (params = {}) => {
  const searchParams = new URLSearchParams();


  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value);
    }
  });


  const query = searchParams.toString();
  return query ? `?${query}` : '';
};


export const menuService = {
  getCategories: async () => {
    const response = await apiService.get('/menu/categories');
    return response.data || [];
  },


  getFoods: async (filters) => {
    const response = await apiService.get(`/menu/foods${buildQuery(filters)}`);
    return response.data || [];
  },


  getFoodById: async (foodId) => {
    const response = await apiService.get(`/menu/foods/${foodId}`);
    return response.data;
  }
};
