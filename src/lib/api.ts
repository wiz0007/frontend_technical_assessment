import {
  DummyJsonLoginRequest,
  DummyJsonLoginResponse,
  AuthErrorCode,
} from '@/types/auth';
import {
  DummyJsonUser,
  UsersResponse,
  UsersFilterParams,
} from '@/types/users';
import {
  DummyJsonProduct,
  ProductsResponse,
  ProductCategory,
  ProductsFilterParams,
} from '@/types/products';

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

  if (typeof record.accessToken !== 'string' || record.accessToken.trim() === '') {
    throw new ApiError(
      'Invalid authentication response: missing or invalid access token.',
      502,
      'MALFORMED_RESPONSE'
    );
  }

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

  if (typeof record.username !== 'string' || record.username.trim() === '') {
    throw new ApiError(
      'Invalid authentication response: missing or invalid username.',
      502,
      'MALFORMED_RESPONSE'
    );
  }

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
 * Centralized fetch wrapper supporting HeadersInit merging, timeout validation,
 * external AbortSignal cancellation, and error normalization.
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  // Validate timeout parameter
  const validTimeout =
    typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  let isTimeout = false;

  const timeoutId = setTimeout(() => {
    isTimeout = true;
    controller.abort();
  }, validTimeout);

  // Safely link external signal without breaking timeout mechanism
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

  // Safely merge Headers without overwriting caller options
  const mergedHeaders = new Headers(options.headers);
  if (!mergedHeaders.has('Content-Type') && options.body) {
    mergedHeaders.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: mergedHeaders,
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    const rawText = await response.text();
    let data: unknown;

    if (rawText.trim() === '') {
      data = null;
    } else if (isJson) {
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new ApiError(
          'Received malformed JSON from API server.',
          response.status || 502,
          'MALFORMED_RESPONSE'
        );
      }
    } else {
      data = rawText;
    }

    if (!response.ok) {
      const record =
        typeof data === 'object' && data !== null
          ? (data as Record<string, unknown>)
          : null;
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

      return (() => {
        throw new ApiError(
          'Unable to connect to the server. Please check your network connection.',
          503,
          'NETWORK_ERROR'
        );
      })();
    }

    throw new ApiError('An unexpected network error occurred.', 500, 'UNKNOWN_ERROR');
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal && externalAbortListener) {
      externalSignal.removeEventListener('abort', externalAbortListener);
    }
  }
}

/* =====================================================================
   AUTHENTICATION API
===================================================================== */

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

  return validateDummyJsonLoginResponse(rawResponse);
}

/* =====================================================================
   USERS API (SPRINT 2)
===================================================================== */

export async function fetchUsers(
  params: UsersFilterParams = {}
): Promise<UsersResponse> {
  const limit = params.limit ?? 10;
  const skip = params.skip ?? 0;
  const search = params.search?.trim();

  let endpoint = `/users?limit=${limit}&skip=${skip}`;
  if (search) {
    endpoint = `/users/search?q=${encodeURIComponent(search)}&limit=${limit}&skip=${skip}`;
  }

  const response = await apiFetch<UsersResponse>(endpoint);

  return {
    users: Array.isArray(response?.users) ? response.users : [],
    total: typeof response?.total === 'number' ? response.total : 0,
    skip: typeof response?.skip === 'number' ? response.skip : skip,
    limit: typeof response?.limit === 'number' ? response.limit : limit,
  };
}

export async function fetchUserById(id: number | string): Promise<DummyJsonUser> {
  return apiFetch<DummyJsonUser>(`/users/${encodeURIComponent(id)}`);
}

/* =====================================================================
   PRODUCTS API (SPRINT 2)
===================================================================== */

export async function fetchCategories(): Promise<ProductCategory[]> {
  const raw = await apiFetch<unknown>('/products/categories');

  if (!Array.isArray(raw)) {
    return [];
  }

  // Handle both modern DummyJSON [{ slug, name, url }] and legacy string[] formats
  return raw.map((item) => {
    if (typeof item === 'string') {
      return {
        slug: item,
        name: item.charAt(0).toUpperCase() + item.slice(1).replace(/-/g, ' '),
      };
    }
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      const slug = String(obj.slug || '');
      const name = String(obj.name || slug);
      return { slug, name };
    }
    return { slug: String(item), name: String(item) };
  });
}

export async function fetchProducts(
  params: ProductsFilterParams = {}
): Promise<ProductsResponse> {
  const limit = params.limit ?? 10;
  const skip = params.skip ?? 0;
  const search = params.search?.trim();
  const category = params.category?.trim();

  // Scenario 1: Both Category AND Search query are supplied
  // DummyJSON does not natively support search inside category endpoint.
  // We fetch category products (limit=0 to get all in category), then filter by query.
  if (category && search) {
    const categoryEndpoint = `/products/category/${encodeURIComponent(category)}?limit=0`;
    const catResponse = await apiFetch<ProductsResponse>(categoryEndpoint);
    const allInCat = Array.isArray(catResponse?.products) ? catResponse.products : [];

    const lowerQuery = search.toLowerCase();
    const filtered = allInCat.filter((p) => {
      const inTitle = p.title?.toLowerCase().includes(lowerQuery);
      const inDesc = p.description?.toLowerCase().includes(lowerQuery);
      const inBrand = p.brand?.toLowerCase().includes(lowerQuery);
      return inTitle || inDesc || inBrand;
    });

    const paginated = filtered.slice(skip, skip + limit);

    return {
      products: paginated,
      total: filtered.length,
      skip,
      limit,
    };
  }

  // Scenario 2: Search only (across all categories)
  if (search) {
    const endpoint = `/products/search?q=${encodeURIComponent(search)}&limit=${limit}&skip=${skip}`;
    const response = await apiFetch<ProductsResponse>(endpoint);
    return {
      products: Array.isArray(response?.products) ? response.products : [],
      total: typeof response?.total === 'number' ? response.total : 0,
      skip: typeof response?.skip === 'number' ? response.skip : skip,
      limit: typeof response?.limit === 'number' ? response.limit : limit,
    };
  }

  // Scenario 3: Category filter only
  if (category) {
    const endpoint = `/products/category/${encodeURIComponent(category)}?limit=${limit}&skip=${skip}`;
    const response = await apiFetch<ProductsResponse>(endpoint);
    return {
      products: Array.isArray(response?.products) ? response.products : [],
      total: typeof response?.total === 'number' ? response.total : 0,
      skip: typeof response?.skip === 'number' ? response.skip : skip,
      limit: typeof response?.limit === 'number' ? response.limit : limit,
    };
  }

  // Scenario 4: Standard paginated product listing
  const endpoint = `/products?limit=${limit}&skip=${skip}`;
  const response = await apiFetch<ProductsResponse>(endpoint);
  return {
    products: Array.isArray(response?.products) ? response.products : [],
    total: typeof response?.total === 'number' ? response.total : 0,
    skip: typeof response?.skip === 'number' ? response.skip : skip,
    limit: typeof response?.limit === 'number' ? response.limit : limit,
  };
}

export async function fetchProductById(id: number | string): Promise<DummyJsonProduct> {
  return apiFetch<DummyJsonProduct>(`/products/${encodeURIComponent(id)}`);
}
