import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { loginWithDummyJson, ApiError } from '@/lib/api';
import { getAuthSecret } from '@/lib/auth-secret';
import { calculateTokenExpiresAt, reconcileTokenState } from '@/lib/token-policy';
import { User } from '@/types/auth';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'dummyjson-credentials',
      name: 'DummyJSON Credentials',
      credentials: {
        username: { label: 'Username', type: 'text', placeholder: 'emilys' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error('EMPTY_FIELDS');
        }

        const username = credentials.username.trim();
        const password = credentials.password;

        if (!username || !password) {
          throw new Error('EMPTY_FIELDS');
        }

        try {
          const authResponse = await loginWithDummyJson({
            username,
            password,
          });

          // Return conforming User object for the JWT token
          return {
            id: authResponse.id,
            username: authResponse.username,
            email: authResponse.email,
            firstName: authResponse.firstName,
            lastName: authResponse.lastName,
            gender: authResponse.gender,
            image: authResponse.image,
            accessToken: authResponse.accessToken,
            refreshToken: authResponse.refreshToken,
          };
        } catch (error: unknown) {
          if (error instanceof ApiError) {
            // Throw recognized error code for safe UI mapping without exposing internals
            throw new Error(error.code || 'UNKNOWN_ERROR');
          }
          throw new Error('UNKNOWN_ERROR');
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60, // 1 hour session
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Store user profile and sensitive tokens safely in encrypted server-side JWT
        token.user = {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          gender: user.gender,
          image: user.image,
        };
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessTokenExpires = calculateTokenExpiresAt(user.expiresInMins ?? 60);
        token.error = undefined;
      }

      // Reconcile upstream token expiration policy using centralized policy
      return reconcileTokenState(token);
    },
    async session({ session, token }) {
      // Invalidate session if upstream token has expired
      if (token?.error === 'AccessTokenExpired') {
        session.user = undefined;
        session.error = 'AccessTokenExpired';
        return session;
      }

      if (token?.user) {
        // Only non-sensitive user profile data is exposed to client-accessible session.
        // Tokens (accessToken, refreshToken) are strictly excluded.
        session.user = {
          id: token.user.id,
          username: token.user.username,
          email: token.user.email,
          firstName: token.user.firstName,
          lastName: token.user.lastName,
          gender: token.user.gender,
          image: token.user.image,
        } as User;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: getAuthSecret(),
  debug: process.env.NODE_ENV === 'development',
};
