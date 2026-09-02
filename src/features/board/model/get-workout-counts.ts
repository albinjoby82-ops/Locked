import { prisma } from "@/shared/lib/prisma";
import { Person } from "@/features/board/types";
import { addDays, toUtcDay } from "@/features/board/lib/dates";

/**
 * How many workouts each of us has actually done.
 *
 * Read straight from WorkoutSession rather than from DailyStat: this is a count
 * of sessions, it doesn't need the flattened tonnage, and reading the source
 * means a workout finished thirty seconds ago is already in the number.
 */

export interface WorkoutCounts {
  /** Sessions ever, per person id. */
  allTime: Record<string, number>;
  /** Sessions in the last 30 days, per person id. */
  last30Days: Record<string, number>;
  /** The date of each person's most recent session, `YYYY-MM-DD`, or null. */
  lastWorkout: Record<string, string | null>;
}

export interface RecentWorkout {
  id: string;
  userId: string;
  startedAt: string;
  durationSec: number | null;
  exerciseCount: number;
  /** Up to three exercise names, for the one-line summary. */
  exerciseNames: string[];
}

/** How many recent sessions the shared feed shows. */
const RECENT_WORKOUT_LIMIT = 12;

export async function getWorkoutCounts(people: Person[]): Promise<WorkoutCounts> {
  const since = addDays(toUtcDay(new Date()), -29);

  const [totals, recent, latest] = await Promise.all([
    prisma.workoutSession.groupBy({ by: ["userId"], _count: { _all: true } }),
    prisma.workoutSession.groupBy({ by: ["userId"], where: { startedAt: { gte: since } }, _count: { _all: true } }),
    prisma.workoutSession.groupBy({ by: ["userId"], _max: { startedAt: true } }),
  ]);

  const counts: WorkoutCounts = { allTime: {}, last30Days: {}, lastWorkout: {} };

  for (const person of people) {
    counts.allTime[person.id] = 0;
    counts.last30Days[person.id] = 0;
    counts.lastWorkout[person.id] = null;
  }

  for (const row of totals) counts.allTime[row.userId] = row._count._all;
  for (const row of recent) counts.last30Days[row.userId] = row._count._all;
  for (const row of latest) {
    counts.lastWorkout[row.userId] = row._max.startedAt ? row._max.startedAt.toISOString().slice(0, 10) : null;
  }

  return counts;
}

/** The most recent sessions across both of us, newest first. */
export async function getRecentWorkouts(): Promise<RecentWorkout[]> {
  const sessions = await prisma.workoutSession.findMany({
    orderBy: { startedAt: "desc" },
    take: RECENT_WORKOUT_LIMIT,
    select: {
      id: true,
      userId: true,
      startedAt: true,
      duration: true,
      exercises: {
        orderBy: { order: "asc" },
        select: { exercise: { select: { name: true, nameEn: true } } },
      },
    },
  });

  return sessions.map((session) => ({
    id: session.id,
    userId: session.userId,
    startedAt: session.startedAt.toISOString(),
    durationSec: session.duration,
    exerciseCount: session.exercises.length,
    exerciseNames: session.exercises.slice(0, 3).map((item) => item.exercise.nameEn || item.exercise.name),
  }));
}
