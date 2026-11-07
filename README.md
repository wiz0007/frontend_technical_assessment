# Help Study Abroad &mdash; Admin Dashboard (Sprint 1, 1.1 & Sprint 2)

Frontend technical assessment implementation for **Sprint 1, Sprint 1.1 & Sprint 2: Foundation, Authentication Hardening, Users Management & Products Catalog**.

Built with Next.js 14 (App Router), TypeScript, Material UI (MUI v5), Zustand, NextAuth, and the official DummyJSON API.

---

## 1. Overview & Architecture

This application delivers a production-grade admin dashboard with full authentication, state synchronization, server-side route protection, and complete business modules for Users and Products:

- **Unified Authentication Lifecycle:** NextAuth Credentials Provider authenticating against the live DummyJSON API (`POST https://dummyjson.com/auth/login`).
- **Sensitive Token Isolation:** `accessToken` and `refreshToken` are encapsulated in encrypted HTTP-only server-side JWT cookies. The client-side session (`session.user`) receives exclusively non-sensitive identity data (`id`, `username`, `firstName`, `lastName`, `email`, `gender`, `image`), eliminating token leakage to browser JS or storage.
- **Upstream Token Expiration Reconciliation:** Tracks DummyJSON token validity (`accessTokenExpires`, 60-minute TTL). When upstream tokens expire, NextAuth marks `error = 'AccessTokenExpired'`, clears the user session, and forces middleware redirect to `/login?callbackUrl=...`, preventing silent acceptance of expired upstream tokens.
- **Combined Category & Search Handling:** DummyJSON lacks a native combined endpoint (category query ignores search, search query ignores category). The system documents this upstream constraint, fetches category items with in-memory caching (60s TTL), and applies deterministic keyword filtering across title, description, and brand with accurate pagination.
- **Strict Runtime Response Validation:** All payloads from external APIs (`/auth/login`, `/users`, `/users/:id`, `/products`, `/products/:id`, `/products/categories`) are validated at runtime (`validateDummyJsonLoginResponse`, `validateUser`, `validateUsersResponse`, `validateProduct`, `validateProductsResponse`, `validateCategories`) with typed `ApiError(..., 502, 'MALFORMED_RESPONSE')` on malformed inputs.
- **Authoritative Secret Enforcement:** Centralized secret resolver enforces `NEXTAUTH_SECRET` presence in production with a strict 32-character minimum length requirement and startup termination on insecure configurations.
- **Strict Callback URL Sanitization:** URL parsing and same-origin validation neutralizing open redirect, protocol-relative, and dangerous scheme attacks.
- **Controlled Logout Lifecycle:** Sign-out terminates server-side NextAuth session cookies before clearing Zustand state and flushing client router caches.
- **Independent State Management:** Three independent Zustand stores:
  - `authStore`: Authoritative session synchronization (`isAuthenticated`, `user`, `isLoading`, `error`). Public mutation is restricted to centralized synchronization.
  - `usersStore`: Users listing, pagination, search query, selected user detail, loading and error states.
  - `productsStore`: Products catalog, dynamic categories, category filtering, search query, pagination, selected product detail, loading and error states.
- **Users Management Module (`/dashboard/users` & `/dashboard/users/[id]`):**
  - Live DummyJSON Users API integration (`GET https://dummyjson.com/users`, `/users/search?q=...`, `/users/[id]`).
  - API-side pagination (limit, skip, total calculations).
  - Debounced search across user records.
  - Responsive table with user demographics, role, company, and quick actions.
  - Rich user detail page displaying personal attributes, company & job, education, and address.
  - Full loading skeleton, error handling with retry, and empty states.
- **Products Catalog Module (`/dashboard/products` & `/dashboard/products/[id]`):**
  - Live DummyJSON Products API integration (`GET https://dummyjson.com/products`, `/products/categories`, `/products/category/[slug]`, `/products/search?q=...`, `/products/[id]`).
  - Dynamic category dropdown with "All Categories" default.
  - Debounced product search.
  - Smart composition: when both category and search query are active, category records are searched comprehensively without silently dropping filters.
  - Responsive product cards grid with pricing, discount badges, inventory status, ratings, and category chips.
  - Custom accessible product image carousel with main preview, previous/next controls, and thumbnail strip.
  - Rich product detail page displaying specifications, dimensions, weight, warranty, shipping policy, return policy, and customer reviews.
- **Server-Side Route Protection:** Next.js Edge Middleware verifying JWT tokens for all `/dashboard/*` routes and redirecting unauthenticated users to `/login?callbackUrl=...`, while preventing authenticated users from visiting `/login`.

---

## 2. Technology Stack

| Technology | Role |
| :--- | :--- |
| **Next.js 14 (App Router)** | Application framework & SSR |
| **TypeScript (Strict)** | Static typing & interface contracts |
| **Material UI (MUI v5)** | Component library & responsive design system |
| **NextAuth.js (v4)** | Session lifecycle, credentials provider, JWT management |
| **Zustand** | Independent client-side reactive state stores |
| **DummyJSON API** | External authentication, users, and products provider |
| **ESLint** | Code quality & best practice enforcement |

