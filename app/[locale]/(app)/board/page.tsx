import { redirect } from "next/navigation";

import { StepEntryForm } from "@/features/board/ui/step-entry-form";
import { Scoreboard } from "@/features/board/ui/scoreboard";
import { HeadToHead } from "@/features/board/ui/head-to-head";
import { BoardGraphs } from "@/features/board/ui/board-graphs";
import { getBoardData } from "@/features/board/model/get-board-data";
import { toDayKey } from "@/features/board/lib/dates";
import { serverAuth } from "@/entities/user/model/get-server-session-user";

/**
 * The board: me and him, side by side.
 *
 * Numbers change whenever either of us logs anything, and today is read live
 * rather than from the nightly rollup, so this page is never cached.
 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Board",
  description: "Who's actually training this week.",
};

export default async function BoardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await serverAuth();

  if (!user) redirect(`/${locale}/auth/signin`);

  const data = await getBoardData(user.id);
  const today = toDayKey(new Date());

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-3 py-6 sm:px-4">
      <header>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">The Board</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {data.isEmpty ? "Nothing logged yet. Whoever trains first goes top." : "Who's actually training."}
        </p>
      </header>

      <Scoreboard people={data.people} thisWeek={data.thisWeek} weeksWon={data.weeksWon} />

      <section className="rounded-lg border border-base-200 bg-base-100 px-4 py-2 dark:border-slate-700 dark:bg-[#1c1c1e]">
        <h2 className="pt-2 text-sm font-semibold text-gray-900 dark:text-white">This week</h2>
        <HeadToHead people={data.people} week={data.thisWeek} />
      </section>

      <section className="rounded-lg border border-base-200 bg-base-100 p-4 dark:border-slate-700 dark:bg-[#1c1c1e]">
        <StepEntryForm day={today} initialSteps={data.todaySteps} />
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Steps are typed in by hand for now — one number a day, no excuses.
        </p>
      </section>

      <BoardGraphs data={data} />

      {data.pastWeeks.length > 0 ? (
        <section className="rounded-lg border border-base-200 bg-base-100 p-4 dark:border-slate-700 dark:bg-[#1c1c1e]">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Previous weeks</h2>

          <ul className="divide-y divide-base-200 text-sm dark:divide-slate-700">
            {data.pastWeeks.slice(0, 12).map((week) => {
              const winner = data.people.find((person) => person.id === week.winnerId);

              return (
                <li className="flex items-center justify-between gap-3 py-2" key={week.weekStart}>
                  <span className="text-gray-500 dark:text-gray-400">
                    Week of {new Date(`${week.weekStart}T00:00:00.000Z`).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      timeZone: "UTC",
                    })}
                  </span>

                  <span className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {data.people.map((person) => week.linesWon[person.id] ?? 0).join(" – ")}
                    </span>
                    {winner ? (
                      <span className="font-semibold" style={{ color: winner.color }}>
                        {winner.name}
                      </span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">Draw</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
