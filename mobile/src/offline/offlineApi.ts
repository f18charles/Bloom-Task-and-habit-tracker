import { api } from "../api/client";
import { AppEvent, CalendarStatus, Habit, HabitLog, Task, UserStats } from "../types";
import {
  computeLocalStats,
  deleteLocalEvent,
  deleteLocalHabit,
  deleteLocalTask,
  enqueueMutation,
  getCachedCalendarStatus,
  getCachedEvents,
  getCachedHabits,
  getCachedStats,
  getCachedTasks,
  getQueueCount,
  saveCalendarStatusSnapshot,
  saveEventsSnapshot,
  saveHabitsSnapshot,
  saveStatsSnapshot,
  saveTasksSnapshot,
  upsertLocalEvent,
  upsertLocalHabit,
  upsertLocalTask,
} from "./localDb";
import { isDeviceOnline, isNetworkError, refreshSyncStats, syncNow } from "./syncWorker";

const localId = (prefix: string) =>
  `local-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

async function triggerSyncIfOnline(userId: string): Promise<boolean> {
  await refreshSyncStats(userId);
  const online = await isDeviceOnline();
  if (online) {
    // Fire and forget so UI remains instant; SyncContext updates listeners on completion.
    syncNow(userId, { pull: false });
  }
  return online;
}

// ---------------------------------------------------------------------------
// Reads (Local-first with live refresh when online)
// ---------------------------------------------------------------------------

export async function fetchTasksOfflineFirst(
  userId: string
): Promise<{ items: Task[]; fromCache: boolean }> {
  const online = await isDeviceOnline();
  const pending = await getQueueCount(userId);

  if (online) {
    try {
      if (pending > 0) {
        await syncNow(userId, { pull: true });
        return { items: await getCachedTasks(userId), fromCache: false };
      }
      const remote = await api.get<Task[]>("/tasks");
      await saveTasksSnapshot(userId, remote);
      await refreshSyncStats(userId);
      return { items: await getCachedTasks(userId), fromCache: false };
    } catch (err) {
      if (!isNetworkError(err)) {
        const cached = await getCachedTasks(userId);
        if (cached.length > 0) return { items: cached, fromCache: true };
        throw err;
      }
    }
  }

  return { items: await getCachedTasks(userId), fromCache: true };
}

export async function fetchHabitsOfflineFirst(
  userId: string
): Promise<{ items: Habit[]; fromCache: boolean }> {
  const online = await isDeviceOnline();
  const pending = await getQueueCount(userId);

  if (online) {
    try {
      if (pending > 0) {
        await syncNow(userId, { pull: true });
        return { items: await getCachedHabits(userId), fromCache: false };
      }
      const remote = await api.get<Habit[]>("/habits");
      const normalized = remote.map((h) => ({ ...h, logs: h.logs ?? [] }));
      await saveHabitsSnapshot(userId, normalized);
      await refreshSyncStats(userId);
      return { items: await getCachedHabits(userId), fromCache: false };
    } catch (err) {
      if (!isNetworkError(err)) {
        const cached = await getCachedHabits(userId);
        if (cached.length > 0) return { items: cached, fromCache: true };
        throw err;
      }
    }
  }

  return { items: await getCachedHabits(userId), fromCache: true };
}

export async function fetchEventsOfflineFirst(
  userId: string
): Promise<{ items: AppEvent[]; fromCache: boolean }> {
  const online = await isDeviceOnline();
  const pending = await getQueueCount(userId);

  if (online) {
    try {
      if (pending > 0) {
        await syncNow(userId, { pull: true });
        return { items: await getCachedEvents(userId), fromCache: false };
      }
      const remote = await api.get<AppEvent[]>("/events");
      await saveEventsSnapshot(userId, remote);
      await refreshSyncStats(userId);
      return { items: await getCachedEvents(userId), fromCache: false };
    } catch (err) {
      if (!isNetworkError(err)) {
        const cached = await getCachedEvents(userId);
        if (cached.length > 0) return { items: cached, fromCache: true };
        throw err;
      }
    }
  }

  return { items: await getCachedEvents(userId), fromCache: true };
}

export async function fetchStatsOfflineFirst(
  userId: string
): Promise<{ stats: UserStats; fromCache: boolean }> {
  const online = await isDeviceOnline();
  const pending = await getQueueCount(userId);

  if (online && pending === 0) {
    try {
      const remote = await api.get<UserStats>("/users/stats");
      await saveStatsSnapshot(userId, remote);
      await refreshSyncStats(userId);
      return { stats: remote, fromCache: false };
    } catch (err) {
      if (!isNetworkError(err)) {
        const cached = await getCachedStats(userId);
        if (cached) return { stats: cached, fromCache: true };
      }
    }
  }

  // If offline or there are unsynced local mutations, compute live from SQLite!
  const localComputed = await computeLocalStats(userId);
  if (
    localComputed.tasksCompleted > 0 ||
    localComputed.habitsActive > 0 ||
    localComputed.recentActivity.length > 0
  ) {
    return { stats: localComputed, fromCache: true };
  }
  const cached = await getCachedStats(userId);
  return { stats: cached ?? localComputed, fromCache: true };
}

export async function fetchCalendarStatusOfflineFirst(
  userId: string
): Promise<{ status: CalendarStatus; fromCache: boolean }> {
  const online = await isDeviceOnline();
  if (online) {
    try {
      const remote = await api.get<CalendarStatus>("/calendar/status");
      await saveCalendarStatusSnapshot(userId, remote);
      return { status: remote, fromCache: false };
    } catch (err) {
      if (!isNetworkError(err)) {
        const cached = await getCachedCalendarStatus(userId);
        if (cached) return { status: cached, fromCache: true };
        throw err;
      }
    }
  }
  const cached = await getCachedCalendarStatus(userId);
  return { status: cached ?? { connected: false }, fromCache: true };
}

// ---------------------------------------------------------------------------
// Writes (Optimistic SQLite write + Outbox queue + Sync Worker trigger)
// ---------------------------------------------------------------------------

export interface TaskWritePayload {
  title?: string;
  description?: string;
  status?: Task["status"];
  priority?: Task["priority"];
  dueDate?: string;
}

export async function createTaskOfflineFirst(
  userId: string,
  payload: Required<Pick<TaskWritePayload, "title">> & TaskWritePayload
): Promise<{ task: Task; queuedOffline: boolean }> {
  const now = new Date().toISOString();
  const task: Task = {
    id: localId("task"),
    title: payload.title.trim(),
    description: payload.description?.trim() ?? "",
    status: payload.status ?? "TODO",
    priority: payload.priority ?? "MEDIUM",
    dueDate: payload.dueDate ? new Date(payload.dueDate).toISOString() : undefined,
    createdAt: now,
    completedAt: payload.status === "DONE" ? now : null,
    subtasks: [],
  };

  await upsertLocalTask(userId, task);
  await enqueueMutation({
    userId,
    opType: "TASK_CREATE",
    entityType: "task",
    entityId: task.id,
    payload: { ...payload },
  });

  const online = await triggerSyncIfOnline(userId);
  return { task, queuedOffline: !online };
}

export async function updateTaskOfflineFirst(
  userId: string,
  existing: Task,
  patch: TaskWritePayload
): Promise<{ task: Task; queuedOffline: boolean }> {
  const wasDone = existing.status === "DONE";
  const nextStatus = patch.status ?? existing.status;
  const isDone = nextStatus === "DONE";
  const completedAt =
    !wasDone && isDone
      ? new Date().toISOString()
      : wasDone && !isDone
        ? null
        : existing.completedAt;

  const updated: Task = {
    ...existing,
    ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
    ...(patch.description !== undefined ? { description: patch.description.trim() } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
    ...(patch.dueDate !== undefined
      ? { dueDate: patch.dueDate ? new Date(patch.dueDate).toISOString() : undefined }
      : {}),
    completedAt,
  };

  await upsertLocalTask(userId, updated);
  await enqueueMutation({
    userId,
    opType: "TASK_UPDATE",
    entityType: "task",
    entityId: existing.id,
    payload: { ...patch },
  });

  const online = await triggerSyncIfOnline(userId);
  return { task: updated, queuedOffline: !online };
}

export async function deleteTaskOfflineFirst(
  userId: string,
  taskId: string
): Promise<void> {
  await deleteLocalTask(userId, taskId);
  await enqueueMutation({
    userId,
    opType: "TASK_DELETE",
    entityType: "task",
    entityId: taskId,
  });
  await triggerSyncIfOnline(userId);
}

export async function createHabitOfflineFirst(
  userId: string,
  payload: { title: string; frequency: Habit["frequency"] }
): Promise<{ habit: Habit; queuedOffline: boolean }> {
  const habit: Habit = {
    id: localId("habit"),
    title: payload.title.trim(),
    frequency: payload.frequency,
    logs: [],
  };

  await upsertLocalHabit(userId, habit);
  await enqueueMutation({
    userId,
    opType: "HABIT_CREATE",
    entityType: "habit",
    entityId: habit.id,
    payload: { title: habit.title, frequency: habit.frequency },
  });

  const online = await triggerSyncIfOnline(userId);
  return { habit, queuedOffline: !online };
}

export async function logHabitOfflineFirst(
  userId: string,
  habit: Habit
): Promise<{ entry: HabitLog; queuedOffline: boolean }> {
  const entry: HabitLog = {
    id: localId("log"),
    completedAt: new Date().toISOString(),
  };

  const updatedHabit: Habit = {
    ...habit,
    logs: [...(habit.logs ?? []), entry],
  };

  await upsertLocalHabit(userId, updatedHabit);
  await enqueueMutation({
    userId,
    opType: "HABIT_LOG",
    entityType: "habit",
    entityId: habit.id,
  });

  const online = await triggerSyncIfOnline(userId);
  return { entry, queuedOffline: !online };
}

export async function deleteHabitOfflineFirst(
  userId: string,
  habitId: string
): Promise<void> {
  await deleteLocalHabit(userId, habitId);
  await enqueueMutation({
    userId,
    opType: "HABIT_DELETE",
    entityType: "habit",
    entityId: habitId,
  });
  await triggerSyncIfOnline(userId);
}

export interface EventWritePayload {
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  allDay: boolean;
}

export async function createEventOfflineFirst(
  userId: string,
  payload: EventWritePayload
): Promise<{ event: AppEvent; queuedOffline: boolean }> {
  const event: AppEvent = {
    id: localId("event"),
    title: payload.title.trim(),
    description: payload.description?.trim() ?? "",
    startTime: payload.startTime,
    endTime: payload.endTime,
    allDay: payload.allDay,
    createdAt: new Date().toISOString(),
  };

  await upsertLocalEvent(userId, event);
  await enqueueMutation({
    userId,
    opType: "EVENT_CREATE",
    entityType: "event",
    entityId: event.id,
    payload: { ...payload },
  });

  const online = await triggerSyncIfOnline(userId);
  return { event, queuedOffline: !online };
}

export async function updateEventOfflineFirst(
  userId: string,
  existing: AppEvent,
  payload: EventWritePayload
): Promise<{ event: AppEvent; queuedOffline: boolean }> {
  const updated: AppEvent = {
    ...existing,
    title: payload.title.trim(),
    description: payload.description?.trim() ?? "",
    startTime: payload.startTime,
    endTime: payload.endTime,
    allDay: payload.allDay,
  };

  await upsertLocalEvent(userId, updated);
  await enqueueMutation({
    userId,
    opType: "EVENT_UPDATE",
    entityType: "event",
    entityId: existing.id,
    payload: { ...payload },
  });

  const online = await triggerSyncIfOnline(userId);
  return { event: updated, queuedOffline: !online };
}

export async function deleteEventOfflineFirst(
  userId: string,
  eventId: string
): Promise<void> {
  await deleteLocalEvent(userId, eventId);
  await enqueueMutation({
    userId,
    opType: "EVENT_DELETE",
    entityType: "event",
    entityId: eventId,
  });
  await triggerSyncIfOnline(userId);
}

export async function submitFeedbackOfflineFirst(
  userId: string,
  payload: Record<string, unknown>
): Promise<{ queuedOffline: boolean }> {
  const online = await isDeviceOnline();
  if (online) {
    try {
      await api.post("/feedback", payload);
      return { queuedOffline: false };
    } catch (err) {
      if (!isNetworkError(err)) throw err;
    }
  }

  await enqueueMutation({
    userId,
    opType: "FEEDBACK_SUBMIT",
    entityType: "feedback",
    entityId: localId("fb"),
    payload,
  });
  await triggerSyncIfOnline(userId);
  return { queuedOffline: true };
}
