import { prisma } from "@/shared/lib/prisma";
import { OneRepMaxSeries, Person, WeekPoint } from "@/features/board/types";
import { epleyOneRepMax, parseSet } from "@/features/board/lib/set-values";
import { formatShortDay, startOfWeek, toDayKey } from "@/features/board/lib/dates";

/**
 * Estimated 1RM per week on the main lifts, both people on the same axes.
 *
 * "Main lifts" is decided from the data rather than a hardcoded list of names:
 * the exercises with the most weighted sets logged across both of us are the
 * ones we actually train, and they're the ones worth arguing about.
 */

/** How many exercises get a chart. Four fits on a phone; more is noise. */
const MAIN_LIFT_COUNT = 4;

/** An exercise needs this many weighted sets before it counts as a main lift. */
const MIN_SETS_TO_QUALIFY = 4;

export async function getOneRepMaxSeries(people: Person[], weeks: Date[]): Promise<OneRepMaxSeries[]> {
  if (weeks.length === 0 || people.length === 0) return [];

  const from = weeks[0];

  const sessionExercises = await prisma.workoutSessionExercise.findMany({
    where: { workoutSession: { startedAt: { gte: from } } },
    select: {
      exercise: { select: { id: true, name: true, nameEn: true } },
      workoutSession: { select: { userId: true, startedAt: true } },
      sets: {
        where: { completed: true },
        select: { types: true, valuesInt: true, valuesSec: true, units: true },
      },
    },
  });

  // exerciseId -> { name, weighted set count, week key -> person id -> best e1RM }
  interface Candidate {
    name: string;
    setCount: number;
    best: Map<string, Map<string, number>>;
  }
  const candidates = new Map<string, Candidate>();

  for (const sessionExercise of sessionExercises) {
    const weekKey = toDayKey(startOfWeek(sessionExercise.workoutSession.startedAt));
    const userId = sessionExercise.workoutSession.userId;

    for (const set of sessionExercise.sets) {
      const oneRepMax = epleyOneRepMax(parseSet(set));
      if (oneRepMax <= 0) continue;

      const candidate = candidates.get(sessionExercise.exercise.id) ?? {
        name: sessionExercise.exercise.nameEn || sessionExercise.exercise.name,
        setCount: 0,
        best: new Map<string, Map<string, number>>(),
      };
      candidates.set(sessionExercise.exercise.id, candidate);

      candidate.setCount += 1;

      const byPerson = candidate.best.get(weekKey) ?? new Map<string, number>();
      candidate.best.set(weekKey, byPerson);
      byPerson.set(userId, Math.max(byPerson.get(userId) ?? 0, oneRepMax));
    }
  }

  const mainLifts = Array.from(candidates.entries())
    .filter(([, candidate]) => candidate.setCount >= MIN_SETS_TO_QUALIFY)
    .sort(([, a], [, b]) => b.setCount - a.setCount)
    .slice(0, MAIN_LIFT_COUNT);

  return mainLifts.map(([exerciseId, candidate]) => {
    const points: WeekPoint[] = weeks.map((weekStart) => {
      const weekKey = toDayKey(weekStart);
      const byPerson = candidate.best.get(weekKey);

      const values: Record<string, number> = {};
      for (const person of people) {
        const best = byPerson?.get(person.id) ?? 0;
        values[person.id] = Math.round(best * 10) / 10;
      }

      return { week: weekKey, label: formatShortDay(weekStart), values };
    });

    return { exerciseId, name: candidate.name, points };
  });
}
