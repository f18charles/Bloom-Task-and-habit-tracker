export interface SubtaskLevel3 {
  id: string;
  title: string;
  isCompleted: boolean;
  createdAt?: string;
}

export interface SubtaskLevel2 {
  id: string;
  title: string;
  isCompleted: boolean;
  createdAt?: string;
  subtasks?: SubtaskLevel3[];
}

// Backward compatibility alias if needed
export type Subtask = SubtaskLevel2;

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string;
  reminderAt?: string;
  isRecurring?: boolean;
  recurrenceRule?: "DAILY" | "WEEKLY" | "MONTHLY";
  googleEventId?: string;
  createdAt: string;
  completedAt?: string | null;
  subtasks?: SubtaskLevel2[];
}
