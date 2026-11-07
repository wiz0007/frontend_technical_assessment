# Help Study Abroad &mdash; Admin Dashboard Foundation (Sprint 1 & Sprint 1.1)

Frontend technical assessment implementation for **Sprint 1 & Sprint 1.1: Foundation, Architecture, Authentication & Security Hardening**.

Built with Next.js (App Router), TypeScript, Material UI (MUI), Zustand, NextAuth, and the official DummyJSON Authentication API.

---

## 1. Overview & Architecture

Sprint 1 & 1.1 establish a rock-solid, production-grade foundation for the Help Study Abroad Admin Dashboard:
- **Unified Authentication Lifecycle:** NextAuth Credentials Provider authenticating against the live DummyJSON API (`https://dummyjson.com/auth/login`).
- **Sensitive Token Isolation (Correction 2):** Sensitive `accessToken` and `refreshToken` are strictly stored in encrypted HTTP-only server-side JWT cookies. The client-side session receives only non-sensitive identity data (`id`, `username`, `firstName`, `lastName`, `email`, `gender`, `image`), eliminating token leakage to browser JS or storage.
- **Authoritative Secret Enforcement (Correction 1):** Centralized secret resolver enforces `NEXTAUTH_SECRET` presence in production with fatal startup rejection for insecure or missing keys, while guarding development defaults.
- **Runtime API Payload Validation (Correction 4):** Strict runtime response validator `validateDummyJsonLoginResponse()` ensures no malformed or partial API responses can construct an authenticated session.
- **Guaranteed Timeout & Stream Protection (Correction 3):** Fetch wrapper timeout spans both request dispatch and response body consumption, with guaranteed timer cleanup in `finally` blocks and distinction between network errors, timeouts, and cancellations.
- **Safe Error Mapping & Recovery (Correction 5 & 6):** User-facing error mapper shields backend stack traces while providing clear recovery paths; guaranteed loading state reset prevents stuck forms.
- **Controlled Logout Lifecycle (Correction 7):** Logout terminates server-side NextAuth session cookies before clearing Zustand state and flushing client router caches.
- **Synchronized State Management (Correction 8):** Zustand authentication store strictly mirrors NextAuth session authority without duplicate token stores or redundant dispatches.
- **Server-Side Route Protection (Correction 9):** Next.js Edge Middleware verifying JWT tokens to prevent unauthenticated access to `/dashboard/*` and prevent authenticated users from returning to `/login`.
- **Sprint 2 Extensibility:** Pre-wired layout, navigation slots, and shared types designed for seamless integration of the Users and Products modules in Sprint 2.

---

## 2. Technology Stack

| Technology | Role |
| :--- | :--- |
| **Next.js 14 (App Router)** | Application framework & SSR |
| **TypeScript (Strict)** | Static typing & interface contracts |
| **Material UI (MUI v5)** | Component library & responsive design system |
| **NextAuth.js (v4)** | Session lifecycle, credentials provider, JWT management |
| **Zustand** | Reactive application-level client authentication store |
| **DummyJSON API** | External authentication provider |
| **ESLint** | Code quality & best practice enforcement |

---

## 3. Project Structure

```text
frontend_assess/
├── .env.example             # Documented environment variable template
├── .env.local               # Local development secrets (git-ignored)
├── .eslintrc.json           # ESLint configuration
├── .gitignore               # Standard Git ignore rules
├── next.config.mjs          # Next.js configuration (remote image patterns)
├── package.json             # Dependencies and scripts
├── tsconfig.json            # Strict TypeScript configuration
└── src/
    ├── app/
    │   ├── (auth)/
    │   │   └── login/
    │   │       └── page.tsx           # Login page hosting LoginForm
    │   ├── (dashboard)/
    │   │   └── dashboard/
    │   │       ├── layout.tsx         # Dashboard layout wrapper
    │   │       └── page.tsx           # Dashboard landing & foundation status
    │   ├── api/
    │   │   └── auth/
    │   │       └── [...nextauth]/
    │   │           └── route.ts       # NextAuth App Router endpoint
    │   ├── layout.tsx                 # Root layout with AppProviders
    │   └── page.tsx                   # Root redirect handler
    ├── components/
    │   ├── auth/
    │   │   └── LoginForm.tsx          # Accessible MUI login form with error mapping & demo buttons
    │   ├── common/
    │   │   ├── ErrorMessage.tsx       # Reusable MUI error alert
    │   │   └── Loading.tsx            # Reusable circular loading state
    │   └── layout/
    │       ├── DashboardLayout.tsx    # Responsive shell layout
    │       ├── Header.tsx             # Fixed AppBar with user menu & controlled logout
    │       └── Sidebar.tsx            # Desktop permanent & mobile drawer nav
    ├── lib/
    │   ├── api.ts                     # Fetch client with timeout, cancel support & runtime validator
    │   ├── auth.ts                    # NextAuth credentials provider configuration
    │   └── auth-secret.ts             # Centralized environment-aware secret resolver
    ├── middleware.ts                  # Server-side route protection & redirect guard
    ├── providers/
    │   ├── AppProviders.tsx           # Combines MUI, Theme, Session, and Store Sync
    │   └── SessionProvider.tsx        # NextAuth SessionProvider wrapper
    ├── store/
    │   └── authStore.ts               # Zustand authentication store
    ├── theme/
    │   └── theme.ts                   # Custom Material UI theme configuration
    └── types/
        └── auth.ts                    # TypeScript types and NextAuth module augmentations
```

