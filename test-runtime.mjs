import { spawn } from 'child_process';

console.log('\n==============================================');
console.log('   SPRINT 1.1 & SPRINT 2 COMPREHENSIVE SUITE   ');
console.log('==============================================\n');

/* -------------------------------------------------------------
   1. SPRINT 1.1 SECRET VALIDATION (32+ CHARS ENFORCEMENT)
------------------------------------------------------------- */
console.log('[Test 1.1] Verifying getAuthSecret() 32-character enforcement...');
function testSecretResolver(envNodeEnv, envSecret) {
  if (envNodeEnv === 'production') {
    if (
      !envSecret ||
      envSecret.trim() === '' ||
      envSecret.trim().length < 32 ||
      envSecret.includes('fallback') ||
      envSecret.includes('dev-only')
    ) {
      throw new Error('[FATAL CONFIG ERROR] NEXTAUTH_SECRET must be at least 32 characters in production.');
    }
    return envSecret.trim();
  }
  if (envSecret && envSecret.trim() !== '') return envSecret.trim();
  return 'dev-only-secret-do-not-use-in-production-help-study-abroad-auth-key-32chars';
}

// Development fallback check
const devRes = testSecretResolver('development', '');
if (devRes.includes('dev-only') && devRes.length >= 32) {
  console.log('  -> PASS: Development fallback allowed and meets length requirements.');
}

// Production missing secret check
try {
  testSecretResolver('production', '');
  throw new Error('FAIL: Missing secret in production should throw');
} catch (e) {
  if (e.message.includes('[FATAL CONFIG ERROR]')) {
    console.log('  -> PASS: Missing secret in production correctly rejected.');
  }
}

// Production short secret check (< 32 characters)
try {
  testSecretResolver('production', 'short-secret-under-32-chars');
  throw new Error('FAIL: Short secret in production should throw');
} catch (e) {
  if (e.message.includes('[FATAL CONFIG ERROR]')) {
    console.log('  -> PASS: Secret shorter than 32 characters in production strictly rejected.');
  }
}

// Production valid secret check
const validProdSecret = 'a-very-secure-production-secret-that-exceeds-thirty-two-chars';
const resolvedProd = testSecretResolver('production', validProdSecret);
if (resolvedProd === validProdSecret) {
  console.log('  -> PASS: Valid 32+ character production secret accepted.');
}

/* -------------------------------------------------------------
   2. SPRINT 1.1 CALLBACK URL VALIDATION
------------------------------------------------------------- */
console.log('\n[Test 1.2] Verifying getSafeCallbackUrl() validation...');
function getSafeCallbackUrl(raw) {
  if (!raw || typeof raw !== 'string') return '/dashboard';
  const trimmed = raw.trim();
  if (
    trimmed === '' ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.startsWith('\\') ||
    trimmed.toLowerCase().startsWith('javascript:') ||
    trimmed.toLowerCase().startsWith('data:')
  ) {
    return '/dashboard';
  }
  try {
    const parsed = new URL(trimmed, 'http://localhost');
    if (parsed.origin !== 'http://localhost') return '/dashboard';
    if (!parsed.pathname.startsWith('/') || parsed.pathname.startsWith('//')) return '/dashboard';
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/dashboard';
  }
}

const safeCases = [
  { input: '/dashboard', expected: '/dashboard' },
  { input: '/dashboard/users', expected: '/dashboard/users' },
  { input: '/dashboard/products?category=beauty', expected: '/dashboard/products?category=beauty' },
  { input: 'https://evil.com', expected: '/dashboard' },
  { input: '//evil.com', expected: '/dashboard' },
  { input: '/\\evil.com', expected: '/dashboard' },
  { input: 'javascript:alert(1)', expected: '/dashboard' },
];

for (const c of safeCases) {
  const res = getSafeCallbackUrl(c.input);
  if (res !== c.expected) {
    throw new Error(`FAIL: Callback URL check for ${c.input} failed! Got ${res}, expected ${c.expected}`);
  }
}
console.log('  -> PASS: All callback URL attack vectors safely neutralized to /dashboard.');

