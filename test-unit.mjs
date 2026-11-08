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
import { ListResponseCache } from './src/lib/list-cache.ts';
import { rankSearchResults } from './src/lib/search-ranking.ts';

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

  // Custom origin / deployed application origin override cases (Requirement S1-01)
  const customOrigin = 'https://portal.helpstudyabroad.com';
  const customCases = [
    { input: `${customOrigin}/dashboard/users`, expected: '/dashboard/users', label: 'Deployed app origin matching internal route' },
    { input: `${customOrigin}/dashboard/products?category=smartphones`, expected: '/dashboard/products?category=smartphones', label: 'Deployed app origin with query parameters' },
    { input: 'https://attacker.example/dashboard/users', expected: '/dashboard', label: 'Attacker origin rejected on deployed app' },
    { input: 'http://localhost:3000/dashboard', expected: '/dashboard', label: 'Localhost rejected when custom production origin configured' },
  ];
  for (const c of customCases) {
    const actual = getSafeCallbackUrl(c.input, '/dashboard', customOrigin);
    assertEqual(actual, c.expected, `Custom origin: ${c.label}`);
    recordPass(`getSafeCallbackUrl [custom origin]: ${c.label}`);
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

  // Token with null/missing/non-finite expiry
  assertTrue(isTokenExpired(null, baseTime), 'Missing expiry metadata treated as expired');
  assertTrue(isTokenExpired(undefined, baseTime), 'Undefined expiry treated as expired');
  assertTrue(isTokenExpired(0, baseTime), 'Zero expiry treated as expired');
  assertTrue(isTokenExpired(-100, baseTime), 'Negative expiry treated as expired');
  assertTrue(isTokenExpired(NaN, baseTime), 'NaN expiry treated as expired');
  assertTrue(isTokenExpired(Infinity, baseTime), 'Infinity expiry treated as expired');
  assertTrue(isTokenExpired(-Infinity, baseTime), '-Infinity expiry treated as expired');
  assertTrue(isTokenExpired('not-a-number', baseTime), 'Non-numeric string expiry treated as expired');
  recordPass('Missing/malformed/non-finite/infinite expiry safely treated as expired');

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

  // reconcileTokenState with NaN / Infinite expiry claim
  const nanJwt = {
    user: safeUser,
    accessToken: 'suspicious-token',
    accessTokenExpires: NaN,
  };
  const reconciledNan = reconcileTokenState({ ...nanJwt }, baseTime);
  assertEqual(reconciledNan.error, 'AccessTokenExpired', 'NaN expiry claim flags token as expired');
  assertTrue(reconciledNan.accessToken === undefined, 'NaN expiry claim purges access token');
  recordPass('reconcileTokenState flags non-finite/NaN expiry claims');

  const missingExpiry = reconcileTokenState({ user: safeUser, accessToken: 'token-without-expiry' }, baseTime);
  assertEqual(missingExpiry.error, 'AccessTokenExpired', 'Missing expiry metadata flags token as expired');
  assertTrue(missingExpiry.accessToken === undefined, 'Missing expiry purges access token');
  recordPass('reconcileTokenState rejects missing expiry on an existing upstream token');
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
    id: 10, username: 'michaelw', firstName: 'Michael', lastName: 'Williams', age: 28,
    gender: 'male', email: 'michael@example.com', phone: '+1 555 0100', image: 'https://example.com/michael.png',
  });
  assertEqual(validUser.id, 10, 'User ID matches');
  assertEqual(validUser.username, 'michaelw', 'User username matches');
  assertEqual(validUser.firstName, 'Michael', 'User firstName matches');
  recordPass('validateUser accepts valid user profile');
  assertTrue(validUser.hair === undefined && validUser.company === undefined, 'Omitted optional user objects remain absent');
  recordPass('validateUser preserves omitted optional fields without fabricating nested objects');

  let missingUsernameThrew = false;
  try {
    validateUser({ id: 11, firstName: 'NoUsername' });
  } catch (e) {
    missingUsernameThrew = true;
    assertTrue(e instanceof ApiError && e.code === 'MALFORMED_RESPONSE', 'Rejects missing username without fabrication');
  }
  assertTrue(missingUsernameThrew, 'Rejects user missing username (S1-05 zero fabrication)');
  recordPass('validateUser strictly rejects missing username without fabrication');

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
    users: [
      { id: 1, username: 'u1', firstName: 'A', lastName: 'One', age: 20, gender: 'male', email: 'a@example.com', phone: '111', image: 'https://example.com/a.png' },
      { id: 2, username: 'u2', firstName: 'B', lastName: 'Two', age: 21, gender: 'female', email: 'b@example.com', phone: '222', image: 'https://example.com/b.png' },
    ],
    total: 2,
    skip: 0,
    limit: 10,
  });
  assertEqual(validUsersList.users.length, 2, 'Parsed 2 users');
  recordPass('validateUsersResponse accepts valid listing');

  let badUsersTotalThrew = false;
  try {
    validateUsersResponse({
      users: [], total: -5, skip: 0, limit: 10,
    });
  } catch (e) {
    badUsersTotalThrew = true;
    assertTrue(e instanceof ApiError && e.code === 'MALFORMED_RESPONSE', 'Rejects negative total');
  }
  assertTrue(badUsersTotalThrew, 'Rejects malformed negative total');
  recordPass('validateUsersResponse rejects negative or non-finite total');

  let missingUsersThrew = false;
  try {
    validateUsersResponse({ total: 5 });
  } catch (e) {
    missingUsersThrew = true;
    assertTrue(e instanceof ApiError && e.code === 'MALFORMED_RESPONSE', 'Rejects missing users array');
  }
  assertTrue(missingUsersThrew, 'Rejects missing users array');
  recordPass('validateUsersResponse rejects missing users array');

  let missingPaginationThrew = false;
  try { validateUsersResponse({ users: [], skip: 0, limit: 10 }); } catch (e) { missingPaginationThrew = e instanceof ApiError && e.code === 'MALFORMED_RESPONSE'; }
  assertTrue(missingPaginationThrew, 'Rejects missing total instead of inferring it from array length');
  recordPass('validateUsersResponse rejects missing pagination metadata');

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
    images: ['https://example.com/1.png'], thumbnail: 'https://example.com/thumb.png',
  });
  assertEqual(validProduct.id, 42, 'Product ID valid');
  assertEqual(validProduct.title, 'Essence Mascara', 'Product title valid');
  recordPass('validateProduct accepts valid product record');
  assertTrue(validProduct.tags === undefined && validProduct.dimensions === undefined && validProduct.reviews === undefined, 'Omitted optional product fields remain absent');
  recordPass('validateProduct preserves omitted optional fields without fabricating values');

  let invalidImageRejected = false;
  try { validateProduct({ id: 42, title: 'Item', description: 'Description', category: 'beauty', price: 1, discountPercentage: 0, rating: 4, stock: 1, images: ['javascript:alert(1)'], thumbnail: 'https://example.com/item.png' }); } catch (e) { invalidImageRejected = e instanceof ApiError && e.code === 'MALFORMED_RESPONSE'; }
  assertTrue(invalidImageRejected, 'Rejects non-HTTP(S) image URLs');
  recordPass('validateProduct rejects unsafe image URL schemes');

  let missingProductTitleThrew = false;
  try {
    validateProduct({ id: 43, category: 'beauty', price: 10 }); // missing title
  } catch (e) {
    missingProductTitleThrew = true;
    assertTrue(e instanceof ApiError && e.code === 'MALFORMED_RESPONSE', 'Rejects missing title without fabrication');
  }
  assertTrue(missingProductTitleThrew, 'Rejects product with missing title (S1-05 zero fabrication)');
  recordPass('validateProduct rejects missing title without fabrication');

  let missingProductPriceThrew = false;
  try {
    validateProduct({ id: 44, title: 'Item', description: 'Item description', category: 'beauty', price: -5, discountPercentage: 0, rating: 4, stock: 1, images: ['https://example.com/item.png'], thumbnail: 'https://example.com/item.png' }); // negative price
  } catch (e) {
    missingProductPriceThrew = true;
    assertTrue(e instanceof ApiError && e.code === 'MALFORMED_RESPONSE', 'Rejects negative price');
  }
  assertTrue(missingProductPriceThrew, 'Rejects product with negative price');
  recordPass('validateProduct rejects invalid/negative price');

  let missingProductCategoryThrew = false;
  try {
    validateProduct({ id: 45, title: 'Item', description: 'Item description', category: '', price: 15, discountPercentage: 0, rating: 4, stock: 1, images: ['https://example.com/item.png'], thumbnail: 'https://example.com/item.png' }); // empty category
  } catch (e) {
    missingProductCategoryThrew = true;
    assertTrue(e instanceof ApiError && e.code === 'MALFORMED_RESPONSE', 'Rejects empty category');
  }
  assertTrue(missingProductCategoryThrew, 'Rejects product with empty category');
  recordPass('validateProduct rejects missing category');

  let badProductThrew = false;
  try {
    validateProduct({ id: -1, title: 'Negative ID', description: 'Item description', category: 'cat', price: 10, discountPercentage: 0, rating: 4, stock: 1, images: ['https://example.com/item.png'], thumbnail: 'https://example.com/item.png' });
  } catch {
    badProductThrew = true;
  }
  assertTrue(badProductThrew, 'Rejects invalid product ID');
  recordPass('validateProduct rejects non-positive product ID');

  // 5. validateProductsResponse
  const validProductsList = validateProductsResponse({
    products: [{ id: 1, title: 'Item', description: 'Item description', category: 'groceries', price: 5, discountPercentage: 0, rating: 4, stock: 3, images: ['https://example.com/item.png'], thumbnail: 'https://example.com/item.png' }],
    total: 1,
    skip: 0,
    limit: 12,
  });
  assertEqual(validProductsList.products.length, 1, 'Parsed 1 product');
  recordPass('validateProductsResponse accepts valid products listing');

  let badProdsLimitThrew = false;
  try {
    validateProductsResponse({
      products: [],
      total: 0,
      skip: 0,
      limit: -1,
    });
  } catch {
    badProdsLimitThrew = true;
  }
  assertTrue(badProdsLimitThrew, 'Rejects non-positive limit');
  recordPass('validateProductsResponse rejects negative limit');

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
  let malformedCategoryRejected = false;
  try { validateCategories(['beauty']); } catch (e) { malformedCategoryRejected = e instanceof ApiError && e.code === 'MALFORMED_RESPONSE'; }
  assertTrue(malformedCategoryRejected, 'Rejects category values outside the documented object shape');
  recordPass('validateCategories accepts documented objects and rejects malformed values');

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

