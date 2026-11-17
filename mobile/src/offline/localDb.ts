import * as SQLite from "expo-sqlite";
import { subDays, startOfDay } from "date-fns";
import { AppEvent, CalendarStatus, Habit, Task, User, UserStats } from "../types";

export type SyncEntityType = "task" | "habit" | "event" | "feedback";

export type SyncOpType =
  | "TASK_CREATE"
  | "TASK_UPDATE"
  | "TASK_DELETE"
  | "HABIT_CREATE"
  | "HABIT_LOG"
  | "HABIT_DELETE"
  | "EVENT_CREATE"
  | "EVENT_UPDATE"
  | "EVENT_DELETE"
  | "FEEDBACK_SUBMIT";

export interface SyncQueueItem {
  id: number;
  userId: string;
  opType: SyncOpType;
  entityType: SyncEntityType;
  entityId: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
  attempts: number;
  lastError: string | null;
}

export interface LocalCacheSummary {
  tasks: number;
  habits: number;
  events: number;
  pendingMutations: number;
  lastSyncedAt: string | null;
}

interface RawRow {
  id: string;
  data: string;
}

interface RawQueueRow {
  id: number;
  user_id: string;
  op_type: SyncOpType;
  entity_type: SyncEntityType;
  entity_id: string;
  payload: string | null;
  created_at: string;
  attempts: number;
  last_error: string | null;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks (user_id);

    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_habits_user ON habits (user_id);

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_user ON events (user_id);

    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      op_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      payload TEXT,
      created_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sync_queue_user ON sync_queue (user_id, id);
  `);
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync("bloom_offline.db");
      await initSchema(db);
      return db;
    })();
  }
  return dbPromise;
}

function safeJsonParse<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setKv(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)",
    [key, JSON.stringify(value)]
  );
}

export async function getKv<T>(key: string): Promise<T | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM kv_store WHERE key = ?",
    [key]
  );
  return safeJsonParse<T>(row?.value);
}

export async function deleteKv(key: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM kv_store WHERE key = ?", [key]);
}

export async function setActiveUserId(userId: string | null): Promise<void> {
  if (userId) {
    await setKv("active_user_id", userId);
  } else {
    await deleteKv("active_user_id");
  }
}

export async function getActiveUserId(): Promise<string | null> {
  return getKv<string>("active_user_id");
}

export async function saveCachedUser(user: User): Promise<void> {
  await setKv(`user:${user.id}`, user);
}

export async function getCachedUser(userId: string): Promise<User | null> {
  return getKv<User>(`user:${userId}`);
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function getCachedTasks(userId: string): Promise<Task[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawRow>(
    "SELECT id, data FROM tasks WHERE user_id = ?",
    [userId]
  );
  const items: Task[] = [];
  for (const r of rows) {
    const parsed = safeJsonParse<Task>(r.data);
    if (parsed) items.push(parsed);
  }
  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function upsertLocalTask(userId: string, task: Task): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO tasks (id, user_id, data, updated_at) VALUES (?, ?, ?, ?)",
    [task.id, userId, JSON.stringify(task), new Date().toISOString()]
  );
}

export async function deleteLocalTask(userId: string, taskId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM tasks WHERE user_id = ? AND id = ?", [userId, taskId]);
}

export async function replaceTaskId(
  userId: string,
  oldId: string,
  newTask: Task
): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM tasks WHERE user_id = ? AND id = ?", [userId, oldId]);
    await db.runAsync(
      "INSERT OR REPLACE INTO tasks (id, user_id, data, updated_at) VALUES (?, ?, ?, ?)",
      [newTask.id, userId, JSON.stringify(newTask), new Date().toISOString()]
    );
  });
}

export async function saveTasksSnapshot(userId: string, serverTasks: Task[]): Promise<void> {
  const db = await getDb();
  const pending = await getPendingQueue(userId);
  const pendingCreateIds = new Set(
    pending.filter((q) => q.opType === "TASK_CREATE").map((q) => q.entityId)
  );
  const pendingUpdateIds = new Set(
    pending.filter((q) => q.opType === "TASK_UPDATE").map((q) => q.entityId)
  );
  const pendingDeleteIds = new Set(
    pending.filter((q) => q.opType === "TASK_DELETE").map((q) => q.entityId)
  );

  const existingLocal = await getCachedTasks(userId);
  const existingMap = new Map(existingLocal.map((t) => [t.id, t]));

  const merged: Task[] = [];
  for (const srv of serverTasks) {
    if (pendingDeleteIds.has(srv.id)) continue;
    if (pendingUpdateIds.has(srv.id) && existingMap.has(srv.id)) {
      merged.push(existingMap.get(srv.id)!);
    } else {
      merged.push(srv);
    }
  }
  for (const local of existingLocal) {
    if (pendingCreateIds.has(local.id) && !merged.some((m) => m.id === local.id)) {
      merged.unshift(local);
    }
  }

  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM tasks WHERE user_id = ?", [userId]);
    for (const task of merged) {
      await db.runAsync(
        "INSERT INTO tasks (id, user_id, data, updated_at) VALUES (?, ?, ?, ?)",
        [task.id, userId, JSON.stringify(task), now]
      );
    }
  });
}

// ---------------------------------------------------------------------------
// Habits
// ---------------------------------------------------------------------------

export async function getCachedHabits(userId: string): Promise<Habit[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawRow>(
    "SELECT id, data FROM habits WHERE user_id = ?",
    [userId]
  );
  const items: Habit[] = [];
  for (const r of rows) {
    const parsed = safeJsonParse<Habit>(r.data);
    if (parsed) items.push({ ...parsed, logs: parsed.logs ?? [] });
  }
  return items;
}

export async function upsertLocalHabit(userId: string, habit: Habit): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO habits (id, user_id, data, updated_at) VALUES (?, ?, ?, ?)",
    [habit.id, userId, JSON.stringify({ ...habit, logs: habit.logs ?? [] }), new Date().toISOString()]
  );
}

export async function deleteLocalHabit(userId: string, habitId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM habits WHERE user_id = ? AND id = ?", [userId, habitId]);
}

export async function replaceHabitId(
  userId: string,
  oldId: string,
  newHabit: Habit
): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<RawRow>(
    "SELECT id, data FROM habits WHERE user_id = ? AND id = ?",
    [userId, oldId]
  );
  const oldParsed = safeJsonParse<Habit>(existing?.data);
  const mergedLogs =
    (newHabit.logs && newHabit.logs.length > 0 ? newHabit.logs : oldParsed?.logs) ?? [];

  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM habits WHERE user_id = ? AND id = ?", [userId, oldId]);
    await db.runAsync(
      "INSERT OR REPLACE INTO habits (id, user_id, data, updated_at) VALUES (?, ?, ?, ?)",
      [
        newHabit.id,
        userId,
        JSON.stringify({ ...newHabit, logs: mergedLogs }),
        new Date().toISOString(),
      ]
    );
  });
}

export async function saveHabitsSnapshot(userId: string, serverHabits: Habit[]): Promise<void> {
  const db = await getDb();
  const pending = await getPendingQueue(userId);
  const pendingCreateIds = new Set(
    pending.filter((q) => q.opType === "HABIT_CREATE").map((q) => q.entityId)
  );
  const pendingLogIds = new Set(
    pending.filter((q) => q.opType === "HABIT_LOG").map((q) => q.entityId)
  );
  const pendingDeleteIds = new Set(
    pending.filter((q) => q.opType === "HABIT_DELETE").map((q) => q.entityId)
  );

  const existingLocal = await getCachedHabits(userId);
  const existingMap = new Map(existingLocal.map((h) => [h.id, h]));

  const merged: Habit[] = [];
  for (const srv of serverHabits) {
    if (pendingDeleteIds.has(srv.id)) continue;
    if (pendingLogIds.has(srv.id) && existingMap.has(srv.id)) {
      merged.push(existingMap.get(srv.id)!);
    } else {
      merged.push({ ...srv, logs: srv.logs ?? [] });
    }
  }
  for (const local of existingLocal) {
    if (pendingCreateIds.has(local.id) && !merged.some((m) => m.id === local.id)) {
      merged.unshift(local);
    }
  }

  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM habits WHERE user_id = ?", [userId]);
    for (const habit of merged) {
      await db.runAsync(
        "INSERT INTO habits (id, user_id, data, updated_at) VALUES (?, ?, ?, ?)",
        [habit.id, userId, JSON.stringify(habit), now]
      );
    }
  });
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export async function getCachedEvents(userId: string): Promise<AppEvent[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawRow>(
    "SELECT id, data FROM events WHERE user_id = ?",
    [userId]
  );
  const items: AppEvent[] = [];
  for (const r of rows) {
    const parsed = safeJsonParse<AppEvent>(r.data);
    if (parsed) items.push(parsed);
  }
  return items.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
}

export async function upsertLocalEvent(userId: string, event: AppEvent): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO events (id, user_id, data, updated_at) VALUES (?, ?, ?, ?)",
    [event.id, userId, JSON.stringify(event), new Date().toISOString()]
  );
}

export async function deleteLocalEvent(userId: string, eventId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM events WHERE user_id = ? AND id = ?", [userId, eventId]);
}

export async function replaceEventId(
  userId: string,
  oldId: string,
  newEvent: AppEvent
): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM events WHERE user_id = ? AND id = ?", [userId, oldId]);
    await db.runAsync(
      "INSERT OR REPLACE INTO events (id, user_id, data, updated_at) VALUES (?, ?, ?, ?)",
      [newEvent.id, userId, JSON.stringify(newEvent), new Date().toISOString()]
    );
  });
}

export async function saveEventsSnapshot(
  userId: string,
  serverEvents: AppEvent[]
): Promise<void> {
  const db = await getDb();
  const pending = await getPendingQueue(userId);
  const pendingCreateIds = new Set(
    pending.filter((q) => q.opType === "EVENT_CREATE").map((q) => q.entityId)
  );
  const pendingUpdateIds = new Set(
    pending.filter((q) => q.opType === "EVENT_UPDATE").map((q) => q.entityId)
  );
  const pendingDeleteIds = new Set(
    pending.filter((q) => q.opType === "EVENT_DELETE").map((q) => q.entityId)
  );

  const existingLocal = await getCachedEvents(userId);
  const existingMap = new Map(existingLocal.map((e) => [e.id, e]));

  const merged: AppEvent[] = [];
  for (const srv of serverEvents) {
    if (pendingDeleteIds.has(srv.id)) continue;
    if (pendingUpdateIds.has(srv.id) && existingMap.has(srv.id)) {
      merged.push(existingMap.get(srv.id)!);
    } else {
      merged.push(srv);
    }
  }
  for (const local of existingLocal) {
    if (pendingCreateIds.has(local.id) && !merged.some((m) => m.id === local.id)) {
      merged.push(local);
    }
  }

  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM events WHERE user_id = ?", [userId]);
    for (const ev of merged) {
      await db.runAsync(
        "INSERT INTO events (id, user_id, data, updated_at) VALUES (?, ?, ?, ?)",
        [ev.id, userId, JSON.stringify(ev), now]
      );
    }
  });
}

// ---------------------------------------------------------------------------
// Stats & Calendar Status Cache
// ---------------------------------------------------------------------------

export async function saveStatsSnapshot(userId: string, stats: UserStats): Promise<void> {
  await setKv(`stats:${userId}`, stats);
}

export async function getCachedStats(userId: string): Promise<UserStats | null> {
  return getKv<UserStats>(`stats:${userId}`);
}

export async function computeLocalStats(userId: string): Promise<UserStats> {
  const [tasks, habits] = await Promise.all([
    getCachedTasks(userId),
    getCachedHabits(userId),
  ]);

  const tasksCompleted = tasks.filter((t) => t.status === "DONE").length;
  const recentActivity = [...tasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const taskHistory = [];
  const habitHistory = [];

  for (let i = 6; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const start = startOfDay(date);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const tasksCount = tasks.filter((t) => {
      if (t.status !== "DONE" || !t.completedAt) return false;
      const compDate = new Date(t.completedAt);
      return compDate >= start && compDate <= end;
    }).length;

    let habitsCount = 0;
    for (const h of habits) {
      for (const l of h.logs ?? []) {
        if (!l.completedAt) continue;
        const compDate = new Date(l.completedAt);
        if (compDate >= start && compDate <= end) {
          habitsCount++;
        }
      }
    }

    const day = date.toLocaleDateString("en-US", { weekday: "short" });
    taskHistory.push({ day, count: tasksCount });
    habitHistory.push({ day, count: habitsCount });
  }

  return {
    tasksCompleted,
    habitsActive: habits.length,
    recentActivity,
    taskHistory,
    habitHistory,
  };
}

export async function saveCalendarStatusSnapshot(
  userId: string,
  status: CalendarStatus
): Promise<void> {
  await setKv(`calendar_status:${userId}`, status);
}

export async function getCachedCalendarStatus(
  userId: string
): Promise<CalendarStatus | null> {
  return getKv<CalendarStatus>(`calendar_status:${userId}`);
}

// ---------------------------------------------------------------------------
// Offline Mutation Queue (Outbox)
// ---------------------------------------------------------------------------

function mapQueueRow(r: RawQueueRow): SyncQueueItem {
  return {
    id: r.id,
    userId: r.user_id,
    opType: r.op_type,
    entityType: r.entity_type,
    entityId: r.entity_id,
    payload: safeJsonParse<Record<string, unknown>>(r.payload),
    createdAt: r.created_at,
    attempts: r.attempts,
    lastError: r.last_error,
  };
}

export async function getPendingQueue(userId: string): Promise<SyncQueueItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawQueueRow>(
    "SELECT * FROM sync_queue WHERE user_id = ? ORDER BY id ASC",
    [userId]
  );
  return rows.map(mapQueueRow);
}

export async function getQueueCount(userId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM sync_queue WHERE user_id = ?",
    [userId]
  );
  return row?.count ?? 0;
}

export async function enqueueMutation(params: {
  userId: string;
  opType: SyncOpType;
  entityType: SyncEntityType;
  entityId: string;
  payload?: Record<string, unknown> | null;
}): Promise<void> {
  const db = await getDb();
  const { userId, opType, entityType, entityId, payload = null } = params;
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    // Coalesce updates/deletes on queued items so redundant offline edits stay atomic.
    if (opType === "TASK_UPDATE" || opType === "EVENT_UPDATE") {
      const createOp = opType === "TASK_UPDATE" ? "TASK_CREATE" : "EVENT_CREATE";
      const existingCreate = await db.getFirstAsync<RawQueueRow>(
        "SELECT * FROM sync_queue WHERE user_id = ? AND entity_id = ? AND op_type = ? ORDER BY id ASC LIMIT 1",
        [userId, entityId, createOp]
      );
      if (existingCreate) {
        const merged = {
          ...(safeJsonParse<Record<string, unknown>>(existingCreate.payload) ?? {}),
          ...(payload ?? {}),
        };
        await db.runAsync("UPDATE sync_queue SET payload = ? WHERE id = ?", [
          JSON.stringify(merged),
          existingCreate.id,
        ]);
        return;
      }

      const existingUpdate = await db.getFirstAsync<RawQueueRow>(
        "SELECT * FROM sync_queue WHERE user_id = ? AND entity_id = ? AND op_type = ? ORDER BY id DESC LIMIT 1",
        [userId, entityId, opType]
      );
      if (existingUpdate) {
        const merged = {
          ...(safeJsonParse<Record<string, unknown>>(existingUpdate.payload) ?? {}),
          ...(payload ?? {}),
        };
        await db.runAsync("UPDATE sync_queue SET payload = ? WHERE id = ?", [
          JSON.stringify(merged),
          existingUpdate.id,
        ]);
        return;
      }
    }

    if (
      opType === "TASK_DELETE" ||
      opType === "HABIT_DELETE" ||
      opType === "EVENT_DELETE"
    ) {
      const createOp =
        opType === "TASK_DELETE"
          ? "TASK_CREATE"
          : opType === "HABIT_DELETE"
            ? "HABIT_CREATE"
            : "EVENT_CREATE";
      const existingCreate = await db.getFirstAsync<RawQueueRow>(
        "SELECT * FROM sync_queue WHERE user_id = ? AND entity_id = ? AND op_type = ? LIMIT 1",
        [userId, entityId, createOp]
      );
      if (existingCreate || entityId.startsWith("local-")) {
        await db.runAsync(
          "DELETE FROM sync_queue WHERE user_id = ? AND entity_id = ?",
          [userId, entityId]
        );
        return;
      }
      // Remove pending updates/logs for this entity since it is being deleted.
      await db.runAsync(
        "DELETE FROM sync_queue WHERE user_id = ? AND entity_id = ? AND op_type != ?",
        [userId, entityId, opType]
      );
    }

    if (opType === "HABIT_LOG") {
      const existingLog = await db.getFirstAsync<RawQueueRow>(
        "SELECT * FROM sync_queue WHERE user_id = ? AND entity_id = ? AND op_type = 'HABIT_LOG' LIMIT 1",
        [userId, entityId]
      );
      if (existingLog) return;
    }

    await db.runAsync(
      "INSERT INTO sync_queue (user_id, op_type, entity_type, entity_id, payload, created_at, attempts, last_error) VALUES (?, ?, ?, ?, ?, ?, 0, NULL)",
      [
        userId,
        opType,
        entityType,
        entityId,
        payload ? JSON.stringify(payload) : null,
        now,
      ]
    );
  });
}

export async function removeQueueItem(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM sync_queue WHERE id = ?", [id]);
}

export async function markQueueItemError(id: number, errorMessage: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE sync_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?",
    [errorMessage, id]
  );
}

export async function updateQueueEntityId(
  userId: string,
  oldEntityId: string,
  newEntityId: string
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE sync_queue SET entity_id = ? WHERE user_id = ? AND entity_id = ?",
    [newEntityId, userId, oldEntityId]
  );
}

export async function getLastSyncedAt(userId: string): Promise<string | null> {
  return getKv<string>(`last_synced_at:${userId}`);
}

export async function setLastSyncedAt(userId: string, iso: string): Promise<void> {
  await setKv(`last_synced_at:${userId}`, iso);
}

export async function getCacheSummary(userId: string): Promise<LocalCacheSummary> {
  const db = await getDb();
  const [taskRow, habitRow, eventRow, pendingRow, lastSyncedAt] = await Promise.all([
    db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM tasks WHERE user_id = ?", [userId]),
    db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM habits WHERE user_id = ?", [userId]),
    db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM events WHERE user_id = ?", [userId]),
    db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM sync_queue WHERE user_id = ?", [userId]),
    getLastSyncedAt(userId),
  ]);

  return {
    tasks: taskRow?.c ?? 0,
    habits: habitRow?.c ?? 0,
    events: eventRow?.c ?? 0,
    pendingMutations: pendingRow?.c ?? 0,
    lastSyncedAt,
  };
}

export async function clearUserOfflineData(
  userId: string,
  includeQueue = false
): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM tasks WHERE user_id = ?", [userId]);
    await db.runAsync("DELETE FROM habits WHERE user_id = ?", [userId]);
    await db.runAsync("DELETE FROM events WHERE user_id = ?", [userId]);
    if (includeQueue) {
      await db.runAsync("DELETE FROM sync_queue WHERE user_id = ?", [userId]);
    }
  });
  await Promise.all([
    deleteKv(`stats:${userId}`),
    deleteKv(`calendar_status:${userId}`),
    deleteKv(`last_synced_at:${userId}`),
  ]);
}
