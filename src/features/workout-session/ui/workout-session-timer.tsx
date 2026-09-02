"use client";

import { useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { useWorkoutSession } from "@/features/workout-builder";
import { Timer } from "@/components/ui/timer";
import { Button } from "@/components/ui/button";

export function WorkoutSessionTimer() {
  const { isWorkoutActive, isTimerRunning, toggleTimer, resetTimer } = useWorkoutSession();

  const [resetCount, setResetCount] = useState(0);

  const handleReset = () => {
    resetTimer();
    setResetCount((c) => c + 1);
  };

  if (!isWorkoutActive) {
    return null;
  }

  return (
    // Docked just above the bottom nav rather than floating mid-screen, where it
    // used to sit on top of the set controls it was meant to sit beside.
    <div className="fixed bottom-[4.25rem] left-1/2 z-40 -translate-x-1/2 transform">
      <div className="bg-white dark:bg-slate-900 rounded-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2">
          {/* Timer display */}
          <div className="flex items-center gap-3">
            <div className="text-base font-mono font-bold text-slate-900 dark:text-white tracking-wider">
              <Timer initialSeconds={0} isRunning={isTimerRunning} key={resetCount} />
            </div>
          </div>

          {/* Control buttons */}
          <div className="flex items-center gap-2">
            <Button
              className={cn(
                "w-9 h-9 rounded-full p-0 text-white shadow-md",
                isTimerRunning ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600",
              )}
              onClick={toggleTimer}
            >
              {isTimerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>

            <Button
              className="w-9 h-9 rounded-full p-0 border-slate-200 text-slate-400 hover:bg-slate-200 dark:border-slate-600 hover:dark:bg-slate-700 shadow-md"
              onClick={handleReset}
              variant="outline"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
