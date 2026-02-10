# Job Finder App

AI-assisted job search built with Next.js. Users can browse listings at `/browse`, save jobs,
compare roles, and generate AI summaries. Admins can view analytics.

_(Add a screenshot of the app here)_

## Tech Stack

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
   Then edit `next-app/.env.local` with real values. For auth (login/register) to work: set `MONGODB_URI` (MongoDB must be running and reachable) and set `JWT_SECRET` and `JWT_REFRESH_SECRET` to at least 32 characters each.
3. Run the app:
   ```bash
   pnpm dev
   ```

**Links**

- **Deployed app:** _(add URL when deployed)_
- **Planning and requirements:** see `md_files/` in this repository.
- **Backend and API:** this repository; API routes live in `next-app/app/api/v1/`.

## Useful scripts (root)

- `pnpm dev` - start Next.js dev server
- `pnpm build` - build all workspace packages
- `pnpm lint` - lint all workspace packages
- `pnpm test` - run unit tests (vitest)

## Attributions

- **Adzuna API** – job listings data.
- **Google Gemini API** – AI-powered job summaries.
- **shadcn/ui** – UI component library.
- **@phosphor-icons/react** – icons.
- **framer-motion** – animations.
- **Cursor AI** – used per course AI attribution guidelines.

## Notes

- Auth uses JWT access tokens + HttpOnly refresh cookie.
- Job search caching TTL is controlled by `JOB_SEARCH_CACHE_TTL`.
