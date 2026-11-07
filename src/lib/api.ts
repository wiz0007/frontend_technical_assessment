import {
  DummyJsonLoginRequest,
  DummyJsonLoginResponse,
  AuthErrorCode,
} from '../types/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dummyjson.com';
const DEFAULT_TIMEOUT_MS = 10000;

export class ApiError extends Error {
  status: number;
  code: AuthErrorCode;
  data?: unknown;

  constructor(
    message: string,
    status: number = 500,
    code: AuthErrorCode = 'UNKNOWN_ERROR',
    data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

/**
 * Validates the runtime payload returned by the DummyJSON auth endpoint.
 * Ensures the session is never constructed from invalid or partial data.
 */
export function validateDummyJsonLoginResponse(data: unknown): DummyJsonLoginResponse {
  if (typeof data !== 'object' || data === null) {
    throw new ApiError(
      'Invalid authentication response: expected an object from server.',
      502,
      'MALFORMED_RESPONSE'
    );
  }

  const record = data as Record<string, unknown>;

  // Validate required accessToken
  if (typeof record.accessToken !== 'string' || record.accessToken.trim() === '') {
    throw new ApiError(
      'Invalid authentication response: missing or invalid access token.',
      502,
      'MALFORMED_RESPONSE'
    );
  }

  // Validate required id (number or non-empty string)
  const id = record.id;
  const isValidId =
    (typeof id === 'number' && !Number.isNaN(id)) ||
    (typeof id === 'string' && id.trim() !== '');
  if (!isValidId) {
    throw new ApiError(
      'Invalid authentication response: missing or invalid user ID.',
      502,
      'MALFORMED_RESPONSE'
    );
  }

  // Validate required username
  if (typeof record.username !== 'string' || record.username.trim() === '') {
    throw new ApiError(
      'Invalid authentication response: missing or invalid username.',
      502,
      'MALFORMED_RESPONSE'
    );
  }

  // Safe extraction of optional profile attributes
  return {
    id: id as number | string,
    username: record.username.trim(),
    email: typeof record.email === 'string' ? record.email.trim() : '',
    firstName: typeof record.firstName === 'string' ? record.firstName.trim() : '',
    lastName: typeof record.lastName === 'string' ? record.lastName.trim() : '',
    gender: typeof record.gender === 'string' ? record.gender.trim() : '',
    image: typeof record.image === 'string' ? record.image.trim() : '',
    accessToken: record.accessToken,
    refreshToken: typeof record.refreshToken === 'string' ? record.refreshToken : '',
  };
}

/**
 * Robust fetch wrapper with comprehensive timeout, external signal support,
 * guaranteed timer cleanup, and safe JSON consumption.
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const controller = new AbortController();
  let isTimeout = false;

  // Set timeout covering BOTH request dispatch and response-body parsing
  const timeoutId = setTimeout(() => {
    isTimeout = true;
    controller.abort();
  }, timeoutMs);

  // Link external signal if supplied
  const externalSignal = options.signal;
  let externalAbortListener: (() => void) | null = null;

  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeoutId);
      throw new ApiError('Request was cancelled.', 499, 'UNKNOWN_ERROR');
    }
    externalAbortListener = () => {
      controller.abort();
    };
    externalSignal.addEventListener('abort', externalAbortListener);
  }

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    // Consume body while timeout is still active
    const rawText = await response.text();
    let data: unknown;

    if (rawText.trim() === '') {
      data = null;
    } else if (isJson) {
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new ApiError(
          'Received malformed JSON from the API server.',
          response.status || 502,
          'MALFORMED_RESPONSE'
        );
      }
    } else {
      data = rawText;
    }

    if (!response.ok) {
      const record = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : null;
      const apiMessage = typeof record?.message === 'string' ? record.message : null;

      let code: AuthErrorCode = 'UNKNOWN_ERROR';
      if (response.status === 400 || response.status === 401) {
        code = 'INVALID_CREDENTIALS';
      } else if (response.status === 408) {
        code = 'TIMEOUT';
      } else if (response.status >= 500 || response.status === 429) {
        code = 'SERVICE_UNAVAILABLE';
      }

      const fallbackMessage =
        code === 'INVALID_CREDENTIALS'
          ? 'Invalid credentials provided.'
          : `Request failed with status ${response.status}`;

      throw new ApiError(apiMessage || fallbackMessage, response.status, code, data);
    }

    return data as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }

    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        if (isTimeout) {
          throw new ApiError(
            'Request timed out. Please check your internet connection and try again.',
            408,
            'TIMEOUT'
          );
        }
        throw new ApiError('Request was cancelled.', 499, 'UNKNOWN_ERROR');
      }

      // Distinguish network failures
      return (() => {
        throw new ApiError(
          'Unable to connect to the authentication server. Please check your network.',
          503,
          'NETWORK_ERROR'
        );
      })();
    }

    throw new ApiError('An unexpected network error occurred.', 500, 'UNKNOWN_ERROR');
  } finally {
    // Guaranteed cleanup of timer and event listeners under all return or throw conditions
    clearTimeout(timeoutId);
    if (externalSignal && externalAbortListener) {
      externalSignal.removeEventListener('abort', externalAbortListener);
    }
  }
}

/**
 * Authenticates credentials against DummyJSON /auth/login endpoint and validates the response.
 */
export async function loginWithDummyJson(
  credentials: DummyJsonLoginRequest
): Promise<DummyJsonLoginResponse> {
  const rawResponse = await apiFetch<unknown>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: credentials.username.trim(),
      password: credentials.password,
      expiresInMins: credentials.expiresInMins ?? 60,
    }),
  });

  // Strict runtime validation ensures no partial or malformed response creates a session
  return validateDummyJsonLoginResponse(rawResponse);
}
