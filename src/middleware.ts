import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getAuthSecret } from '@/lib/auth-secret';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Authoritative secret resolution matching NextAuth server configuration
  const secret = getAuthSecret();

  const token = await getToken({
    req: request,
    secret,
  });

  const isAuthenticated = Boolean(token);
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isLoginRoute = pathname === '/login';

  // 1. Unauthenticated users attempting to access protected /dashboard routes
  if (isDashboardRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Authenticated users attempting to access guest-only /login page
  if (isLoginRoute && isAuthenticated) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
