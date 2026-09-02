/**
 * The origin this app is being served from.
 *
 * Feeds the better-auth client's `baseURL`, the OAuth `callbackURL`, and
 * `metadataBase` — so a wrong value here doesn't degrade anything, it breaks
 * sign-in outright.
 *
 * Order matters:
 *  - In the browser, the origin is simply the truth.
 *  - Preview deploys get their own ephemeral hostname, so `VERCEL_URL` has to
 *    win there over the build-time constant, which always holds production's.
 *  - `NEXT_PUBLIC_APP_URL` is inlined at build time and is the production value.
 *
 * This deliberately does not read `SiteConfig.prodUrl`: that constant is
 * upstream's domain, and returning it on production pointed the OAuth callback
 * at someone else's site.
 */
export const getServerUrl = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  return "http://localhost:3000";
};
