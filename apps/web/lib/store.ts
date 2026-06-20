import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from './api';

export interface User {
  id: string;
  email: string;
  walletAddress: string;
  subscriptionTier: string;
  genBalanceCache: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  refreshBalance: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      setUser: (user) => set({ user }),
      logout: async () => {
        await api.post('/api/v1/auth/logout').catch(() => {});
        localStorage.removeItem('refresh_token');
        set({ user: null });
        window.location.href = '/auth/login';
      },
      fetchMe: async () => {
        set({ isLoading: true });
        try {
          const res = await api.get('/api/v1/auth/me');
          set({ user: res.data.user });
        } catch {
          set({ user: null });
        } finally {
          set({ isLoading: false });
        }
      },
      refreshBalance: async () => {
        const { user } = get();
        if (!user) return;
        try {
          const res = await api.get('/api/v1/wallet');
          set({ user: { ...user, genBalanceCache: res.data.genBalance ?? user.genBalanceCache } });
        } catch {}
      },
    }),
    { name: 'fortichain-auth', partialize: (s) => ({ user: s.user }) }
  )
);
