import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/axios';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('access_token', data.accessToken);
        localStorage.setItem('refresh_token', data.refreshToken);
        set({ user: data.user, isAuthenticated: true });
        return data;
      },

      logout: async () => {
        try {
          const refreshToken = localStorage.getItem('refresh_token');
          await api.post('/auth/logout', { refreshToken });
        } catch {}
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ user: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },

      hasRole: (...roles) => {
        const user = get().user;
        return user ? roles.includes(user.role) : false;
      }
    }),
    {
      name: 'auth-storage',
      partialize: state => ({ user: state.user, isAuthenticated: state.isAuthenticated })
    }
  )
);
