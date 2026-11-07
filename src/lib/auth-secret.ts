/**
 * Resolves the authoritative authentication secret used across NextAuth and middleware.
 * In production (NODE_ENV === 'production'), NEXTAUTH_SECRET is strictly required.
 * In development/test, a dev fallback is only used if NEXTAUTH_SECRET is not set.
 */
export function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;

  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret.trim() === '' || secret.includes('fallback') || secret.includes('dev-only')) {
      throw new Error(
        '[FATAL CONFIG ERROR] NEXTAUTH_SECRET environment variable is missing or insecure in production. ' +
          'A secure 32+ character secret is required for production deployment.'
      );
    }
    return secret;
  }

  // Development / test fallback
  if (secret && secret.trim() !== '') {
    return secret;
  }

  return 'dev-only-secret-do-not-use-in-production-help-study-abroad-auth-key';
}

