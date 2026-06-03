import { apiService } from './api.service.js';
import { authService } from './authService.js';

const optionalAuthOptions = () => {
  const session = authService.getCurrentSession();
  return session?.token
    ? {
        headers: {
          Authorization: `Bearer ${session.token}`
        }
      }
    : undefined;
};

export const supportService = {
  createTicket: async (payload) => {
    const session = authService.getCurrentSession();
    const path = session?.token ? '/support/mine/tickets' : '/support/tickets';
    const response = await apiService.post(path, payload, optionalAuthOptions());
    return response.data;
  },

  getTicket: async ({ ticketCode, phone }) => {
    const query = new URLSearchParams();
    if (phone) query.set('phone', phone);
    const response = await apiService.get(`/support/tickets/${encodeURIComponent(ticketCode)}?${query.toString()}`);
    return response.data;
  },

  getMine: async () => {
    const response = await apiService.get('/support/mine', optionalAuthOptions());
    return response.data;
  }
};
