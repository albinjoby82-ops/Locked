import { Check, MoreHorizontal, Trash2 } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { WorkoutSet, WorkoutSetUnit } from "@/features/workout-session/types/workout-set";

/**
 * A set as one row: `SET n · weight · reps · ✓`.
 *
 * The inherited editor renders every set as a column builder — a type dropdown,
 * a value, a unit select and add/remove-column buttons, stacked vertically on a
 * phone. One set filled the screen, and logging five sets of squats meant
 * scrolling past thirty controls.
 *
 * Almost every set either of us logs is reps × weight, so that case gets a
 * single row. Anything else (time, bodyweight, extra columns) falls through to
 * the full editor, which is still one tap away behind the ⋯ button.
 */

interface WorkoutSessionSetCompactProps {
  set: WorkoutSet;
  setIndex: number;
  /** Index into the parallel arrays, or -1 when the set doesn't record it. */
  repsIndex: number;
  weightIndex: number;
  /** The set before this one in the same exercise — shown greyed, as a target to beat. */
  previousSet?: WorkoutSet;
  onChange: (setIndex: number, data: Partial<WorkoutSet>) => void;
  onFinish: () => void;
  onRemove: () => void;
  onShowAdvanced: () => void;
}

/**
 * `appearance-none` matters: Chromium's number spinners eat ~20px of a narrow
 * field, which clipped three-digit weights to "10".
 */
const inputClass =
  "w-full appearance-none rounded-lg border border-slate-300 bg-white px-1 py-2 text-center text-base font-semibold tabular-nums " +
  "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] " +
  "disabled:opacity-70 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500";

export function WorkoutSessionSetCompact({
  set,
  setIndex,
  repsIndex,
  weightIndex,
  previousSet,
  onChange,
  onFinish,
  onRemove,
  onShowAdvanced,
}: WorkoutSessionSetCompactProps) {
  const valuesInt = set.valuesInt || [];
  const units = set.units || [];

  const writeValue = (columnIndex: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = Array.isArray(set.valuesInt) ? [...set.valuesInt] : [];
    next[columnIndex] = event.target.value ? parseInt(event.target.value, 10) : 0;
    onChange(setIndex, { valuesInt: next });
  };

  const writeUnit = (columnIndex: number) => (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = Array.isArray(set.units) ? [...set.units] : [];
    next[columnIndex] = event.target.value as WorkoutSetUnit;
    onChange(setIndex, { units: next });
  };

  /** The same column on the previous set, as a placeholder to aim at. */
  const previousValue = (columnIndex: number): string => {
    const value = previousSet?.valuesInt?.[columnIndex];
    return value ? String(value) : "–";
  };

  return (
    <div
      className={cn(
        "mb-2 flex items-center gap-2 rounded-xl border px-2 py-2 transition-colors",
        set.completed
          ? "border-green-300 bg-green-50/60 dark:border-green-800 dark:bg-green-950/20"
          : "border-slate-200 bg-slate-50 dark:border-slate-700/50 dark:bg-slate-900/80",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
          set.completed ? "bg-green-500 dark:bg-green-700" : "bg-blue-500 dark:bg-blue-900 dark:text-blue-200",
        )}
      >
        {setIndex + 1}
      </span>

      {weightIndex !== -1 ? (
        <span className="flex min-w-0 flex-1 items-center gap-1">
          <input
            aria-label={`Set ${setIndex + 1} weight`}
            className={inputClass}
            disabled={set.completed}
            inputMode="numeric"
            min={0}
            onChange={writeValue(weightIndex)}
            placeholder={previousValue(weightIndex)}
            type="number"
            value={valuesInt[weightIndex] ?? ""}
          />
          <select
            aria-label={`Set ${setIndex + 1} unit`}
            className="w-14 shrink-0 rounded-lg border border-slate-300 bg-white px-1 py-2 text-xs font-semibold dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            disabled={set.completed}
            onChange={writeUnit(weightIndex)}
            value={units[weightIndex] ?? "kg"}
          >
            <option value="kg">kg</option>
            <option value="lbs">lbs</option>
          </select>
        </span>
      ) : null}

      {repsIndex !== -1 ? (
        <span className="min-w-0 flex-1">
          <input
            aria-label={`Set ${setIndex + 1} reps`}
            className={inputClass}
            disabled={set.completed}
            inputMode="numeric"
            min={0}
            onChange={writeValue(repsIndex)}
            placeholder={previousValue(repsIndex)}
            type="number"
            value={valuesInt[repsIndex] ?? ""}
          />
        </span>
      ) : null}

      <button
        aria-label={set.completed ? `Reopen set ${setIndex + 1}` : `Finish set ${setIndex + 1}`}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
          set.completed
            ? "border-green-500 bg-green-500 text-white"
            : "border-slate-300 text-slate-400 hover:border-green-500 hover:text-green-600 dark:border-slate-600",
        )}
        onClick={() => (set.completed ? onChange(setIndex, { completed: false }) : onFinish())}
        type="button"
      >
        <Check className="h-4 w-4" />
      </button>

      <button
        aria-label={`More options for set ${setIndex + 1}`}
        className="flex h-9 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        onClick={onShowAdvanced}
        type="button"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      <button
        aria-label={`Remove set ${setIndex + 1}`}
        className="flex h-9 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-red-600 disabled:opacity-40"
        disabled={set.completed}
        onClick={onRemove}
        type="button"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
