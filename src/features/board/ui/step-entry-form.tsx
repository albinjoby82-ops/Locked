"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { Footprints } from "lucide-react";

import { saveStepsAction } from "@/features/board/actions/save-steps.action";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface StepEntryFormProps {
  /** `YYYY-MM-DD`, today. */
  day: string;
  /** What's already logged for today, if anything. */
  initialSteps: number | null;
}

/**
 * One number a day, typed in. That's the whole steps feature for now — see
 * PLAN.md on why automating it is deliberately deferred.
 */
export function StepEntryForm({ day, initialSteps }: StepEntryFormProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialSteps === null ? "" : String(initialSteps));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { execute, isPending } = useAction(saveStepsAction, {
    onSuccess: () => {
      setError(null);
      setSaved(true);
      router.refresh();
    },
    onError: ({ error: actionError }) => {
      setSaved(false);
      setError(actionError.serverError ?? "Couldn't save that.");
    },
  });

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const steps = Number(value);
    if (!Number.isInteger(steps) || steps < 0) {
      setError("Steps have to be a whole number.");
      return;
    }

    execute({ day, steps });
  };

  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={onSubmit}>
      <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300" htmlFor="steps-today">
        <Footprints className="h-4 w-4" />
        Steps today
      </label>

      <Input
        className="w-32"
        id="steps-today"
        inputMode="numeric"
        max={200000}
        min={0}
        onChange={(event) => {
          setValue(event.target.value);
          setSaved(false);
        }}
        placeholder="e.g. 8400"
        type="number"
        value={value}
      />

      <Button disabled={isPending || value === ""} size="large" type="submit">
        {isPending ? "Saving…" : "Save"}
      </Button>

      {error ? <p className="w-full text-xs text-red-600 dark:text-red-400">{error}</p> : null}
      {saved && !error ? <p className="w-full text-xs text-[#25CB78]">Logged.</p> : null}
    </form>
  );
}
