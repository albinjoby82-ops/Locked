import { parseSet, RawSet } from "@/features/board/lib/set-values";
import { toDayKey } from "@/features/board/lib/dates";

/**
 * Folds workout sessions into per-user, per-day totals.
 *
 * Shared by the nightly DailyStat rebuild and by the board's live read of
 * *today* — DailyStat is only as fresh as the last cron run, so a session
 * logged this morning would otherwise not show up until tomorrow. Both paths
 * going through this function is what keeps the two consistent.
 */

export interface DayTotals {
  tonnageKg: number;
  sets: number;
  reps: number;
  sessions: number;
  durationSec: number;
}

export interface AggregatableSession {
  userId: string;
  startedAt: Date;
  duration: number | null;
  exercises: { sets: RawSet[] }[];
}

export function emptyDayTotals(): DayTotals {
  return { tonnageKg: 0, sets: 0, reps: 0, sessions: 0, durationSec: 0 };
}

/** userId -> `YYYY-MM-DD` -> totals. */
export function aggregateSessions(sessions: AggregatableSession[]): Map<string, Map<string, DayTotals>> {
  const totals = new Map<string, Map<string, DayTotals>>();

  for (const session of sessions) {
    const dayKey = toDayKey(session.startedAt);
    const byDay = totals.get(session.userId) ?? new Map<string, DayTotals>();
    totals.set(session.userId, byDay);

    const day = byDay.get(dayKey) ?? emptyDayTotals();
    byDay.set(dayKey, day);

    day.sessions += 1;
    day.durationSec += session.duration ?? 0;

    for (const exercise of session.exercises) {
      for (const set of exercise.sets) {
        const parsed = parseSet(set);
        day.sets += 1;
        day.reps += parsed.reps;
        day.tonnageKg += parsed.tonnageKg;
      }
    }
  }

  return totals;
}

/** The `select` both callers pass to Prisma, so the shapes can't drift apart. */
export const SESSION_AGGREGATE_SELECT = {
  userId: true,
  startedAt: true,
  duration: true,
  exercises: {
    select: {
      sets: {
        where: { completed: true },
        select: { types: true, valuesInt: true, valuesSec: true, units: true },
      },
    },
  },
} as const;
