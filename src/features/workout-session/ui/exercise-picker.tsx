"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, Loader2, Plus, Search, X } from "lucide-react";
import { ExerciseAttributeValueEnum } from "@prisma/client";

import { cn } from "@/shared/lib/utils";
import { EXERCISE_SEARCH_PAGE_SIZE, useExerciseSearch } from "@/features/workout-session/model/use-exercise-search";
import { ExerciseWithAttributes } from "@/entities/exercise/types/exercise.types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Pick exercises by name.
 *
 * The inherited flow only let you reach an exercise by walking an
 * equipment → muscle → generated-list wizard, which is fine for "build me
 * something" and useless for "add barbell rows to what I'm already doing".
 * This is the other half: type the name, tap add, keep going.
 *
 * It stays open after an add so you can queue several in one pass, and marks
 * what's already in the session so you don't add the same lift twice.
 */

interface ExercisePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (exercise: ExerciseWithAttributes) => void;
  /** Exercise ids already in the session, shown as added rather than addable. */
  addedExerciseIds: string[];
}

/** The muscles worth a filter chip — the ones that name a training day. */
const MUSCLE_FILTERS: { value: ExerciseAttributeValueEnum; label: string }[] = [
  { value: ExerciseAttributeValueEnum.CHEST, label: "Chest" },
  { value: ExerciseAttributeValueEnum.BACK, label: "Back" },
  { value: ExerciseAttributeValueEnum.LATS, label: "Lats" },
  { value: ExerciseAttributeValueEnum.SHOULDERS, label: "Shoulders" },
  { value: ExerciseAttributeValueEnum.BICEPS, label: "Biceps" },
  { value: ExerciseAttributeValueEnum.TRICEPS, label: "Triceps" },
  { value: ExerciseAttributeValueEnum.QUADRICEPS, label: "Quads" },
  { value: ExerciseAttributeValueEnum.HAMSTRINGS, label: "Hamstrings" },
  { value: ExerciseAttributeValueEnum.GLUTES, label: "Glutes" },
  { value: ExerciseAttributeValueEnum.CALVES, label: "Calves" },
  { value: ExerciseAttributeValueEnum.ABDOMINALS, label: "Abs" },
];

const EQUIPMENT_FILTERS: { value: ExerciseAttributeValueEnum; label: string }[] = [
  { value: ExerciseAttributeValueEnum.BARBELL, label: "Barbell" },
  { value: ExerciseAttributeValueEnum.DUMBBELL, label: "Dumbbell" },
  { value: ExerciseAttributeValueEnum.MACHINE, label: "Machine" },
  { value: ExerciseAttributeValueEnum.CABLE, label: "Cable" },
  { value: ExerciseAttributeValueEnum.BODY_ONLY, label: "Bodyweight" },
  { value: ExerciseAttributeValueEnum.KETTLEBELLS, label: "Kettlebell" },
  { value: ExerciseAttributeValueEnum.BANDS, label: "Bands" },
];

