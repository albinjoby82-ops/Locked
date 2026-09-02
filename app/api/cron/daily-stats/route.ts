import { NextRequest, NextResponse } from "next/server";

import { isOperator } from "@/shared/api/operator-auth";
import { recomputeDailyStats } from "@/features/board/lib/recompute-daily-stats";

/**
 * Nightly rebuild of the DailyStat table.
 *
 * Authentication is shared with the other maintenance routes — see
 * `isOperator`.
 *
 * `?days=` sets the rebuild window; `?days=all` rebuilds the whole history.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await isOperator(request))) {
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
