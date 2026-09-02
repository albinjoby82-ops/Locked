/**
 * Ads were removed with the rest of the monetisation code — this is a private
 * two-user app. These no-op stubs keep the upstream call sites compiling.
 * Delete the call sites (and this file) whenever it's convenient.
 */
import type { ReactNode } from "react";

const NoAd = (_props: { children?: ReactNode; [key: string]: unknown }) => null;

export const GoogleAdSense = NoAd;
export const AdWrapper = NoAd;
export const VerticalAdBanner = NoAd;
export const VerticalLeftBanner = NoAd;
export const VerticalRightBanner = NoAd;
export const HorizontalTopBanner = NoAd;
export const HorizontalBottomBanner = NoAd;
export const AdBlockerForPremium = NoAd;
export const InArticle = NoAd;
export const AdPlaceholder = NoAd;
export const EzoicAd = NoAd;
export const ResponsiveAdBanner = NoAd;
export const HorizontalAdBanner = NoAd;
export const AdSenseAutoAds = NoAd;
export const RewardedAdGate = ({ children }: { children?: ReactNode }) => <>{children}</>;
