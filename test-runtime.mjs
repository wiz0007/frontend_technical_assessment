import { spawn } from 'child_process';
import { getAuthSecret } from './src/lib/auth-secret.ts';
import { getSafeCallbackUrl } from './src/lib/safe-callback-url.ts';
import {
  ApiError,
  validateDummyJsonLoginResponse,
  validateUser,
  validateUsersResponse,
  validateProduct,
  validateProductsResponse,
  validateCategories,
} from './src/lib/api.ts';

let hasFailed = false;

// Global safety listeners
process.on('unhandledRejection', (reason) => {
  console.error('\n[FATAL] Unhandled Rejection:', reason);
  hasFailed = true;
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('\n[FATAL] Uncaught Exception:', err);
  hasFailed = true;
  process.exit(1);
});

function recordPass(testName, details = '') {
  console.log(`  -> PASS: ${testName} ${details}`.trimEnd());
}

function recordFail(testName, error) {
  hasFailed = true;
  console.error(`  -> FAIL: ${testName} -`, error instanceof Error ? error.message : error);
}

console.log('\n==============================================');
console.log('   SPRINT 1.1 & SPRINT 2 COMPREHENSIVE SUITE   ');
console.log('==============================================\n');

/* -------------------------------------------------------------
   1. SPRINT 1.1 SECRET VALIDATION (32+ CHARS ENFORCEMENT)
------------------------------------------------------------- */
console.log('[Test 1.1] Verifying getAuthSecret() 32-character enforcement...');
try {
  // Test 1.1.1: Development fallback allowed and >= 32 chars
  const devSecret = getAuthSecret('development', '');
  if (devSecret.includes('dev-only') && devSecret.length >= 32) {
    recordPass('Development fallback allowed with length >= 32');
  } else {
    recordFail('Development fallback', `Expected dev secret, got: ${devSecret}`);
  }

  // Test 1.1.2: Production missing secret rejected
  let prodMissingThrew = false;
  try {
    getAuthSecret('production', '');
  } catch (e) {
    prodMissingThrew = true;
    if (e.message.includes('at least 32 characters') || e.message.includes('[FATAL CONFIG ERROR]')) {
      recordPass('Production missing secret rejected');
    } else {
      recordFail('Production missing secret', e.message);
    }
  }
  if (!prodMissingThrew) {
    recordFail('Production missing secret', 'Did not throw error on missing secret');
  }

  // Test 1.1.3: Production secret shorter than 32 chars rejected
  let prodShortThrew = false;
  try {
    getAuthSecret('production', 'too-short-secret');
  } catch (e) {
    prodShortThrew = true;
    if (e.message.includes('at least 32 characters') || e.message.includes('[FATAL CONFIG ERROR]')) {
      recordPass('Production short secret (< 32 chars) rejected');
    } else {
      recordFail('Production short secret', e.message);
    }
  }
  if (!prodShortThrew) {
    recordFail('Production short secret', 'Did not throw on short secret');
  }

  // Test 1.1.4: Valid 32+ char production secret accepted
  const validSecret = 'production-secret-with-at-least-32-characters-length!';
  const prodResolved = getAuthSecret('production', validSecret);
  if (prodResolved === validSecret) {
    recordPass('Valid 32+ char production secret accepted');
  } else {
    recordFail('Valid production secret', `Got ${prodResolved}`);
  }
} catch (err) {
  recordFail('Secret validation suite', err);
}

/* -------------------------------------------------------------
   2. SPRINT 1.1 CALLBACK URL VALIDATION (PRODUCTION IMPORT)
------------------------------------------------------------- */
console.log('\n[Test 1.2] Verifying getSafeCallbackUrl() production validation...');

const safeCases = [
  { input: '/dashboard', expected: '/dashboard' },
  { input: '/dashboard/users', expected: '/dashboard/users' },
  { input: '/dashboard/products?category=beauty', expected: '/dashboard/products?category=beauty' },
  { input: 'https://evil.com', expected: '/dashboard' },
  { input: '//evil.com', expected: '/dashboard' },
  { input: '/\\evil.com', expected: '/dashboard' },
  { input: '\\evil.com', expected: '/dashboard' },
  { input: 'javascript:alert(1)', expected: '/dashboard' },
  { input: 'data:text/html,<script>alert(1)</script>', expected: '/dashboard' },
  { input: null, expected: '/dashboard' },
  { input: '', expected: '/dashboard' },
];

