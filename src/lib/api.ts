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

/* =====================================================================
   RUNTIME DATA VALIDATION FUNCTIONS
===================================================================== */

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
  const idNum = typeof id === 'number' ? id : parseInt(String(id), 10);
  const isValidId = !Number.isNaN(idNum) && idNum > 0;
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
 * Validates an individual user profile record received from DummyJSON.
 */
export function validateUser(data: unknown): DummyJsonUser {
  if (typeof data !== 'object' || data === null) {
    throw new ApiError('Invalid user data: expected an object.', 502, 'MALFORMED_RESPONSE');
  }

  const r = data as Record<string, unknown>;
  const id = typeof r.id === 'number' ? r.id : parseInt(String(r.id), 10);

  if (Number.isNaN(id) || id <= 0) {
    throw new ApiError('Invalid user data: missing or malformed numeric ID.', 502, 'MALFORMED_RESPONSE');
  }

  return {
    id,
    firstName: typeof r.firstName === 'string' ? r.firstName.trim() : '',
    lastName: typeof r.lastName === 'string' ? r.lastName.trim() : '',
    maidenName: typeof r.maidenName === 'string' ? r.maidenName.trim() : undefined,
    age: typeof r.age === 'number' ? r.age : 0,
    gender: typeof r.gender === 'string' ? r.gender.trim() : '',
    email: typeof r.email === 'string' ? r.email.trim() : '',
    phone: typeof r.phone === 'string' ? r.phone.trim() : '',
    username: typeof r.username === 'string' ? r.username.trim() : `user_${id}`,
    birthDate: typeof r.birthDate === 'string' ? r.birthDate : undefined,
    image: typeof r.image === 'string' ? r.image : '',
    bloodGroup: typeof r.bloodGroup === 'string' ? r.bloodGroup : undefined,
    height: typeof r.height === 'number' ? r.height : undefined,
    weight: typeof r.weight === 'number' ? r.weight : undefined,
    eyeColor: typeof r.eyeColor === 'string' ? r.eyeColor : undefined,
    hair:
      typeof r.hair === 'object' && r.hair !== null
        ? {
            color: String((r.hair as Record<string, unknown>).color || ''),
            type: String((r.hair as Record<string, unknown>).type || ''),
          }
        : undefined,
    address:
      typeof r.address === 'object' && r.address !== null
        ? {
            address: String((r.address as Record<string, unknown>).address || ''),
            city: String((r.address as Record<string, unknown>).city || ''),
            state: String((r.address as Record<string, unknown>).state || ''),
            stateCode: (r.address as Record<string, unknown>).stateCode
              ? String((r.address as Record<string, unknown>).stateCode)
              : undefined,
            postalCode: String((r.address as Record<string, unknown>).postalCode || ''),
            country: (r.address as Record<string, unknown>).country
              ? String((r.address as Record<string, unknown>).country)
              : undefined,
          }
        : undefined,
    university: typeof r.university === 'string' ? r.university : undefined,
    company:
      typeof r.company === 'object' && r.company !== null
        ? {
            department: String((r.company as Record<string, unknown>).department || ''),
            name: String((r.company as Record<string, unknown>).name || ''),
            title: String((r.company as Record<string, unknown>).title || ''),
          }
        : undefined,
    role: typeof r.role === 'string' ? r.role : undefined,
  };
}

/**
 * Validates a paginated users response from DummyJSON.
 */
export function validateUsersResponse(
  data: unknown,
  fallbackSkip = 0,
  fallbackLimit = 10
): UsersResponse {
  if (typeof data !== 'object' || data === null) {
    throw new ApiError('Invalid users listing response: expected object.', 502, 'MALFORMED_RESPONSE');
  }

  const r = data as Record<string, unknown>;
  if (!Array.isArray(r.users)) {
    throw new ApiError(
      'Invalid users listing response: missing or malformed users array.',
      502,
      'MALFORMED_RESPONSE'
    );
  }
  const users = r.users.map((u) => validateUser(u));

  const total = typeof r.total === 'number' && r.total >= 0 ? r.total : users.length;
  const skip = typeof r.skip === 'number' && r.skip >= 0 ? r.skip : fallbackSkip;
  const limit = typeof r.limit === 'number' && r.limit > 0 ? r.limit : fallbackLimit;

  return { users, total, skip, limit };
}

/**
 * Validates an individual product record from DummyJSON.
 */
