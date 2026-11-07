export interface User {
  id: number | string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  gender: string;
  image: string;
}

export interface DummyJsonLoginResponse {
  id: number | string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  gender: string;
  image: string;
  accessToken: string;
  refreshToken: string;
}

export interface DummyJsonLoginRequest {
  username: string;
  password: string;
  expiresInMins?: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  setAuthState: (isAuthenticated: boolean, user: User | null) => void;
  clearAuthState: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export type AuthStore = AuthState & AuthActions;

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'SERVICE_UNAVAILABLE'
  | 'MALFORMED_RESPONSE'
  | 'REQUEST_CANCELLED'
  | 'HTTP_ERROR'
  | 'UNKNOWN_ERROR';

// Module augmentation for next-auth
// Notice: Tokens are strictly kept server-side in JWT and NEVER exposed to Session['user']
declare module 'next-auth' {
  interface Session {
    user?: User;
    expires: string;
    error?: string;
  }

  interface User {
    id: number | string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    gender: string;
    image: string;
    accessToken?: string;
    refreshToken?: string;
    expiresInMins?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    user?: User;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
  }
}
