import { Trophy } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { Person, WeekComparison } from "@/features/board/types";

/**
 * The four lines, side by side, with a bar behind each number so who's ahead is
 * obvious without reading the digits. PLAN.md: "you can see who's ahead on each
 * line and the total is obvious".
 */

interface HeadToHeadProps {
  people: Person[];
  week: WeekComparison;
}

export function HeadToHead({ people, week }: HeadToHeadProps) {
  return (
    <div className="divide-y divide-base-200 dark:divide-slate-700">
      {week.lines.map((line) => {
        const max = Math.max(...people.map((person) => line.value[person.id] ?? 0), 1);

        return (
          <div className="py-3" key={line.key}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{line.label}</p>

            <div className="space-y-1.5">
              {people.map((person) => {
                const value = line.value[person.id] ?? 0;
                const isWinner = line.winnerId === person.id;

                return (
                  <div className="flex items-center gap-3" key={person.id}>
                    <span className="w-20 shrink-0 truncate text-sm text-gray-600 dark:text-gray-300">{person.name}</span>

                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-base-200 dark:bg-slate-700">
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{ width: `${Math.max((value / max) * 100, value > 0 ? 4 : 0)}%`, backgroundColor: person.color }}
                      />
                    </div>

                    <span
                      className={cn(
                        "w-24 shrink-0 text-right text-sm tabular-nums",
                        isWinner ? "font-bold text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400",
                      )}
                    >
                      {line.display[person.id]}
                    </span>

                    <Trophy className={cn("h-4 w-4 shrink-0", isWinner ? "text-[#FFB800]" : "text-transparent")} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
