import { AppState, AppStateStatus } from "react-native";
import * as Network from "expo-network";
import * as TaskManager from "expo-task-manager";
import * as BackgroundTask from "expo-background-task";
import { AxiosError } from "axios";
import { api, errorMessage, tokenStore } from "../api/client";
import { AppEvent, CalendarStatus, Habit, HabitLog, Task, UserStats } from "../types";
import {
  getActiveUserId,
  getCacheSummary,
  getLastSyncedAt,
  getPendingQueue,
  getQueueCount,
  LocalCacheSummary,
  markQueueItemError,
  removeQueueItem,
  replaceEventId,
  replaceHabitId,
  replaceTaskId,
  saveCalendarStatusSnapshot,
  saveEventsSnapshot,
  saveHabitsSnapshot,
  saveStatsSnapshot,
  saveTasksSnapshot,
  setLastSyncedAt,
  SyncQueueItem,
  updateQueueEntityId,
  upsertLocalEvent,
  upsertLocalTask,
} from "./localDb";

export const BLOOM_SYNC_TASK = "BLOOM_OFFLINE_SYNC_TASK";

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  summary: LocalCacheSummary;
}

type SyncListener = (state: SyncState) => void;
type DataSyncedListener = () => void;

let currentState: SyncState = {
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncedAt: null,
  lastError: null,
  summary: {
    tasks: 0,
    habits: 0,
    events: 0,
    pendingMutations: 0,
    lastSyncedAt: null,
  },
};

const stateListeners = new Set<SyncListener>();
const dataListeners = new Set<DataSyncedListener>();
let activeSyncPromise: Promise<boolean> | null = null;
let workerUserId: string | null = null;
let stopCallbacks: Array<() => void> = [];

function notifyState() {
  for (const listener of stateListeners) {
    listener(currentState);
  }
}

function notifyDataChanged() {
  for (const listener of dataListeners) {
    listener();
  }
}

export function getSyncState(): SyncState {
  return currentState;
}

export function subscribeSyncState(listener: SyncListener): () => void {
  stateListeners.add(listener);
  listener(currentState);
  return () => {
    stateListeners.delete(listener);
  };
}

export function subscribeDataSynced(listener: DataSyncedListener): () => void {
  dataListeners.add(listener);
  return () => {
    dataListeners.delete(listener);
  };
}

export async function isDeviceOnline(): Promise<boolean> {
  try {
    const net = await Network.getNetworkStateAsync();
    const online = Boolean(net.isConnected && net.isInternetReachable !== false);
    if (online !== currentState.isOnline) {
      currentState = { ...currentState, isOnline: online };
      notifyState();
    }
    return online;
  } catch {
    return true;
  }
}

export function isNetworkError(err: unknown): boolean {
  const e = err as AxiosError | undefined;
  if (!e) return false;
  if (e.response) return false;
  return Boolean(e.request || e.code === "ECONNABORTED" || e.code === "ERR_NETWORK");
}

export async function refreshSyncStats(userId: string): Promise<void> {
  try {
    const [summary, lastSyncedAt] = await Promise.all([
      getCacheSummary(userId),
      getLastSyncedAt(userId),
    ]);
    currentState = {
      ...currentState,
      pendingCount: summary.pendingMutations,
      lastSyncedAt,
      summary,
    };
    notifyState();
  } catch {
    // Ignore SQLite read errors during teardown
  }
}

function httpStatus(err: unknown): number | undefined {
  return (err as AxiosError | undefined)?.response?.status;
}

