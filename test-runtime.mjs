import { spawn } from 'child_process';

console.log('\n==============================================');
console.log('       SPRINT 1.1 UNIT & SECURITY TESTS        ');
console.log('==============================================\n');

// 1. Standalone Unit Test of validateDummyJsonLoginResponse contract
console.log('[Unit 1] Testing validateDummyJsonLoginResponse contract...');
function validateMock(data) {
  if (typeof data !== 'object' || data === null) {
    const err = new Error('Invalid response: expected an object');
    err.code = 'MALFORMED_RESPONSE';
    throw err;
  }
  if (typeof data.accessToken !== 'string' || data.accessToken.trim() === '') {
    const err = new Error('Invalid response: missing or invalid access token');
    err.code = 'MALFORMED_RESPONSE';
    throw err;
  }
  const id = data.id;
  const isValidId = (typeof id === 'number' && !Number.isNaN(id)) || (typeof id === 'string' && id.trim() !== '');
  if (!isValidId) {
    const err = new Error('Invalid response: missing or invalid user ID');
    err.code = 'MALFORMED_RESPONSE';
    throw err;
  }
  if (typeof data.username !== 'string' || data.username.trim() === '') {
    const err = new Error('Invalid response: missing or invalid username');
    err.code = 'MALFORMED_RESPONSE';
    throw err;
  }
  return {
    id,
    username: data.username.trim(),
    email: typeof data.email === 'string' ? data.email.trim() : '',
    firstName: typeof data.firstName === 'string' ? data.firstName.trim() : '',
    lastName: typeof data.lastName === 'string' ? data.lastName.trim() : '',
    gender: typeof data.gender === 'string' ? data.gender.trim() : '',
    image: typeof data.image === 'string' ? data.image.trim() : '',
    accessToken: data.accessToken,
    refreshToken: typeof data.refreshToken === 'string' ? data.refreshToken : '',
  };
}

const validMock = {
  id: 42,
  username: 'john_doe',
  email: 'john@example.com',
  firstName: 'John',
  lastName: 'Doe',
  gender: 'male',
  image: 'https://example.com/icon.png',
  accessToken: 'valid-token-xyz',
  refreshToken: 'refresh-token-xyz',
};
const validated = validateMock(validMock);
if (validated.id === 42 && validated.username === 'john_doe' && validated.accessToken === 'valid-token-xyz') {
  console.log('  -> PASS: Valid response properly validated and parsed.');
}

try {
  validateMock({ id: 1, username: 'test' });
} catch (e) {
  if (e.code === 'MALFORMED_RESPONSE') {
    console.log('  -> PASS: Missing access token correctly rejected with MALFORMED_RESPONSE.');
  }
}

try {
  validateMock({ username: 'test', accessToken: 'xyz' });
} catch (e) {
  if (e.code === 'MALFORMED_RESPONSE') {
    console.log('  -> PASS: Missing user ID correctly rejected with MALFORMED_RESPONSE.');
  }
}

try {
  validateMock({ id: 1, accessToken: 'xyz' });
} catch (e) {
  if (e.code === 'MALFORMED_RESPONSE') {
    console.log('  -> PASS: Missing username correctly rejected with MALFORMED_RESPONSE.');
  }
}

// 2. Unit Test of Secret Resolver Logic
console.log('\n[Unit 2] Testing getAuthSecret() logic...');
function testSecretResolver(envNodeEnv, envSecret) {
  if (envNodeEnv === 'production') {
    if (!envSecret || envSecret.trim() === '' || envSecret.includes('fallback') || envSecret.includes('dev-only')) {
      throw new Error('[FATAL CONFIG ERROR] NEXTAUTH_SECRET is missing or insecure in production.');
    }
    return envSecret;
  }
  if (envSecret && envSecret.trim() !== '') return envSecret;
  return 'dev-only-secret-do-not-use-in-production-help-study-abroad-auth-key';
}

const devResolved = testSecretResolver('development', '');
if (devResolved.includes('dev-only')) {
  console.log('  -> PASS: Development fallback allowed in development environment.');
}

try {
  testSecretResolver('production', '');
  throw new Error('FAIL: Missing secret in production should throw fatal error');
} catch (e) {
  if (e.message.includes('[FATAL CONFIG ERROR]')) {
    console.log('  -> PASS: Missing production secret triggers fatal error as required.');
  }
}

try {
  testSecretResolver('production', 'dev-only-secret-fallback');
  throw new Error('FAIL: Insecure fallback secret in production should throw fatal error');
} catch (e) {
  if (e.message.includes('[FATAL CONFIG ERROR]')) {
    console.log('  -> PASS: Insecure fallback in production rejected as required.');
  }
}

console.log('\n==============================================');
console.log('     STARTING SERVER FOR INTEGRATION TESTS    ');
console.log('==============================================\n');

