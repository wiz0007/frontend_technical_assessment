import { getSafeCallbackUrl } from './src/lib/safe-callback-url.ts';
import { getAuthSecret } from './src/lib/auth-secret.ts';
import {
  calculateTokenExpiresAt,
  isTokenExpired,
  reconcileTokenState,
  createClientSafeUser,
} from './src/lib/token-policy.ts';
import {
  ApiError,
  isCancelledError,
  validateDummyJsonLoginResponse,
  validateUser,
  validateUsersResponse,
  validateProduct,
  validateProductsResponse,
  validateCategories,
} from './src/lib/api.ts';
import { CategoryCache } from './src/lib/category-cache.ts';

let hasFailed = false;
let passedCount = 0;
let failedCount = 0;

// Register global safety listeners (Requirement T-03)
process.on('unhandledRejection', (reason) => {
  console.error('\n[FATAL] Unhandled Rejection in test-unit:', reason);
  hasFailed = true;
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('\n[FATAL] Uncaught Exception in test-unit:', err);
  hasFailed = true;
  process.exit(1);
});

function recordPass(testName, details = '') {
  passedCount++;
  console.log(`  -> [PASS] ${testName} ${details}`.trimEnd());
}

function recordFail(testName, error) {
  failedCount++;
  hasFailed = true;
  console.error(`  -> [FAIL] ${testName}:`, error instanceof Error ? error.message : error);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected "${expected}", got "${actual}"`);
  }
}

function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(`${message}: condition evaluated to false`);
  }
}

console.log('\n========================================================');
console.log('   HELP STUDY ABROAD &mdash; DETERMINISTIC UNIT TEST SUITE   ');
console.log('========================================================\n');

/* -------------------------------------------------------------
   S1-01: CALLBACK URL VALIDATION (PRODUCTION CODE EXECUTION)
------------------------------------------------------------- */
console.log('[S1-01] Testing getSafeCallbackUrl() production validator...');
try {
  const cases = [
    // Safe internal paths
    { input: '/dashboard', expected: '/dashboard', label: 'Safe internal root path' },
    { input: '/dashboard/users?page=2&limit=10', expected: '/dashboard/users?page=2&limit=10', label: 'Path with query parameters' },
    { input: '/dashboard/products#specifications', expected: '/dashboard/products#specifications', label: 'Path with fragment' },
    { input: '/dashboard/users/42', expected: '/dashboard/users/42', label: 'Path with numeric resource ID' },

    // External origins & dangerous protocols
    { input: 'https://evil.example', expected: '/dashboard', label: 'External HTTPS URL' },
    { input: 'http://evil.example', expected: '/dashboard', label: 'External HTTP URL' },
    { input: 'https://evil.example/dashboard', expected: '/dashboard', label: 'External HTTPS URL mimicking internal path' },
    { input: '//evil.example', expected: '/dashboard', label: 'Protocol-relative URL' },
    { input: '//evil.example/dashboard', expected: '/dashboard', label: 'Protocol-relative with path' },
    { input: '/\\evil.example', expected: '/dashboard', label: 'Backslash escape variation' },
    { input: '\\\\evil.example', expected: '/dashboard', label: 'Windows network share variation' },
    { input: 'javascript:alert(1)', expected: '/dashboard', label: 'JavaScript URI scheme' },
    { input: 'JAVASCRIPT:alert(document.cookie)', expected: '/dashboard', label: 'Case-insensitive JavaScript URI' },
    { input: 'data:text/html,<script>alert(1)</script>', expected: '/dashboard', label: 'Data URI scheme' },
    { input: 'vbscript:msgbox(1)', expected: '/dashboard', label: 'VBScript URI scheme' },
    { input: 'file:///etc/passwd', expected: '/dashboard', label: 'File URI scheme' },

    // Empty & malformed inputs
    { input: '', expected: '/dashboard', label: 'Empty string' },
    { input: '   ', expected: '/dashboard', label: 'Whitespace string' },
    { input: null, expected: '/dashboard', label: 'Null input' },
    { input: undefined, expected: '/dashboard', label: 'Undefined input' },
    { input: 12345, expected: '/dashboard', label: 'Numeric input' },
  ];

  for (const c of cases) {
    const actual = getSafeCallbackUrl(c.input);
    assertEqual(actual, c.expected, c.label);
    recordPass(`getSafeCallbackUrl: ${c.label}`);
  }
} catch (err) {
  recordFail('S1-01 Callback URL validation', err);
}

/* -------------------------------------------------------------
   S1-01.1: AUTHENTICATION SECRET VALIDATION (32+ CHARS)
------------------------------------------------------------- */
console.log('\n[S1-01.1] Testing getAuthSecret() production secret resolver...');
try {
  // Dev fallback allowed
  const devSec = getAuthSecret('development', '');
  assertTrue(devSec.length >= 32, 'Dev secret must be at least 32 characters');
  recordPass('Development fallback allowed with length >= 32');

  // Production missing secret
  let prodMissingThrew = false;
  try {
    getAuthSecret('production', '');
  } catch (e) {
    prodMissingThrew = true;
    assertTrue(e.message.includes('at least 32 characters'), 'Should enforce 32 characters message');
  }
  assertTrue(prodMissingThrew, 'Production missing secret must throw');
  recordPass('Production missing secret strictly rejected');

  // Production short secret
  let prodShortThrew = false;
  try {
    getAuthSecret('production', 'too-short-secret');
  } catch {
    prodShortThrew = true;
  }
  assertTrue(prodShortThrew, 'Production short secret must throw');
  recordPass('Production secret < 32 characters strictly rejected');

  // Production valid secret
  const validSecret = 'production-secret-with-minimum-thirty-two-chars!';
  const resolved = getAuthSecret('production', validSecret);
  assertEqual(resolved, validSecret, 'Valid production secret must be returned');
  recordPass('Valid 32+ character production secret accepted');
} catch (err) {
  recordFail('S1-01.1 Secret validation', err);
}

/* -------------------------------------------------------------
   S1-03: UPSTREAM TOKEN EXPIRATION POLICY
------------------------------------------------------------- */
console.log('\n[S1-03] Testing Upstream Token Expiration Policy...');
try {
  const baseTime = 1000000;
  const expiresAt = calculateTokenExpiresAt(60, baseTime);
  assertEqual(expiresAt, baseTime + 3600000, 'Token expiry must be 60 minutes in future');
  recordPass('calculateTokenExpiresAt computes correct epoch');

  // Token with future expiry
  assertTrue(!isTokenExpired(baseTime + 5000, baseTime), 'Future token is not expired');
  recordPass('Future token evaluated as active');

  // Token with past expiry
  assertTrue(isTokenExpired(baseTime - 100, baseTime), 'Past token is expired');
  recordPass('Past token evaluated as expired');

  // Token with null/missing expiry
  assertTrue(isTokenExpired(null, baseTime), 'Missing expiry metadata treated as expired');
  assertTrue(isTokenExpired(undefined, baseTime), 'Undefined expiry treated as expired');
  recordPass('Missing/malformed expiry safely treated as expired');

  // Client-safe user stripping
  const rawUser = {
    id: 1,
    username: 'emilys',
    email: 'emily@example.com',
    accessToken: 'sensitive-upstream-token',
    refreshToken: 'sensitive-refresh-token',
  };
  const safeUser = createClientSafeUser(rawUser);
  assertTrue(!('accessToken' in safeUser), 'accessToken must be stripped');
  assertTrue(!('refreshToken' in safeUser), 'refreshToken must be stripped');
  assertEqual(safeUser.username, 'emilys', 'Safe user demographics preserved');
  recordPass('createClientSafeUser removes sensitive tokens');

  // reconcileTokenState active token
  const activeJwt = {
    user: safeUser,
    accessToken: 'valid-token',
    accessTokenExpires: baseTime + 3600000,
  };
  const reconciledActive = reconcileTokenState({ ...activeJwt }, baseTime);
  assertTrue(!reconciledActive.error, 'Active token has no error');
  recordPass('reconcileTokenState preserves active tokens');

  // reconcileTokenState expired token
  const expiredJwt = {
    user: safeUser,
    accessToken: 'expired-token',
    accessTokenExpires: baseTime - 1000,
  };
  const reconciledExpired = reconcileTokenState({ ...expiredJwt }, baseTime);
  assertEqual(reconciledExpired.error, 'AccessTokenExpired', 'Expired token flagged with AccessTokenExpired');
  assertTrue(reconciledExpired.accessToken === undefined, 'Expired token purges accessToken');
  recordPass('reconcileTokenState flags expired tokens and purges credentials');
} catch (err) {
  recordFail('S1-03 Token Policy', err);
}

/* -------------------------------------------------------------
   S1-05 & API-01: RUNTIME RESPONSE VALIDATORS & ERROR CONTRACT
------------------------------------------------------------- */
console.log('\n[S1-05 & API-01] Testing Runtime Response Validators & Error Contract...');
try {
  // 1. validateDummyJsonLoginResponse
  const validAuth = validateDummyJsonLoginResponse({
    id: 1,
    username: 'emilys',
    email: 'emilys@example.com',
    firstName: 'Emily',
    lastName: 'Smith',
    gender: 'female',
    image: 'https://example.com/emily.png',
    accessToken: 'mock-token-xyz',
    refreshToken: 'mock-refresh-xyz',
  });
  assertEqual(validAuth.username, 'emilys', 'Auth username valid');
  assertEqual(validAuth.accessToken, 'mock-token-xyz', 'Auth access token valid');
  recordPass('validateDummyJsonLoginResponse accepts valid payload');

  let badAuthThrew = false;
  try {
    validateDummyJsonLoginResponse({ id: 1, username: 'emilys' }); // missing accessToken
  } catch (e) {
    badAuthThrew = true;
    assertTrue(e instanceof ApiError && e.code === 'MALFORMED_RESPONSE', 'Throws MALFORMED_RESPONSE ApiError');
  }
  assertTrue(badAuthThrew, 'Rejects login without accessToken');
  recordPass('validateDummyJsonLoginResponse rejects missing accessToken');

  let invalidAuthIdThrew = false;
  try {
    validateDummyJsonLoginResponse({ id: 'non-numeric', username: 'u', accessToken: 't' });
  } catch {
    invalidAuthIdThrew = true;
  }
  assertTrue(invalidAuthIdThrew, 'Rejects non-numeric ID');
  recordPass('validateDummyJsonLoginResponse rejects invalid numeric user ID');

  // 2. validateUser
  const validUser = validateUser({
    id: 10,
    firstName: 'Michael',
    lastName: 'Williams',
    age: 28,
    gender: 'male',
    email: 'michael@example.com',
  });
  assertEqual(validUser.id, 10, 'User ID matches');
  assertEqual(validUser.firstName, 'Michael', 'User firstName matches');
  recordPass('validateUser accepts valid user profile');

  let badUserThrew = false;
  try {
    validateUser('string payload');
  } catch (e) {
    badUserThrew = true;
    assertTrue(e instanceof ApiError && e.code === 'MALFORMED_RESPONSE', 'Rejects non-object');
  }
  assertTrue(badUserThrew, 'Rejects non-object user');
  recordPass('validateUser rejects non-object payload');

  // 3. validateUsersResponse
  const validUsersList = validateUsersResponse({
    users: [{ id: 1, firstName: 'A' }, { id: 2, firstName: 'B' }],
    total: 2,
    skip: 0,
    limit: 10,
  });
  assertEqual(validUsersList.users.length, 2, 'Parsed 2 users');
  recordPass('validateUsersResponse accepts valid listing');

  let missingUsersThrew = false;
  try {
    validateUsersResponse({ total: 5 });
  } catch (e) {
    missingUsersThrew = true;
    assertTrue(e instanceof ApiError && e.code === 'MALFORMED_RESPONSE', 'Rejects missing users array');
  }
  assertTrue(missingUsersThrew, 'Rejects missing users array');
  recordPass('validateUsersResponse rejects missing users array');

  // 4. validateProduct
  const validProduct = validateProduct({
    id: 42,
    title: 'Essence Mascara',
    description: 'Popular mascara',
    category: 'beauty',
    price: 9.99,
    discountPercentage: 7.17,
    rating: 4.94,
    stock: 99,
    images: ['https://example.com/1.png'],
    thumbnail: 'https://example.com/thumb.png',
  });
  assertEqual(validProduct.id, 42, 'Product ID valid');
  assertEqual(validProduct.title, 'Essence Mascara', 'Product title valid');
  recordPass('validateProduct accepts valid product record');

  let badProductThrew = false;
  try {
    validateProduct({ id: -1, title: 'Negative ID' });
  } catch {
    badProductThrew = true;
  }
  assertTrue(badProductThrew, 'Rejects invalid product ID');
  recordPass('validateProduct rejects non-positive product ID');

  // 5. validateProductsResponse
  const validProductsList = validateProductsResponse({
    products: [{ id: 1, title: 'Item' }],
    total: 1,
    skip: 0,
    limit: 12,
  });
  assertEqual(validProductsList.products.length, 1, 'Parsed 1 product');
  recordPass('validateProductsResponse accepts valid products listing');

  let missingProdsThrew = false;
  try {
    validateProductsResponse({ total: 100 });
  } catch {
    missingProdsThrew = true;
  }
  assertTrue(missingProdsThrew, 'Rejects missing products array');
  recordPass('validateProductsResponse rejects missing products array');

  // 6. validateCategories
  const objCats = validateCategories([{ slug: 'beauty', name: 'Beauty' }]);
  assertEqual(objCats[0].slug, 'beauty', 'Category object accepted');
  const strCats = validateCategories(['beauty', 'fragrances']);
  assertEqual(strCats[0].slug, 'beauty', 'Category string normalized');
  assertEqual(strCats[1].name, 'Fragrances', 'Category string formatted');
  recordPass('validateCategories normalizes string and object categories');

  // 7. isCancelledError
  const abortDom = new DOMException('The user aborted a request.', 'AbortError');
  assertTrue(isCancelledError(abortDom), 'DOMException AbortError is cancelled');
  const cancelApi = new ApiError('Cancelled', 499, 'REQUEST_CANCELLED');
  assertTrue(isCancelledError(cancelApi), 'ApiError REQUEST_CANCELLED is cancelled');
  const genericErr = new Error('Generic failure');
  assertTrue(!isCancelledError(genericErr), 'Generic error is not cancelled');
  recordPass('isCancelledError correctly classifies cancellation vs failures');
} catch (err) {
  recordFail('S1-05 & API-01 Response Validators', err);
}

/* -------------------------------------------------------------
   S2-05: BOUNDED LRU CATEGORY CACHING
------------------------------------------------------------- */
console.log('\n[S2-05] Testing Bounded LRU CategoryCache...');
try {
  const cache = new CategoryCache({ ttlMs: 1000, maxEntries: 3 });

  const dummyItem = (id, cat) => ({
    id,
    title: `Item ${id}`,
    description: 'desc',
    category: cat,
    price: 10,
    discountPercentage: 0,
    rating: 5,
    stock: 10,
    images: [],
    thumbnail: '',
  });

  // Test set and get
  const t0 = 10000;
  cache.set('beauty', [dummyItem(1, 'beauty')], t0);
  const hit = cache.get('beauty', t0);
  assertTrue(Array.isArray(hit) && hit.length === 1 && hit[0].id === 1, 'Cache hit returns item');
  recordPass('CategoryCache: Cache hit returns cached products');

  // Test case-insensitive key normalization
  const caseHit = cache.get('  BEAUTY  ', t0);
  assertTrue(caseHit !== null && caseHit.length === 1, 'Normalized key matches');
  recordPass('CategoryCache: Normalized key lookups work identically');

  // Test TTL Expiration
  const expiredGet = cache.get('beauty', t0 + 1500); // 1.5s later (> 1s TTL)
  assertEqual(expiredGet, null, 'Expired cache entry returns null');
  recordPass('CategoryCache: Expired entries return null and are pruned');

  // Test Maximum Capacity and LRU Eviction
  cache.clear();
  cache.set('cat-a', [dummyItem(1, 'cat-a')], t0);
  cache.set('cat-b', [dummyItem(2, 'cat-b')], t0 + 10);
  cache.set('cat-c', [dummyItem(3, 'cat-c')], t0 + 20);
  assertEqual(cache.size(), 3, 'Cache reaches max capacity of 3');

  // Access cat-a to make it most recently used (LRU order becomes: cat-b, cat-c, cat-a)
  cache.get('cat-a', t0 + 30);

  // Insert 4th category -> cat-b (oldest/least recently used) should be evicted
  cache.set('cat-d', [dummyItem(4, 'cat-d')], t0 + 40);

  assertEqual(cache.size(), 3, 'Cache remains bounded at maxEntries');
  assertEqual(cache.get('cat-b', t0 + 50), null, 'cat-b was evicted as LRU');
  assertTrue(cache.get('cat-a', t0 + 50) !== null, 'cat-a was preserved via recency refresh');
  assertTrue(cache.get('cat-c', t0 + 50) !== null, 'cat-c was preserved');
  assertTrue(cache.get('cat-d', t0 + 50) !== null, 'cat-d was stored');
  recordPass('CategoryCache: Deterministic LRU eviction under capacity pressure');
} catch (err) {
  recordFail('S2-05 CategoryCache', err);
}

/* -------------------------------------------------------------
   S2-06: COMBINED PRODUCT FILTERING & DETERMINISTIC PAGINATION
------------------------------------------------------------- */
console.log('\n[S2-06] Testing Combined Product Filtering & Pagination Logic...');
try {
  const dummyProducts = [
    { id: 1, title: 'iPhone 14 Pro', description: 'Apple flagship', brand: 'Apple', category: 'smartphones', price: 999 },
    { id: 2, title: 'Galaxy S23', description: 'Samsung phone', brand: 'Samsung', category: 'smartphones', price: 899 },
    { id: 3, title: 'Pixel 7', description: 'Google smartphone', brand: 'Google', category: 'smartphones', price: 699 },
    { id: 4, title: 'MacBook Air', description: 'Apple laptop', brand: 'Apple', category: 'laptops', price: 1199 },
  ];

  function filterAndPaginate(products, query, skip, limit) {
    const q = query.trim().toLowerCase();
    const filtered = products.filter((p) => {
      const inTitle = p.title?.toLowerCase().includes(q);
      const inDesc = p.description?.toLowerCase().includes(q);
      const inBrand = p.brand?.toLowerCase().includes(q);
      return inTitle || inDesc || inBrand;
    });
    return {
      products: filtered.slice(skip, skip + limit),
      total: filtered.length,
      skip,
      limit,
    };
  }

  // Filter for 'apple' in smartphones (should only match iPhone 14 Pro, not MacBook)
  const smartphoneItems = dummyProducts.filter((p) => p.category === 'smartphones');
  const res = filterAndPaginate(smartphoneItems, 'apple', 0, 10);
  assertEqual(res.total, 1, 'Only 1 smartphone matches Apple');
  assertEqual(res.products[0].id, 1, 'Matches iPhone 14 Pro');
  recordPass('Combined filter: Category isolation and brand search predicate match');

  // Pagination on filtered results
  // All 3 smartphones contain 'phone' (iPhone, Samsung phone, Google smartphone)
  const resPage1 = filterAndPaginate(smartphoneItems, 'phone', 0, 2);
  assertEqual(resPage1.total, 3, 'All 3 smartphones have phone keyword');
  assertEqual(resPage1.products.length, 2, 'Page 1 limit 2 returns 2 products');
  const resPage2 = filterAndPaginate(smartphoneItems, 'phone', 2, 2);
  assertEqual(resPage2.products.length, 1, 'Page 2 limit 2 returns remaining 1 product');
  assertTrue(resPage1.products[0].id !== resPage2.products[0].id, 'Pages return distinct products');
  recordPass('Combined filter: Accurate pagination slice on filtered dataset');
} catch (err) {
  recordFail('S2-06 Combined Product Filtering', err);
}

/* -------------------------------------------------------------
   S2-01 & S2-02: STALE RESPONSE & CANCELLATION RACE SIMULATION
------------------------------------------------------------- */
console.log('\n[S2-01 & S2-02] Testing Stale Response Prevention & Cancellation Race...');
try {
  // Simulate active request identity tracking
  let activeRequestId = 0;
  let selectedEntity = null;

  async function mockDetailRequest(id, delayMs, assignedRequestId) {
    await new Promise((r) => setTimeout(r, delayMs));
    if (assignedRequestId === activeRequestId) {
      selectedEntity = { id, name: `User #${id}` };
    }
  }

  // Request 1 starts with 80ms delay
  const req1Id = ++activeRequestId;
  const p1 = mockDetailRequest(1, 80, req1Id);

  // Request 2 starts 10ms later with 20ms delay (finishes first)
  const req2Id = ++activeRequestId;
  const p2 = mockDetailRequest(2, 20, req2Id);

  await Promise.all([p1, p2]);

  assertEqual(selectedEntity.id, 2, 'User #2 remains selected even after slow User #1 finishes later');
  recordPass('Race condition prevention: Out-of-order response discarded');

  // Cancel action simulation
  activeRequestId++;
  const cancelledReqId = activeRequestId;
  activeRequestId++; // immediately superseded or unmounted
  await mockDetailRequest(3, 10, cancelledReqId);
  assertEqual(selectedEntity.id, 2, 'Superseded / cancelled request did not mutate state');
  recordPass('Unmount / route change invalidates pending request identity');
} catch (err) {
  recordFail('S2-01 & S2-02 Race condition simulation', err);
}

console.log('\n========================================================');
console.log(` UNIT TEST EXECUTION COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED `);
console.log('========================================================\n');

if (hasFailed) {
  process.exit(1);
} else {
  process.exit(0);
}
