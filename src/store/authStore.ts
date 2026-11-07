import { create } from 'zustand';
import { AuthStore, User } from '@/types/auth';

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true,
  error: null,

  setAuthState: (isAuthenticated: boolean, user: User | null) =>
    set({
      isAuthenticated,
      user,
      isLoading: false,
      error: null,
    }),

  setUser: (user: User | null) =>
    set((state) => ({
      user,
      isAuthenticated: user !== null,
      isLoading: false,
    })),

  clearAuthState: () =>
    set({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,
    }),

  setLoading: (isLoading: boolean) =>
    set({
      isLoading,
    }),

  setError: (error: string | null) =>
    set({
      error,
      isLoading: false,
    }),
}));