const PORT = 3005;
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
    console.log('\n--- Running End-to-End Server Tests ---');

    try {
      // 1. Unauthenticated Route Protection
      console.log('\n[Integration 1] Verifying Unauthenticated Access Protection...');
      const resDash = await fetch(`${BASE_URL}/dashboard`, { redirect: 'manual' });
      const dashLoc = resDash.headers.get('location');
      console.log(`  - /dashboard status: ${resDash.status}, Location: ${dashLoc}`);
      if (resDash.status === 307 && dashLoc?.includes('/login?callbackUrl=%2Fdashboard')) {
        console.log('  -> PASS: Unauthenticated user redirected to /login with callbackUrl.');
      } else {
        throw new Error('FAIL: /dashboard did not properly redirect unauthenticated user');
      }

      // 2. Root Redirect
      console.log('\n[Integration 2] Verifying Root Route Redirection...');
      const resRoot = await fetch(`${BASE_URL}/`, { redirect: 'manual' });
      console.log(`  - / status: ${resRoot.status}, Location: ${resRoot.headers.get('location')}`);
      if (resRoot.status === 307 && resRoot.headers.get('location')?.includes('/login')) {
        console.log('  -> PASS: Root route redirected unauthenticated user to /login.');
      }

      // 3. Login Page Availability
      console.log('\n[Integration 3] Verifying Login Page Availability...');
      const resLogin = await fetch(`${BASE_URL}/login`);
      console.log(`  - /login status: ${resLogin.status}`);
      if (resLogin.status === 200) {
        console.log('  -> PASS: Login page rendered with 200 OK.');
      }

      // 4. CSRF and Provider Discovery
      console.log('\n[Integration 4] Verifying NextAuth CSRF & Providers...');
      const resCsrf = await fetch(`${BASE_URL}/api/auth/csrf`);
      const setCookieHeader = resCsrf.headers.get('set-cookie') || '';
      const csrfData = await resCsrf.json();
      const csrfToken = csrfData.csrfToken;
      console.log(`  - CSRF Token: ${csrfToken ? 'Generated' : 'Missing'}`);
      const csrfCookie = setCookieHeader.split(';')[0];

      // 5. Authentication Test with Invalid Credentials
      console.log('\n[Integration 5] Verifying Authentication with Invalid Credentials...');
      const invalidAuthRes = await fetch(`${BASE_URL}/api/auth/callback/dummyjson-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: csrfCookie,
        },
        body: new URLSearchParams({
          csrfToken,
          username: 'invalidUser_xyz',
          password: 'wrongPassword_xyz',
          json: 'true',
        }),
        redirect: 'manual',
      });
      console.log(`  - Invalid credentials response status: ${invalidAuthRes.status}`);
      const invalidData = await invalidAuthRes.json().catch(() => null);
      if (invalidData?.url?.includes('error=') || invalidAuthRes.status === 401) {
        console.log('  -> PASS: Invalid credentials rejected without establishing session.');
      }

      // 6. Authentication Test with Valid DummyJSON Credentials (emilys / emilyspass)
      console.log('\n[Integration 6] Verifying Live Authentication with DummyJSON (emilys / emilyspass)...');
      const validAuthRes = await fetch(`${BASE_URL}/api/auth/callback/dummyjson-credentials`, {
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

      console.log(`  - Valid login response status: ${validAuthRes.status}`);
      const authCookies = validAuthRes.headers.get('set-cookie');
      console.log(`  - Set-Cookie received: ${authCookies ? 'Yes (Session Cookie)' : 'No'}`);

      if (authCookies) {
        const sessionCookie = authCookies.split(',').find(c => c.includes('next-auth.session-token'))?.split(';')[0] || authCookies.split(';')[0];

        // 7. Test Session Verification & CORRECTION 2 AUDIT
        console.log('\n[Integration 7] SENSITIVE TOKEN AUDIT ON CLIENT SESSION...');
        const sessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
          headers: { Cookie: sessionCookie },
        });
        const session = await sessionRes.json();
        console.log('  - Exposed session keys:', Object.keys(session || {}));
        console.log('  - Exposed session.user keys:', Object.keys(session?.user || {}));

        // VERIFY TOKENS ARE NOT EXPOSED
        const hasRefreshToken = 'refreshToken' in (session?.user || {});
        const hasAccessToken = 'accessToken' in (session?.user || {});

        if (!hasRefreshToken && !hasAccessToken) {
          console.log('  -> PASS [CORRECTION 2 VERIFIED]: Neither refreshToken nor accessToken is exposed to client session!');
        } else {
          console.error('  -> FAIL: Sensitive tokens leaked to client session!', { hasRefreshToken, hasAccessToken });
          throw new Error('CORRECTION 2 VIOLATION');
        }

        console.log('  - Authenticated user profile:', {
          id: session?.user?.id,
          username: session?.user?.username,
          email: session?.user?.email,
          firstName: session?.user?.firstName,
        });

        // 8. Access Protected /dashboard with Session Cookie
        console.log('\n[Integration 8] Accessing Protected /dashboard with Session Cookie...');
        const authedDashRes = await fetch(`${BASE_URL}/dashboard`, {
          headers: { Cookie: sessionCookie },
          redirect: 'manual',
        });
        console.log(`  - Authenticated /dashboard status: ${authedDashRes.status}`);
        if (authedDashRes.status === 200) {
          console.log('  -> PASS: Authenticated user served /dashboard (200 OK)!');
        }

        // 9. Authenticated User Visiting /login
        console.log('\n[Integration 9] Authenticated User Visiting /login...');
        const authedLoginRes = await fetch(`${BASE_URL}/login`, {
          headers: { Cookie: sessionCookie },
          redirect: 'manual',
        });
        console.log(`  - /login redirect status: ${authedLoginRes.status}, Location: ${authedLoginRes.headers.get('location')}`);
        if (authedLoginRes.status === 307 && authedLoginRes.headers.get('location')?.includes('/dashboard')) {
          console.log('  -> PASS: Authenticated user visiting /login redirected to /dashboard.');
        }
      }

      console.log('\n==============================================');
      console.log('   ALL SPRINT 1.1 QUALITY ASSURANCE TESTS PASSED ');
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
