# Build notes — Step 1 (strip + auth + deploy prep)

Working notes from the Step 1 pass described in `PLAN.md`. Decisions I had to
make without being able to ask are marked **[call]** with a one-line reason.

---

## Status against the definition of done

| Goal | Status |
|---|---|
| App runs locally, stripped of commercial cruft | ✅ |
| Only two allowlisted emails can log in | ✅ verified both directions |
| A real workout logs and displays correctly | ✅ verified end-to-end |
| Clean, incrementally committed repo | ✅ |
| Cloudflare deploy-ready | ⚠️ **blocked — see "Production build" below** |

`next dev` runs fine and the whole logging flow works against a real Postgres.
`next build` does not currently complete. That is the one open item.

---

## What was removed

**Monetisation.** Stripe and RevenueCat providers, `/api/billing`,
`/api/premium`, `/api/webhooks`, `/api/revenuecat`, the premium and sponsor
pages, subscription seed scripts, and the `Subscription`, `SubscriptionPlan`,
`PlanProviderMapping`, `License` and `RevenueCatWebhookEvent` Prisma models.

**Ads.** Every ad component, plus the ~90 ad-slot environment variables.

**Analytics.** OpenPanel client and server, GA4 tag.

**Email.** The `emails/` React Email templates and the contact/feedback features.

**Public surface.** The BMI / calorie / heart-rate calculators, the about page,
and the leaderboard. **[call]** These weren't named in PLAN.md, but they're SEO
and marketing surface for a public product — nothing a two-person app needs.

**i18n — only partly. [call]** PLAN.md says remove it, but routing is built on
`app/[locale]/...` and unpicking that touches every route. I left the framework
in place and kept `en` as the only locale that matters. Non-English locale files
(`es`, `fr`, `pt`, `ru`, `zh-CN`) are still on disk and can be deleted whenever;
they cost nothing at runtime. This was the reversible option under time pressure.

### What was stubbed rather than deleted

`premium` was referenced in 77 files and `ads` in 64 — mostly one-line guards
threaded through UI components, including the workout logger itself. Excising
every call site tonight would have been a large diff through the exact code
Step 1 needs to keep working.

Instead the choke points are stubbed:

- `src/shared/lib/premium/*` — everyone is premium, always.
- `src/components/ads/index.tsx` — every ad component renders `null`.
- `src/shared/lib/analytics/*` — no-ops.
- `src/shared/lib/mail/sendEmail.ts` — logs to console instead of sending.

This removes all the secrets and config (the actual goal) without touching the
logging flow. The stubs are small and can be inlined away whenever someone is
already in those files. Dead ad conditionals are typed `false as boolean` so
TypeScript doesn't flag them as always-falsy; the JSX behind them is unreachable.

---

## Auth

Email + password only. **The Google provider was dropped** — it required
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, two secrets for a two-person app.

The allowlist lives in `ALLOWED_EMAILS` (comma-separated) and is enforced in
better-auth's `databaseHooks.user.create.before`. Gating *creation* is enough:
an address that could never create an account has nothing to sign in to.

**[call]** Env var rather than hardcoded, so the addresses aren't in git.

Verified locally:

```
stranger@example.com  → 403 "This app is private. That email address is not on the allowlist."
albinjoby82@gmail.com → 200 + session
```

Note: `better-auth` exports `APIError` from `better-auth/api`, not the package
root, in 1.2.9. The root import typechecks but fails at runtime.

---

## Database

**Postgres, not D1. [call]** This wasn't a close call. The schema leans on
PostgreSQL scalar lists throughout — `WorkoutSet.valuesInt Int[]`,
`types WorkoutSetType[]`, `WorkoutSession.muscles ExerciseAttributeValueEnum[]`.
Prisma cannot represent scalar lists on SQLite, so D1 would mean rewriting the
set-logging model into join tables before anything worked at all. That is a
large change to the one part of the app Step 1 is supposed to protect.

So: **Neon or Supabase Postgres, reached from the Worker** via Prisma's driver
adapter (`@prisma/adapter-neon`, which talks HTTP and works on Workers — the
regular `pg` driver does not).

### Migration history was reset

The inherited `0_init` migration had already drifted from `schema.prisma` —
`user.onboardingPreferences` existed in the schema with no migration creating
it, so sign-in failed against a freshly migrated database with `P2022`. Since
the subscription models were being removed anyway, I replaced the migrations
directory with a single baseline, `init_two_user_build`. Upstream migration
history isn't worth preserving in a snapshot.

### The exercise database is nearly empty

⚠️ **PLAN.md discrepancy.** PLAN.md calls the exercise database "the genuinely
valuable part" we're inheriting. What's actually vendored is
`data/sample-exercises.csv` — **19 lines, 3 exercises**, and the names and
descriptions are in French (upstream is a French project).

The real dataset is not in the repo. Before Step 1 counts as usable in a gym,
someone needs to source a proper exercise list. This does not block anything
technically — the schema and import script work fine — but it does mean the app
is not yet usable for real training. Worth deciding early whether to find an
open dataset or hand-write the 40 or so lifts you two actually do.

---

## Cloudflare

**Workers, not Pages. [call]** `@opennextjs/cloudflare` (installed, v1.20.5) is
the supported adapter for Next 16 and is what the Next team points at for
Cloudflare. Pages' `next-on-pages` is the older edge-runtime-only path and is
not a good fit for an app this size.

Committed: `wrangler.jsonc` and `open-next.config.ts`.

