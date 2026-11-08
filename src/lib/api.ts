import type {
  DummyJsonLoginRequest,
  DummyJsonLoginResponse,
  AuthErrorCode,
} from '@/types/auth';
import type {
  DummyJsonUser,
  UsersResponse,
  UsersFilterParams,
} from '@/types/users';
import type {
  DummyJsonProduct,
  ProductsResponse,
  ProductCategory,
  ProductsFilterParams,
} from '@/types/products';
import { categoryProductsCache } from './category-cache.ts';

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
 * Checks whether an exception represents intentional request cancellation.
 */
export function isCancelledError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  if (err instanceof ApiError && (err.code === 'REQUEST_CANCELLED' || err.status === 499)) return true;
  if (err instanceof Error && err.name === 'AbortError') return true;
  return false;
}

/* =====================================================================
   RUNTIME DATA VALIDATION FUNCTIONS
===================================================================== */

function malformed(message: string): never {
  throw new ApiError(message, 502, 'MALFORMED_RESPONSE');
}

function recordOf(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) malformed(`Invalid ${label}: expected an object.`);
  return value as Record<string, unknown>;
}

function requiredString(record: Record<string, unknown>, key: string, label: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.trim() === '') malformed(`Invalid ${label}: missing or invalid ${key}.`);
  return value.trim();
}

function requiredFiniteNumber(record: Record<string, unknown>, key: string, label: string, min = -Infinity): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min) malformed(`Invalid ${label}: missing or invalid ${key}.`);
  return value;
}

function optionalString(record: Record<string, unknown>, key: string, label: string): string | undefined {
  const value = record[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') malformed(`Invalid ${label}: ${key} must be a string when provided.`);
  return value;
}

function optionalFiniteNumber(record: Record<string, unknown>, key: string, label: string, min = -Infinity): number | undefined {
  const value = record[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min) malformed(`Invalid ${label}: ${key} must be a valid number when provided.`);
  return value;
}

function optionalStringArray(record: Record<string, unknown>, key: string, label: string): string[] | undefined {
  const value = record[key];
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) malformed(`Invalid ${label}: ${key} must be an array of strings.`);
  return value as string[];
}

function validImageUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim() === '') return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function requiredImageUrl(record: Record<string, unknown>, key: string, label: string): string {
  const value = record[key];
  if (!validImageUrl(value)) malformed(`Invalid ${label}: ${key} must be an absolute HTTP(S) URL.`);
  return value;
}

/** Validates the runtime payload returned by the DummyJSON authentication endpoint. */
export function validateDummyJsonLoginResponse(data: unknown): DummyJsonLoginResponse {
  const r = recordOf(data, 'authentication response');
  const id = typeof r.id === 'number' ? r.id : (typeof r.id === 'string' && /^\d+$/.test(r.id) ? Number(r.id) : NaN);
  if (!Number.isSafeInteger(id) || id <= 0) malformed('Invalid authentication response: missing or invalid user ID.');
  return {
    id,
    username: requiredString(r, 'username', 'authentication response'),
    email: requiredString(r, 'email', 'authentication response'),
    firstName: requiredString(r, 'firstName', 'authentication response'),
    lastName: requiredString(r, 'lastName', 'authentication response'),
    gender: requiredString(r, 'gender', 'authentication response'),
    image: requiredImageUrl(r, 'image', 'authentication response'),
    accessToken: requiredString(r, 'accessToken', 'authentication response'),
    refreshToken: requiredString(r, 'refreshToken', 'authentication response'),
  };
}

/** Validates a DummyJSON user. Optional API fields remain absent when omitted. */
export function validateUser(data: unknown): DummyJsonUser {
  const r = recordOf(data, 'user data');
  const id = requiredFiniteNumber(r, 'id', 'user data', 1);
  if (!Number.isSafeInteger(id)) malformed('Invalid user data: id must be a safe integer.');
  const firstName = requiredString(r, 'firstName', 'user data');
  const lastName = requiredString(r, 'lastName', 'user data');
  const username = requiredString(r, 'username', 'user data');
  const age = requiredFiniteNumber(r, 'age', 'user data', 0);
  const gender = requiredString(r, 'gender', 'user data');
  const email = requiredString(r, 'email', 'user data');
  const phone = requiredString(r, 'phone', 'user data');
  const image = requiredImageUrl(r, 'image', 'user data');

  let hair: DummyJsonUser['hair'];
  if (r.hair !== undefined && r.hair !== null) {
    const h = recordOf(r.hair, 'user hair');
    hair = { color: requiredString(h, 'color', 'user hair'), type: requiredString(h, 'type', 'user hair') };
  }
  let address: DummyJsonUser['address'];
  if (r.address !== undefined && r.address !== null) {
    const a = recordOf(r.address, 'user address');
    address = {
      address: requiredString(a, 'address', 'user address'), city: requiredString(a, 'city', 'user address'),
      state: requiredString(a, 'state', 'user address'), postalCode: requiredString(a, 'postalCode', 'user address'),
      ...(optionalString(a, 'stateCode', 'user address') !== undefined ? { stateCode: optionalString(a, 'stateCode', 'user address') } : {}),
      ...(optionalString(a, 'country', 'user address') !== undefined ? { country: optionalString(a, 'country', 'user address') } : {}),
    };
  }
  let company: DummyJsonUser['company'];
  if (r.company !== undefined && r.company !== null) {
    const c = recordOf(r.company, 'user company');
    company = { department: requiredString(c, 'department', 'user company'), name: requiredString(c, 'name', 'user company'), title: requiredString(c, 'title', 'user company') };
  }
  return {
    id, firstName, lastName, username, age, gender, email, phone, image,
    maidenName: optionalString(r, 'maidenName', 'user data'),
    birthDate: optionalString(r, 'birthDate', 'user data'),
    bloodGroup: optionalString(r, 'bloodGroup', 'user data'),
    height: optionalFiniteNumber(r, 'height', 'user data', 0),
    weight: optionalFiniteNumber(r, 'weight', 'user data', 0),
    eyeColor: optionalString(r, 'eyeColor', 'user data'), hair, address,
    university: optionalString(r, 'university', 'user data'), company,
    role: optionalString(r, 'role', 'user data'),
  };
}

