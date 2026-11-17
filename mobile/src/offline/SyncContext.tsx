import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { clearUserOfflineData } from "./localDb";
import {
  getSyncState,
  refreshSyncStats,
  startForegroundSyncWorker,
  stopForegroundSyncWorker,
  subscribeDataSynced,
  subscribeSyncState,
  syncNow,
  SyncState,
} from "./syncWorker";

interface SyncContextValue extends SyncState {
  triggerSync: () => Promise<boolean>;
  clearLocalCache: (includePendingQueue?: boolean) => Promise<void>;
  refreshStats: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user, locked } = useAuth();
  const [syncState, setSyncState] = useState<SyncState>(() => getSyncState());

  useEffect(() => {
    return subscribeSyncState(setSyncState);
  }, []);

  useEffect(() => {
    if (!user || locked) {
      stopForegroundSyncWorker();
      return;
    }
    const stop = startForegroundSyncWorker(user.id);
    return () => {
      stop();
    };
  }, [user, locked]);

  const triggerSync = useCallback(async () => {
    if (!user) return false;
    return syncNow(user.id, { pull: true });
  }, [user]);

  const clearLocalCache = useCallback(
    async (includePendingQueue = false) => {
      if (!user) return;
      await clearUserOfflineData(user.id, includePendingQueue);
      await refreshSyncStats(user.id);
    },
    [user]
  );

  const refreshStats = useCallback(async () => {
    if (!user) return;
    await refreshSyncStats(user.id);
  }, [user]);

  const value = useMemo<SyncContextValue>(
    () => ({
      ...syncState,
      triggerSync,
      clearLocalCache,
      refreshStats,
    }),
    [syncState, triggerSync, clearLocalCache, refreshStats]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync must be used inside SyncProvider");
  return ctx;
}

export function useOnDataSynced(callback: () => void) {
  useEffect(() => {
    return subscribeDataSynced(callback);
  }, [callback]);
}
