import { admin, customSession } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth";

import { getServerUrl } from "@/shared/lib/server-url";
import { prisma } from "@/shared/lib/prisma";
import { env } from "@/env";

/**
 * This app is for exactly two people. Rather than gate signup behind an invite
 * flow, we hard-limit which email addresses may ever own an account.
 *
 * Set ALLOWED_EMAILS to a comma-separated list of the two addresses. The check
 * runs on user creation, so sign-in needs no separate guard: an address that
 * was never allowed to create an account has nothing to sign in to.
 *
 * It is provider-agnostic — the hook sits in the adapter path, so a Google
 * sign-in by a stranger is refused at exactly the same point a password signup
 * would have been. It deliberately does not fire when an existing user links a
 * second provider: they already passed the allowlist when the account was made.
 */
export const ALLOWED_EMAILS = env.ALLOWED_EMAILS.split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ALLOWED_EMAILS.includes(email.trim().toLowerCase());
}

export const auth = betterAuth({
  // Upstream shipped ["*"], which turns off better-auth's origin check
  // altogether. Harmless on localhost, not on a public URL.
  trustedOrigins: [getServerUrl(), "http://localhost:3000"],
  plugins: [
    admin(),
    customSession(async ({ user, session }) => {
      const userFromDB = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          name: true,
          firstName: true,
          lastName: true,
          image: true,
          locale: true,
          role: true,
          banned: true,
          banReason: true,
          banExpires: true,
          isPremium: true,
          accounts: { select: { providerId: true } },
        },
      });

      return { user: userFromDB, session };
    }),
    nextCookies(),
  ],
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!isAllowedEmail(user.email)) {
            throw new APIError("FORBIDDEN", {
              message: "This app is private. That email address is not on the allowlist.",
            });
          }
          return { data: user };
        },
      },
    },
  },
  user: {
    additionalFields: {
      email: { type: "string" },
      name: { type: "string" },
      role: { type: "string" },
      firstName: { type: "string" },
      lastName: { type: "string" },
    },
  },
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  session: {
    /**
     * Staying signed in on a phone is `expiresIn`, not the cookie cache — the
     * cache is a signed snapshot that skips the database, so a long one keeps
     * honouring a session that has already expired or been revoked. Upstream
     * had a 30-day cache over a 7-day session, which is backwards.
     */
    expiresIn: 60 * 60 * 24 * 90,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendOnSignUp: false,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      // Always ask which account — we occasionally share a laptop.
      prompt: "select_account",
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  /**
   * Passwords are off.
   *
   * Upstream replaced better-auth's scrypt with a single SHA salted by
   * BETTER_AUTH_SECRET — one global salt, no per-user salt, no KDF, so one
   * database leak cracks both accounts at once, and rainbow-tables across them
   * because the salt never varies. Google sign-in suits a phone better anyway,
   * so the fix is to delete the password path rather than re-hash it.
   */
  emailAndPassword: {
    enabled: false,
  },
});
