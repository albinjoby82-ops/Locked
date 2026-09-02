"use client";

import type { ReactNode } from "react";

import { useChartTheme } from "@/features/statistics/hooks/use-chart-theme";
import { Person } from "@/features/board/types";

/**
 * The frame every board chart sits in: title, legend, and the surface.
 *
 * The legend is not optional. Both of us are on every chart, so identity has to
 * be readable without relying on colour alone.
 */

interface ChartShellProps {
  title: string;
  subtitle?: string;
  people: Person[];
  children: ReactNode;
}

/** Each person's colour for the current theme — dark has its own validated step. */
export function usePersonColor(): (person: Person) => string {
  const { isDark } = useChartTheme();
  return (person: Person) => (isDark ? person.colorDark : person.color);
}

export function ChartShell({ title, subtitle, people, children }: ChartShellProps) {
  const colorOf = usePersonColor();

  return (
    <section className="rounded-lg border border-base-200 bg-base-100 p-4 dark:border-slate-700 dark:bg-[#1c1c1e]">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          {subtitle ? <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p> : null}
        </div>

        <ul className="flex items-center gap-3">
          {people.map((person) => (
            <li className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300" key={person.id}>
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: colorOf(person) }} />
              {person.name}
            </li>
          ))}
        </ul>
      </header>

      {children}
    </section>
  );
}
