import { cn } from "@/shared/lib/utils";
import { Person, WeekComparison } from "@/features/board/types";

/**
 * The running weeks-won count, and who's winning the week in progress.
 *
 * PLAN.md: "Keep a running count of weeks won, because that's the number we'll
 * actually argue about." So it's the biggest thing on the page.
 */

interface ScoreboardProps {
  people: Person[];
  weeksWon: Record<string, number>;
  thisWeek: WeekComparison;
}

export function Scoreboard({ people, weeksWon, thisWeek }: ScoreboardProps) {
  const leader = people.reduce<Person | null>((best, person) => {
    if (!best) return person;
    if ((weeksWon[person.id] ?? 0) > (weeksWon[best.id] ?? 0)) return person;
    return best;
  }, null);

  const isDraw = people.length > 1 && people.every((person) => (weeksWon[person.id] ?? 0) === (weeksWon[people[0].id] ?? 0));

  return (
    <div className="rounded-lg border border-base-200 bg-base-100 p-4 dark:border-slate-700 dark:bg-[#1c1c1e]">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Weeks won</p>

      <div className="flex items-stretch justify-center gap-3">
        {people.map((person, index) => {
          const isLeader = !isDraw && leader?.id === person.id;
          const linesWon = thisWeek.linesWon[person.id] ?? 0;

          return (
            <div className="flex items-stretch gap-3" key={person.id}>
              {index > 0 ? <span className="self-center text-lg font-light text-gray-300 dark:text-gray-600">–</span> : null}

              <div className="min-w-24 text-center">
                <p
                  className={cn("text-4xl font-black tabular-nums", isLeader ? "" : "text-gray-500 dark:text-gray-400")}
                  style={isLeader ? { color: person.color } : undefined}
                >
                  {weeksWon[person.id] ?? 0}
                </p>
                <p className="mt-1 truncate text-sm font-medium text-gray-700 dark:text-gray-200">{person.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {linesWon}/{thisWeek.lines.length} this week
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-center text-sm text-gray-600 dark:text-gray-300">
        {thisWeek.winnerId ? (
          <>
            <span className="font-semibold" style={{ color: people.find((person) => person.id === thisWeek.winnerId)?.color }}>
              {people.find((person) => person.id === thisWeek.winnerId)?.name}
            </span>{" "}
            is winning this week.
          </>
        ) : (
          "This week is level."
        )}
      </p>
    </div>
  );
}
