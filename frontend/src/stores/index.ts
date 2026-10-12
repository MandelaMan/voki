import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Business } from '../types';
import { setTokens, clearTokens } from '../api/client';
import { authApi } from '../api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => Promise<void>;
  loadProfile: () => Promise<void>;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: !!localStorage.getItem('accessToken'),
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const result = await authApi.login(email, password);
          setTokens(result.accessToken, result.refreshToken);
          set({ user: result.user, isAuthenticated: true, isLoading: false });
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const result = await authApi.register(data);
          setTokens(result.accessToken, result.refreshToken);
          set({ user: result.user, isAuthenticated: true, isLoading: false });
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },

      logout: async () => {
        const refresh = localStorage.getItem('refreshToken');
        if (refresh) {
          try { await authApi.logout(refresh); } catch { /* ignore */ }
        }
        clearTokens();
        useBusinessStore.setState({ businesses: [], activeBusiness: null });
        set({ user: null, isAuthenticated: false });
      },

      loadProfile: async () => {
        try {
          const user = await authApi.getProfile();
          set({ user, isAuthenticated: true });
        } catch {
          clearTokens();
          set({ user: null, isAuthenticated: false });
        }
      },

      updateUser: (user) => set({ user }),
    }),
    { name: 'voki-auth', partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }) }
  )
);

interface BusinessState {
  businesses: Business[];
  activeBusiness: Business | null;
  setBusinesses: (businesses: Business[]) => void;
  setActiveBusiness: (business: Business | null) => void;
}

export const useBusinessStore = create<BusinessState>()(
  persist(
    (set) => ({
      businesses: [],
      activeBusiness: null,
      setBusinesses: (businesses) => set({ businesses }),
      setActiveBusiness: (business) => set({ activeBusiness: business }),
    }),
    { name: 'voki-business' }
  )
);

interface ThemeState {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
    }),
    { name: 'voki-theme' }
  )
);

export function isDarkTheme(theme: 'light' | 'dark' | 'system') {
  return (
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
}

export function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement;
  const isDark = isDarkTheme(theme);
  root.classList.toggle('dark', isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isDark ? '#020617' : '#eef3f9');
}

interface ViewState {
  inventoryView: 'grid' | 'list';
  setInventoryView: (view: 'grid' | 'list') => void;
}

export const useViewStore = create<ViewState>()(
  persist(
    (set) => ({
      inventoryView: 'grid',
      setInventoryView: (view) => set({ inventoryView: view }),
    }),
    { name: 'voki-view' }
  )
);
