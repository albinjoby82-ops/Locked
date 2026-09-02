import { admin, customSession } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";

import { prisma } from "@/shared/lib/prisma";
import { sendEmail } from "@/shared/lib/mail/sendEmail";
import { hashStringWithSalt } from "@/features/update-password/lib/hash";
import { env } from "@/env";

/**
 * This app is for exactly two people. Rather than gate signup behind an invite
 * flow, we hard-limit which email addresses may ever own an account.
 *
 * Set ALLOWED_EMAILS to a comma-separated list of the two addresses. The check
 * runs on user creation, so sign-in needs no separate guard: an address that
 * was never allowed to create an account has nothing to sign in to.
 */
export const ALLOWED_EMAILS = env.ALLOWED_EMAILS.split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ALLOWED_EMAILS.includes(email.trim().toLowerCase());
}

export const auth = betterAuth({
  trustedOrigins: ["*"],
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
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    },
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendOnSignUp: false,
  },
  emailAndPassword: {
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      // Email is disabled; sendEmail logs the link to the server console.
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        text: `Click the link to reset your password: ${url}`,
      });
    },
    password: {
      hash: async (password: string) => hashStringWithSalt(password, env.BETTER_AUTH_SECRET),
      verify: async ({ password, hash }) => hashStringWithSalt(password, env.BETTER_AUTH_SECRET) === hash,
    },
    enabled: true,
  },
});
