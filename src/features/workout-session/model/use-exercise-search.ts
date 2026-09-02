import { useQuery } from "@tanstack/react-query";
import { ExerciseAttributeValueEnum } from "@prisma/client";

import { ExerciseWithAttributes } from "@/entities/exercise/types/exercise.types";

/**
 * Search the exercise database by name, optionally narrowed to one muscle and
 * one piece of equipment.
 *
 * There are ~880 exercises, so browsing a muscle accordion doesn't scale —
 * typing three letters of the name is how anyone actually finds a lift.
 */

export interface ExerciseSearchParams {
  search: string;
  muscle: ExerciseAttributeValueEnum | null;
  equipment: ExerciseAttributeValueEnum | null;
  page: number;
}

export interface ExerciseSearchResult {
  data: ExerciseWithAttributes[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export const EXERCISE_SEARCH_PAGE_SIZE = 20;

export function useExerciseSearch({ search, muscle, equipment, page }: ExerciseSearchParams, enabled: boolean) {
  return useQuery<ExerciseSearchResult>({
    queryKey: ["exercise-search", search, muscle, equipment, page],
    enabled,
    // Keeps the previous page on screen while the next one loads, so the list
    // doesn't blank out on every keystroke.
    placeholderData: (previous) => previous,
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(EXERCISE_SEARCH_PAGE_SIZE) });
      if (search.trim()) params.set("search", search.trim());
      if (muscle) params.set("muscle", muscle);
      if (equipment) params.set("equipment", equipment);

      const response = await fetch(`/api/exercises/all?${params.toString()}`);
      if (!response.ok) throw new Error("Could not load exercises");

      return response.json();
    },
  });
}
