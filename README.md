# Job Finder App

AI-assisted job search built with Next.js. Users can browse listings, save jobs,
compare roles, and generate AI summaries. Admins can view analytics and system
health.

## Tech stack
- Next.js 16 (App Router), React 19
- MongoDB + Mongoose
- TanStack Query
- Zod schemas shared via `packages/schemas`
- UI components via `packages/ui`

## Monorepo layout
- `next-app/` - main Next.js application
- `packages/schemas` - shared Zod schemas and types
- `packages/ui` - shared UI components

## Getting started
1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Configure environment variables:
   ```bash
   cp next-app/.env.example next-app/.env.local
   ```
   Then edit `next-app/.env.local` with real values.
3. Run the app:
   ```bash
   pnpm dev
   ```

## Useful scripts (root)
- `pnpm dev` - start Next.js dev server
- `pnpm build` - build all workspace packages
- `pnpm lint` - lint all workspace packages
- `pnpm test` - run unit tests (vitest)
- `pnpm analyze` - build with bundle analyzer

## Health check
Public health endpoint for uptime monitoring:
```
GET /api/v1/system/health
```

## Notes
- Auth uses JWT access tokens + HttpOnly refresh cookie.
- Rate limiting is enforced on auth and resume parsing endpoints.
- Job search caching TTL is controlled by `JOB_SEARCH_CACHE_TTL`.
