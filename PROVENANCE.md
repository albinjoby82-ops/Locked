# Locked In — provenance

## What this is

"Locked In" is a Hevy-style gym / workout tracker for exactly two users. It
started life as a snapshot vendored into a side branch of my portfolio repo
(`albinjoby82-ops/MyPortfolio`, branch `claude/gym-tracker-research-r0vfr9`,
under `gym-tracker/`) while this repo didn't exist yet, and has now moved here
to its own repo — its permanent home.

See `PLAN.md` for the actual product plan, and `NOTES.md` for the state of the
Step 1 build work (strip, auth, Cloudflare deploy prep).

## Upstream

- Source: https://github.com/Snouzy/workout-cool
- License: MIT (see `LICENSE` — it must be kept)
- Vendored at: upstream `main`, version 1.3.2
- Git history was **not** kept — this was a snapshot, not a fork or submodule,
  so there's no upstream history to reconcile here either.

Why this one:
- Next.js + TypeScript + Tailwind — a stack I already knew.
- Actively maintained with a large contributor base.
- MIT licensed, so it can be built on and re-released freely.
- Shipped the pieces a Hevy clone needs: exercise database, workout builder,
  session logging, progress tracking, auth, and a Prisma/Postgres schema.

## Exercise data

`data/exercises.csv` — 876 exercises — is generated from
[free-exercise-db](https://github.com/yuhonas/free-exercise-db) by
`scripts/build-exercise-csv.ts`. That dataset is released under the Unlicense
(public domain), so it can be redistributed here freely. Exercise photos are
hotlinked from the same repo rather than vendored. See `NOTES.md` for the
field mapping.

`data/sample-exercises.csv` is upstream's 3-exercise French sample, kept only as
a reference for the importer's CSV format.

## Running it

```sh
cp .env.example .env      # fill in DATABASE_URL, ALLOWED_EMAILS and the Google keys
pnpm install
npx prisma migrate deploy
npx tsx scripts/import-exercises-with-attributes.ts ./data/exercises.csv
pnpm dev
```

A Postgres instance is required — `docker-compose.yml` provides one locally.
See `README.md` and `CONTRIBUTING.md` for upstream docs (both still describe
the original commercial project; treat them as background, not instructions).
