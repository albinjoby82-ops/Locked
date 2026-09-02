"use client";

/**
 * No paid tier in this build — everyone is premium.
 * Stubs kept so the inherited call sites compile.
 */
export function usePremiumStatus() {
  return { data: { isPremium: true }, isLoading: false, isPending: false, error: null };
}

export function useSubscription() {
  return { data: { isActive: true }, isLoading: false, isPending: false, error: null };
}

export function useIsPremium(): boolean {
  return true;
}