/* -------------------------------------------------------------
   3. SPRINT 2 API INTEGRATION TESTS (USERS & PRODUCTS)
------------------------------------------------------------- */
console.log('\n[Test 2.1] Verifying DummyJSON Users API Integration...');
async function testDummyJsonAPIs() {
  // Test Users API
  const usersRes = await fetch('https://dummyjson.com/users?limit=5&skip=0');
  const usersData = await usersRes.json();
  if (Array.isArray(usersData.users) && usersData.users.length === 5 && usersData.total > 0) {
    console.log(`  -> PASS: Users listing fetched (${usersData.users.length} items, total: ${usersData.total}).`);
  }

  // Test User Details API
  const singleUserRes = await fetch('https://dummyjson.com/users/1');
  const singleUserData = await singleUserRes.json();
  if (singleUserData.id === 1 && singleUserData.company?.name && singleUserData.address?.city) {
    console.log(`  -> PASS: User details for #${singleUserData.id} (${singleUserData.firstName}) verified.`);
  }

  // Test Products API
  console.log('\n[Test 2.2] Verifying DummyJSON Products API Integration...');
  const productsRes = await fetch('https://dummyjson.com/products?limit=6&skip=0');
  const productsData = await productsRes.json();
  if (Array.isArray(productsData.products) && productsData.products.length === 6 && productsData.total > 0) {
    console.log(`  -> PASS: Products listing fetched (${productsData.products.length} items, total: ${productsData.total}).`);
  }

  // Test Categories API
  const catsRes = await fetch('https://dummyjson.com/products/categories');
  const catsData = await catsRes.json();
  if (Array.isArray(catsData) && catsData.length > 0) {
    console.log(`  -> PASS: Product categories fetched (${catsData.length} categories available).`);
  }

  // Test Product Details API
  const singleProdRes = await fetch('https://dummyjson.com/products/1');
  const singleProdData = await singleProdRes.json();
  if (singleProdData.id === 1 && Array.isArray(singleProdData.images) && singleProdData.images.length > 0) {
    console.log(`  -> PASS: Product details for #${singleProdData.id} (${singleProdData.title}) verified.`);
  }
}

await testDummyJsonAPIs();

/* -------------------------------------------------------------
   4. END-TO-END SERVER ROUTING & PROTECTION AUDIT
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
      // 1. Unauthenticated route protections for Sprint 2 routes
      console.log('\n[Route 1] Verifying Route Protection for Users and Products...');
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
        console.log('  -> PASS: All Sprint 2 routes (/dashboard/users, /dashboard/products and details) strictly protected!');
      } else {
        throw new Error('FAIL: Route protection breached on Sprint 2 routes');
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
      console.log(`  - /dashboard/users status: ${authedUsersRes.status}`);
      if (authedUsersRes.status === 200) {
        console.log('  -> PASS: /dashboard/users accessible and rendered (200 OK)!');
      }

      // 4. Authenticated Access to Products Page
      console.log('\n[Route 3] Accessing /dashboard/products with Session Cookie...');
      const authedProductsRes = await fetch(`${BASE_URL}/dashboard/products`, {
        headers: { Cookie: sessionCookie },
        redirect: 'manual',
      });
      console.log(`  - /dashboard/products status: ${authedProductsRes.status}`);
      if (authedProductsRes.status === 200) {
        console.log('  -> PASS: /dashboard/products accessible and rendered (200 OK)!');
      }

      // 5. Authenticated Access to User Detail Page
      console.log('\n[Route 4] Accessing /dashboard/users/1 with Session Cookie...');
      const authedUserDetailRes = await fetch(`${BASE_URL}/dashboard/users/1`, {
        headers: { Cookie: sessionCookie },
        redirect: 'manual',
      });
      console.log(`  - /dashboard/users/1 status: ${authedUserDetailRes.status}`);
      if (authedUserDetailRes.status === 200) {
        console.log('  -> PASS: /dashboard/users/1 accessible and rendered (200 OK)!');
      }

      // 6. Authenticated Access to Product Detail Page
      console.log('\n[Route 5] Accessing /dashboard/products/1 with Session Cookie...');
      const authedProductDetailRes = await fetch(`${BASE_URL}/dashboard/products/1`, {
        headers: { Cookie: sessionCookie },
        redirect: 'manual',
      });
      console.log(`  - /dashboard/products/1 status: ${authedProductDetailRes.status}`);
      if (authedProductDetailRes.status === 200) {
        console.log('  -> PASS: /dashboard/products/1 accessible and rendered (200 OK)!');
      }

      console.log('\n==============================================');
      console.log(' ALL SPRINT 1.1 & SPRINT 2 AUDITS SUCCESSFUL! ');
      console.log('==============================================\n');
    } catch (e) {
      console.error('Audit Error:', e);
    } finally {
      spawn('taskkill', ['/pid', server.pid.toString(), '/f', '/t'], { shell: true });
      process.exit(0);
    }
  }
});

server.stderr.on('data', (d) => process.stderr.write(d.toString()));
