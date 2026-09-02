"use client";

import { ComparisonChart } from "@/features/board/ui/comparison-chart";
import { ActivityCalendar } from "@/features/board/ui/activity-calendar";
import { BoardData } from "@/features/board/types";

/** The four graphs PLAN.md asks for, in the order it lists them. */
export function BoardGraphs({ data }: { data: BoardData }) {
  const { people } = data;

  return (
    <div className="space-y-4">
      <ComparisonChart
        kind="bar"
        people={people}
        points={data.weeklyTonnage}
        subtitle="Total weight moved, per week"
        title="Weight lifted"
        unit="kg"
      />

      <ComparisonChart kind="bar" people={people} points={data.weeklySessions} subtitle="Per week" title="Sessions" />

      {data.oneRepMax.length > 0 ? (
        data.oneRepMax.map((series) => (
          <ComparisonChart
            key={series.exerciseId}
            kind="line"
            people={people}
            points={series.points}
            subtitle="Best estimated 1RM that week (Epley)"
            title={series.name}
            unit="kg"
            zeroAsGap
          />
        ))
      ) : (
        <section className="rounded-lg border border-base-200 bg-base-100 p-4 text-sm text-gray-500 dark:border-slate-700 dark:bg-[#1c1c1e] dark:text-gray-400">
          <h3 className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">Estimated 1RM</h3>
          Log a few weighted sets on the same lift and its estimated 1RM shows up here.
        </section>
      )}

      {/* A line, not 60 bars: two series over 30 days is too dense to read as bars.
          Gaps rather than zeroes — a day nobody typed in isn't a day nobody walked. */}
      <ComparisonChart
        kind="line"
        people={people}
        points={data.dailySteps}
        subtitle="Last 30 days"
        title="Daily steps"
        zeroAsGap
      />

      <ActivityCalendar days={data.calendar} people={people} />
    </div>
  );
}
