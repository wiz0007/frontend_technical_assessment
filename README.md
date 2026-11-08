# Help Study Abroad — Admin Dashboard

Frontend technical assessment built with **Next.js 14 App Router, TypeScript, Material UI v5, NextAuth v4, Zustand, and DummyJSON**.

## Implemented assignment scope

- Admin sign-in through DummyJSON `POST /auth/login`, managed by NextAuth Credentials Provider.
- Protected dashboard routes and redirect handling for authenticated/unauthenticated users.
- Users listing with server-side pagination, relevance-ranked search, user details, loading/error/empty states.
- Products listing with server-side pagination, relevance-ranked search, category selection, product details, and an image carousel.
- Zustand stores for authentication, users, and products.
- Responsive MUI-based application layout and pages.
- Bounded client-side list-response caching to avoid repeat requests when returning to previously visited list/filter/page combinations.

## Architecture and implementation notes

### Authentication and token handling

The DummyJSON access and refresh tokens remain inside the encrypted NextAuth JWT cookie on the server. The client session exposes safe identity fields only. This intentionally differs from putting bearer tokens in Zustand or local storage: it avoids exposing credentials to browser JavaScript. Zustand keeps the client-facing authentication state synchronized with the NextAuth session; it is not the source of truth for the upstream tokens.

### Zustand

Zustand is used for shared client state that is consumed by multiple pages/components: authentication, users list/detail, and products/categories/list/detail. This avoids prop drilling and keeps async request state close to the data it represents. List, detail, and category errors/loading states are independent so one request does not overwrite another request's status.

### API and validation

`src/lib/api.ts` centralizes HTTP requests, timeout/cancellation handling, API error mapping, and runtime validation of DummyJSON responses. Malformed required data is rejected rather than silently replaced with fabricated values. API-side pagination is used for ordinary list/search/category requests.

DummyJSON does not provide a combined category-plus-search endpoint. When both filters are selected, the application retrieves the category dataset, filters it locally by title, description, and brand, then paginates the filtered result. The category dataset has its own bounded TTL/LRU cache.

### List response caching

`src/lib/list-cache.ts` provides a bounded in-memory TTL/LRU cache (60-second TTL, maximum 100 list combinations per store). Users cache keys include page size, offset, and normalized search text. Products cache keys include page size, offset, normalized search text, and category. Returning to a cached combination reuses its response without another network request while the entry remains fresh. The Refresh action bypasses the cache and replaces the cached response with fresh API data. This cache is intentionally in-memory: it is per browser runtime and is cleared on a full reload; no stale persistent localStorage data is introduced.

### Performance

The API receives `limit` and `skip` for server-side pagination. Search input is debounced in the listing pages. Requests are cancelled when superseded, and request IDs prevent late responses from replacing newer results. Memoization is applied only where it provides a concrete benefit; it is not added indiscriminately to every component.

## Project structure

```text
.
├── .env.example
├── .eslintrc.json
├── .gitignore
├── MANUAL-VERIFICATION.md
├── next.config.mjs
├── package.json
├── package-lock.json
├── README.md
├── test-unit.mjs
├── tsconfig.json
└── src/
    ├── app/
    │   ├── (auth)/login/page.tsx
    │   ├── (dashboard)/dashboard/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   ├── users/page.tsx
    │   │   ├── users/[id]/page.tsx
    │   │   ├── products/page.tsx
    │   │   └── products/[id]/page.tsx
    │   ├── api/auth/[...nextauth]/route.ts
    │   ├── layout.tsx
    │   └── page.tsx
    ├── components/
    ├── lib/
    │   ├── api.ts
    │   ├── auth-secret.ts
    │   ├── auth.ts
    │   ├── category-cache.ts
    │   ├── list-cache.ts
    │   ├── safe-callback-url.ts
    │   └── token-policy.ts
    ├── middleware.ts
    ├── providers/
    ├── store/
    ├── theme/
    └── types/
```

## Requirements

- Node.js 18.17 or later (Node.js 20 LTS recommended)
- npm 9 or later
- Network access to `https://dummyjson.com` when using live authentication/data

## Setup

```bash
npm ci
cp .env.example .env.local
```

Set the following values in `.env.local`:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=y7g4f5der4gt5b4vf4de5fg5bv5ds5we
NEXT_PUBLIC_API_URL=https://dummyjson.com
```

Generate a suitable secret, for example:

```bash
openssl rand -base64 32
```

Start development:

```bash
npm run dev
```

Open `http://localhost:3000`. Build and run production with:

```bash
npm run build
npm start
```

## Quality commands

```bash
npm test             # deterministic unit tests for production utilities
npm run lint         # ESLint / Next.js rules
npx tsc --noEmit     # TypeScript check
npm run build        # production build
```

`npm test` does not claim browser end-to-end coverage. Browser journeys and visual/responsive acceptance checks are listed in `MANUAL-VERIFICATION.md` and must be checked manually.

## Responsive layout and fixed toolbars

The dashboard header is fixed at the top of the viewport. The Users and Products page toolbars are independently fixed beneath it, so the page title and controls remain visible while the result content scrolls. On narrow screens, controls wrap into a compact second row without creating page-level horizontal overflow.

The desktop toolbar begins 8px below the 64px dashboard header on small desktop/tablet widths and 12px below it at the `md` breakpoint and above. Mobile keeps the tighter alignment directly beneath the 56px header. The corresponding reserved layout spacer keeps the first result row from rendering underneath the fixed toolbar.

The Users listing retains its desktop-style table on narrow screens. The table has a fixed minimum content width inside a width-constrained `TableContainer` with horizontal scrolling enabled, so a swipe inside the table reveals the remaining columns without widening the dashboard page. The dashboard main flex item uses `min-width: 0` and clips horizontal overflow at the page boundary.

The Products toolbar places the page title on the left and search, category, Reset, and Refresh controls on the right at desktop widths. At narrower widths, the controls wrap in their intended order. The product grid remains constrained to the available content width.

The root layout declares a device-width viewport with an initial scale of 1. Search ranking prioritizes name/title prefix matches, then word-prefix matches, then other valid substring matches; it retains valid matches rather than silently discarding them. User-facing sprint labels and the disabled profile placeholder have been removed.

## Assignment compliance

See [ASSIGNMENT-COMPLIANCE.md](./ASSIGNMENT-COMPLIANCE.md) for a requirement-by-requirement mapping to the assessment brief, including the deliberate server-side NextAuth token-storage security deviation.

## Manual verification

The user reports that the previously supplied manual browser checklist has been completed successfully. The only outstanding visual recheck for this refinement is the new desktop toolbar gap beneath the dashboard header. See `MANUAL-VERIFICATION.md` for that final check and the regression coverage.
