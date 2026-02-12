# Job Finder App

AI-assisted job search built with Next.js. Browse listings from the Adzuna API, save jobs,
compare up to 3 roles side by side, and generate AI summaries powered by Gemini.
Admins manage users, listings, and summaries from a dedicated dashboard.

![App Screenshot](image/appscreenshot.png)

## Tech Stack

| Layer             | Technology                                                                  |
| ----------------- | --------------------------------------------------------------------------- |
| **Framework**     | Next.js 16 (App Router), React 19, TypeScript                               |
| **Database**      | MongoDB + Mongoose                                                          |
| **Data fetching** | TanStack Query (React Query)                                                |
| **Validation**    | Zod (shared schemas in `packages/schemas`)                                  |
| **UI**            | Tailwind CSS 4.0 (dark mode default), shadcn/ui (`packages/ui`)             |
| **Icons**         | @phosphor-icons/react                                                       |
| **Animations**    | framer-motion                                                               |
| **AI**            | Google Gemini (via `ai` SDK) — summaries, resume parsing, skill suggestions |
| **External data** | Adzuna API — job listings for 20+ countries                                 |

## Monorepo layout

```
Job-Finder-App/
├── next-app/             # Next.js application
│   ├── app/              #   Pages and API routes (App Router)
│   ├── components/       #   React components
│   ├── contexts/         #   AuthContext, CompareContext
│   ├── hooks/            #   useSavedListings, useIsMdViewport
│   └── lib/              #   Services, models, API client, auth, utilities
├── packages/
│   ├── schemas/          # Shared Zod schemas and inferred TypeScript types
│   └── ui/               # Shared UI components (Button, Card, Dialog, Input, Label, Select)
└── package.json          # Root workspace config (pnpm Workspaces)
```

## High-level React component tree

```
RootLayout                          # app/layout.tsx — fonts, metadata
└── Providers                       # QueryClient, AuthProvider, CompareProvider, Toaster
    ├── AuthModal                   # Global overlay — renders when URL has ?auth=login|signup
    │   ├── AuthTabs                #   Log in / Sign up tab bar
    │   └── AuthFormFields          #   Shared form fields (email, password, username)
    │
    ├── / (Home)                    # Server component: redirect() → /browse (preserves auth/redirect params)
    │
    ├── /browse                     # Main job search page
    │   └── ProtectedRoute (blockAdmins)
    │       ├── AppHeader           #   Logo, nav links, UserMenu or AuthModalLink
    │       ├── CompareBar          #   Sticky bar when 1–3 jobs selected for comparison
    │       ├── ListingSection[]    #   → ListingCarousel → ListingCard[] (Recommended, Trending)
    │       ├── ListingCard[]       #   Search results grid
    │       └── JobDetailPanel      #   Right panel (lg) or full-page detail
    │           └── AISummaryCard   #     AI summary output
    │
    ├── /browse/[id]                # Full-page job detail
    │   └── ProtectedRoute (blockAdmins)
    │       ├── AppHeader
    │       ├── CompareBar
    │       └── JobDetailPanel → AISummaryCard
    │
    ├── /browse/compare             # Side-by-side comparison (2–3 jobs)
    │   └── ProtectedRoute (blockAdmins)
    │       ├── AppHeader
    │       ├── CompareBar
    │       └── PageShell
    │           └── CompareColumn[] #   Per-job: meta, description, inline summary
    │
    ├── /summarize                  # Paste URL or text → AI summary
    │   └── ProtectedRoute
    │       └── PageShell → AISummaryCard
    │
    ├── /profile                    # User skills + saved listings (/saved, /my-jobs redirect here)
    │   └── ProtectedRoute (blockAdmins)
    │       ├── AppHeader
    │       ├── SkillsEditor
    │       └── ListingCard[]       #   Saved listings
    │
    ├── /profile/settings           # Account form + delete account
    │   └── ProtectedRoute
    │       ├── AppHeader
    │       └── AccountSettingsForm
    │
    ├── /admin                      # Admin dashboard or login/register
    │   └── AdminLayout
    │       ├── AppHeader (admin nav: Dashboard, Users, Summaries, Listings)
    │       └── Dashboard cards / AuthCard (when not logged in)
    │
    ├── /admin/users                # User management table
    │   └── PageShell → TablePagination, FormField
    │
    ├── /admin/summaries            # Summary moderation table
    │   └── PageShell → TablePagination
    │
    ├── /admin/listings             # Listings management + ListingForm
    │   └── PageShell → ListingCard[], ListingForm, TablePagination
    │
    └── /admin/settings             # Admin account form
        └── PageShell → AccountSettingsForm
```

