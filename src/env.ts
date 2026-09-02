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
    BETTER_AUTH_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(1),
    /** Comma-separated list of the only email addresses allowed to hold an account. */
    ALLOWED_EMAILS: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
});
