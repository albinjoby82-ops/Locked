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
| Cloudflare deploy-ready | ✅ build fixed — remaining steps are dashboard work |

`next dev` runs fine and the whole logging flow works against a real Postgres.
`next build` now completes as well — see "The production build" below.

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

### The exercise database

⚠️ **PLAN.md discrepancy.** PLAN.md calls the exercise database "the genuinely
valuable part" we're inheriting. What was actually vendored is
`data/sample-exercises.csv` — **19 lines, 3 exercises**, with names and
descriptions in French (upstream is a French project). The real dataset was
never in the repo.

**Fixed by sourcing one.** `data/exercises.csv` now holds **876 exercises**,
built from [free-exercise-db](https://github.com/yuhonas/free-exercise-db)
(Unlicense — public domain, no attribution required). It's English, actively
mirrored, and carries exactly the fields this schema wants: primary/secondary
muscles, equipment, mechanics, category, step-by-step instructions and two
photos per exercise.

`scripts/build-exercise-csv.ts` converts that dataset into the CSV shape the
vendored importer already reads, so nothing about the import path changed:

```sh
npx tsx scripts/build-exercise-csv.ts                                  # data/exercises.csv
npx tsx scripts/import-exercises-with-attributes.ts ./data/exercises.csv
```

The CSV is committed, so a fresh setup needs no network beyond the database.
Re-run the build script only to pick up upstream changes.

Mapping notes, since the two vocabularies aren't identical:

- `lower back` and `middle back` both fold into `BACK` (the schema has no
  finer-grained back muscle), de-duplicated so an exercise never gets `BACK`
  twice.
- `olympic weightlifting` → `WEIGHTLIFTING`, `exercise ball` → `SWISS_BALL`,
  `e-z curl bar` → `EZ_BAR`.
- Equipment `None` becomes `NONE`, which the importer normalises to `NA`.
- A muscle listed as both primary and secondary is recorded once, as primary.
- The dataset has no prose intro, so `introduction` is a generated one-liner
  ("A beginner strength exercise targeting the Quadriceps, using barbell.").
- `level` and `force` are dropped — the schema has nowhere to put them.

**Photos are hotlinked**, not vendored: `fullVideoImageUrl` points at
`raw.githubusercontent.com/yuhonas/free-exercise-db/...`. ~1,700 JPEGs would
add well over 100 MB to the repo for a two-person app. `next.config.ts` allows
that host. If it ever goes away, the fix is to download `exercises/` from the
dataset into `public/` and change `IMAGE_BASE` in the build script.

**[call]** free-exercise-db over the alternatives (wger's API, ExerciseDB on
RapidAPI): public domain rather than a licence to reason about, a plain JSON
file rather than an API key and a rate limit, and its field vocabulary is
near-identical to the enums this schema already ships.

Verified end-to-end against a local Postgres: `prisma migrate deploy` then the
importer → **876 exercises, 5,104 attributes, 0 errors**.

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

1. Create a Postgres database at [neon.tech](https://neon.tech) (free tier) and
   copy the pooled connection string.
2. Swap Prisma to the Neon driver adapter:
   `pnpm add @prisma/adapter-neon @neondatabase/serverless`, add
   `previewFeatures = ["driverAdapters"]` to the Prisma client generator, and
   construct `PrismaClient` with the adapter in `src/shared/lib/prisma.ts`.
3. `npx wrangler login`
4. Push secrets:
   ```sh
   npx wrangler secret put DATABASE_URL
   npx wrangler secret put BETTER_AUTH_SECRET     # openssl rand -base64 32
   npx wrangler secret put BETTER_AUTH_URL        # https://<worker>.workers.dev
   npx wrangler secret put ALLOWED_EMAILS         # the two addresses
   ```
   `NEXT_PUBLIC_APP_URL` is inlined at build time — set it in the build env, not
   as a secret.
5. Apply the schema to Neon: `DATABASE_URL=<neon url> npx prisma migrate deploy`
6. `npx opennextjs-cloudflare build && npx opennextjs-cloudflare deploy`

---

## The production build (fixed)

`next build` used to fail while prerendering the synthetic `/_global-error`
page:

```
TypeError: Cannot read properties of null (reading 'useContext')
Export encountered an error on /_global-error/page
```

**Cause.** The only root layout was `app/[locale]/layout.tsx`, which rendered
`<html>` *and* all the client providers (i18n, theme, query client). Next
generates `/_global-error` and `/_not-found` outside any `[locale]` value, so
those providers never mounted and the first `useContext` returned null. This was
inherited from upstream v1.3.2, which fails identically.

**Fix (the layout split suggested here previously).**

- `app/layout.tsx` is now the real root layout. It owns `<html>`/`<body>`, the
  fonts, `globals.css` and the locale-independent PWA meta tags — and nothing
  else. No providers, no context, no i18n, so the synthetic pages have a valid
  root layout they can prerender against.
- `app/[locale]/layout.tsx` keeps `generateMetadata` and is otherwise reduced to
  mounting `<Providers>`, the locale manifest link, the structured-data scripts
  and the page shell. It no longer renders `<html>`.
- `lang` is hardcoded to `en` on the root `<html>`; `en` is the only locale that
  matters here (see the i18n note above).
- Dropped along the way: the AdSense/Ezoic head scripts and the GA4 block (both
  already inert after the analytics/ads strip), and the `hreflang` alternates
  for workout.cool, which point at the upstream public site.

`app/global-error.tsx` was kept — it's the right thing to have regardless, even
though Next doesn't use it for the synthetic route.

Verified: `pnpm build` completes, and `pnpm lint` is clean (24 warnings, 0
errors — the warnings are inherited).

---

# Step 2 — the comparison board and the graphs

Everything PLAN.md asks for in Step 2 is built and verified against a real
Postgres with two seeded users and twelve weeks of sessions.

## The board — `/[locale]/board`

The four lines, per week, exactly as PLAN.md words them: sessions, total weight
lifted, daily step average, and current streak (weeks with 3+ sessions).
Whoever takes more of the four takes the week; there is no weighting and no
composite score, because the plan explicitly doesn't want one. Ties go to
nobody. The running **weeks-won** count is the biggest number on the page.

Details worth knowing:

- **Streaks.** A finished week under three sessions breaks the streak. The
  *current* week is the exception — two sessions in a week that isn't over
  hasn't broken anything, so the count picks up from the week before
  (`streakAt(..., inProgress)`).
- **Step averages** are over the days actually recorded, not over seven.
  Averaging over seven would just punish whoever hasn't typed the number in yet.
- **Weeks nobody logged anything in** aren't counted as won by anyone.
- **Everything is UTC.** Two people in two timezones would otherwise disagree
  about which day a late-evening session belongs to, and the `DATE` columns have
  no timezone to fall back on.

## The graphs

All of them put both people on the same axes — never a second y-axis:

- weight lifted per week, and sessions per week (grouped bars, 12 weeks)
- estimated 1RM per week on the main lifts (lines, Epley `weight * (1 + reps / 30)`
  as the plan names it). "Main lifts" is picked from the data — the exercises
  with the most weighted sets logged across both of us — rather than a hardcoded
  list of names.
- daily steps over 30 days (a line, not 60 bars; a day nobody typed in is a gap,
  not a zero)
- the calendar grid: one square per day per person over six months, shaded by
  tonnage. PLAN.md calls this "the one that makes it obvious when someone's
  disappeared for two weeks", so empty squares matter as much as full ones.

Person colours are fixed by join order and validated for colour-blind
separation, chroma, lightness band and contrast, with a separate dark-mode step
(`src/features/board/lib/palette.ts`). Every chart carries a legend, so identity
never rests on colour alone.

## `WorkoutSet` flattening — done

The deferred `TODO(step-2)` is closed. `DailyStat` holds one row per user per
day (tonnage, sets, reps, sessions, duration) and the board reads it instead of
re-parsing the parallel arrays.

- `src/features/board/lib/set-values.ts` is now the **only** place that knows
  the `types`/`valuesInt`/`valuesSec`/`units` layout. It handles the lbs → kg
  conversion the parallel arrays encode per column (verified: 10 × 100 lbs adds
  453.6 kg).
- `recomputeDailyStats()` deletes and rewrites the window it rebuilds rather
  than doing incremental bookkeeping — the table is derived, so a full rebuild
  is always safe and an edited or deleted session can never leave a stale row.
- **Today is read live**, not from DailyStat, so a session logged this morning
  shows on the board this morning instead of after the next cron run. Both paths
  share `aggregateSessions()`, so they can't drift.

Rebuild by hand any time: `GET /api/cron/daily-stats?days=all`.

## Steps

Typed in, one number a day, into `StepEntry` with `source = "manual"` — the
column exists so a real sync can be added later without touching anything that
reads the table. Step 3 territory; see PLAN.md on why the Fitbit/Google Health
ground is still moving.

## The nightly job

`GET /api/cron/daily-stats`, authenticated by either a `CRON_SECRET` bearer
token or a signed-in session. With no `CRON_SECRET` set only the session path
works, so an unconfigured deployment can't be poked by a stranger.
`wrangler.jsonc` schedules it at 03:15 UTC — note the Worker's scheduled handler
still has to actually call the route with the bearer token when you deploy.

## Navigation

The bottom nav pointed at `/tools`, `/leaderboard` and `/premium`, all of which
were deleted in Step 1 — three dead links. Replaced with **Board**, and the
premium styling branches went with them.

## Verified

Against a local Postgres, two users, 12 weeks of sessions and daily steps:

```
weeks won            12–0
this week            3–1 (sessions, tonnage and streak to one; steps to the other)
streak               11 weeks vs 0
today, pre-cron      session count rises live, without a rebuild
10 reps x 100 lbs    +453.6 kg
pnpm build           passes
pnpm lint            0 errors
```

Both themes were rendered in a browser and eyeballed.

---

# The workout logger

The inherited logger worked but was built for a different product: a
three-step funnel (equipment → muscles → a *generated* exercise list) that
had to be walked before you could log anything, and no way to reach an
exercise by name. Fine for "build me a workout", useless for "add barbell
rows to what I'm already doing".

## Adding exercises

- **Search, by name.** `ExercisePicker` searches all 876 exercises with
  muscle and equipment filter chips, debounced, paginated. It stays open
  after an add so you can queue several, and marks what's already in the
  session. It's backed by `/api/exercises/all`, which already supported
  `search`/`muscle`/`equipment` — that route is now **session-gated** (it was
  open, with the auth check commented out) and returns the full exercise
  shape so a result can go straight into a session.
- **Start an empty workout.** A button on step 1 skips the wizard entirely
  and opens a session with nothing in it. The wizard still exists for when
  you want it to pick for you.
- **Add and remove exercises mid-session.** `addExerciseToSession` existed in
  the store but the only UI that called it wrote to the *builder* store and
  needed equipment already selected, so it did nothing during a workout.
  Now the session has its own "Add exercise" button and a per-exercise
  remove. `removeExerciseFromSession` is new: it renumbers `order` and
  clamps the cursor, so removing the exercise you're on doesn't leave the
  session pointing past the end of the list.

## Logging a set

The set editor rendered every set as a *column builder* — a type dropdown, a
value, a unit select, and add/remove-column buttons, stacked vertically on a
phone. One set filled the screen.

Reps × weight is what nearly every set actually is, so that case is now one
row: `SET n · weight · kg · reps · ✓`. Three sets now fit where one used to.
Nothing was removed — time-based, bodyweight and multi-column sets still get
the full editor, and it's one tap away on any set behind the ⋯ button.

Two smaller fixes that came out of using it:

- The previous set's numbers show as the placeholder for the next one, so
  you can see what you're trying to beat.
- Chromium's number spinners were eating ~20px of a narrow field, clipping
  three-digit weights to "10". `appearance-none`.

## The rest-timer

It was `fixed` at `bottom-36` with `z-50` — floating in the middle of the
screen, on top of the set controls it was meant to sit beside, and over the
exercise picker. It's now docked just above the bottom nav, smaller, at
`z-40`, and the picker sits at `z-[60]` above it.

## Workouts done

The board now carries a **Workouts done** block: all-time and last-30-day
session counts for each of us, when each last trained, and a combined feed
of the last dozen sessions with their exercises. Read straight from
`WorkoutSession` rather than from `DailyStat` — it's a count of sessions, it
doesn't need the flattened tonnage, and reading the source means a workout
finished thirty seconds ago is already in the number.

## Verified

Driven in a browser, end to end: start empty → search "barbell squat" and
"barbell curl" → add both → log 3 sets (95/100/105 kg × 5) → total volume
reads **1,500 kg** → finish → the session syncs and the board's count goes
up, with "Last: today". No console errors.

## ⚠️ `locales/en.ts` is at next-international's type-inference limit

Adding a *single* key to `en.ts` (a `commons.done`) made TypeScript stop
resolving the key union for the whole app: every `t("...")` call started
failing with "Expected 2 arguments, but got 1", including keys that had
typechecked moments earlier. Removing the one key fixed it.

So: **new UI strings in this app are written as literals, not locale keys.**
That's fine for two English speakers, and it's another argument for
finishing the i18n removal PLAN.md asked for. If you do need a new key,
budget for deleting the non-English locale files first.

---

# Deploying (Vercel + Neon + Google)

Step-by-step in `DEPLOY.md`. What changed in the code, and why.

## Vercel, not Cloudflare Workers — [call], reversing the Step 1 decision

Step 1 committed `wrangler.jsonc` and `open-next.config.ts`. Going back over it
before deploying, that path had four blockers, three of which were silent:

1. Prisma's query engine can't open a direct TCP connection on Workers. It needs
   `@prisma/adapter-neon` + the `driverAdapters` preview; neither was installed
   and the schema wasn't configured for it.
2. `wrangler.jsonc` scheduled a cron with **no `scheduled` handler anywhere** to
   invoke — the nightly job would never have run, and nothing would have said so.
3. No npm script wired `opennextjs-cloudflare build`.
4. `getServerUrl()` (below) returns the wrong origin off Vercel, which breaks the
   OAuth redirect outright.

`PLAN.md` said Vercel originally. The Cloudflare config has been deleted along
with `@opennextjs/cloudflare` and `wrangler`.

**Firebase was considered and rejected.** The ask was for something free, which
Neon's free tier already is. Firestore would have meant rewriting the data layer:
the schema depends on Postgres scalar list columns (`Int[]`, enum arrays — the
same reason SQLite and D1 were rejected in Step 1), the board and stats use
`groupBy`/`$transaction`/`distinct` and relational joins, better-auth uses
`prismaAdapter`, and the exercise picker needs substring search (`contains` +
`mode: "insensitive"`), which Firestore cannot do without Algolia or Typesense
bolted alongside.

## `getServerUrl()` pointed at somebody else's domain

The worst bug found in this pass, and it was invisible locally.
`src/shared/lib/server-url.ts` returned `SiteConfig.prodUrl` whenever
`VERCEL_ENV === "production"` — and that constant is `https://workout.cool`.
Since it feeds the better-auth client `baseURL`, the OAuth `callbackURL` and
`metadataBase`, the first production deploy would have handed out upstream's
domain as its auth callback and sign-in would simply have failed.

It now resolves `NEXT_PUBLIC_APP_URL`, preferring `VERCEL_URL` on preview deploys
so those work on their own hostname, and no longer reads `SiteConfig` at all. The
hardcoded `https://www.workout.cool` canonical/hreflang tags, sitemap base and
breadcrumb JSON-LD were switched to it too.

## Google sign-in, and passwords are gone

`socialProviders.google` with `account.accountLinking.trustedProviders:
["google"]`. The `ALLOWED_EMAILS` hook is untouched and needed no change — it
sits in the adapter path, so it refuses a stranger's Google sign-up at exactly
the point it used to refuse a password signup, and correctly does *not* fire when
an existing user links a second provider.

`emailAndPassword` is now `enabled: false`. Upstream had overridden better-auth's
scrypt with `hashStringWithSalt(password, BETTER_AUTH_SECRET)` — one global salt,
no per-user salt, no KDF, so a single database leak cracks both accounts at once
and rainbow-tables across them. Deleting the password path is a better answer
than re-hashing it, and one tap beats typing a password on a phone anyway.

Two related fixes:

- **`trustedOrigins` was `["*"]`**, which disables better-auth's origin check
  entirely. Harmless on localhost, not on a public URL.
- **The session config was backwards**: a 30-day `cookieCache.maxAge` over a
  7-day session expiry. The cookie cache is a signed snapshot that skips the
  database, so that setup kept honouring sessions that had already expired.
  Staying logged in is `expiresIn` — now 90 days, with a 5-minute cache.

**Refusal used to be silent.** `ProviderButton` called
`authClient.signIn.social()` inside a `useMutation` with no `onError` and never
inspected the returned error, so a failure just stopped the spinner. It now
throws on error, toasts, and passes an `errorCallbackURL` — necessary because an
`APIError` from `databaseHooks` inside the OAuth callback *redirects* rather than
returning JSON, so without one a refused account landed on a bare better-auth
error page. The sign-in form reads that flag and explains the allowlist.

Verified against a live build: the consent URL carries
`redirect_uri=http://localhost:3000/api/auth/callback/google`, scopes
`email profile openid` (not restricted, so no Google verification review), and
PKCE. Password sign-in now returns `EMAIL_AND_PASSWORD_IS_NOT_ENABLED`.

## Serverless

- `prisma/schema.prisma` gained `directUrl`; `DATABASE_URL` is the pooled Neon
  string and `DIRECT_URL` the unpooled one, because PgBouncer in transaction mode
  can hold neither Prisma's advisory locks nor the importer's long transactions.
- `src/shared/lib/prisma.ts` cached the client on `globalThis` only when
  `NODE_ENV !== "production"` — exactly backwards for serverless, where instances
  are reused across invocations. Now cached unconditionally.
- `preferredRegion` listed three continents; pinned to one.
- `vercel.json` schedules the nightly rebuild. No route change was needed: Vercel
  sends `Authorization: Bearer $CRON_SECRET` automatically, which is what
  `/api/cron/daily-stats` already checks.

## Phone fixes

**A failed save looked like a successful one.** `syncSessions()` was called
without `await` and its result discarded, while per-session failures were caught
and only `console.error`'d — invisible on a phone. Confetti fired regardless. It
now returns `{ failed, total, skipped }`, and finishing a workout with no signal
toasts "Saved on this phone. It'll upload when you're back online."

Verified with the network actually cut: the toast appears, the workout stays in
localStorage, and it uploads on reconnect. `MAX_SESSIONS` also went from 10 to
50 — `saveAll` keeps only the newest N, so an eleventh unsynced workout used to
silently drop the oldest.

**The viewport meta was malformed.** `maximum-scale=1 viewport-fit=cover` with no
comma between them, so the token was invalid and `viewport-fit` never applied —
which silently meant `env(safe-area-inset-*)` had no real values. Replaced with
Next's typed `viewport` export, and `maximum-scale` dropped so pinch-zoom works.

**Safe-area insets** were used nowhere in the codebase, so the fixed bottom nav
sat under the iPhone home indicator. Added to the nav, the session timer, and the
two content spacers that have to clear them.

## Removed

`wrangler.jsonc`, `open-next.config.ts`, `nextauth.d.ts` (augmenting a package
that isn't installed), the duplicate `app/api/auth/signup/route.ts`, and the
dependencies `@opennextjs/cloudflare`, `wrangler`, `@vercel/functions`,
`@auth/prisma-adapter` and `pg` — none of them imported anywhere.

The signup, forgot-password, reset-password and verify-email routes now redirect
to sign-in; with passwords off they were dead ends.

## Smaller things deferred

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
and trophy art into `public/images/`. The board is built to the plan rather than
to that bundle — its Dashboard/Board layouts and roast mode are still unused. Note it assumes a React
Native app; we're a Next.js web app, so it's a visual reference, not a spec to
follow literally.

## Local development

```sh
cp .env.example .env      # set ALLOWED_EMAILS to the two real addresses
docker compose up -d      # or any local Postgres
pnpm install
npx prisma migrate deploy
npx tsx scripts/import-exercises-with-attributes.ts ./data/exercises.csv
pnpm dev
```

The seed script does not read `.env` on its own (it runs under `tsx`, not the
Prisma CLI), so export `DATABASE_URL` first or prefix the command with it.
