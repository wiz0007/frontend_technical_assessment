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
  setUser: (user: User | null) => void;
  clearAuthState: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export type AuthStore = AuthState & AuthActions;

// Module augmentation for next-auth
declare module 'next-auth' {
  interface Session {
    user: User & {
      accessToken?: string;
      refreshToken?: string;
    };
    expires: string;
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
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    user?: User;
    accessToken?: string;
    refreshToken?: string;
    error?: string;
  }
}