function validatePagination(r: Record<string, unknown>, label: string): { total: number; skip: number; limit: number } {
  const total = requiredFiniteNumber(r, 'total', label, 0);
  const skip = requiredFiniteNumber(r, 'skip', label, 0);
  const limit = requiredFiniteNumber(r, 'limit', label, 0);
  if (![total, skip, limit].every(Number.isSafeInteger)) malformed(`Invalid ${label}: pagination values must be safe integers.`);
  return { total, skip, limit };
}

export function validateUsersResponse(data: unknown, _expectedSkip?: number, _expectedLimit?: number): UsersResponse {
  const r = recordOf(data, 'users listing response');
  if (!Array.isArray(r.users)) malformed('Invalid users listing response: users must be an array.');
  const users = r.users.map(validateUser);
  return { users, ...validatePagination(r, 'users listing response') };
}

/** Validates a DummyJSON product while preserving omitted optional fields. */
export function validateProduct(data: unknown): DummyJsonProduct {
  const r = recordOf(data, 'product data');
  const id = requiredFiniteNumber(r, 'id', 'product data', 1);
  if (!Number.isSafeInteger(id)) malformed('Invalid product data: id must be a safe integer.');
  const title = requiredString(r, 'title', 'product data');
  const description = requiredString(r, 'description', 'product data');
  const category = requiredString(r, 'category', 'product data');
  const price = requiredFiniteNumber(r, 'price', 'product data', 0);
  const discountPercentage = requiredFiniteNumber(r, 'discountPercentage', 'product data', 0);
  const rating = requiredFiniteNumber(r, 'rating', 'product data', 0);
  const stock = requiredFiniteNumber(r, 'stock', 'product data', 0);
  if (rating > 5 || discountPercentage > 100) malformed('Invalid product data: rating or discountPercentage is out of range.');
  if (!Array.isArray(r.images) || !r.images.every(validImageUrl)) malformed('Invalid product data: images must contain only absolute HTTP(S) URLs.');
  const thumbnail = requiredImageUrl(r, 'thumbnail', 'product data');
  const tags = optionalStringArray(r, 'tags', 'product data');
  const weight = optionalFiniteNumber(r, 'weight', 'product data', 0);
  const minimumOrderQuantity = optionalFiniteNumber(r, 'minimumOrderQuantity', 'product data', 1);
  let dimensions: DummyJsonProduct['dimensions'];
  if (r.dimensions !== undefined && r.dimensions !== null) {
    const d = recordOf(r.dimensions, 'product dimensions');
    dimensions = { width: requiredFiniteNumber(d, 'width', 'product dimensions', 0), height: requiredFiniteNumber(d, 'height', 'product dimensions', 0), depth: requiredFiniteNumber(d, 'depth', 'product dimensions', 0) };
  }
  let reviews: DummyJsonProduct['reviews'];
  if (r.reviews !== undefined && r.reviews !== null) {
    if (!Array.isArray(r.reviews)) malformed('Invalid product data: reviews must be an array.');
    reviews = r.reviews.map((review) => {
      const rev = recordOf(review, 'product review');
      const reviewRating = requiredFiniteNumber(rev, 'rating', 'product review', 1);
      if (reviewRating > 5) malformed('Invalid product review: rating must not exceed 5.');
      const date = requiredString(rev, 'date', 'product review');
      if (Number.isNaN(Date.parse(date))) malformed('Invalid product review: date must be valid.');
      return { rating: reviewRating, comment: requiredString(rev, 'comment', 'product review'), reviewerName: requiredString(rev, 'reviewerName', 'product review'), reviewerEmail: requiredString(rev, 'reviewerEmail', 'product review'), date };
    });
  }
  return {
    id, title, description, category, price, discountPercentage, rating, stock,
    images: r.images as string[], thumbnail, tags, weight, dimensions, reviews,
    brand: optionalString(r, 'brand', 'product data'), sku: optionalString(r, 'sku', 'product data'),
    warrantyInformation: optionalString(r, 'warrantyInformation', 'product data'),
    shippingInformation: optionalString(r, 'shippingInformation', 'product data'),
    availabilityStatus: optionalString(r, 'availabilityStatus', 'product data'),
    returnPolicy: optionalString(r, 'returnPolicy', 'product data'), minimumOrderQuantity,
  };
}