---

## 4. Getting Started

### Prerequisites
- **Node.js**: `v18.17.0` or higher (recommended: `v20.x` or `v24.x`)
- **npm**: `v9.x` or higher

### Installation

1. Navigate to the project root:
   ```bash
   cd frontend_assess
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Environment Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
2. Verify or update the environment variables:
   ```env
   # Site URL for NextAuth callbacks
   NEXTAUTH_URL=http://localhost:3000

   # Secret used to encrypt NextAuth JWT tokens (required in production)
   NEXTAUTH_SECRET=your-secure-random-secret-key-at-least-32-chars

   # Live DummyJSON API endpoint
   NEXT_PUBLIC_API_URL=https://dummyjson.com
   ```

---

## 5. Development & Build Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts local Next.js development server on `http://localhost:3000` |
| `npm run build` | Compiles TypeScript and creates optimized production build |
| `npm start` | Runs the compiled production server |
| `npm run lint` | Runs ESLint static analysis |
| `npx tsc --noEmit` | Runs strict TypeScript type-checking |
| `node test-runtime.mjs` | Runs automated end-to-end integration and security audit suite |

---

## 6. Authentication Implementation Details

### 1. Credentials Verification Flow
1. User enters username and password in `LoginForm.tsx`.
2. Client-side input validation rejects empty or whitespace-only inputs.
3. Form invokes NextAuth's `signIn('dummyjson-credentials', { username, password, redirect: false })`.
4. NextAuth's `authorize` callback in `src/lib/auth.ts` dispatches a `POST` request to `https://dummyjson.com/auth/login`.
5. Upon response from DummyJSON:
   - `validateDummyJsonLoginResponse()` validates presence of `accessToken`, `id`, and `username`.
   - The user profile and tokens are safely passed into the encrypted server-side JWT.
   - The client session (`session.user`) is populated **exclusively** with non-sensitive user identity data (`id`, `username`, `firstName`, `lastName`, `email`, `gender`, `image`).
   - The client navigates smoothly to `/dashboard`.
6. Upon failed response:
   - Standardized error codes (`INVALID_CREDENTIALS`, `TIMEOUT`, `NETWORK_ERROR`, `SERVICE_UNAVAILABLE`) are mapped to clean user-facing messages.
   - The login form loading state is guaranteed to reset in the `finally` block, leaving the form fully interactive for retries.

### 2. Live Demo Accounts (DummyJSON)
To test authentication, you can use any valid DummyJSON user account:
- **Username:** `emilys` &nbsp;|&nbsp; **Password:** `emilyspass`
- **Username:** `michaelw` &nbsp;|&nbsp; **Password:** `michaelwpass`

Quick-fill demo buttons are provided directly on the login form for fast testing.

---

## 7. State Management & Synchronization Architecture

- **NextAuth as the Single Authority:** NextAuth manages session tokens, secure cookies, and token expiration. Tokens are **not** exposed to client JS or persisted in insecure storage.
- **Zustand Application Store (`useAuthStore`):** Provides reactive client-side access to `isAuthenticated`, `user`, `isLoading`, and `error`.
- **Automatic Synchronization (`AuthSync`):** An internal synchronization provider in `src/providers/AppProviders.tsx` observes NextAuth's `useSession()` status and updates the Zustand store without redundant re-renders:
  - When NextAuth is authenticated &rarr; Zustand is populated with the authenticated user data.
  - When NextAuth is unauthenticated (or logged out) &rarr; Zustand is immediately wiped clean.
  - On page refresh &rarr; NextAuth rehydrates the session from the secure cookie and Zustand re-synchronizes seamlessly.

---

## 8. Route Protection Strategy

Route protection is implemented at the server level via Next.js Middleware (`src/middleware.ts`):
- **Protected Routes:** `/dashboard` and `/dashboard/:path*` require a valid JWT token. Unauthenticated requests are immediately redirected to `/login?callbackUrl=...`.
- **Guest-Only Routes:** Authenticated users attempting to visit `/login` are automatically redirected to `/dashboard`.
- **Root Route (`/`):** Server component in `src/app/page.tsx` checks session state on initial load and redirects to `/dashboard` if authenticated, or `/login` if unauthenticated.
- **Back-Button & Stale Cache Prevention:** On sign-out, NextAuth invalidates the session cookie, clears Zustand state, flushes the in-memory router cache, and redirects to `/login`. Returning to `/dashboard` via browser history immediately triggers the middleware redirect.
