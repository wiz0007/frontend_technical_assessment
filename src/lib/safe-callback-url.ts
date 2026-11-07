/**
 * Validates and sanitizes callback URLs to prevent open redirects, protocol-relative attacks,
 * and dangerous URI schemes.
 *
 * @param raw - The untrusted callback URL candidate (from query parameters, headers, or state)
 * @param defaultDestination - Fallback internal route when validation fails (default: '/dashboard')
 * @returns A safe internal pathname with query parameters and hash, or the default destination
 */
export function getSafeCallbackUrl(
  raw: unknown,
  defaultDestination: string = '/dashboard'
): string {
  if (!raw || typeof raw !== 'string') {
    return defaultDestination;
  }

  const trimmed = raw.trim();

  // Reject empty string
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

  try {
    // Resolve against a dummy local base
    const parsed = new URL(trimmed, 'http://localhost');

    // Must match local origin (rejects absolute external URLs like https://evil.example)
    if (parsed.origin !== 'http://localhost') {
      return defaultDestination;
    }

    // Must have a valid single-slash pathname
    if (!parsed.pathname.startsWith('/') || parsed.pathname.startsWith('//')) {
      return defaultDestination;
    }

    // Return sanitized internal route containing path, query, and hash
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return defaultDestination;
  }
}