export function validateProduct(data: unknown): DummyJsonProduct {
  if (typeof data !== 'object' || data === null) {
    throw new ApiError('Invalid product data: expected an object.', 502, 'MALFORMED_RESPONSE');
  }

  const r = data as Record<string, unknown>;
  const id = typeof r.id === 'number' ? r.id : parseInt(String(r.id), 10);

  if (Number.isNaN(id) || id <= 0) {
    throw new ApiError('Invalid product data: missing or malformed numeric ID.', 502, 'MALFORMED_RESPONSE');
  }

  const rawImages = Array.isArray(r.images)
    ? (r.images.filter((img) => typeof img === 'string') as string[])
    : [];

  return {
    id,
    title: typeof r.title === 'string' ? r.title.trim() : `Product #${id}`,
    description: typeof r.description === 'string' ? r.description.trim() : '',
    category: typeof r.category === 'string' ? r.category.trim() : '',
    price: typeof r.price === 'number' && !Number.isNaN(r.price) ? r.price : 0,
    discountPercentage:
      typeof r.discountPercentage === 'number' && !Number.isNaN(r.discountPercentage)
        ? r.discountPercentage
        : 0,
    rating: typeof r.rating === 'number' && !Number.isNaN(r.rating) ? r.rating : 0,
    stock: typeof r.stock === 'number' && !Number.isNaN(r.stock) ? r.stock : 0,
    tags: Array.isArray(r.tags) ? (r.tags.filter((t) => typeof t === 'string') as string[]) : undefined,
    brand: typeof r.brand === 'string' ? r.brand.trim() : undefined,
    sku: typeof r.sku === 'string' ? r.sku.trim() : undefined,
    weight: typeof r.weight === 'number' ? r.weight : undefined,
    dimensions:
      typeof r.dimensions === 'object' && r.dimensions !== null
        ? {
            width: Number((r.dimensions as Record<string, unknown>).width) || 0,
            height: Number((r.dimensions as Record<string, unknown>).height) || 0,
            depth: Number((r.dimensions as Record<string, unknown>).depth) || 0,
          }
        : undefined,
    warrantyInformation: typeof r.warrantyInformation === 'string' ? r.warrantyInformation : undefined,
    shippingInformation: typeof r.shippingInformation === 'string' ? r.shippingInformation : undefined,
    availabilityStatus: typeof r.availabilityStatus === 'string' ? r.availabilityStatus : undefined,
    reviews: Array.isArray(r.reviews)
      ? r.reviews.map((rev) => {
          const robj = typeof rev === 'object' && rev !== null ? (rev as Record<string, unknown>) : {};
          return {
            rating: typeof robj.rating === 'number' ? robj.rating : 5,
            comment: typeof robj.comment === 'string' ? robj.comment : '',
            date: typeof robj.date === 'string' ? robj.date : '',
            reviewerName: typeof robj.reviewerName === 'string' ? robj.reviewerName : 'Customer',
            reviewerEmail: typeof robj.reviewerEmail === 'string' ? robj.reviewerEmail : '',
          };
        })
      : undefined,
    returnPolicy: typeof r.returnPolicy === 'string' ? r.returnPolicy : undefined,
    minimumOrderQuantity: typeof r.minimumOrderQuantity === 'number' ? r.minimumOrderQuantity : undefined,
    images: rawImages,
    thumbnail: typeof r.thumbnail === 'string' ? r.thumbnail : rawImages[0] || '',
  };
}

/**
 * Validates a paginated products response from DummyJSON.
 */
export function validateProductsResponse(
  data: unknown,
  fallbackSkip = 0,
  fallbackLimit = 12
): ProductsResponse {
  if (typeof data !== 'object' || data === null) {
    throw new ApiError('Invalid products listing response: expected object.', 502, 'MALFORMED_RESPONSE');
  }

  const r = data as Record<string, unknown>;
  if (!Array.isArray(r.products)) {
    throw new ApiError(
      'Invalid products listing response: missing or malformed products array.',
      502,
      'MALFORMED_RESPONSE'
    );
  }
  const products = r.products.map((p) => validateProduct(p));

  const total = typeof r.total === 'number' && r.total >= 0 ? r.total : products.length;
  const skip = typeof r.skip === 'number' && r.skip >= 0 ? r.skip : fallbackSkip;
  const limit = typeof r.limit === 'number' && r.limit > 0 ? r.limit : fallbackLimit;

  return { products, total, skip, limit };
}

/**
 * Validates product categories response from DummyJSON.
 */
export function validateCategories(data: unknown): ProductCategory[] {
  if (!Array.isArray(data)) {
    throw new ApiError('Invalid categories response: expected array.', 502, 'MALFORMED_RESPONSE');
  }

  return data.map((item) => {
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

// In-memory cache for category products to avoid repeated downloads when filtering + searching
const categoryProductsCache = new Map<string, { products: DummyJsonProduct[]; timestamp: number }>();
const CATEGORY_CACHE_TTL_MS = 60000; // 60 seconds

export async function fetchCategories(options?: RequestInit): Promise<ProductCategory[]> {
  const raw = await apiFetch<unknown>('/products/categories', options);
  return validateCategories(raw);
}

export async function fetchProducts(
  params: ProductsFilterParams = {},
  options?: RequestInit
): Promise<ProductsResponse> {
  const limit = params.limit ?? 12;
  const skip = params.skip ?? 0;
  const search = params.search?.trim();
  const category = params.category?.trim();

  // Scenario 1: Both Category AND Search query are supplied
  // UPSTREAM API LIMITATION: DummyJSON does not natively support search within category endpoint.
  // We fetch category products (cached for 60s to prevent repeated downloads), filter deterministically,
  // and apply pagination accurately.
  if (category && search) {
    const cacheKey = category.toLowerCase();
    const cached = categoryProductsCache.get(cacheKey);
    let allInCat: DummyJsonProduct[];

    if (cached && Date.now() - cached.timestamp < CATEGORY_CACHE_TTL_MS) {
      allInCat = cached.products;
    } else {
      const categoryEndpoint = `/products/category/${encodeURIComponent(category)}?limit=0`;
      const rawCatResponse = await apiFetch<unknown>(categoryEndpoint, options);
      const validatedCat = validateProductsResponse(rawCatResponse, 0, 0);
      allInCat = validatedCat.products;
      categoryProductsCache.set(cacheKey, { products: allInCat, timestamp: Date.now() });
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
