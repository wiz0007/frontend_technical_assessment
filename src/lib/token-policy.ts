/**
 * Token Policy & Upstream Lifecycle Management (Requirement S1-03)
 *
 * Distinguishes between:
 * 1. Application Session: Authoritative application-level session managed by NextAuth.
 * 2. Upstream Access Token: External credentials issued by DummyJSON (60-minute default TTL).
 *
 * Rules:
 * - Upstream tokens are stored exclusively in encrypted server-side JWT cookies.
 * - Sensitive tokens (accessToken, refreshToken) are strictly stripped from client-facing session objects.
 * - No tokens are placed in localStorage, sessionStorage, Zustand, or client cookies.
 * - Expiry timestamps are evaluated deterministically; expired upstream tokens trigger controlled reconciliation.
 */

export const DEFAULT_TOKEN_TTL_MINS = 60;

/**
 * Calculates the epoch expiration timestamp for an upstream token.
 */
export function calculateTokenExpiresAt(
  expiresInMins: number = DEFAULT_TOKEN_TTL_MINS,
  baseTime: number = Date.now()
): number {
  const safeMins = typeof expiresInMins === 'number' && expiresInMins > 0 ? expiresInMins : DEFAULT_TOKEN_TTL_MINS;
  return baseTime + safeMins * 60 * 1000;
}

/**
 * Determines whether an upstream token has expired relative to a reference time.
 */
export function isTokenExpired(
  expiresAt?: number | null,
  currentTime: number = Date.now()
): boolean {
  if (typeof expiresAt !== 'number' || Number.isNaN(expiresAt) || expiresAt <= 0) {
    // Missing or invalid expiry metadata is treated as expired to prevent silent unauthenticated usage
    return true;
  }
  return currentTime >= expiresAt;
}

/**
 * Strips all sensitive credentials from a user profile, producing a client-safe user representation.
 */
export function createClientSafeUser<T extends Record<string, unknown>>(user: T): Omit<T, 'accessToken' | 'refreshToken'> {
  const safeCopy = { ...user };
  delete safeCopy.accessToken;
  delete safeCopy.refreshToken;
  return safeCopy;
}

export interface ReconciledJwtResult {
  accessTokenExpires?: number;
  error?: 'AccessTokenExpired';
  [key: string]: unknown;
}

/**
 * Evaluates and reconciles server-side NextAuth JWT token state against upstream token expiration.
 */
export function reconcileTokenState(
  token: ReconciledJwtResult,
  currentTime: number = Date.now()
): ReconciledJwtResult {
  if (!token) return token;

  // If token is already marked expired, preserve the error state
  if (token.error === 'AccessTokenExpired') {
    return token;
  }

  // Check expiration if expiry metadata exists
  if (token.accessTokenExpires && isTokenExpired(token.accessTokenExpires, currentTime)) {
    return {
      ...token,
      error: 'AccessTokenExpired',
      // Purge cached upstream access token when expired
      accessToken: undefined,
    };
  }

  return token;
}
