# Gym Tracker — me and my brother

Private workout tracker for two people. Built on the vendored `workout-cool`
base (see `PROVENANCE.md`).

It logs workouts and shows, at a glance, which of us is actually training and
which of us is talking. That's it.

---

## What it does

**Log a workout.** The base app already does this well. Keep it, make it fast.

**One comparison page.** Me and him, side by side, this week:

- sessions
- total weight lifted
- daily step average
- current streak (weeks with 3+ sessions)

Whoever wins more of those four wins the week. No weights, no formula — you can
see who's ahead on each line and the total is obvious. Keep a running count of
weeks won, because that's the number we'll actually argue about.

**Graphs.** Both of us on the same axes, always:

- weight lifted per week
- estimated 1RM on the main lifts (Epley: `weight * (1 + reps / 30)`)
- daily steps
- a calendar grid, one square per day, shaded by how hard you went — this is the
  one that makes it obvious when someone's disappeared for two weeks

---

## Steps

Type it in. One number a day.

Automating it is worth doing eventually but it's not what makes the app good, and
the ground is currently moving (see below). Store steps in their own table with a
`source` column set to `"manual"` so swapping in a real sync later doesn't mean
touching anything else.

### What I found out about the Fitbit Air

Worth writing down because it's non-obvious and it'll waste a day otherwise:

- The Fitbit Air syncs into the **Google Health app**, not the old Fitbit app.
- **The old Fitbit Web API is being switched off this month** (Sept 2026). Any
  guide or library using `api.fitbit.com` is already dead. The replacement is the
  Google Health API on normal Google OAuth.
- Every Google Health scope is "Restricted", which officially means an app
  verification *and* a paid annual security audit. **But unverified apps are
  allowed 100 users and we need two** — so we just never verify, click through
  the "unverified app" warning once each, and that's fine forever.
- Gotcha: in **Testing** mode Google kills refresh tokens after **7 days**, so a
  nightly sync would break every week. Publishing the consent screen to
  **Production** (while still not verifying) gives tokens that don't expire.
- Unconfirmed: whether Google actually serves Restricted scopes to an unverified
  production app. Test that with a throwaway project before writing sync code.

If it turns out to be a pain: my brother's Android can read steps straight out of
Health Connect on-device, and my iPhone can post them from a Shortcut. Neither
needs Google's approval for anything.

---

## What to strip from the base app

It ships as a full commercial fitness platform. Delete the parts that only exist
to make money or serve strangers, because they all need config and secrets:

- Stripe / RevenueCat / subscriptions / licenses
- transactional emails
- OpenPanel analytics
- public program browsing, coach features, exercise submission
- i18n — it's a lot of files for two English speakers

Keep the exercise database. That's the genuinely valuable part and it would take
weeks to build by hand. Keep the workout logging models. Cut auth down to two
allowlisted emails.

One note: `WorkoutSet` stores values in parallel arrays (`valuesInt`, `valuesSec`,
`units`), which is annoying to add up. Flatten it into a simple per-day totals
table on a nightly job rather than re-parsing arrays on every page load. That
table is derived, so it's always safe to delete and rebuild.

---

## Running it

Vercel free tier, free Postgres (Neon or Supabase), one nightly cron to
recalculate the totals. Two people will never come close to outgrowing any of it.

---

## Order

1. Strip it down, cut auth to two accounts, get it deployed and log a real
   session on both our phones.
2. Add the comparison page and the graphs, with steps typed in.
3. Automate steps, if we still care by then.

Step 1 is the only one that matters. If we don't both actually use it to log
workouts, nothing else is worth building.
