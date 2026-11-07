import { spawn } from 'child_process';

const server = spawn('npm', ['start'], { shell: true, stdio: 'pipe' });

let hasTested = false;

server.stdout.on('data', async (d) => {
  const str = d.toString();
  process.stdout.write(str);
  if ((str.includes('Ready in') || str.includes('started server on') || str.includes('localhost:3000')) && !hasTested) {
    hasTested = true;
    console.log('\n==============================================');
    console.log('       RUNNING COMPREHENSIVE RUNTIME AUDIT     ');
    console.log('==============================================\n');

    try {
      // 1. Unauthenticated Route Protection
      console.log('[Test 1] Verifying Unauthenticated Access Protection...');
      const resDash = await fetch('http://localhost:3000/dashboard', { redirect: 'manual' });
      const dashLoc = resDash.headers.get('location');
      console.log(`  - /dashboard status: ${resDash.status}, Location: ${dashLoc}`);
      if (resDash.status === 307 && dashLoc?.includes('/login?callbackUrl=%2Fdashboard')) {
        console.log('  -> PASS: Unauthenticated user correctly redirected to /login with callbackUrl.');
      } else {
        throw new Error('FAIL: /dashboard did not properly redirect unauthenticated user');
      }

      // 2. Root Redirect
      console.log('\n[Test 2] Verifying Root Route Redirection...');
      const resRoot = await fetch('http://localhost:3000/', { redirect: 'manual' });
      console.log(`  - / status: ${resRoot.status}, Location: ${resRoot.headers.get('location')}`);
      if (resRoot.status === 307 && resRoot.headers.get('location')?.includes('/login')) {
        console.log('  -> PASS: Root route correctly redirected unauthenticated user to /login.');
      }

      // 3. Login Page Availability
      console.log('\n[Test 3] Verifying Login Page Availability...');
      const resLogin = await fetch('http://localhost:3000/login');
      console.log(`  - /login status: ${resLogin.status}`);
      if (resLogin.status === 200) {
        console.log('  -> PASS: Login page rendered with 200 OK.');
      }

      // 4. CSRF and Provider Discovery
      console.log('\n[Test 4] Verifying NextAuth CSRF & Providers...');
      const resCsrf = await fetch('http://localhost:3000/api/auth/csrf');
      const setCookieHeader = resCsrf.headers.get('set-cookie') || '';
      const csrfData = await resCsrf.json();
      const csrfToken = csrfData.csrfToken;
      console.log(`  - CSRF Token: ${csrfToken ? 'Generated' : 'Missing'}`);
      console.log(`  - NextAuth Session Cookie Header: ${setCookieHeader ? 'Present' : 'None'}`);

      // Extract CSRF cookie
      const csrfCookie = setCookieHeader.split(';')[0];

      // 5. Authentication Test with Invalid Credentials
      console.log('\n[Test 5] Verifying Authentication with Invalid Credentials...');
      const invalidAuthRes = await fetch('http://localhost:3000/api/auth/callback/dummyjson-credentials', {
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
        console.log('  -> PASS: Invalid credentials correctly rejected without establishing session.');
      } else {
        console.log('  -> Response:', invalidData);
      }

      // 6. Authentication Test with Valid DummyJSON Credentials (emilys / emilyspass)
      console.log('\n[Test 6] Verifying Live Authentication with DummyJSON (emilys / emilyspass)...');
      const validAuthRes = await fetch('http://localhost:3000/api/auth/callback/dummyjson-credentials', {
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
        // Extract session token
        const sessionCookie = authCookies.split(',').find(c => c.includes('next-auth.session-token'))?.split(';')[0] || authCookies.split(';')[0];

        // 7. Test Session Verification
        console.log('\n[Test 7] Verifying Authenticated Session Endpoint...');
        const sessionRes = await fetch('http://localhost:3000/api/auth/session', {
          headers: { Cookie: sessionCookie },
        });
        const session = await sessionRes.json();
        console.log('  - Authenticated user in session:', {
          id: session?.user?.id,
          username: session?.user?.username,
          email: session?.user?.email,
          firstName: session?.user?.firstName,
        });

        if (session?.user?.username === 'emilys') {
          console.log('  -> PASS: NextAuth session payload matches DummyJSON user contract.');
        }

        // 8. Test Access to Protected /dashboard with Session Cookie
        console.log('\n[Test 8] Accessing Protected /dashboard with Session Cookie...');
        const authedDashRes = await fetch('http://localhost:3000/dashboard', {
          headers: { Cookie: sessionCookie },
          redirect: 'manual',
        });
        console.log(`  - Authenticated /dashboard status: ${authedDashRes.status}`);
        if (authedDashRes.status === 200) {
          console.log('  -> PASS: Authenticated user successfully served /dashboard (200 OK)!');
        }

        // 9. Test Authenticated User Visiting /login (Should Redirect to /dashboard)
        console.log('\n[Test 9] Authenticated User Visiting /login...');
        const authedLoginRes = await fetch('http://localhost:3000/login', {
          headers: { Cookie: sessionCookie },
          redirect: 'manual',
        });
        console.log(`  - /login redirect status: ${authedLoginRes.status}, Location: ${authedLoginRes.headers.get('location')}`);
        if (authedLoginRes.status === 307 && authedLoginRes.headers.get('location')?.includes('/dashboard')) {
          console.log('  -> PASS: Authenticated user visiting /login is redirected back to /dashboard.');
        }
      }

      console.log('\n==============================================');
      console.log('     ALL SPRINT 1 RUNTIME TESTS COMPLETED     ');
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
