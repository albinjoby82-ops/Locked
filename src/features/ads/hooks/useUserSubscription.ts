"use client";

/**
 * Two-user private app: no paid tier, no ads. Always "subscribed".
 */
export function useUserSubscription() {
  return { isPremium: true, isPending: false, error: null, data: null };
}
