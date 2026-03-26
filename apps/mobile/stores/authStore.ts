import { create } from 'zustand';
import type { User } from '@enheritage/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  isElderlyMode: boolean;
}

interface AuthActions {
  setUser: (user: User) => void;
  clearUser: () => void;
  setAuthenticated: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setAccessToken: (token: string | null) => void;
  toggleElderlyMode: () => void;
  setElderlyMode: (value: boolean) => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  accessToken: null,
  isElderlyMode: false,

  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null, isAuthenticated: false, accessToken: null }),
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setLoading: (isLoading) => set({ isLoading }),
  setAccessToken: (accessToken) => set({ accessToken }),
  toggleElderlyMode: () => set((s) => ({ isElderlyMode: !s.isElderlyMode })),
  setElderlyMode: (isElderlyMode) => set({ isElderlyMode }),
}));