**Shared components** used across multiple pages: `AppHeader`, `ListingCard`, `ListingCarousel`, `ListingSection`, `SkillsEditor`, `AccountSettingsForm`, `PageShell`, `PageLoading`/`PageError`, `CompareBar`, `AISummaryCard`, `AuthFormFields`, `FormField`, `TablePagination`, `AdminTable`, `ProtectedRoute`.

## API routes

All routes are under `/api/v1/`. Protected routes require a Bearer token; admin routes also require `role: "admin"`.

| Route                      | Methods          | Auth   | Description                                       |
| -------------------------- | ---------------- | ------ | ------------------------------------------------- |
| `/auth/login`              | POST             | —      | Log in (email or username + password)             |
| `/auth/register`           | POST             | —      | Create account                                    |
| `/auth/refresh`            | POST             | Cookie | Rotate access + refresh tokens                    |
| `/auth/logout`             | POST             | —      | Clear refresh cookie                              |
| `/auth/admin/register`     | POST             | Admin  | Create admin user                                 |
| `/users`                   | GET              | Admin  | List users                                        |
| `/users/me`                | GET              | Auth   | Current user                                      |
| `/users/:id`               | GET, PATCH, DELETE | Auth   | User by ID (own or admin); DELETE = delete own account |
| `/profile`                 | GET, PUT         | Auth   | User profile (skills, job titles, resume summary) |
| `/profile/suggest-skills`  | POST             | Auth   | AI skill suggestions from role                    |
| `/resume/parse`            | POST             | Auth   | Parse resume (PDF, DOCX, or text) via AI          |
| `/listings`                | GET              | —      | Search listings (keyword, country, filters)       |
| `/listings/:id`            | GET              | —      | Single listing                                    |
| `/listings/:id/view`       | POST             | —      | Record a view                                     |
| `/listings/categories`     | GET              | —      | Categories by country                             |
| `/listings/trending`       | GET              | —      | Trending listings                                 |
| `/listings/recommended`    | GET              | Auth   | Recommended listings                              |
| `/saved`                   | GET              | Auth   | Saved listings                                    |
| `/saved/:listingId`        | DELETE           | Auth   | Unsave a listing                                  |
| `/saved/check`             | GET              | Auth   | Check if listings are saved                       |
| `/summaries`               | GET, POST        | Auth   | List / create AI summary                          |
| `/summaries/:id`           | GET, DELETE      | Auth   | Get / delete summary                              |
| `/summaries/compare`           | POST             | Auth   | Compare 2–3 listings via AI (non-stream)         |
| `/summaries/compare/stream`   | POST             | Auth   | Stream comparison of 2–3 listings via AI         |
| `/summaries/stream`           | POST             | Auth   | Stream AI summary (cache hit returns JSON)        |
| `/admin/dashboard`           | GET              | Admin  | Dashboard metrics                                 |
| `/admin/dashboard/summary/stream` | POST         | Admin  | Stream AI dashboard summary                       |
| `/admin/users`               | GET              | Admin  | User management                                   |
| `/admin/users/:id`           | GET, PATCH       | Admin  | User detail                                       |
| `/admin/users/:id/role`      | PATCH            | Admin  | Change user role                                  |
| `/admin/users/:id/status`    | PATCH            | Admin  | Suspend / activate                                |
| `/admin/summaries`           | GET              | Admin  | All summaries                                     |
| `/admin/summaries/:id`       | DELETE           | Admin  | Delete summary by ID                              |
| `/admin/listings`            | GET, POST, PATCH | Admin  | Listing management                                |

