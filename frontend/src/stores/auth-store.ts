import { create } from 'zustand';
import { saveAuth, clearAuth, getToken, getUser, getTenantId, type UserInfo } from '@/lib/auth';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: UserInfo | null;
  tenantId: string | null;
  login: (token: string, user: UserInfo, tenantId: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  token: null,
  user: null,
  tenantId: null,
  login: (token, user, tenantId) => {
    saveAuth(token, user, tenantId);
    set({ isAuthenticated: true, token, user, tenantId });
  },
  logout: () => {
    clearAuth();
    set({ isAuthenticated: false, token: null, user: null, tenantId: null });
  },
  hydrate: () => {
    const token = getToken();
    const user = getUser();
    const tenantId = getTenantId();
    if (token && user && tenantId) {
      set({ isAuthenticated: true, token, user, tenantId });
    }
  },
}));
