import { NextRequest, NextResponse } from "next/server";

import { recomputeDailyStats } from "@/features/board/lib/recompute-daily-stats";
import { env } from "@/env";
import { serverAuth } from "@/entities/user/model/get-server-session-user";

/**
 * Nightly rebuild of the DailyStat table.
 *
 * Authentication is either the `CRON_SECRET` bearer token (how the scheduler
 * calls it) or a signed-in session (how you run it by hand). With no
 * CRON_SECRET set only the session path works, so an unconfigured deployment
 * can't be poked by a stranger.
 *
 * `?days=` sets the rebuild window; `?days=all` rebuilds the whole history.
 */

export const dynamic = "force-dynamic";

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const secret = env.CRON_SECRET;

  if (secret) {
    const header = request.headers.get("authorization");
    if (header === `Bearer ${secret}`) return true;
  }

  const user = await serverAuth();
  return Boolean(user);
}

export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const daysParam = request.nextUrl.searchParams.get("days");
  let sinceDays: number | null = 30;

  if (daysParam === "all") {
    sinceDays = null;
  } else if (daysParam !== null) {
    const parsed = Number(daysParam);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 3650) {
      return NextResponse.json({ error: "INVALID_PARAMETERS", message: "days must be 1-3650 or 'all'" }, { status: 400 });
    }
    sinceDays = parsed;
  }

  try {
    const result = await recomputeDailyStats({ sinceDays });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Failed to recompute daily stats:", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
