/**
 * Date helpers for the board.
 *
 * Everything is keyed on UTC midnight. Two people in two timezones would
 * otherwise disagree about which day a late-evening session belongs to, and the
 * `DATE` columns on DailyStat/StepEntry have no timezone to fall back on.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight UTC of the day `date` falls in. */
export function toUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** `YYYY-MM-DD`, the key used for joining days across users. */
export function toDayKey(date: Date): string {
  return toUtcDay(date).toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Midnight UTC of the Monday on or before `date`. Weeks run Monday to Sunday. */
export function startOfWeek(date: Date): Date {
  const day = toUtcDay(date);
  // getUTCDay() is 0 for Sunday, which is the *last* day of the week here.
  const offset = (day.getUTCDay() + 6) % 7;
  return addDays(day, -offset);
}

export function startOfCurrentWeek(now: Date = new Date()): Date {
  return startOfWeek(now);
}

/** Every day from `from` to `to` inclusive, as `YYYY-MM-DD` keys. */
export function dayKeysBetween(from: Date, to: Date): string[] {
  const keys: string[] = [];
  for (let day = toUtcDay(from); day.getTime() <= toUtcDay(to).getTime(); day = addDays(day, 1)) {
    keys.push(toDayKey(day));
  }
  return keys;
}

/** The Monday of each week from `from` to `to` inclusive, oldest first. */
export function weekStartsBetween(from: Date, to: Date): Date[] {
  const weeks: Date[] = [];
  for (let week = startOfWeek(from); week.getTime() <= startOfWeek(to).getTime(); week = addDays(week, 7)) {
    weeks.push(week);
  }
  return weeks;
}

/** "6 Sep" — short enough for a chart axis. */
export function formatShortDay(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}
