import { DummyJsonLoginRequest, DummyJsonLoginResponse } from '@/types/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dummyjson.com';
const DEFAULT_TIMEOUT_MS = 10000;

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number = 500, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Custom fetch wrapper with timeout and standardized error handling.
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      // DummyJSON returns error message in { message: "Invalid credentials" } format
      const errorMessage =
        (typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string')
          ? data.message
          : `Request failed with status ${response.status}`;

      throw new ApiError(errorMessage, response.status, data);
    }

    return data as T;
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof ApiError) {
      throw err;
    }

    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new ApiError('Request timed out. Please check your internet connection and try again.', 408);
      }
      throw new ApiError(err.message || 'Network error occurred. Please try again.', 500);
    }

    throw new ApiError('An unexpected error occurred.', 500);
  }
}

/**
 * Authenticate credentials against DummyJSON /auth/login endpoint.
 */
export async function loginWithDummyJson(
  credentials: DummyJsonLoginRequest
): Promise<DummyJsonLoginResponse> {
  return apiFetch<DummyJsonLoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: credentials.username.trim(),
      password: credentials.password,
      expiresInMins: credentials.expiresInMins ?? 60,
    }),
  });
}

