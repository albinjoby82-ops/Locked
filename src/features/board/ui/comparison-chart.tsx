"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useChartTheme } from "@/features/statistics/hooks/use-chart-theme";
import { ChartShell, usePersonColor } from "@/features/board/ui/chart-shell";
import { DayPoint, Person, WeekPoint } from "@/features/board/types";

/**
 * Both of us on the same axes, always — that's the whole point of the board, so
 * there's one chart component and every graph goes through it.
 *
 * One y-axis, never two: the two series are the same measure for two people, so
 * a second scale would make the comparison a lie.
 */

interface ComparisonChartProps {
  title: string;
  subtitle?: string;
  people: Person[];
  points: (WeekPoint | DayPoint)[];
  /** Bars for counted things (sessions, steps per day), lines for progressions. */
  kind: "bar" | "line";
  /** Appended to values in the tooltip, e.g. "kg". */
  unit?: string;
  /**
   * Treat 0 as "no data" and leave a gap instead of plotting a zero. A week
   * without a bench session isn't a week you benched nothing.
   */
  zeroAsGap?: boolean;
  height?: number;
}

interface ChartRow {
  label: string;
  [personId: string]: string | number | null;
}

/**
 * recharts v3 no longer exports a usable props type for a custom tooltip, so
 * this is the shape it actually passes in — the fields this tooltip reads.
 */
interface TooltipRenderProps {
  active?: boolean;
  label?: string | number;
  payload?: { dataKey?: string | number; value?: number | null }[];
}

function formatValue(value: number, unit?: string): string {
  const rounded = Math.round(value * 10) / 10;
  return unit ? `${rounded.toLocaleString("en-GB")} ${unit}` : rounded.toLocaleString("en-GB");
}

export function ComparisonChart({ title, subtitle, people, points, kind, unit, zeroAsGap = false, height = 220 }: ComparisonChartProps) {
  const { colors } = useChartTheme();
  const colorOf = usePersonColor();

  const rows: ChartRow[] = points.map((point) => {
    const row: ChartRow = { label: point.label };
    for (const person of people) {
      const value = point.values[person.id] ?? 0;
      row[person.id] = zeroAsGap && value === 0 ? null : value;
    }
    return row;
  });

  const hasAnything = rows.some((row) => people.some((person) => Number(row[person.id]) > 0));

  const renderTooltip = ({ active, payload, label }: TooltipRenderProps) => {
    if (!active || !payload?.length) return null;

    return (
      <div
        className="rounded-lg border px-3 py-2 text-xs shadow-sm"
        style={{ backgroundColor: colors.tooltipBackground, borderColor: colors.tooltipBorder, color: colors.text }}
      >
        <p className="mb-1 font-medium">{label}</p>
        {payload.map((entry) => {
          const person = people.find((candidate) => candidate.id === entry.dataKey);
          if (!person) return null;

          return (
            <p className="flex items-center gap-1.5" key={person.id}>
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: colorOf(person) }} />
              <span style={{ color: colors.textSecondary }}>{person.name}</span>
              <span className="ml-auto tabular-nums">{formatValue(Number(entry.value ?? 0), unit)}</span>
            </p>
          );
        })}
      </div>
    );
  };

  const axisProps = {
    stroke: colors.textMuted,
    tick: { fill: colors.textMuted, fontSize: 11 },
    tickLine: false,
    axisLine: { stroke: colors.border },
  };

  return (
    <ChartShell people={people} subtitle={subtitle} title={title}>
      {hasAnything ? (
        <ResponsiveContainer height={height} width="100%">
          {kind === "bar" ? (
            <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
              <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={16} />
              <YAxis {...axisProps} width={48} />
              <Tooltip content={renderTooltip} cursor={{ fill: colors.grid, fillOpacity: 0.3 }} />
              {people.map((person) => (
                <Bar dataKey={person.id} fill={colorOf(person)} key={person.id} name={person.name} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          ) : (
            <LineChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
              <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={16} />
              <YAxis {...axisProps} width={48} />
              <Tooltip content={renderTooltip} cursor={{ stroke: colors.border }} />
              {people.map((person) => (
                <Line
                  activeDot={{ r: 5 }}
                  connectNulls
                  dataKey={person.id}
                  dot={{ r: 3 }}
                  key={person.id}
                  name={person.name}
                  stroke={colorOf(person)}
                  strokeWidth={2}
                  type="monotone"
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      ) : (
        <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Nothing logged here yet.</p>
      )}
    </ChartShell>
  );
}