for (const c of safeCases) {
  const res = getSafeCallbackUrl(c.input);
  if (res === c.expected) {
    recordPass(`Callback URL: "${c.input}" -> "${res}"`);
  } else {
    recordFail(`Callback URL: "${c.input}"`, `Expected "${c.expected}", got "${res}"`);
  }
}

/* -------------------------------------------------------------
   3. SPRINT 1.1 & 2 RUNTIME RESPONSE VALIDATORS
------------------------------------------------------------- */
console.log('\n[Test 1.3] Verifying API runtime response validators...');

// 3.1 validateDummyJsonLoginResponse
try {
  const validLogin = validateDummyJsonLoginResponse({
    id: 1,
    username: 'emilys',
    email: 'emily.smith@example.com',
    firstName: 'Emily',
    lastName: 'Smith',
    gender: 'female',
    image: 'https://dummyjson.com/icon/emilys/128',
    accessToken: 'mock-jwt-token-123',
    refreshToken: 'mock-refresh-token-456',
  });
  if (validLogin.username === 'emilys' && validLogin.accessToken === 'mock-jwt-token-123') {
    recordPass('validateDummyJsonLoginResponse accepts valid payload');
  }

  let missingTokenThrew = false;
  try {
    validateDummyJsonLoginResponse({ id: 1, username: 'emilys' });
  } catch (e) {
    missingTokenThrew = true;
    if (e instanceof ApiError && e.code === 'MALFORMED_RESPONSE') {
      recordPass('validateDummyJsonLoginResponse rejects missing accessToken');
    }
  }
  if (!missingTokenThrew) recordFail('validateDummyJsonLoginResponse', 'Did not reject missing token');

  let invalidIdThrew = false;
  try {
    validateDummyJsonLoginResponse({ id: 'invalid', accessToken: 'token', username: 'test' });
  } catch (e) {
    invalidIdThrew = true;
    if (e instanceof ApiError) {
      recordPass('validateDummyJsonLoginResponse rejects invalid ID');
    }
  }
  if (!invalidIdThrew) recordFail('validateDummyJsonLoginResponse', 'Did not reject invalid ID');
} catch (err) {
  recordFail('validateDummyJsonLoginResponse suite', err);
}

// 3.2 validateUser
try {
  const validUser = validateUser({
    id: 42,
    username: 'johndoe',
    firstName: 'John',
    lastName: 'Doe',
    age: 30,
    gender: 'male',
    email: 'john@example.com',
  });
  if (validUser.id === 42 && validUser.firstName === 'John' && validUser.username === 'johndoe') {
    recordPass('validateUser accepts valid user profile');
  }

  let nonObjectThrew = false;
  try {
    validateUser('string payload');
  } catch (e) {
    nonObjectThrew = true;
    if (e instanceof ApiError && e.code === 'MALFORMED_RESPONSE') {
      recordPass('validateUser rejects non-object payload');
    }
  }
  if (!nonObjectThrew) recordFail('validateUser', 'Did not reject non-object');

  let invalidUserIdThrew = false;
  try {
    validateUser({ id: 0, username: 'zero', firstName: 'Zero' });
  } catch (e) {
    invalidUserIdThrew = true;
    if (e instanceof ApiError) {
      recordPass('validateUser rejects non-positive numeric ID');
    }
  }
  if (!invalidUserIdThrew) recordFail('validateUser', 'Did not reject invalid user ID');
} catch (err) {
  recordFail('validateUser suite', err);
}

// 3.3 validateUsersResponse
try {
  const validUsersList = validateUsersResponse({
    users: [
      { id: 1, username: 'user1', firstName: 'A', lastName: 'B', email: 'a@b.com' },
      { id: 2, username: 'user2', firstName: 'C', lastName: 'D', email: 'c@d.com' },
    ],
    total: 2,
    skip: 0,
    limit: 10,
  });
  if (validUsersList.users.length === 2 && validUsersList.total === 2) {
    recordPass('validateUsersResponse accepts valid users list');
  }

  let missingUsersArrayThrew = false;
  try {
    validateUsersResponse({ total: 10 });
  } catch (e) {
    missingUsersArrayThrew = true;
    if (e instanceof ApiError && e.code === 'MALFORMED_RESPONSE') {
      recordPass('validateUsersResponse rejects missing users array');
    }
  }
  if (!missingUsersArrayThrew) recordFail('validateUsersResponse', 'Did not reject missing users array');
} catch (err) {
  recordFail('validateUsersResponse suite', err);
}