/*
 * Removed test-only filtering and request-ID simulations. They duplicated the
 * production algorithm without exercising fetchProducts() or the Zustand stores.
 * Those behaviours are not reported as automated coverage by this suite.
 */

/* -------------------------------------------------------------
   S2-CACHE: PAGINATED LIST RESPONSE CACHE
------------------------------------------------------------- */
console.log('\n[S2-CACHE] Testing production list response cache...');
try {
  const cache = new ListResponseCache({ ttlMs: 100, maxEntries: 2 });
  const first = { products: [{ id: 1 }], total: 1 };
  cache.set('page-1', first, 1000);
  assertEqual(cache.get('page-1', 1050).total, 1, 'Cached list response is returned before TTL');
  recordPass('List cache returns a fresh response');
  assertEqual(cache.get('page-1', 1100), null, 'Expired cache entry is not returned');
  recordPass('List cache expires entries at TTL boundary');
  cache.set('a', { value: 'a' }, 2000);
  cache.set('b', { value: 'b' }, 2000);
  cache.get('a', 2001);
  cache.set('c', { value: 'c' }, 2002);
  assertEqual(cache.get('a', 2003).value, 'a', 'Recently accessed entry remains');
  assertEqual(cache.get('b', 2003), null, 'Least recently used entry is evicted');
  recordPass('List cache enforces bounded LRU eviction');
  cache.clear();
  assertEqual(cache.get('a', 2004), null, 'Clear removes all entries');
  recordPass('List cache clear removes stored responses');
} catch (err) {
  recordFail('S2 paginated list response cache', err);
}