async function processQueueItem(userId: string, item: SyncQueueItem): Promise<void> {
  const payload = item.payload ?? {};

  switch (item.opType) {
    case "TASK_CREATE": {
      const created = await api.post<Task>("/tasks", payload);
      await replaceTaskId(userId, item.entityId, created);
      await updateQueueEntityId(userId, item.entityId, created.id);
      return;
    }
    case "TASK_UPDATE": {
      const updated = await api.put<Task>(`/tasks/${item.entityId}`, payload);
      await upsertLocalTask(userId, updated);
      return;
    }
    case "TASK_DELETE": {
      await api.del(`/tasks/${item.entityId}`);
      return;
    }
    case "HABIT_CREATE": {
      const created = await api.post<Habit>("/habits", payload);
      await replaceHabitId(userId, item.entityId, created);
      await updateQueueEntityId(userId, item.entityId, created.id);
      return;
    }
    case "HABIT_LOG": {
      await api.post<HabitLog>(`/habits/${item.entityId}/log`);
      return;
    }
    case "HABIT_DELETE": {
      await api.del(`/habits/${item.entityId}`);
      return;
    }
    case "EVENT_CREATE": {
      const created = await api.post<AppEvent>("/events", payload);
      await replaceEventId(userId, item.entityId, created);
      await updateQueueEntityId(userId, item.entityId, created.id);
      return;
    }
    case "EVENT_UPDATE": {
      const updated = await api.patch<AppEvent>(`/events/${item.entityId}`, payload);
      await upsertLocalEvent(userId, updated);
      return;
    }
    case "EVENT_DELETE": {
      await api.del(`/events/${item.entityId}`);
      return;
    }
    case "FEEDBACK_SUBMIT": {
      await api.post("/feedback", payload);
      return;
    }
  }
}

async function flushQueue(userId: string): Promise<{ flushedAny: boolean; halted: boolean }> {
  let flushedAny = false;
  // Re-fetch iteratively because TASK_CREATE / HABIT_CREATE / EVENT_CREATE
  // rewrites local-* IDs in subsequent queued items.
  while (true) {
    const queue = await getPendingQueue(userId);
    if (queue.length === 0) break;

    const item = queue[0];
    try {
      await processQueueItem(userId, item);
      await removeQueueItem(item.id);
      flushedAny = true;
    } catch (err) {
      const status = httpStatus(err);
      const msg = errorMessage(err);

      // Idempotent / already-applied / missing-on-server states should not block the outbox forever.
      const isAlreadyLogged =
        item.opType === "HABIT_LOG" && status === 400 && msg.includes("Already logged");
      const isMissingOnDelete =
        (item.opType === "TASK_DELETE" ||
          item.opType === "HABIT_DELETE" ||
          item.opType === "EVENT_DELETE") &&
        (status === 404 || status === 403);
      const isMissingOnUpdate =
        (item.opType === "TASK_UPDATE" ||
          item.opType === "EVENT_UPDATE" ||
          item.opType === "HABIT_LOG") &&
        status === 404;

      if (isAlreadyLogged || isMissingOnDelete || isMissingOnUpdate) {
        await removeQueueItem(item.id);
        flushedAny = true;
        continue;
      }

      if (status === 401) {
        return { flushedAny, halted: true };
      }

      await markQueueItemError(item.id, msg);
      currentState = {
        ...currentState,
        lastError: msg,
        isOnline: !isNetworkError(err),
      };
      notifyState();
      return { flushedAny, halted: true };
    }
  }

  return { flushedAny, halted: false };
}

async function pullSnapshots(userId: string): Promise<boolean> {
  const [tasksRes, habitsRes, eventsRes, statsRes, calRes] = await Promise.allSettled([
    api.get<Task[]>("/tasks"),
    api.get<Habit[]>("/habits"),
    api.get<AppEvent[]>("/events"),
    api.get<UserStats>("/users/stats"),
    api.get<CalendarStatus>("/calendar/status"),
  ]);

  let anySuccess = false;
  if (tasksRes.status === "fulfilled") {
    await saveTasksSnapshot(userId, tasksRes.value);
    anySuccess = true;
  }
  if (habitsRes.status === "fulfilled") {
    await saveHabitsSnapshot(
      userId,
      habitsRes.value.map((h) => ({ ...h, logs: h.logs ?? [] }))
    );
    anySuccess = true;
  }
  if (eventsRes.status === "fulfilled") {
    await saveEventsSnapshot(userId, eventsRes.value);
    anySuccess = true;
  }
  if (statsRes.status === "fulfilled") {
    await saveStatsSnapshot(userId, statsRes.value);
    anySuccess = true;
  }
  if (calRes.status === "fulfilled") {
    await saveCalendarStatusSnapshot(userId, calRes.value);
    anySuccess = true;
  }

  return anySuccess;
}