---

## 3. Project Structure

```text
frontend_assess/
├── .env.example                               # Documented environment variable template
├── .env.local                                 # Local development secrets (git-ignored)
├── .eslintrc.json                             # ESLint configuration
├── .gitignore                                 # Git ignore rules
├── next.config.mjs                            # Next.js configuration (remote image patterns)
├── package.json                               # Dependencies and scripts
├── tsconfig.json                              # Strict TypeScript configuration
├── README.md                                  # Complete project documentation
├── test-runtime.mjs                           # Automated end-to-end integration & audit test suite
└── src/
    ├── app/
    │   ├── (auth)/
    │   │   └── login/
    │   │       └── page.tsx                   # Login page hosting LoginForm
    │   ├── (dashboard)/
    │   │   └── dashboard/
    │   │       ├── layout.tsx                 # Dashboard shell wrapper
    │   │       ├── page.tsx                   # Dashboard landing & architecture status
    │   │       ├── products/
    │   │       │   ├── [id]/
    │   │       │   │   └── page.tsx           # Product detail view with carousel & specs
    │   │       │   └── page.tsx               # Products catalog with search, category & pagination
    │   │       └── users/
    │   │           ├── [id]/
    │   │           │   └── page.tsx           # User profile detail view
    │   │           └── page.tsx               # Users management table with search & pagination
    │   ├── api/
    │   │   └── auth/
    │   │       └── [...nextauth]/
    │   │           └── route.ts               # NextAuth App Router endpoint
    │   ├── layout.tsx                         # Root layout with AppProviders
    │   └── page.tsx                           # Root redirect handler
    ├── components/
    │   ├── auth/
    │   │   └── LoginForm.tsx                  # Accessible MUI login form with error mapping
    │   ├── common/
    │   │   ├── ErrorMessage.tsx               # Reusable MUI error alert with retry
    │   │   └── Loading.tsx                    # Reusable circular loading state
    │   ├── layout/
    │   │   ├── DashboardLayout.tsx            # Responsive shell layout
    │   │   ├── Header.tsx                     # Fixed AppBar with user menu & controlled logout
    │   │   └── Sidebar.tsx                    # Desktop permanent & mobile drawer navigation
    │   └── products/
    │       └── ProductCarousel.tsx            # Accessible image carousel for product details
    ├── lib/
    │   ├── api.ts                             # Centralized API fetcher (Auth, Users, Products)
    │   ├── auth.ts                            # NextAuth credentials provider configuration
    │   └── auth-secret.ts                     # Centralized secret resolver (32+ chars requirement)
    ├── middleware.ts                          # Server-side route protection & redirect guard
    ├── providers/
    │   ├── AppProviders.tsx                   # Combines MUI, Theme, Session, and Store Sync
    │   └── SessionProvider.tsx                # NextAuth SessionProvider wrapper
    ├── store/
    │   ├── authStore.ts                       # Zustand authentication store
    │   ├── productsStore.ts                   # Independent Zustand products store
    │   └── usersStore.ts                      # Independent Zustand users store
    ├── theme/
    │   └── theme.ts                           # Custom Material UI theme configuration
    └── types/
        ├── auth.ts                            # Authentication TypeScript types & augmentations
        ├── products.ts                        # Products & categories TypeScript types
        └── users.ts                           # Users TypeScript types
```

---

## 4. Getting Started

### Prerequisites
- **Node.js**: `v18.17.0` or higher (recommended: `v20.x` or `v24.x`)
- **npm**: `v9.x` or higher

### Installation

1. Clone or extract the project repository.
2. Navigate to the project root:
   ```bash
   cd frontend_assess
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Environment Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
2. Verify or update environment variables:
   ```env
   # Site URL for NextAuth callbacks
   NEXTAUTH_URL=http://localhost:3000

   # Secret used to encrypt NextAuth JWT tokens (minimum 32 characters in production)
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
| `npm test` | Runs automated end-to-end integration and security audit suite (`test-runtime.mjs`) |

---

## 6. Verification & Quality Checklist

- [x] TypeScript strict compilation (`npx tsc --noEmit` &mdash; 0 errors)
- [x] ESLint analysis (`npm run lint` &mdash; 0 warnings or errors)
- [x] Production build (`npm run build` &mdash; 0 errors, all 8 routes generated)
- [x] Automated test suite (`node test-runtime.mjs` &mdash; 100% passed)
- [x] Authentication secret 32-character enforcement verified
- [x] Callback URL validation neutralizing external/protocol-relative vectors verified
- [x] Sensitive tokens stripped from client session verified
- [x] Users listing, API pagination, search, and detail page verified
- [x] Products listing, API pagination, category filter, search, and detail page verified
- [x] Product image carousel with thumbnail navigation and fallback verified
- [x] Independent Zustand stores (`authStore`, `usersStore`, `productsStore`) verified
- [x] Route protection for all `/dashboard/*` endpoints verified