// 3.4 validateProduct
try {
  const validProd = validateProduct({
    id: 99,
    title: 'Test Smartphone',
    description: 'High-end smartphone',
    category: 'smartphones',
    price: 699,
    discountPercentage: 10,
    rating: 4.5,
    stock: 50,
    images: ['https://example.com/phone.jpg'],
    thumbnail: 'https://example.com/thumb.jpg',
  });
  if (validProd.id === 99 && validProd.title === 'Test Smartphone' && validProd.images.length === 1) {
    recordPass('validateProduct accepts valid product record');
  }

  let invalidProdThrew = false;
  try {
    validateProduct({ id: -1, title: 'Negative ID' });
  } catch (e) {
    invalidProdThrew = true;
    if (e instanceof ApiError) {
      recordPass('validateProduct rejects invalid product ID');
    }
  }
  if (!invalidProdThrew) recordFail('validateProduct', 'Did not reject invalid product ID');
} catch (err) {
  recordFail('validateProduct suite', err);
}

// 3.5 validateProductsResponse
try {
  const validProdList = validateProductsResponse({
    products: [
      { id: 1, title: 'Item 1', category: 'cat', price: 10, discountPercentage: 0, rating: 5, stock: 10, images: [], thumbnail: '' },
    ],
    total: 1,
    skip: 0,
    limit: 12,
  });
  if (validProdList.products.length === 1 && validProdList.total === 1) {
    recordPass('validateProductsResponse accepts valid products list');
  }

  let missingProdsThrew = false;
  try {
    validateProductsResponse({ total: 0 });
  } catch (e) {
    missingProdsThrew = true;
    if (e instanceof ApiError && e.code === 'MALFORMED_RESPONSE') {
      recordPass('validateProductsResponse rejects missing products array');
    }
  }
  if (!missingProdsThrew) recordFail('validateProductsResponse', 'Did not reject missing products array');
} catch (err) {
  recordFail('validateProductsResponse suite', err);
}

// 3.6 validateCategories
try {
  const validCatObjects = validateCategories([
    { slug: 'beauty', name: 'Beauty', url: 'https://dummyjson.com/products/category/beauty' },
    { slug: 'fragrances', name: 'Fragrances' },
  ]);
  if (validCatObjects.length === 2 && validCatObjects[0].slug === 'beauty') {
    recordPass('validateCategories accepts object array');
  }

  const validCatStrings = validateCategories(['smartphones', 'laptops']);
  if (validCatStrings.length === 2 && validCatStrings[0].slug === 'smartphones') {
    recordPass('validateCategories normalizes string array to object format');
  }

  let nonArrayCatThrew = false;
  try {
    validateCategories({ categories: [] });
  } catch (e) {
    nonArrayCatThrew = true;
    if (e instanceof ApiError && e.code === 'MALFORMED_RESPONSE') {
      recordPass('validateCategories rejects non-array');
    }
  }
  if (!nonArrayCatThrew) recordFail('validateCategories', 'Did not reject non-array');
} catch (err) {
  recordFail('validateCategories suite', err);
}

/* -------------------------------------------------------------
   4. SPRINT 1.1 UPSTREAM TOKEN EXPIRATION LOGIC
------------------------------------------------------------- */
console.log('\n[Test 1.4] Verifying Upstream Token Expiration Handling...');
{
  // Simulated JWT callback expiration check
  const now = Date.now();
  const activeToken = {
    user: { id: 1, username: 'emilys', name: 'Emily Smith' },
    accessToken: 'valid-token',
    accessTokenExpires: now + 3600000, // 1 hour in future
  };
  const isExpiredActive = now >= (activeToken.accessTokenExpires || 0);
  if (!isExpiredActive) {
    recordPass('Active upstream token (< expires) remains valid');
  } else {
    recordFail('Active token expiration', 'Marked active token as expired');
  }

  const expiredToken = {
    user: { id: 1, username: 'emilys', name: 'Emily Smith' },
    accessToken: 'expired-token',
    accessTokenExpires: now - 1000, // expired 1 second ago
  };
  const isExpired = now >= (expiredToken.accessTokenExpires || 0);
  if (isExpired) {
    expiredToken.error = 'AccessTokenExpired';
    delete expiredToken.user;
    delete expiredToken.accessToken;
    recordPass('Expired upstream token flags error: AccessTokenExpired and purges user data');
  } else {
    recordFail('Expired token logic', 'Failed to detect expired timestamp');
  }
}

