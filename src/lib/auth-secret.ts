/**
 * Resolves the authoritative authentication secret used across NextAuth and middleware.
 * In production (NODE_ENV === 'production'), NEXTAUTH_SECRET is strictly required
 * and must be at least 32 characters long.
 * In development/test, a guarded dev fallback is used only if NEXTAUTH_SECRET is not set.
 */
export function getAuthSecret(
  envNodeEnv: string = process.env.NODE_ENV || 'development',
  envSecret: string | undefined = process.env.NEXTAUTH_SECRET
): string {
  const secret = envSecret;

  if (envNodeEnv === 'production') {
    if (
      !secret ||
      secret.trim() === '' ||
      secret.trim().length < 32 ||
      secret.includes('fallback') ||
      secret.includes('dev-only')
    ) {
      throw new Error(
        '[FATAL CONFIG ERROR] NEXTAUTH_SECRET environment variable is missing, too short, or insecure in production. ' +
          'A cryptographically secure secret of at least 32 characters is strictly required for production deployment.'
      );
    }
    return secret.trim();
  }

  // Development / test fallback
  if (secret && secret.trim() !== '') {
    return secret.trim();
  }

  return 'dev-only-secret-do-not-use-in-production-help-study-abroad-auth-key-32chars';
}
