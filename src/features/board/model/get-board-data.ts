import { prisma } from "@/shared/lib/prisma";
import { BoardData, CalendarDay, DayPoint, Person, WeekPoint } from "@/features/board/types";
import { getOneRepMaxSeries } from "@/features/board/model/get-one-rep-max";
import { compareWeek, emptyWeekTotals, streakAt, WeekTotals } from "@/features/board/lib/scoring";
import { PERSON_COLORS_DARK, PERSON_COLORS_LIGHT } from "@/features/board/lib/palette";
import {
  addDays,
  dayKeysBetween,
  formatShortDay,
  startOfCurrentWeek,
  startOfWeek,
  toDayKey,
  toUtcDay,
  weekStartsBetween,
} from "@/features/board/lib/dates";
import { aggregateSessions, DayTotals, emptyDayTotals, SESSION_AGGREGATE_SELECT } from "@/features/board/lib/aggregate-sessions";

/**
 * Everything the board page renders, in one read.
 *
 * This is a two-person app, so the whole history is a few hundred rows — there
 * is no windowing here on purpose. The weeks-won count has to look at every
 * week anyway, and paging it would buy nothing.
 *
 * Days come from DailyStat, which the nightly job fills. Today is the exception:
 * it is aggregated live from sessions, because a workout logged this morning
 * should show up on the board this morning, not tomorrow.
 */

/** How much of the history each chart shows. */
const WEEKS_ON_CHARTS = 12;
const DAYS_ON_STEP_CHART = 30;
const DAYS_ON_CALENDAR = 182;

function personName(user: { name: string; firstName: string; email: string }): string {
  return user.firstName.trim() || user.name.trim() || user.email.split("@")[0];
}