## Database schemas

MongoDB collections (Mongoose models in `next-app/lib/models/`). Zod schemas in `packages/schemas` define the contract; Mongoose schemas align with them.

### User

| Field     | Type                        | Optional                  |
| --------- | --------------------------- | ------------------------- |
| email     | String                      | no                        |
| username  | String                      | no                        |
| password  | String                      | no                        |
| role      | `"user"` \| `"admin"`       | yes (default: `"user"`)   |
| status    | `"active"` \| `"suspended"` | yes (default: `"active"`) |
| createdAt | Date                        | no (auto)                 |
| updatedAt | Date                        | no (auto)                 |

Index: `email` + `role` (unique).

### UserProfile

| Field             | Type                 | Optional            |
| ----------------- | -------------------- | ------------------- |
| userId            | ObjectId (ref: User) | no                  |
| skills            | String[]             | yes (default: `[]`) |
| jobTitles         | String[]             | yes (default: `[]`) |
| resumeSummary     | String               | yes                 |
| yearsOfExperience | Number               | yes                 |
| updatedAt         | Date                 | no (auto)           |

### Listing

| Field       | Type   | Optional                  |
| ----------- | ------ | ------------------------- |
| title       | String | no                        |
| company     | String | no                        |
| location    | String | yes                       |
| description | String | yes                       |
| source      | String | yes (default: `"adzuna"`) |
| sourceUrl   | String | yes                       |
| sourceId    | String | no                        |
| country     | String | no (default: `"sg"`)      |
| expiresAt   | Date   | no                        |
| postedAt    | Date   | yes                       |
| salaryMin   | Number | yes                       |
| salaryMax   | Number | yes                       |
| createdAt   | Date   | no (auto)                 |
| updatedAt   | Date   | no (auto)                 |

Indexes: `sourceId` + `country` (unique); TTL on `expiresAt`.

### SearchCache

| Field      | Type                      | Optional        |
| ---------- | ------------------------- | --------------- |
| cacheKey   | String                    | no              |
| listingIds | ObjectId[] (ref: Listing) | yes             |
| totalCount | Number                    | no (default: 0) |
| expiresAt  | Date                      | no              |
| createdAt  | Date                      | no (auto)       |

Indexes: `cacheKey` (unique); TTL on `expiresAt`.

### AISummary

| Field               | Type                                            | Optional  |
| ------------------- | ----------------------------------------------- | --------- |
| userId              | ObjectId (ref: User)                            | no        |
| inputTextHash       | String                                          | no        |
| tldr                | String                                          | no        |
| keyResponsibilities | String[]                                        | yes       |
| requirements        | String[]                                        | yes       |
| niceToHaves         | String[]                                        | yes       |
| salarySgd           | String                                          | yes       |
| jdMatch             | { matchScore?, matchedSkills?, missingSkills? } | yes       |
| caveats             | String[]                                        | yes       |
| createdAt           | Date                                            | no (auto) |
| updatedAt           | Date                                            | no (auto) |

Indexes: `inputTextHash` + `userId`; `userId`.

### SavedListing

| Field     | Type                    | Optional  |
| --------- | ----------------------- | --------- |
| userId    | ObjectId (ref: User)    | no        |
| listingId | ObjectId (ref: Listing) | no        |
| title     | String                  | no        |
| company   | String                  | no        |
| location  | String                  | yes       |
| sourceUrl | String                  | yes       |
| country   | String                  | yes       |
| createdAt | Date                    | no (auto) |
| updatedAt | Date                    | no (auto) |

Index: `userId` + `listingId` (unique).

### ListingView

| Field     | Type                    | Optional          |
| --------- | ----------------------- | ----------------- |
| listingId | ObjectId (ref: Listing) | no                |
| viewedAt  | Date                    | no (default: now) |

Indexes: `listingId` + `viewedAt`; `viewedAt`.

## Useful scripts

