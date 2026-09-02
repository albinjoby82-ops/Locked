# CLAUDE.md

## Project Overview

**Locked In** — a private gym / workout tracker for exactly two people (me and
my brother). It logs workouts and shows, side by side, which of us is actually
training.

Built on a vendored snapshot of the MIT-licensed `workout-cool` project. See:

- `PLAN.md` — the product plan and the order of work.
- `NOTES.md` — the state of the Step 1 build (strip, auth, deploy prep).
- `PROVENANCE.md` — where the base app came from and how to run it.
- `AGENTS.md` — code style, import order and FSD conventions. Follow it.

There is no mobile app. This is a single Next.js web app; upstream docs
(`README.md`, `CONTRIBUTING.md`) still describe the original commercial project
and are background, not instructions.

## Architecture

- **Next.js 16** (App Router) + TypeScript + TailwindCSS, Feature-Sliced Design.
- `app/layout.tsx` is the context-free root layout (`<html>`/`<body>`, fonts,
  global CSS). `app/[locale]/layout.tsx` mounts the client providers. Keep the
  root layout free of providers — the synthetic `/_global-error` and
  `/_not-found` pages render outside `[locale]` and will fail the build
  otherwise.
- Server Components by default; `"use client"` only where needed.
- Server Actions via `next-safe-action`, client state via `@tanstack/react-query`.
- **Exercise data**: `data/exercises.csv` (876 exercises, generated from the
  public-domain free-exercise-db by `scripts/build-exercise-csv.ts`). Photos are
  hotlinked from that repo, not vendored.
- **Prisma + PostgreSQL** — schema at `prisma/schema.prisma`. Postgres, not
  SQLite/D1: the schema relies on scalar list columns.
- **Auth**: better-auth, **Google sign-in only** (passwords are disabled), gated
  by an `ALLOWED_EMAILS` allowlist enforced on user creation — the hook is
  provider-agnostic, so it refuses a stranger's Google account too.
- **The logger**: `src/features/workout-builder/` is the optional
  equipment→muscles→exercises wizard; `src/features/workout-session/` is the
  actual session. A workout can start empty and gain exercises from
  `ExercisePicker` (search over the whole database). Sets render compact
  (reps × weight) with the full column editor behind the ⋯ button.
- **The board** (`src/features/board/`) is the head-to-head page at `/board`.
  It reads the derived `DailyStat` table, never `WorkoutSet` directly —
  `src/features/board/lib/set-values.ts` is the only place that knows the
  parallel-array layout. `DailyStat` is rebuilt by
  `GET /api/cron/daily-stats` (nightly); today is aggregated live so the page
  is never stale. Scoring rules live in `src/features/board/lib/scoring.ts`.

## What was deliberately removed or stubbed

Monetisation, ads, analytics and transactional email are gone or stubbed to
no-ops so the app needs no third-party secrets. Don't reintroduce them. Details
in `NOTES.md`.

## Gotcha: locale keys

`locales/en.ts` sits at next-international's type-inference limit. Adding one
more key breaks `t()` typechecking across the whole app. Write new UI strings
as literals — the app is English-only.

## Commands

```sh
pnpm dev      # dev server (Turbopack)
pnpm build    # production build
pnpm lint     # ESLint — must stay at 0 errors
pnpm db:seed  # seed sample data
```

Local setup (Postgres required) is documented in `PROVENANCE.md`.

## Deployment

Vercel + Neon Postgres + Google OAuth, all on free tiers. Step-by-step in
`DEPLOY.md`; the reasoning, including why not Cloudflare and why not Firebase,
is in `NOTES.md`.

`src/shared/lib/server-url.ts` is load-bearing: it feeds the better-auth client
`baseURL` and the OAuth `callbackURL`, so it must resolve to the real origin.
`DATABASE_URL` is Neon's pooled string, `DIRECT_URL` the unpooled one that
migrations and the exercise import need.
