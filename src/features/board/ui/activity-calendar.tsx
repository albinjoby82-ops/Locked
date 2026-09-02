"use client";

import { ChartShell, usePersonColor } from "@/features/board/ui/chart-shell";
import { CalendarDay, Person } from "@/features/board/types";

/**
 * One square per day per person, shaded by how hard you went.
 *
 * PLAN.md calls this "the one that makes it obvious when someone's disappeared
 * for two weeks", so the empty squares matter as much as the full ones — each
 * person gets their own row of weeks, stacked, sharing one shading scale.
 *
 * Shading is a sequential ramp in the person's own hue (opacity steps on one
 * colour), not a rainbow: the value being encoded is magnitude, and the hue is
 * already spent on identity.
 */

interface ActivityCalendarProps {
  people: Person[];
  days: CalendarDay[];
}

/** Opacity steps for buckets 1-4. Bucket 0 is the empty-day surface. */
const INTENSITY_STEPS = [0.28, 0.5, 0.72, 1];

const WEEKDAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

/** Quartile-ish buckets off the person's own busiest day, so both scales read the same. */
function bucketFor(tonnageKg: number, max: number): number {
  if (tonnageKg <= 0 || max <= 0) return 0;
  return Math.min(INTENSITY_STEPS.length, Math.ceil((tonnageKg / max) * INTENSITY_STEPS.length));
}

export function ActivityCalendar({ people, days }: ActivityCalendarProps) {
  const colorOf = usePersonColor();

  // The grid is column-per-week, row-per-weekday. `days` already starts on a
  // Monday, so chunking by 7 gives the columns directly.
  const weeks: CalendarDay[][] = [];
  for (let index = 0; index < days.length; index += 7) weeks.push(days.slice(index, index + 7));

  return (
    <ChartShell people={people} subtitle="Every day of the last six months. Darker means a heavier day." title="Who actually turned up">
      <div className="space-y-4">
        {people.map((person) => {
          const color = colorOf(person);
          const max = Math.max(...days.map((day) => day.tonnageKg[person.id] ?? 0), 0);
          const activeDays = days.filter((day) => (day.sessions[person.id] ?? 0) > 0).length;

          return (
            <div key={person.id}>
              <p className="mb-1.5 flex items-baseline gap-2 text-xs">
                <span className="font-medium text-gray-700 dark:text-gray-200">{person.name}</span>
                <span className="text-gray-500 dark:text-gray-400">
                  {activeDays} {activeDays === 1 ? "day" : "days"} trained
                </span>
              </p>

              <div className="flex gap-2 overflow-x-auto pb-1">
                <div className="flex shrink-0 flex-col gap-[3px] pt-[1px]">
                  {WEEKDAY_LABELS.map((label, weekday) => (
                    <span
                      className="h-[11px] text-[9px] leading-[11px] text-gray-500 dark:text-gray-400"
                      key={`${person.id}-weekday-${weekday}`}
                    >
                      {label}
                    </span>
                  ))}
                </div>

                <div className="flex gap-[3px]">
                  {weeks.map((week) => (
                    <div className="flex flex-col gap-[3px]" key={`${person.id}-${week[0].day}`}>
                      {week.map((day) => {
                        const tonnage = day.tonnageKg[person.id] ?? 0;
                        const bucket = bucketFor(tonnage, max);
                        const sessions = day.sessions[person.id] ?? 0;

                        return (
                          <span
                            className="h-[11px] w-[11px] rounded-[2px] bg-base-200 dark:bg-slate-700"
                            key={`${person.id}-${day.day}`}
                            style={bucket === 0 ? undefined : { backgroundColor: color, opacity: INTENSITY_STEPS[bucket - 1] }}
                            title={
                              sessions > 0
                                ? `${day.label}: ${tonnage.toLocaleString("en-GB")} kg over ${sessions} ${sessions === 1 ? "session" : "sessions"}`
                                : `${day.label}: nothing`
                            }
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ChartShell>
  );
}