| Command      | Description                  |
| ------------ | ---------------------------- |
| `pnpm dev`   | Start Next.js dev server     |
| `pnpm build` | Build all workspace packages |
| `pnpm lint`  | Lint all workspace packages  |
| `pnpm test`  | Run unit tests (vitest)      |

## Getting started

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Configure environment variables:
   ```bash
   cp next-app/.env.example next-app/.env.local
   ```
   Edit `next-app/.env.local` with real values. Full keys and comments are in `next-app/.env.example`.

   **Required (app will fail without them):**
   - **MONGODB_URI** — MongoDB connection string; used for all persistence (auth, listings, search cache, AI summaries). Must be reachable (e.g. local or Atlas).
   - **JWT_SECRET** — Secret used to sign access tokens; must be at least 32 characters (e.g. `openssl rand -base64 32`).
   - **JWT_REFRESH_SECRET** — Secret used to sign refresh tokens; must be at least 32 characters (use a different value than `JWT_SECRET`).

   **Optional but needed for full functionality:**
   - **ADZUNA_APP_ID** / **ADZUNA_APP_KEY** — Credentials for the Adzuna job search API; required for job search and listing data. Get from [developer.adzuna.com](https://developer.adzuna.com/signup).
   - **GEMINI_API_KEY** — Primary API key for Gemini; used for AI job summaries and resume parsing. Without it, summary endpoints return 503. Get from [ai.google.dev](https://ai.google.dev/) or [makersuite.google.com](https://makersuite.google.com/app/apikey).

   **Optional (have defaults or only affect specific features):**
   - **JWT_ACCESS_TOKEN_EXPIRES_IN** — Access token lifetime (default `15m`). Used when issuing JWTs.
   - **JWT_REFRESH_TOKEN_EXPIRES_IN** — Refresh token lifetime (default `7d`). Used when issuing refresh tokens.
   - **JOB_SEARCH_CACHE_TTL** — Job search cache TTL in **seconds** (default `604800` = 7 days). How long Adzuna search results are cached before refetching.
   - **AI_SUMMARY_CACHE_TTL** — AI summary cache TTL in **seconds** (default `604800` = 7 days). How long summaries are considered valid per `inputTextHash`.
   - **ADMIN_REGISTER_SECRET** — If set, allows creating an admin account via `POST /api/v1/auth/admin/register`; if unset, that endpoint returns 403.

   **Other (document for completeness):**
   - **NEXT_PUBLIC_API_URL** — Backend API base URL (e.g. `http://localhost:3000/api/v1`). Used by the client for API calls; defaults in app may assume same-origin.
   - **NODE_ENV** — Standard Node environment (`development` / `production`); not validated in `next-app/lib/env.ts` but used by Next.js.
3. Run the app:
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/browse`.

## Cache duration

Every cache in the app, where it lives, and when entries expire:

| Cache                       | Where                                                                                 | Duration / expiry                           | Config / notes                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Job search (Adzuna)**     | MongoDB: `SearchCache` (query → listing IDs) and `Listing` documents with `expiresAt` | TTL in seconds; default **7 days** (604800)  | Env: `JOB_SEARCH_CACHE_TTL` (`next-app/lib/services/listings.service.ts`). Entries expire at `expiresAt`; TTL index can remove expired docs.      |
| **AI summaries**            | MongoDB: `AISummary`; lookup by `inputTextHash` and `createdAt` within TTL window      | TTL in seconds; default **7 days** (604800)  | Env: `AI_SUMMARY_CACHE_TTL` (`next-app/lib/services/summaries.service.ts`). Summaries older than TTL are not reused; new generation is stored.   |
| **Admin dashboard summary** | In-memory only (process lifetime)                                                     | **10 minutes**                              | Hardcoded in `next-app/lib/services/admin-dashboard.service.ts`. Bypass with `?refresh=1` on dashboard summary endpoints.                         |

JWT access and refresh tokens have their own expiry (see env vars above); they are not caches. Manual listings (admin-created) get `expiresAt` set to 1 year in `next-app/lib/services/listings.service.ts`.

## Next steps

- Add screenshot or logo after deployment
- WCAG contrast audit across all pages
- Additional unit and integration tests for services and API routes
