export interface User {
  id: string;
  email: string;
  displayName: string;
}

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type Status = "TODO" | "IN_PROGRESS" | "DONE";

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  createdAt?: string;
  subtasks?: Subtask[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: Status;
  priority: Priority;
  dueDate?: string;
  createdAt: string;
  completedAt?: string | null;
  subtasks?: Subtask[];
  googleEventId?: string;
  isRecurring?: boolean;
  recurrenceRule?: "DAILY" | "WEEKLY" | "MONTHLY";
}

export interface HabitLog {
  id: string;
  completedAt: string;
}

export interface Habit {
  id: string;
  title: string;
  frequency: "DAILY" | "WEEKLY";
  reminderTime?: string | null;
  logs: HabitLog[];
}

export interface AppEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  allDay: boolean;
  googleEventId?: string;
  isFromGoogle?: boolean;
  createdAt?: string;
}

export interface StatsDay {
  day: string;
  count: number;
}

export interface UserStats {
  tasksCompleted: number;
  habitsActive: number;
  recentActivity: Task[];
  taskHistory: StatsDay[];
  habitHistory: StatsDay[];
}

export interface CalendarStatus {
  connected: boolean;
  lastSyncedAt?: string | null;
}
