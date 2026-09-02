"use client";

import { useEffect, useState } from "react";

import { syncWorkoutSessionAction } from "../actions/sync-workout-sessions.action";

import { workoutSessionLocal } from "@/shared/lib/workout-session/workout-session.local";
import { useSession } from "@/features/auth/lib/auth-client";


interface SyncState {
  isSyncing: boolean;
  error: Error | null;
  lastSyncAt: Date | null;
}

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * What a sync attempt did, so the caller can tell "saved" from "still only on
 * this phone". Previously every failure was swallowed into a console.error,
 * which nobody reads on a phone in a gym.
 */
export interface SyncResult {
  /** Sessions that failed to upload. They stay in localStorage and retry. */
  failed: number;
  /** Sessions that were attempted. */
  total: number;
  /** True when there was nobody signed in, so nothing was even tried. */
  skipped: boolean;
}

export function useSyncWorkoutSessions() {
  const { data: session, isPending: isSessionLoading } = useSession();

  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    error: null,
    lastSyncAt: null,
  });

  const syncSessions = async (): Promise<SyncResult> => {
    if (!session?.user) return { failed: 0, total: 0, skipped: true };

    setSyncState((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      const localSessions = workoutSessionLocal.getAll().filter((s) => s.status === "completed");
      let failed = 0;

      for (const localSession of localSessions) {
        try {
          const result = await syncWorkoutSessionAction({
            session: {
              ...localSession,
              userId: localSession.userId === "local" ? session.user.id : localSession.userId,
              status: "synced",
            },
          });

          if (result && result.serverError) {
            console.log("result:", result);
            throw new Error(result.serverError);
          }

          if (result && result.data) {
            const { data } = result.data;

            if (data) {
              workoutSessionLocal.markSynced(localSession.id, data.id);
            }
          }
        } catch (error) {
          failed += 1;
          console.error(`Failed to sync session ${localSession.id}:`, error);
        }
      }

      workoutSessionLocal.purgeSynced();

      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: new Date(),
      }));

      return { failed, total: localSessions.length, skipped: false };
    } catch (error) {
      console.log("error:", error);
      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        error: error as Error,
      }));

      // The whole attempt fell over, so treat every pending session as failed.
      return { failed: 1, total: 1, skipped: false };
    }
  };

  // Sync on login
  useEffect(() => {
    if (!isSessionLoading && session?.user) {
      syncSessions();
    }
  }, [session, isSessionLoading]);

  // Periodic sync
  useEffect(() => {
    if (!session?.user) return;

    const interval = setInterval(syncSessions, SYNC_INTERVAL);
    return () => clearInterval(interval);
  }, [session]);

  return {
    syncSessions,
    ...syncState,
  };
}
