import { Dumbbell } from "lucide-react";

import { Person } from "@/features/board/types";
import { RecentWorkout, WorkoutCounts } from "@/features/board/model/get-workout-counts";

/**
 * How many workouts each of us has done, and what the last few actually were.
 *
 * The rest of the board argues about a single week; this is the running total
 * neither of us can spin.
 */

interface WorkoutsDoneProps {
  people: Person[];
  counts: WorkoutCounts;
  recent: RecentWorkout[];
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

function sinceLabel(day: string | null): string {
  if (!day) return "never";

  const days = Math.round((Date.now() - new Date(`${day}T00:00:00.000Z`).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export function WorkoutsDone({ people, counts, recent }: WorkoutsDoneProps) {
  return (
    <section className="rounded-lg border border-base-200 bg-base-100 p-4 dark:border-slate-700 dark:bg-[#1c1c1e]">
      <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Workouts done</h2>

      <div className="grid grid-cols-2 gap-3">
        {people.map((person) => (
          <div className="rounded-lg border border-base-200 p-3 dark:border-slate-700" key={person.id}>
            <p className="text-3xl font-black tabular-nums" style={{ color: person.color }}>
              {counts.allTime[person.id] ?? 0}
            </p>
            <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-200">{person.name}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {counts.last30Days[person.id] ?? 0} in the last 30 days
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Last: {sinceLabel(counts.lastWorkout[person.id] ?? null)}</p>
          </div>
        ))}
      </div>

      {recent.length > 0 ? (
        <ul className="mt-4 divide-y divide-base-200 dark:divide-slate-700">
          {recent.map((workout) => {
            const person = people.find((candidate) => candidate.id === workout.userId);
            const duration = formatDuration(workout.durationSec);

            return (
              <li className="flex items-center gap-3 py-2" key={workout.id}>
                <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: person?.color ?? "#9ca3af" }} />

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-gray-800 dark:text-gray-100">
                    {person?.name ?? "Someone"} · {workout.exerciseCount}{" "}
                    {workout.exerciseCount === 1 ? "exercise" : "exercises"}
                  </span>
                  {workout.exerciseNames.length > 0 ? (
                    <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                      {workout.exerciseNames.join(", ")}
                      {workout.exerciseCount > workout.exerciseNames.length ? "…" : ""}
                    </span>
                  ) : null}
                </span>

                <span className="shrink-0 text-right text-xs text-gray-500 dark:text-gray-400">
                  <span className="block">{formatDay(workout.startedAt)}</span>
                  {duration ? <span className="block">{duration}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 flex items-center justify-center gap-2 py-6 text-sm text-gray-500 dark:text-gray-400">
          <Dumbbell className="h-4 w-4" />
          No workouts logged yet.
        </p>
      )}
    </section>
  );
}