export async function syncNow(
  userId: string,
  options: { pull?: boolean } = { pull: true }
): Promise<boolean> {
  if (activeSyncPromise) return activeSyncPromise;

  activeSyncPromise = (async () => {
    const token = await tokenStore.get();
    if (!token) return false;

    const online = await isDeviceOnline();
    if (!online) {
      await refreshSyncStats(userId);
      return false;
    }

    currentState = { ...currentState, isSyncing: true, lastError: null };
    notifyState();

    try {
      const { flushedAny, halted } = await flushQueue(userId);
      let pulledAny = false;

      if (options.pull !== false && !halted) {
        pulledAny = await pullSnapshots(userId);
      }

      if (flushedAny || pulledAny) {
        const now = new Date().toISOString();
        await setLastSyncedAt(userId, now);
        notifyDataChanged();
      }

      const pendingRemaining = await getQueueCount(userId);
      currentState = {
        ...currentState,
        isSyncing: false,
        pendingCount: pendingRemaining,
      };
      await refreshSyncStats(userId);
      return !halted;
    } catch (err) {
      currentState = {
        ...currentState,
        isSyncing: false,
        lastError: errorMessage(err),
      };
      await refreshSyncStats(userId);
      return false;
    } finally {
      activeSyncPromise = null;
    }
  })();

  return activeSyncPromise;
}

// Top-level background task definition for OS-level background sync (Android WorkManager / iOS BGTask)
try {
  if (!TaskManager.isTaskDefined(BLOOM_SYNC_TASK)) {
    TaskManager.defineTask(BLOOM_SYNC_TASK, async () => {
      try {
        const [userId, token] = await Promise.all([getActiveUserId(), tokenStore.get()]);
        if (!userId || !token) {
          return BackgroundTask.BackgroundTaskResult.Success;
        }
        const ok = await syncNow(userId, { pull: true });
        return ok
          ? BackgroundTask.BackgroundTaskResult.Success
          : BackgroundTask.BackgroundTaskResult.Failed;
      } catch {
        return BackgroundTask.BackgroundTaskResult.Failed;
      }
    });
  }
} catch {
  // Ignore if TaskManager cannot register in the current environment
}

export async function registerBackgroundSyncWorker(): Promise<void> {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status === BackgroundTask.BackgroundTaskStatus.Restricted) return;

    const alreadyRegistered = await TaskManager.isTaskRegisteredAsync(BLOOM_SYNC_TASK);
    if (!alreadyRegistered) {
      await BackgroundTask.registerTaskAsync(BLOOM_SYNC_TASK, {
        minimumInterval: 15,
      });
    }
  } catch {
    // Expo Go on some platforms may restrict OS background registration;
    // foreground reactive worker still handles connectivity + AppState syncs.
  }
}

export function startForegroundSyncWorker(userId: string): () => void {
  if (workerUserId === userId && stopCallbacks.length > 0) {
    return () => stopForegroundSyncWorker();
  }

  stopForegroundSyncWorker();
  workerUserId = userId;

  // Initial sync & stats check
  refreshSyncStats(userId).then(() => {
    syncNow(userId, { pull: true });
  });
  registerBackgroundSyncWorker();

  // 1. React immediately when device reconnects to internet
  let netSubscription: { remove: () => void } | null = null;
  try {
    netSubscription = Network.addNetworkStateListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      const wasOffline = !currentState.isOnline;
      if (online !== currentState.isOnline) {
        currentState = { ...currentState, isOnline: online };
        notifyState();
      }
      if (online && (wasOffline || currentState.pendingCount > 0)) {
        syncNow(userId, { pull: true });
      }
    });
  } catch {
    // Ignore if listener is unavailable
  }

  // 2. Sync when app returns to foreground
  const appStateSub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
    if (nextState === "active") {
      syncNow(userId, { pull: true });
    }
  });

  // 3. Periodic worker heartbeat while app is active and queue has pending changes
  const interval = setInterval(async () => {
    const count = await getQueueCount(userId);
    if (count > 0) {
      syncNow(userId, { pull: false });
    }
  }, 20000);

  stopCallbacks = [
    () => netSubscription?.remove(),
    () => appStateSub.remove(),
    () => clearInterval(interval),
  ];

  return () => stopForegroundSyncWorker();
}

export function stopForegroundSyncWorker(): void {
  for (const fn of stopCallbacks) {
    try {
      fn();
    } catch {
      // ignore cleanup errors
    }
  }
  stopCallbacks = [];
  workerUserId = null;
}
