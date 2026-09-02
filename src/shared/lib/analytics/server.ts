/**
 * Analytics removed — private two-user app, nothing to measure.
 * No-op stub kept so existing call sites compile.
 */
export const setupAnalytics = async (_options?: unknown) => ({
  track: async (_event?: unknown, _payload?: unknown) => {},
});