export function validateProductsResponse(data: unknown, _expectedSkip?: number, _expectedLimit?: number): ProductsResponse {
  const r = recordOf(data, 'products listing response');
  if (!Array.isArray(r.products)) malformed('Invalid products listing response: products must be an array.');
  const products = r.products.map(validateProduct);
  return { products, ...validatePagination(r, 'products listing response') };
}

export function validateCategories(data: unknown): ProductCategory[] {
  if (!Array.isArray(data)) malformed('Invalid categories response: expected an array.');
  return data.map((item) => {
    const category = recordOf(item, 'product category');
    const slug = requiredString(category, 'slug', 'product category');
    const name = requiredString(category, 'name', 'product category');
    const url = optionalString(category, 'url', 'product category');
    if (url !== undefined && !validImageUrl(url)) malformed('Invalid product category: url must be an absolute HTTP(S) URL.');
    return { slug, name, ...(url ? { url } : {}) };
  });
}

/* =====================================================================
   CENTRALIZED FETCH WRAPPER
===================================================================== */

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
    typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS;

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
      throw new ApiError('Request was cancelled.', 499, 'REQUEST_CANCELLED');
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
        throw new ApiError('Request was cancelled.', 499, 'REQUEST_CANCELLED');
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
  credentials: DummyJsonLoginRequest,
  options?: RequestInit
): Promise<DummyJsonLoginResponse> {
  const rawResponse = await apiFetch<unknown>('/auth/login', {
    ...options,
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
  params: UsersFilterParams = {},
  options?: RequestInit
): Promise<UsersResponse> {
  const limit = params.limit ?? 10;
  const skip = params.skip ?? 0;
  const search = params.search?.trim();

  let endpoint = `/users?limit=${limit}&skip=${skip}`;
  if (search) {
    endpoint = `/users/search?q=${encodeURIComponent(search)}&limit=${limit}&skip=${skip}`;
  }

  const raw = await apiFetch<unknown>(endpoint, options);
  return validateUsersResponse(raw, skip, limit);
}

export async function fetchUserById(
  id: number | string,
  options?: RequestInit
): Promise<DummyJsonUser> {
  const raw = await apiFetch<unknown>(`/users/${encodeURIComponent(id)}`, options);
  return validateUser(raw);
}

/* =====================================================================
   PRODUCTS API (SPRINT 2)
===================================================================== */

export async function fetchCategories(options?: RequestInit): Promise<ProductCategory[]> {
  const raw = await apiFetch<unknown>('/products/categories', options);
  return validateCategories(raw);
}

export async function fetchProducts(
  params: ProductsFilterParams = {},
  options?: RequestInit
): Promise<ProductsResponse> {
  const limit = params.limit ?? 10;
  const skip = params.skip ?? 0;
  const search = params.search?.trim();
  const category = params.category?.trim();

  // Scenario 1: Both Category AND Search query are supplied
  // UPSTREAM API LIMITATION: DummyJSON does not natively support search within category endpoint.
  // We fetch category products (cached in bounded LRU cache for 60s to prevent repeated downloads),
  // filter deterministically, and apply slice-based pagination accurately.
  if (category && search) {
    const cached = categoryProductsCache.get(category);
    let allInCat: DummyJsonProduct[];

    if (cached) {
      allInCat = cached;
    } else {
      const categoryEndpoint = `/products/category/${encodeURIComponent(category)}?limit=0`;
      const rawCatResponse = await apiFetch<unknown>(categoryEndpoint, options);
      const validatedCat = validateProductsResponse(rawCatResponse, 0, 0);
      allInCat = validatedCat.products;
      categoryProductsCache.set(category, allInCat);
    }

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
    const raw = await apiFetch<unknown>(endpoint, options);
    return validateProductsResponse(raw, skip, limit);
  }

  // Scenario 3: Category filter only
  if (category) {
    const endpoint = `/products/category/${encodeURIComponent(category)}?limit=${limit}&skip=${skip}`;
    const raw = await apiFetch<unknown>(endpoint, options);
    return validateProductsResponse(raw, skip, limit);
  }

  // Scenario 4: Standard paginated product listing
  const endpoint = `/products?limit=${limit}&skip=${skip}`;
  const raw = await apiFetch<unknown>(endpoint, options);
  return validateProductsResponse(raw, skip, limit);
}

export async function fetchProductById(
  id: number | string,
  options?: RequestInit
): Promise<DummyJsonProduct> {
  const raw = await apiFetch<unknown>(`/products/${encodeURIComponent(id)}`, options);
  return validateProduct(raw);
}
