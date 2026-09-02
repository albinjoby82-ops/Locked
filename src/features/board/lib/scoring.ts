import { MetricKey, MetricLine, Person, WeekComparison } from "@/features/board/types";

/**
 * Who wins a week.
 *
 * PLAN.md: four lines — sessions, total weight lifted, daily step average,
 * current streak — and "whoever wins more of those four wins the week. No
 * weights, no formula." So each line is a straight comparison, ties go to
 * nobody, and the week goes to whoever took more lines.
 */

/** How many sessions in a week it takes for that week to extend a streak. */
export const STREAK_SESSIONS_PER_WEEK = 3;

export const METRIC_LABELS: Record<MetricKey, string> = {
  sessions: "Sessions",
  tonnage: "Weight lifted",
  steps: "Daily steps",
  streak: "Streak",
};

export interface WeekTotals {
  sessions: number;
  tonnageKg: number;
  stepAverage: number;
  streakWeeks: number;
}

function winnerOf(values: Record<string, number>, people: Person[]): string | null {
  let best: string | null = null;
  let bestValue = 0;
  let tied = false;

  for (const person of people) {
    const value = values[person.id] ?? 0;
    if (value <= 0) continue;

    if (best === null || value > bestValue) {
      best = person.id;
      bestValue = value;
      tied = false;
    } else if (value === bestValue) {
      tied = true;
    }
  }

  // Nobody logged anything, or it's level — either way there's no winner.
  return tied ? null : best;
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("en-GB");
}

function buildLine(key: MetricKey, values: Record<string, number>, people: Person[], format: (value: number) => string): MetricLine {
  const display: Record<string, string> = {};
  for (const person of people) display[person.id] = format(values[person.id] ?? 0);

  return { key, label: METRIC_LABELS[key], display, value: values, winnerId: winnerOf(values, people) };
}

export function compareWeek(weekStart: string, totals: Record<string, WeekTotals>, people: Person[]): WeekComparison {
  const pick = (read: (totals: WeekTotals) => number): Record<string, number> => {
    const values: Record<string, number> = {};
    for (const person of people) values[person.id] = read(totals[person.id] ?? emptyWeekTotals());
    return values;
  };

  const lines: MetricLine[] = [
    buildLine("sessions", pick((t) => t.sessions), people, formatNumber),
    buildLine(
      "tonnage",
      pick((t) => t.tonnageKg),
      people,
      (value) => `${formatNumber(value)} kg`,
    ),
    buildLine("steps", pick((t) => t.stepAverage), people, (value) => `${formatNumber(value)}/day`),
    buildLine(
      "streak",
      pick((t) => t.streakWeeks),
      people,
      (value) => (value === 1 ? "1 week" : `${formatNumber(value)} weeks`),
    ),
  ];

  const linesWon: Record<string, number> = {};
  for (const person of people) linesWon[person.id] = 0;
  for (const line of lines) {
    if (line.winnerId) linesWon[line.winnerId] += 1;
  }

  return { weekStart, lines, linesWon, winnerId: winnerOf(linesWon, people) };
}

export function emptyWeekTotals(): WeekTotals {
  return { sessions: 0, tonnageKg: 0, stepAverage: 0, streakWeeks: 0 };
}

/**
 * Consecutive weeks, counting back from `weekIndex`, with at least
 * STREAK_SESSIONS_PER_WEEK sessions.
 *
 * `sessionsByWeek` is oldest-first and must cover every week in the range, gaps
 * included as 0.
 *
 * Pass `inProgress` for the current week only: a week that isn't over yet and
 * has two sessions in it hasn't broken the streak, it just hasn't extended it,
 * so the count picks up from the week before. A *finished* week below the
 * threshold does break it.
 */
export function streakAt(sessionsByWeek: number[], weekIndex: number, inProgress = false): number {
  let index = weekIndex;

  if ((sessionsByWeek[index] ?? 0) < STREAK_SESSIONS_PER_WEEK) {
    if (!inProgress) return 0;
    index -= 1;
  }

  let streak = 0;
  while (index >= 0 && (sessionsByWeek[index] ?? 0) >= STREAK_SESSIONS_PER_WEEK) {
    streak += 1;
    index -= 1;
  }

  return streak;
}
