import { create } from 'zustand';
import api from '../services/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: false,
  switchingGym: false,
  error: null,

  login: async (email, password, gymId = null) => {
    set({ loading: true, error: null });
    try {
      const parsedGymId = Number(gymId);
      const payload =
        Number.isInteger(parsedGymId) && parsedGymId > 0
          ? { email, password, gym_id: parsedGymId }
          : { email, password };
      const { data } = await api.post('/auth/login', payload);
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('tenant_id', String(data.data.user.tenant_id));
      localStorage.setItem('gym_id', String(data.data.user.gym_id));
      set({ user: data.data.user, token: data.data.token, loading: false });
      return true;
    } catch (err) {
      set({
        loading: false,
        error: err?.response?.data?.message ?? 'Login failed'
      });
      return false;
    }
  },

  switchGym: async (gymId) => {
    set({ switchingGym: true, error: null });
    try {
      const { data } = await api.post('/auth/switch-gym', { gym_id: Number(gymId) });
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('tenant_id', String(data.data.user.tenant_id));
      localStorage.setItem('gym_id', String(data.data.user.gym_id));
      set({ user: data.data.user, token: data.data.token, switchingGym: false });
      return true;
    } catch (err) {
      set({ switchingGym: false, error: err?.response?.data?.message ?? 'Gym switch failed' });
      return false;
    }
  },

  loadMe: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const { data } = await api.get('/auth/me');
      const user = data.data.user;
      if (user?.tenant_id) localStorage.setItem('tenant_id', String(user.tenant_id));
      if (user?.gym_id) localStorage.setItem('gym_id', String(user.gym_id));
      set({ user, token });
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('tenant_id');
      localStorage.removeItem('gym_id');
      set({ user: null, token: null });
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('tenant_id');
    localStorage.removeItem('gym_id');
    set({ user: null, token: null });
  },

  hasPermission: (permission) => {
    const perms = get().user?.permissions ?? [];
    return Array.isArray(perms) && perms.includes(permission);
  }
}));
