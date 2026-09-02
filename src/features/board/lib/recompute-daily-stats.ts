import { prisma } from "@/shared/lib/prisma";
import { addDays, toDayKey, toUtcDay } from "@/features/board/lib/dates";
import { aggregateSessions, DayTotals, SESSION_AGGREGATE_SELECT } from "@/features/board/lib/aggregate-sessions";

/**
 * Rebuilds DailyStat from WorkoutSession/WorkoutSet.
 *
 * DailyStat is derived data and this is its only writer, so the safe thing on
 * every run is to delete the window being rebuilt and write it again — no
 * incremental bookkeeping to get wrong, and an edited or deleted session can
 * never leave a stale row behind.
 *
 * Run nightly via /api/cron/daily-stats. Rebuilding everything from scratch is
 * `recomputeDailyStats({ sinceDays: null })`, which for two people is cheap.
 */

interface RecomputeOptions {
  /** Limit to one user. Omit to rebuild both of us. */
  userId?: string;
  /** How far back to rebuild. `null` means the whole history. Defaults to 30. */
  sinceDays?: number | null;
}

export interface RecomputeResult {
  users: number;
  days: number;
  from: string | null;
}

export async function recomputeDailyStats({ userId, sinceDays = 30 }: RecomputeOptions = {}): Promise<RecomputeResult> {
  const from = sinceDays === null ? null : toUtcDay(addDays(new Date(), -sinceDays));

  const sessions = await prisma.workoutSession.findMany({
    where: {
      ...(userId ? { userId } : {}),
      ...(from ? { startedAt: { gte: from } } : {}),
    },
    select: SESSION_AGGREGATE_SELECT,
  });

  const totals = aggregateSessions(sessions);

  // Users with sessions in the window, plus any user who already has rows in it
  // — otherwise deleting every session in a day would leave its row orphaned.
  const affectedUsers = new Set(totals.keys());
  const existing = await prisma.dailyStat.findMany({
    where: { ...(userId ? { userId } : {}), ...(from ? { day: { gte: from } } : {}) },
    select: { userId: true },
    distinct: ["userId"],
  });
  for (const row of existing) affectedUsers.add(row.userId);

  let writtenDays = 0;

  for (const affectedUserId of affectedUsers) {
    const byDay: Map<string, DayTotals> = totals.get(affectedUserId) ?? new Map();

    await prisma.$transaction([
      prisma.dailyStat.deleteMany({
        where: { userId: affectedUserId, ...(from ? { day: { gte: from } } : {}) },
      }),
      prisma.dailyStat.createMany({
        data: Array.from(byDay.entries()).map(([dayKey, day]) => ({
          userId: affectedUserId,
          day: new Date(`${dayKey}T00:00:00.000Z`),
          tonnageKg: Math.round(day.tonnageKg * 10) / 10,
          sets: day.sets,
          reps: day.reps,
          sessions: day.sessions,
          durationSec: day.durationSec,
        })),
      }),
    ]);

    writtenDays += byDay.size;
  }

  return { users: affectedUsers.size, days: writtenDays, from: from ? toDayKey(from) : null };
}
