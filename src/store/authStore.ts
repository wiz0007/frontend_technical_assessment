import { create } from 'zustand';
import { AuthStore, User } from '@/types/auth';

/**
 * Zustand store representing application-level authentication state.
 * Mutated strictly through centralized NextAuth synchronization (AuthSync)
 * to prevent independent components from arbitrarily establishing authentication.
 */
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
