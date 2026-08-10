import { create } from "zustand";
import api from "../api/axios.ts";

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate?: string;
  points: number;
  googleEventId?: string;
  createdAt: string;
  subtasks: Subtask[];
}

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  fetchTasks: () => Promise<void>;
  addTask: (task: Partial<Task>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  fetchTasks: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get("/tasks");
      set({ tasks: data.data || [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
  addTask: async (task) => {
    try {
      const { data } = await api.post("/tasks", task);
      set({ tasks: [...get().tasks, data.data] });
    } catch {
      // Handled via toast interceptor
    }
  },
  updateTask: async (id, updates) => {
    try {
      const { data } = await api.put(`/tasks/${id}`, updates);
      set({
        tasks: get().tasks.map((t) => (t.id === id ? data.data : t))
      });
    } catch {
      // Handled via toast interceptor
    }
  },
  deleteTask: async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      set({ tasks: get().tasks.filter((t) => t.id !== id) });
    } catch {
      // Handled via toast interceptor
    }
  }
}));
