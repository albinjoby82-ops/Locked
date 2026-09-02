import { z } from "zod";
import { createEnv } from "@t3-oss/env-nextjs";

/**
 * Environment for the two-user private build.
 *
 * The upstream base declared ~120 variables, almost all of them ad slots,
 * Stripe price IDs and RevenueCat keys. Those features are gone, so their
 * variables are gone with them — the app should never ask for a secret we
 * have no intention of setting.
 */
export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production", "test"]),
    DATABASE_URL: z.string().url(),
    /**
     * Unpooled connection, for `prisma migrate deploy` and the exercise import.
     * PgBouncer in transaction mode can't hold Prisma's advisory locks or its
     * long transactions, so those two jobs need to bypass the pooler.
     */
    DIRECT_URL: z.string().url(),
    BETTER_AUTH_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(1),
    /** Comma-separated list of the only email addresses allowed to hold an account. */
    ALLOWED_EMAILS: z.string().min(1),
    /**
     * Shared secret for /api/cron/daily-stats. Optional: when it is unset the
     * route only accepts a signed-in user, which is enough to run the rebuild
     * by hand in development.
     */
    CRON_SECRET: z.string().min(1).optional(),
    /** Google OAuth — the only way into the app. */
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
});
