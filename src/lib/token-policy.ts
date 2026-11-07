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
 * - Expiry timestamps must be valid finite positive numbers. Missing, zero, negative, NaN,
 *   or infinite values are strictly treated as expired.
 */

export const DEFAULT_TOKEN_TTL_MINS = 60;

/**
 * Calculates the epoch expiration timestamp for an upstream token.
 */
export function calculateTokenExpiresAt(
  expiresInMins: unknown = DEFAULT_TOKEN_TTL_MINS,
  baseTime: number = Date.now()
): number {
  const mins = typeof expiresInMins === 'number' && Number.isFinite(expiresInMins) && expiresInMins > 0
    ? expiresInMins
    : DEFAULT_TOKEN_TTL_MINS;
  return baseTime + mins * 60 * 1000;
}

/**
 * Determines whether an upstream token has expired relative to a reference time.
 * Validates that expiresAt is a finite positive number; any missing, zero, negative, NaN,
 * or infinite value is strictly classified as expired.
 */
export function isTokenExpired(
  expiresAt?: unknown,
  currentTime: number = Date.now()
): boolean {
  if (
    typeof expiresAt !== 'number' ||
    !Number.isFinite(expiresAt) ||
    Number.isNaN(expiresAt) ||
    expiresAt <= 0
  ) {
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
  accessTokenExpires?: unknown;
  accessToken?: unknown;
  error?: 'AccessTokenExpired';
  [key: string]: unknown;
}

/**
 * Evaluates and reconciles server-side NextAuth JWT token state against upstream token expiration.
 * Any missing or invalid expiry on an upstream token triggers expiration rather than bypassing it.
 */
export function reconcileTokenState<T extends Record<string, unknown>>(
  token: T,
  currentTime: number = Date.now()
): T {
  if (!token || typeof token !== 'object') {
    return token;
  }

  // Preserve already flagged expiration
  if ((token as ReconciledJwtResult).error === 'AccessTokenExpired') {
    return token;
  }

  // If token has an upstream accessToken or an expiry claim, validate expiry strictly
  const rec = token as ReconciledJwtResult;
  if (rec.accessToken !== undefined || rec.accessTokenExpires !== undefined) {
    if (isTokenExpired(rec.accessTokenExpires, currentTime)) {
      return {
        ...token,
        error: 'AccessTokenExpired',
        accessToken: undefined,
      };
    }
  }

  return token;
}
