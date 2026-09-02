/** The four lines PLAN.md compares each week. */
export const METRIC_KEYS = ["sessions", "tonnage", "steps", "streak"] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];

export interface Person {
  id: string;
  name: string;
  /**
   * Stable per-person colour, so a person is the same colour on every chart.
   * Dark mode gets its own step rather than an automatic flip — see
   * src/features/board/lib/palette.ts.
   */
  color: string;
  colorDark: string;
}

/** One of the four comparison lines, already resolved to a winner. */
export interface MetricLine {
  key: MetricKey;
  label: string;
  /** Rendered value per person id, e.g. "12,480 kg". */
  display: Record<string, string>;
  /** Raw value per person id, for the bar behind the number. */
  value: Record<string, number>;
  /** Null on a tie, or when neither person has anything logged. */
  winnerId: string | null;
}

export interface WeekComparison {
  /** Monday of the week, `YYYY-MM-DD`. */
  weekStart: string;
  lines: MetricLine[];
  /** Whoever wins more of the four lines. Null on a tie. */
  winnerId: string | null;
  linesWon: Record<string, number>;
}

export interface WeekPoint {
  /** Monday, `YYYY-MM-DD`. */
  week: string;
  /** "6 Sep" — the axis label. */
  label: string;
  /** Per person id. */
  values: Record<string, number>;
}

export interface DayPoint {
  /** `YYYY-MM-DD`. */
  day: string;
  label: string;
  values: Record<string, number>;
}

export interface CalendarDay {
  day: string;
  label: string;
  /** Tonnage per person id — 0 means a rest day, which is the point of the grid. */
  tonnageKg: Record<string, number>;
  sessions: Record<string, number>;
}

export interface OneRepMaxSeries {
  exerciseId: string;
  name: string;
  /** Best Epley estimate that week, per person id. Missing weeks are gaps. */
  points: WeekPoint[];
}

export interface BoardData {
  people: Person[];
  thisWeek: WeekComparison;
  /** Weeks won across every completed week, per person id. */
  weeksWon: Record<string, number>;
  /** Completed weeks that were actually contested, most recent first. */
  pastWeeks: WeekComparison[];
  weeklyTonnage: WeekPoint[];
  weeklySessions: WeekPoint[];
  dailySteps: DayPoint[];
  calendar: CalendarDay[];
  oneRepMax: OneRepMaxSeries[];
  /** Steps the signed-in person has logged for today, if any. */
  todaySteps: number | null;
  /** True when nobody has logged anything at all — the page says so instead of drawing empty charts. */
  isEmpty: boolean;
}
