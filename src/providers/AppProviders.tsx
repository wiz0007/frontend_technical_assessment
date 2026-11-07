'use client';

import React, { useEffect } from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useSession } from 'next-auth/react';
import { SessionProvider } from '@/providers/SessionProvider';
import { theme } from '@/theme/theme';
import { useAuthStore } from '@/store/authStore';

/**
 * Synchronizes the authoritative NextAuth session with the application-level Zustand store.
 * Ensures single source of truth without competing authentication managers.
 */
function AuthSync({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const setAuthState = useAuthStore((s) => s.setAuthState);
  const clearAuthState = useAuthStore((s) => s.clearAuthState);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    if (status === 'loading') {
      setLoading(true);
    } else if (status === 'authenticated' && session?.user) {
      setAuthState(true, {
        id: session.user.id,
        username: session.user.username || '',
        email: session.user.email || '',
        firstName: session.user.firstName || '',
        lastName: session.user.lastName || '',
        gender: session.user.gender || '',
        image: session.user.image || '',
      });
    } else if (status === 'unauthenticated') {
      clearAuthState();
    }
  }, [session, status, setAuthState, clearAuthState, setLoading]);

  return <>{children}</>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <SessionProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AuthSync>{children}</AuthSync>
        </ThemeProvider>
      </SessionProvider>
    </AppRouterCacheProvider>
  );
}
