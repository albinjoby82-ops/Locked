import { WorkoutSetType, WorkoutSetUnit } from "@prisma/client";

/**
 * Reading a WorkoutSet.
 *
 * A set stores its values as parallel arrays: `types` says what each column is,
 * and `valuesInt` / `valuesSec` / `units` hold the value for that column at the
 * same index. So a 5-rep set at 100 kg is
 * `types: [REPS, WEIGHT], valuesInt: [5, 100], units: [_, "kg"]`.
 *
 * This is the one place that knows that layout. Everything else reads DailyStat.
 */

const LBS_TO_KG = 0.453592;

export interface ParsedSet {
  reps: number;
  weightKg: number;
  seconds: number;
  /** reps x weight, in kg. 0 for sets that don't record both. */
  tonnageKg: number;
}

export interface RawSet {
  types: WorkoutSetType[];
  valuesInt: number[];
  valuesSec: number[];
  units: WorkoutSetUnit[];
}

export function parseSet(set: RawSet): ParsedSet {
  const repsIndex = set.types.indexOf(WorkoutSetType.REPS);
  const weightIndex = set.types.indexOf(WorkoutSetType.WEIGHT);
  const timeIndex = set.types.indexOf(WorkoutSetType.TIME);

  const reps = repsIndex === -1 ? 0 : (set.valuesInt[repsIndex] ?? 0);
  const rawWeight = weightIndex === -1 ? 0 : (set.valuesInt[weightIndex] ?? 0);
  const weightKg = set.units[weightIndex] === WorkoutSetUnit.lbs ? rawWeight * LBS_TO_KG : rawWeight;

  // Time-only sets store their duration in valuesSec at the matching index, but
  // the logger has historically written it at index 0 for single-column sets.
  const seconds = timeIndex === -1 ? 0 : (set.valuesSec[timeIndex] ?? set.valuesSec[0] ?? 0);

  return {
    reps,
    weightKg,
    seconds,
    tonnageKg: reps > 0 && weightKg > 0 ? reps * weightKg : 0,
  };
}

/**
 * Estimated one-rep max, Epley: `weight * (1 + reps / 30)`. PLAN.md picks Epley
 * by name, so don't quietly swap in Brzycki.
 *
 * Returns 0 for sets that aren't a weighted rep set. A single rep is its own
 * 1RM, which is what the formula already gives.
 */
export function epleyOneRepMax({ reps, weightKg }: Pick<ParsedSet, "reps" | "weightKg">): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  return weightKg * (1 + reps / 30);
}