/* -------------------------------------------------------------
   SEARCH RELEVANCE: PRODUCTION RESULT RANKING
------------------------------------------------------------- */
console.log('\n[SEARCH] Testing production search relevance ranking...');
try {
  const users = [
    { name: 'Ethan Martinez', email: 'ethan.z@example.com' },
    { name: 'Zoe Nicholson', email: 'zoe@example.com' },
    { name: 'Mia Rodriguez', email: 'mia@example.com' },
    { name: 'Zachary Chen', email: 'zachary@example.com' },
  ];
  const rankedUsers = rankSearchResults(users, 'z', (u) => u.name, (u) => u.email);
  assertEqual(rankedUsers[0].name, 'Zoe Nicholson', 'Name prefix match ranks before substring-only matches');
  assertEqual(rankedUsers[1].name, 'Zachary Chen', 'Other name prefix match is retained');
  assertEqual(rankedUsers.length, users.length, 'Valid substring matches are not discarded');

  const products = [
    { title: 'Running Shoes', brand: 'North Star' },
    { title: 'NN Compact Camera', brand: 'Acme' },
    { title: 'Wireless Headphones', brand: 'NN Audio' },
  ];
  const rankedProducts = rankSearchResults(products, 'nn', (p) => p.title, (p) => p.brand);
  assertEqual(rankedProducts[0].title, 'NN Compact Camera', 'Product title prefix ranks first');
  assertEqual(rankedProducts.length, products.length, 'Other valid product matches remain available');
  recordPass('Search ranking prioritizes title/name prefixes while retaining valid matches');
} catch (err) {
  recordFail('Search relevance ranking', err);
}

console.log('\n========================================================');
console.log(` UNIT TEST EXECUTION COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED `);
console.log('========================================================\n');

if (hasFailed) {
  process.exit(1);
} else {
  process.exit(0);
}


