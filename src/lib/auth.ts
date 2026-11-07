import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { loginWithDummyJson } from '@/lib/api';
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
          throw new Error('Username and password are required');
        }

        const username = credentials.username.trim();
        const password = credentials.password;

        if (!username || !password) {
          throw new Error('Username and password cannot be empty or whitespace');
        }

        try {
          const authResponse = await loginWithDummyJson({
            username,
            password,
          });

          if (!authResponse || !authResponse.accessToken) {
            throw new Error('Invalid authentication response from server');
          }

          // Return conforming NextAuth User object
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
          const message = error instanceof Error ? error.message : 'Authentication failed';
          throw new Error(message);
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
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.user) {
        session.user = {
          ...(token.user as User),
          accessToken: token.accessToken as string,
          refreshToken: token.refreshToken as string,
        };
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'development-fallback-secret-for-assessment-only-not-production',
  debug: process.env.NODE_ENV === 'development',
};