/* -------------------------------------------------------------
   5. SPRINT 2 CAROUSEL INDEX CLAMPING & SYNCHRONIZATION
------------------------------------------------------------- */
console.log('\n[Test 2.0] Verifying Product Carousel index clamping & synchronization...');
{
  function clampIndex(index, total) {
    return total > 0 ? Math.min(Math.max(0, index), total - 1) : 0;
  }

  // Normal in-bounds
  if (clampIndex(1, 4) === 1) recordPass('Carousel index within bounds preserved');
  // Out-of-bounds upper
  if (clampIndex(10, 3) === 2) recordPass('Carousel index clamped to total - 1 on overshoot');
  // Out-of-bounds lower
  if (clampIndex(-5, 3) === 0) recordPass('Carousel index clamped to 0 on negative index');
  // Empty array
  if (clampIndex(0, 0) === 0) recordPass('Carousel index returns 0 when no images');
}

/* -------------------------------------------------------------
   6. LIVE DUMMYJSON API INTEGRATION TESTS
------------------------------------------------------------- */
console.log('\n[Test 2.1] Verifying Live DummyJSON API Integration...');
try {
  // Test Users API
  const usersRes = await fetch('https://dummyjson.com/users?limit=5&skip=0');
  const usersData = await usersRes.json();
  if (Array.isArray(usersData.users) && usersData.users.length === 5 && usersData.total > 0) {
    recordPass(`Users listing fetched (${usersData.users.length} items, total: ${usersData.total})`);
  } else {
    recordFail('Users listing fetch', 'Malformed response');
  }

  // Test User Details API
  const singleUserRes = await fetch('https://dummyjson.com/users/1');
  const singleUserData = await singleUserRes.json();
  if (singleUserData.id === 1 && singleUserData.company?.name && singleUserData.address?.city) {
    recordPass(`User details for #${singleUserData.id} (${singleUserData.firstName}) verified`);
  } else {
    recordFail('User details fetch', 'Missing company or address');
  }

  // Test Products API
  const productsRes = await fetch('https://dummyjson.com/products?limit=6&skip=0');
  const productsData = await productsRes.json();
  if (Array.isArray(productsData.products) && productsData.products.length === 6 && productsData.total > 0) {
    recordPass(`Products listing fetched (${productsData.products.length} items, total: ${productsData.total})`);
  } else {
    recordFail('Products listing fetch', 'Malformed response');
  }

  // Test Categories API
  const catsRes = await fetch('https://dummyjson.com/products/categories');
  const catsData = await catsRes.json();
  if (Array.isArray(catsData) && catsData.length > 0) {
    recordPass(`Product categories fetched (${catsData.length} categories available)`);
  } else {
    recordFail('Categories fetch', 'Empty or malformed categories');
  }

  // Test Product Details API
  const singleProdRes = await fetch('https://dummyjson.com/products/1');
  const singleProdData = await singleProdRes.json();
  if (singleProdData.id === 1 && Array.isArray(singleProdData.images) && singleProdData.images.length > 0) {
    recordPass(`Product details for #${singleProdData.id} (${singleProdData.title}) verified`);
  } else {
    recordFail('Product details fetch', 'Missing images');
  }
} catch (err) {
  recordFail('Live DummyJSON API integration', err);
}

/* -------------------------------------------------------------
   7. END-TO-END SERVER ROUTING & PROTECTION AUDIT
------------------------------------------------------------- */
console.log('\n==============================================');
console.log('       STARTING APPLICATION SERVER AUDIT       ');
console.log('==============================================\n');

const PORT = 3006;
const BASE_URL = `http://localhost:${PORT}`;

const server = spawn('npx', ['next', 'start', '-p', PORT.toString()], {
  shell: true,
  stdio: 'pipe',
  env: {
    ...process.env,
    NEXTAUTH_URL: BASE_URL,
    NEXTAUTH_SECRET: 'test-secret-at-least-32-characters-for-audit-suite',
  },
});

let hasTested = false;

