/** Ads removed — this gate now just renders its children. */
import type { ReactNode } from "react";

export function RewardedAdGate({ children }: { children?: ReactNode; onRewardGranted?: () => void }) {
  return <>{children}</>;
}
