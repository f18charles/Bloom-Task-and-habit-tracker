import { Habit, Task } from "./types";

export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const isOverdue = (t: Task) =>
  t.status !== "DONE" && !!t.dueDate && new Date(t.dueDate) < startOfToday();

export const isDueToday = (t: Task) =>
  t.status !== "DONE" && !!t.dueDate && dateKey(new Date(t.dueDate)) === dateKey(new Date());

export const formatDue = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const logsOf = (h: Habit) => (Array.isArray(h.logs) ? h.logs : []);

export const loggedToday = (h: Habit) => {
  const today = dateKey(new Date());
  return logsOf(h).some((l) => dateKey(new Date(l.completedAt)) === today);
};

const weekStart = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday
  return dateKey(x);
};

/** Consecutive days (DAILY) or weeks (WEEKLY) with a log, ending today/this week or the one before. */
export function habitStreak(h: Habit): number {
  const weekly = h.frequency === "WEEKLY";
  const days = new Set(logsOf(h).map((l) => dateKey(new Date(l.completedAt))));
  const weeks = new Set(logsOf(h).map((l) => weekStart(new Date(l.completedAt))));
  const has = (d: Date) => (weekly ? weeks.has(weekStart(d)) : days.has(dateKey(d)));
  const step = weekly ? 7 : 1;

  const cursor = new Date();
  if (!has(cursor)) cursor.setDate(cursor.getDate() - step);
  let n = 0;
  while (has(cursor)) {
    n++;
    cursor.setDate(cursor.getDate() - step);
  }
  return n;
}