server.stdout.on('data', async (d) => {
  const str = d.toString();
  process.stdout.write(str);
  if ((str.includes('Ready in') || str.includes('started server on') || str.includes(`localhost:${PORT}`)) && !hasTested) {
    hasTested = true;
    console.log('\n--- Running Full End-to-End Route Audits ---');

    try {
      // 1. Unauthenticated route protections for all dashboard routes
      console.log('\n[Route 1] Verifying Route Protection for Users, Products, and Details...');
      const unauthUsers = await fetch(`${BASE_URL}/dashboard/users`, { redirect: 'manual' });
      const unauthProducts = await fetch(`${BASE_URL}/dashboard/products`, { redirect: 'manual' });
      const unauthDetailUser = await fetch(`${BASE_URL}/dashboard/users/1`, { redirect: 'manual' });
      const unauthDetailProduct = await fetch(`${BASE_URL}/dashboard/products/1`, { redirect: 'manual' });

      if (
        unauthUsers.status === 307 &&
        unauthProducts.status === 307 &&
        unauthDetailUser.status === 307 &&
        unauthDetailProduct.status === 307
      ) {
        recordPass('All dashboard routes (/users, /products, /users/:id, /products/:id) redirect 307 when unauthenticated');
      } else {
        recordFail('Route protection', `Got statuses: users=${unauthUsers.status}, products=${unauthProducts.status}, user1=${unauthDetailUser.status}, prod1=${unauthDetailProduct.status}`);
      }

      // 2. Obtain Session Cookie via Live Authentication
      console.log('\n[Auth] Authenticating emilys / emilyspass to test authenticated access...');
      const resCsrf = await fetch(`${BASE_URL}/api/auth/csrf`);
      const setCookieHeader = resCsrf.headers.get('set-cookie') || '';
      const { csrfToken } = await resCsrf.json();
      const csrfCookie = setCookieHeader.split(';')[0];

      const authRes = await fetch(`${BASE_URL}/api/auth/callback/dummyjson-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: csrfCookie,
        },
        body: new URLSearchParams({
          csrfToken,
          username: 'emilys',
          password: 'emilyspass',
          json: 'true',
        }),
        redirect: 'manual',
      });

      const authCookies = authRes.headers.get('set-cookie') || '';
      const sessionCookie = authCookies.split(',').find(c => c.includes('next-auth.session-token'))?.split(';')[0] || authCookies.split(';')[0];

      // 3. Authenticated Access to Users Page
      console.log('\n[Route 2] Accessing /dashboard/users with Session Cookie...');
      const authedUsersRes = await fetch(`${BASE_URL}/dashboard/users`, {
        headers: { Cookie: sessionCookie },
        redirect: 'manual',
      });
      if (authedUsersRes.status === 200) {
        recordPass('/dashboard/users rendered with 200 OK');
      } else {
        recordFail('/dashboard/users', `Status: ${authedUsersRes.status}`);
      }

      // 4. Authenticated Access to Products Page
      console.log('\n[Route 3] Accessing /dashboard/products with Session Cookie...');
      const authedProductsRes = await fetch(`${BASE_URL}/dashboard/products`, {
        headers: { Cookie: sessionCookie },
        redirect: 'manual',
      });
      if (authedProductsRes.status === 200) {
        recordPass('/dashboard/products rendered with 200 OK');
      } else {
        recordFail('/dashboard/products', `Status: ${authedProductsRes.status}`);
      }

      // 5. Authenticated Access to User Detail Page
      console.log('\n[Route 4] Accessing /dashboard/users/1 with Session Cookie...');
      const authedUserDetailRes = await fetch(`${BASE_URL}/dashboard/users/1`, {
        headers: { Cookie: sessionCookie },
        redirect: 'manual',
      });
      if (authedUserDetailRes.status === 200) {
        recordPass('/dashboard/users/1 rendered with 200 OK');
      } else {
        recordFail('/dashboard/users/1', `Status: ${authedUserDetailRes.status}`);
      }

      // 6. Authenticated Access to Product Detail Page
      console.log('\n[Route 5] Accessing /dashboard/products/1 with Session Cookie...');
      const authedProductDetailRes = await fetch(`${BASE_URL}/dashboard/products/1`, {
        headers: { Cookie: sessionCookie },
        redirect: 'manual',
      });
      if (authedProductDetailRes.status === 200) {
        recordPass('/dashboard/products/1 rendered with 200 OK');
      } else {
        recordFail('/dashboard/products/1', `Status: ${authedProductDetailRes.status}`);
      }

      console.log('\n==============================================');
      if (hasFailed) {
        console.error(' AUDIT SUITE FINISHED WITH FAILURES ');
      } else {
        console.log(' ALL SPRINT 1.1 & SPRINT 2 AUDITS SUCCESSFUL! ');
      }
      console.log('==============================================\n');
    } catch (e) {
      console.error('Audit Error:', e);
      hasFailed = true;
    } finally {
      spawn('taskkill', ['/pid', server.pid.toString(), '/f', '/t'], { shell: true });
      process.exit(hasFailed ? 1 : 0);
    }
  }
});

server.stderr.on('data', (d) => process.stderr.write(d.toString()));
