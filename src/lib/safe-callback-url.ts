/**
 * Validates and sanitizes callback URLs to prevent open redirects, protocol-relative attacks,
 * and dangerous URI schemes across both local development and production deployments (Requirement S1-01).
 *
 * Rules:
 * - Uses configured application origin (NEXTAUTH_URL) rather than hard-coded localhost.
 * - Does not trust arbitrary request Host headers.
 * - Accepts valid relative application paths.
 * - Accepts absolute URLs only when they resolve to the trusted application origin.
 * - Rejects external origins, protocol-relative URLs (//example.com), dangerous schemes (javascript:).
 * - Returns safe application fallback (/dashboard) whenever input is invalid or external.
 */

/**
 * Resolves the trusted application origin from configuration or runtime environment.
 */
export function getTrustedAppOrigin(configuredUrl?: string): string {
  const envUrl = configuredUrl || (typeof process !== 'undefined' ? process.env.NEXTAUTH_URL : undefined);
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    try {
      const parsed = new URL(envUrl.trim());
      return parsed.origin;
    } catch {
      // Fall through if NEXTAUTH_URL is malformed
    }
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return 'http://localhost:3000';
}

/**
 * Sanitizes and validates a callback URL against the trusted application origin.
 *
 * @param raw - The untrusted callback URL candidate (query parameter, state, etc.)
 * @param defaultDestination - Safe internal fallback route (default: '/dashboard')
 * @param trustedOriginOverride - Optional origin override for testing or multi-environment resolution
 * @returns A safe internal pathname with query parameters and hash, or defaultDestination
 */
export function getSafeCallbackUrl(
  raw: unknown,
  defaultDestination: string = '/dashboard',
  trustedOriginOverride?: string
): string {
  if (!raw || typeof raw !== 'string') {
    return defaultDestination;
  }

  const trimmed = raw.trim();
  if (trimmed === '') {
    return defaultDestination;
  }

  // Reject protocol-relative, backslash-based, and dangerous scheme attacks
  const lower = trimmed.toLowerCase();
  if (
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.startsWith('\\') ||
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return defaultDestination;
  }

  const trustedOrigin = getTrustedAppOrigin(trustedOriginOverride);

  try {
    // If input is an absolute URL, verify it matches the trusted origin
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const parsedAbsolute = new URL(trimmed);
      if (parsedAbsolute.origin !== trustedOrigin) {
        return defaultDestination;
      }
      if (!parsedAbsolute.pathname.startsWith('/') || parsedAbsolute.pathname.startsWith('//')) {
        return defaultDestination;
      }
      return `${parsedAbsolute.pathname}${parsedAbsolute.search}${parsedAbsolute.hash}`;
    }

    // Resolve relative path against trustedOrigin
    const parsed = new URL(trimmed, trustedOrigin);
    if (parsed.origin !== trustedOrigin) {
      return defaultDestination;
    }

    if (!parsed.pathname.startsWith('/') || parsed.pathname.startsWith('//')) {
      return defaultDestination;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return defaultDestination;
  }
}