function FilterChips<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: { value: T; label: string }[];
  selected: T | null;
  onSelect: (value: T | null) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {options.map((option) => {
        const isSelected = selected === option.value;
        return (
          <button
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs transition-colors",
              isSelected
                ? "border-transparent bg-[#4F8EF7] text-white"
                : "border-base-300 text-gray-600 hover:bg-base-200 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700",
            )}
            key={option.value}
            onClick={() => onSelect(isSelected ? null : option.value)}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** The muscle an exercise trains, for the one-line subtitle under its name. */
function primaryMuscleOf(exercise: ExerciseWithAttributes): string | null {
  for (const attribute of exercise.attributes) {
    const name = typeof attribute.attributeName === "string" ? attribute.attributeName : attribute.attributeName?.name;
    if (name !== "PRIMARY_MUSCLE") continue;

    const value = typeof attribute.attributeValue === "string" ? attribute.attributeValue : attribute.attributeValue?.value;
    if (value) return value.toLowerCase().replace(/_/g, " ");
  }
  return null;
}

export function ExercisePicker({ isOpen, onClose, onAdd, addedExerciseIds }: ExercisePickerProps) {
  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState<ExerciseAttributeValueEnum | null>(null);
  const [equipment, setEquipment] = useState<ExerciseAttributeValueEnum | null>(null);
  const [page, setPage] = useState(1);

  // Debounced, so typing "bench" is one request rather than five.
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(rawSearch), 250);
    return () => clearTimeout(timeout);
  }, [rawSearch]);

  // Any change to the query starts again at the first page.
  useEffect(() => setPage(1), [search, muscle, equipment]);

  const { data, isFetching, isError } = useExerciseSearch({ search, muscle, equipment, page }, isOpen);

  const added = useMemo(() => new Set(addedExerciseIds), [addedExerciseIds]);

  useEffect(() => {
    if (!isOpen) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const exercises = data?.data ?? [];
  const total = data?.pagination.totalCount ?? 0;

  return (
    // z-[60] clears the session timer, which is docked at z-50 and would
    // otherwise float over the results list.
    <div aria-modal className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog">
      <button aria-label="Close" className="absolute inset-0 bg-black/50" onClick={onClose} type="button" />

      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl dark:bg-[#232324] sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-base-200 px-4 py-3 dark:border-slate-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Add an exercise</h2>
          <Button aria-label="Close" onClick={onClose} size="icon" type="button" variant="ghost">
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="space-y-2 border-b border-base-200 px-4 py-3 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              autoFocus
              className="pl-9"
              onChange={(event) => setRawSearch(event.target.value)}
              placeholder="Search 880 exercises — try &quot;bench&quot;"
              value={rawSearch}
            />
          </div>

          <FilterChips onSelect={setMuscle} options={MUSCLE_FILTERS} selected={muscle} />
          <FilterChips onSelect={setEquipment} options={EQUIPMENT_FILTERS} selected={equipment} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {isError ? (
            <p className="py-10 text-center text-sm text-red-600 dark:text-red-400">Couldn&apos;t load exercises.</p>
          ) : exercises.length === 0 && !isFetching ? (
            <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Nothing matches that.</p>
          ) : (
            <ul className="space-y-1">
              {exercises.map((exercise) => {
                const isAdded = added.has(exercise.id);
                const muscleLabel = primaryMuscleOf(exercise);

                return (
                  <li key={exercise.id}>
                    <button
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors",
                        isAdded ? "opacity-60" : "hover:bg-base-200 dark:hover:bg-slate-700",
                      )}
                      disabled={isAdded}
                      onClick={() => onAdd(exercise)}
                      type="button"
                    >
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-base-200 dark:bg-slate-700">
                        {exercise.fullVideoImageUrl ? (
                          <Image alt="" className="object-cover" fill sizes="40px" src={exercise.fullVideoImageUrl} />
                        ) : null}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-gray-900 dark:text-white">
                          {exercise.nameEn || exercise.name}
                        </span>
                        {muscleLabel ? (
                          <span className="block truncate text-xs capitalize text-gray-500 dark:text-gray-400">{muscleLabel}</span>
                        ) : null}
                      </span>

                      {isAdded ? (
                        <Check className="h-4 w-4 shrink-0 text-[#25CB78]" />
                      ) : (
                        <Plus className="h-4 w-4 shrink-0 text-[#4F8EF7]" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-base-200 px-4 py-2 dark:border-slate-700">
          <span className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {isFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            {total > 0 ? `${total} exercise${total === 1 ? "" : "s"}` : ""}
          </span>

          {total > EXERCISE_SEARCH_PAGE_SIZE ? (
            <span className="flex items-center gap-2">
              <Button
                disabled={!data?.pagination.hasPreviousPage}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                size="small"
                type="button"
                variant="outline-general"
              >
                Back
              </Button>
              <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
                {data?.pagination.page} / {data?.pagination.totalPages}
              </span>
              <Button
                disabled={!data?.pagination.hasNextPage}
                onClick={() => setPage((current) => current + 1)}
                size="small"
                type="button"
                variant="outline-general"
              >
                More
              </Button>
            </span>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
