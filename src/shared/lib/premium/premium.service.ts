/**
 * No paid tier in this build — everyone is premium.
 * Stub kept so the inherited call sites compile.
 */
export const PremiumService = {
  checkUserPremiumStatus: async (_userId: string) => ({ isPremium: true }),
  isPremium: async (_userId: string) => true,
};
