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
- **Prisma + PostgreSQL** — schema at `prisma/schema.prisma`. Postgres, not
  SQLite/D1: the schema relies on scalar list columns.
- **Auth**: better-auth, email + password only, gated by an `ALLOWED_EMAILS`
  allowlist enforced on user creation.

## What was deliberately removed or stubbed

Monetisation, ads, analytics and transactional email are gone or stubbed to
no-ops so the app needs no third-party secrets. Don't reintroduce them. Details
in `NOTES.md`.

## Commands

```sh
pnpm dev      # dev server (Turbopack)
pnpm build    # production build
pnpm lint     # ESLint — must stay at 0 errors
pnpm db:seed  # seed sample data
```

Local setup (Postgres required) is documented in `PROVENANCE.md`.

## Deployment

Cloudflare Workers via `@opennextjs/cloudflare`, with Neon/Supabase Postgres.
Step-by-step in `NOTES.md`.