export async function getBoardData(viewerId?: string): Promise<BoardData> {
  const today = toUtcDay(new Date());
  const currentWeekStart = startOfCurrentWeek();

  const users = await prisma.user.findMany({
    select: { id: true, name: true, firstName: true, email: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const people: Person[] = users.map((user, index) => ({
    id: user.id,
    name: personName(user),
    color: PERSON_COLORS_LIGHT[index % PERSON_COLORS_LIGHT.length],
    colorDark: PERSON_COLORS_DARK[index % PERSON_COLORS_DARK.length],
  }));

  const [storedDays, stepEntries, todaySessions] = await Promise.all([
    prisma.dailyStat.findMany({
      where: { day: { lt: today } },
      select: { userId: true, day: true, tonnageKg: true, sets: true, reps: true, sessions: true, durationSec: true },
    }),
    prisma.stepEntry.findMany({ select: { userId: true, day: true, steps: true } }),
    prisma.workoutSession.findMany({ where: { startedAt: { gte: today } }, select: SESSION_AGGREGATE_SELECT }),
  ]);

  // userId -> day key -> totals
  const days = new Map<string, Map<string, DayTotals>>();
  const dayFor = (userId: string, dayKey: string): DayTotals => {
    const byDay = days.get(userId) ?? new Map<string, DayTotals>();
    days.set(userId, byDay);
    const day = byDay.get(dayKey) ?? emptyDayTotals();
    byDay.set(dayKey, day);
    return day;
  };

  for (const row of storedDays) {
    const day = dayFor(row.userId, toDayKey(row.day));
    day.tonnageKg += row.tonnageKg;
    day.sets += row.sets;
    day.reps += row.reps;
    day.sessions += row.sessions;
    day.durationSec += row.durationSec;
  }

  for (const [userId, byDay] of aggregateSessions(todaySessions)) {
    for (const [dayKey, totals] of byDay) {
      const day = dayFor(userId, dayKey);
      day.tonnageKg += totals.tonnageKg;
      day.sets += totals.sets;
      day.reps += totals.reps;
      day.sessions += totals.sessions;
      day.durationSec += totals.durationSec;
    }
  }

  // userId -> day key -> steps
  const steps = new Map<string, Map<string, number>>();
  for (const entry of stepEntries) {
    const byDay = steps.get(entry.userId) ?? new Map<string, number>();
    steps.set(entry.userId, byDay);
    byDay.set(toDayKey(entry.day), entry.steps);
  }

  // The history runs from the first thing anyone logged to today. With nothing
  // logged at all it is just this week, and the page says the board is empty.
  const allDayKeys = [
    ...Array.from(days.values()).flatMap((byDay) => Array.from(byDay.keys())),
    ...Array.from(steps.values()).flatMap((byDay) => Array.from(byDay.keys())),
  ].sort();
  const isEmpty = allDayKeys.length === 0;
  const firstDay = isEmpty ? currentWeekStart : new Date(`${allDayKeys[0]}T00:00:00.000Z`);

  const weekStarts = weekStartsBetween(firstDay, today);
  const weekKeys = weekStarts.map(toDayKey);

  // Per person, per week: the four raw numbers, oldest week first.
  const weeklyTotals = new Map<string, WeekTotals[]>();

  for (const person of people) {
    const personDays = days.get(person.id) ?? new Map<string, DayTotals>();
    const personSteps = steps.get(person.id) ?? new Map<string, number>();

    const totals: WeekTotals[] = [];
    const sessionCounts: number[] = [];

    for (const weekStart of weekStarts) {
      const weekDayKeys = dayKeysBetween(weekStart, addDays(weekStart, 6));

      let sessions = 0;
      let tonnageKg = 0;
      let stepTotal = 0;
      let stepDays = 0;

      for (const dayKey of weekDayKeys) {
        const day = personDays.get(dayKey);
        if (day) {
          sessions += day.sessions;
          tonnageKg += day.tonnageKg;
        }

        const dailySteps = personSteps.get(dayKey);
        // Average over days that were actually recorded — averaging over 7 would
        // punish whoever simply hasn't typed the number in yet.
        if (dailySteps !== undefined) {
          stepTotal += dailySteps;
          stepDays += 1;
        }
      }

      sessionCounts.push(sessions);
      totals.push({
        sessions,
        tonnageKg,
        stepAverage: stepDays === 0 ? 0 : stepTotal / stepDays,
        streakWeeks: 0, // filled in below, once every week's session count is known
      });
    }

    for (let index = 0; index < totals.length; index++) {
      totals[index].streakWeeks = streakAt(sessionCounts, index, index === totals.length - 1);
    }

    weeklyTotals.set(person.id, totals);
  }

  const totalsForWeek = (weekIndex: number): Record<string, WeekTotals> => {
    const byPerson: Record<string, WeekTotals> = {};
    for (const person of people) byPerson[person.id] = weeklyTotals.get(person.id)?.[weekIndex] ?? emptyWeekTotals();
    return byPerson;
  };

  const currentWeekIndex = weekKeys.indexOf(toDayKey(currentWeekStart));
  const thisWeek = compareWeek(toDayKey(currentWeekStart), totalsForWeek(currentWeekIndex), people);

  // Weeks won only counts finished weeks — the current one is still in play.
  const weeksWon: Record<string, number> = {};
  for (const person of people) weeksWon[person.id] = 0;

  const pastWeeks = [];
  for (let index = 0; index < weekKeys.length; index++) {
    if (index === currentWeekIndex) continue;

    const comparison = compareWeek(weekKeys[index], totalsForWeek(index), people);
    // A week nobody logged anything in isn't a week anyone won.
    if (Object.values(comparison.linesWon).every((won) => won === 0)) continue;

    if (comparison.winnerId) weeksWon[comparison.winnerId] += 1;
    pastWeeks.push(comparison);
  }
  pastWeeks.reverse();

  const chartWeeks = weekStarts.slice(-WEEKS_ON_CHARTS);
  const weekPoint = (read: (totals: WeekTotals) => number): WeekPoint[] =>
    chartWeeks.map((weekStart) => {
      const index = weekKeys.indexOf(toDayKey(weekStart));
      const values: Record<string, number> = {};
      for (const person of people) values[person.id] = Math.round(read(weeklyTotals.get(person.id)?.[index] ?? emptyWeekTotals()));
      return { week: toDayKey(weekStart), label: formatShortDay(weekStart), values };
    });

  const stepDayKeys = dayKeysBetween(addDays(today, -(DAYS_ON_STEP_CHART - 1)), today);
  const dailySteps: DayPoint[] = stepDayKeys.map((dayKey) => {
    const values: Record<string, number> = {};
    for (const person of people) values[person.id] = steps.get(person.id)?.get(dayKey) ?? 0;
    return { day: dayKey, label: formatShortDay(new Date(`${dayKey}T00:00:00.000Z`)), values };
  });

  // The calendar starts on a Monday so the grid's rows line up as weeks.
  const calendarStart = startOfWeek(addDays(today, -(DAYS_ON_CALENDAR - 1)));
  const calendar: CalendarDay[] = dayKeysBetween(calendarStart, today).map((dayKey) => {
    const tonnageKg: Record<string, number> = {};
    const sessions: Record<string, number> = {};
    for (const person of people) {
      const day = days.get(person.id)?.get(dayKey);
      tonnageKg[person.id] = Math.round(day?.tonnageKg ?? 0);
      sessions[person.id] = day?.sessions ?? 0;
    }
    return { day: dayKey, label: formatShortDay(new Date(`${dayKey}T00:00:00.000Z`)), tonnageKg, sessions };
  });

  const oneRepMax = await getOneRepMaxSeries(people, chartWeeks);

  return {
    people,
    thisWeek,
    weeksWon,
    pastWeeks,
    weeklyTonnage: weekPoint((totals) => totals.tonnageKg),
    weeklySessions: weekPoint((totals) => totals.sessions),
    dailySteps,
    calendar,
    oneRepMax,
    todaySteps: viewerId ? (steps.get(viewerId)?.get(toDayKey(today)) ?? null) : null,
    isEmpty,
  };
}
