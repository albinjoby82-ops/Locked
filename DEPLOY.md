# Deploying Locked In

Everything in the code is done. What's left needs three consoles you own —
Neon, Google Cloud, Vercel. Work top to bottom; the order matters, because
`NEXT_PUBLIC_APP_URL` is baked in at build time and the Google redirect URI has
to match the live domain exactly.

Running cost is £0: Vercel Hobby, Neon free tier, Google OAuth.

---

## 1. Database — Neon

Create a project at [neon.tech](https://neon.tech). From the dashboard take
**two** connection strings:

| Env var | Which string | Why |
|---|---|---|
| `DATABASE_URL` | **Pooled** — host contains `-pooler` | The app. Append `?sslmode=require&connection_limit=1` — each serverless instance keeps its own pool, so a higher limit multiplies with concurrency. |
| `DIRECT_URL` | **Direct** — no `-pooler` | Migrations and the exercise import. PgBouncer in transaction mode can hold neither Prisma's advisory locks nor its long transactions. |

Note the region you pick, then set it in `app/layout.tsx`:
`export const preferredRegion = ["lhr1"]` — currently London. Vercel and Neon
being in different continents adds an ocean to every query.

Apply the schema from your laptop:

```sh
DIRECT_URL="<direct-url>" DATABASE_URL="<pooled-url>" npx prisma migrate deploy
```

---

## 2. Google sign-in

[Google Cloud Console](https://console.cloud.google.com) → new project.

1. **APIs & Services → OAuth consent screen** → **External** → **Testing**.
   Add both Gmail addresses as **Test users**. Testing mode is correct for two
   people: no verification review. Sign-in uses only `email`, `profile` and
   `openid`, which are *not* restricted scopes — so unlike the Google Health
   research in `PLAN.md` there's no audit and no 7-day token expiry.
2. **Credentials → Create credentials → OAuth client ID → Web application.**
3. **Authorised redirect URIs** — exactly these, no trailing slash:
   - `https://<your-vercel-domain>/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google`

   It is `/api/auth/callback/google`, *not* `/api/auth/[...all]/callback/google`.
   (Verified against a live build: better-auth emits precisely this URI.)
4. **Authorised JavaScript origins**: the same two, without the path.
5. Keep the client ID and secret for step 3.

---

## 3. Vercel

Import the repo, then set these under **Settings → Environment Variables** for
**Production and Preview both**. `src/env.ts` validates at build time with no
escape hatch, so a missing one fails the build rather than misbehaving later.

| Var | Value |
|---|---|
| `DATABASE_URL` | Neon pooled + `connection_limit=1` |
| `DIRECT_URL` | Neon direct |
| `BETTER_AUTH_URL` | `https://<your-domain>` |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` — a **fresh** one, not the local value |
| `ALLOWED_EMAILS` | `you@gmail.com,bro@gmail.com` — lowercase, and they must match the Google accounts you sign in with |
| `NEXT_PUBLIC_APP_URL` | `https://<your-domain>` — **inlined at build time**, so changing it needs a redeploy |
| `GOOGLE_CLIENT_ID` | from step 2 |
| `GOOGLE_CLIENT_SECRET` | from step 2 |
| `CRON_SECRET` | `openssl rand -hex 32` |

**The chicken-and-egg.** You can't know the domain until the project exists, but
two of the vars need it. So: import the repo and let the first build fail or
deploy wrong, take the domain Vercel assigns, fill in the vars above, then
redeploy. The first build is expected to be throwaway.

`vercel.json` already schedules the nightly stats rebuild at 03:00. **No further
setup:** Vercel attaches `Authorization: Bearer $CRON_SECRET` to cron requests
automatically, which is exactly what `/api/cron/daily-stats` checks. Hobby allows
one cron a day and fires it within about an hour of the stated time — fine for a
nightly rollup.

---

## 4. Seed the exercises

876 exercises and ~5,100 attribute rows. Run it against the **direct** URL, from
your laptop — it takes a few minutes and inserts one row at a time:

```sh
DATABASE_URL="<direct-url>" npx tsx scripts/import-exercises-with-attributes.ts ./data/exercises.csv
```

Safe to re-run: it upserts by slug. Do **not** use `pnpm db:seed`, which points
at the 19-row French sample file.

Accounts need no seeding — they create themselves on first Google sign-in.

---

## 5. Check it works

From an actual phone, on mobile data rather than wifi.

- [ ] Open the URL, tap **Sign in with Google**, land back signed in.
      If it bounces to `workout.cool`, `NEXT_PUBLIC_APP_URL` isn't set.
- [ ] Add to home screen; it opens without browser chrome.
- [ ] Start an empty workout, search a lift, add it, log three sets, finish.
- [ ] It appears on `/board` under **Workouts done**.
- [ ] Second person does the same; both appear head-to-head.
- [ ] **Airplane mode:** log a workout offline and finish. You should get
      "Saved on this phone. It'll upload when you're back online." Re-enable the
      network, wait, and confirm it uploads. *(Verified locally — this is the
      check that matters most, because a silent failure would have you believe a
      workout saved when it hadn't.)*
- [ ] A **third, non-allowlisted** Google account is refused with "That Google
      account isn't on the allowlist", and creates no user row. This one can only
      be tested live, since it needs real Google credentials.
- [ ] Cron: `curl -H "Authorization: Bearer $CRON_SECRET" "https://<domain>/api/cron/daily-stats?days=all"`
      returns `{"ok":true,...}`; the same URL with a wrong token returns 401. If
      `days=all` exceeds the 10s Hobby function limit, run the backfill from your
      laptop instead.

---

## Known, deliberate gaps

Not oversights — see `NOTES.md`.

- **It still says "Workout Cool"** in the header and on the home-screen icon, and
  the footer links to the upstream author's Ko-fi, Discord and Twitter. You chose
  to defer branding; this is what that looks like in practice.
- **No offline support.** `public/sw.js` claims a cache fallback and doesn't have
  one, so with no signal the app won't load at all. The logger itself works
  offline once loaded — sets are written to localStorage and upload later.
- **The workout timer resets to 00:00** after a reload or if iOS discards the
  backgrounded tab. The sets are safe; only the clock is lost.