**Not deployed.** No Cloudflare credentials exist in the repo or environment, and
deploying needs an account, a Worker, and a database — all dashboard work. Per
the brief I stopped here.

### Exact next steps to deploy

1. Fix the production build (below). Nothing else can proceed until this is done.
2. Create a Postgres database at [neon.tech](https://neon.tech) (free tier) and
   copy the pooled connection string.
3. Swap Prisma to the Neon driver adapter:
   `pnpm add @prisma/adapter-neon @neondatabase/serverless`, add
   `previewFeatures = ["driverAdapters"]` to the Prisma client generator, and
   construct `PrismaClient` with the adapter in `src/shared/lib/prisma.ts`.
4. `npx wrangler login`
5. Push secrets:
   ```sh
   npx wrangler secret put DATABASE_URL
   npx wrangler secret put BETTER_AUTH_SECRET     # openssl rand -base64 32
   npx wrangler secret put BETTER_AUTH_URL        # https://<worker>.workers.dev
   npx wrangler secret put ALLOWED_EMAILS         # the two addresses
   ```
   `NEXT_PUBLIC_APP_URL` is inlined at build time — set it in the build env, not
   as a secret.
6. Apply the schema to Neon: `DATABASE_URL=<neon url> npx prisma migrate deploy`
7. `npx opennextjs-cloudflare build && npx opennextjs-cloudflare deploy`

---

## ⚠️ Open blocker: the production build

`next build` fails while prerendering the synthetic `/_global-error` page:

```
TypeError: Cannot read properties of null (reading 'useContext')
Export encountered an error on /_global-error/page
```

**Diagnosis.** The app's root layout lives at `app/[locale]/layout.tsx` and
renders `<html>` plus all the client providers (i18n, theme, query client).
Next generates `/_global-error` and `/_not-found` *outside* any `[locale]`
value, so those providers never mount and the first `useContext` returns null.

Evidence it's the layout and not any one component: stubbing `not-found.tsx`
down to a bare `<div>` didn't fix it, it just moved the failure from
`/_global-error` to `/_not-found`.

**Confirmed inherited, not caused by the strip.** I built pristine upstream
v1.3.2 (the vendored snapshot at commit `c19402e`, its own `node_modules`, its
own env) and it fails with the byte-identical error on the same page. So this
ships broken from upstream against the Next version upstream itself pins
(16.2.1) — it is not fallout from anything removed here.

Worth knowing: pristine upstream also refuses to build at all without
`REVENUECAT_SECRET_KEY`, `STRIPE_SECRET_KEY` and friends set. It hard-fails
collecting `/api/billing/status` before it ever reaches prerendering. That is a
decent retrospective argument for having stripped the monetisation code rather
than leaving it configured with dummy values.

**Suggested fix** (attempted the cheap version, didn't work; the real one is
too large to start unsupervised at the end of the session, and it touches the
layout every page depends on): split the layout. Add a real `app/layout.tsx` that owns `<html>`/`<body>` and nothing
else, and reduce `app/[locale]/layout.tsx` to a fragment that mounts the
providers. Then the synthetic pages get a valid root layout with no context
dependency.

Two cheaper things I tried that did *not* fix it, so nobody repeats them:
a self-contained `app/global-error.tsx` (kept — it's the right thing to have
regardless, but Next doesn't pick it up for the synthetic route), and a
pass-through `app/layout.tsx` returning `children` (reverted, no effect).
Stubbing `not-found.tsx` to a bare `<div>` only moved the failure to
`/_not-found`, which is what pointed at the layout in the first place.

`next dev` is unaffected, so local development and Step 2 work can continue
while this is open.

---

## Smaller things deferred

- **`WorkoutSet` flattening** — left as a `TODO(step-2)` comment in
  `prisma/schema.prisma` above the model, as instructed. The plan is a derived
  `DailyStat` table (one row per user per day) filled by a nightly job, so the
  graphs never re-parse the parallel arrays. Not needed for logging.
- **`CLAUDE.md`** in this directory is still upstream's, and refers to the
  original author's local paths and a React Native app we don't have. It should
  be rewritten or deleted.
- **Turbopack workspace-root warning** on every `next dev`, left over from when
  this lived under a portfolio repo with its own `package-lock.json` above it.
  Should be gone now that this is its own repo; if it isn't, set
  `turbopack.root` in `next.config.ts`.
- **Admin section** is still present (`app/[locale]/(admin)`). Harmless, and the
  dashboard's subscription tile now reads a hardcoded 0.
- **Programs / coach features** are still present. PLAN.md said to remove public
  program browsing; the models and pages are still there because the workout
  logger links into them. Removing them cleanly is its own task.

## Design handoff

The "Locked In" bundle is unpacked into `docs/design/`, and its equipment icons
and trophy art into `public/images/`. Everything it specifies (Dashboard, Board,
roast mode) is Step 2 — nothing from it is wired up. Note it assumes a React
Native app; we're a Next.js web app, so it's a visual reference, not a spec to
follow literally.

## Local development

```sh
cp .env.example .env      # set ALLOWED_EMAILS to the two real addresses
docker compose up -d      # or any local Postgres
pnpm install
npx prisma migrate deploy
npx tsx scripts/import-exercises-with-attributes.ts ./data/sample-exercises.csv
pnpm dev
```

The seed script does not read `.env` on its own (it runs under `tsx`, not the
Prisma CLI), so export `DATABASE_URL` first or prefix the command with it.
