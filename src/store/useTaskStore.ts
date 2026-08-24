import { create } from "zustand";
import api from "../api/axios.ts";
import { Task, SubtaskLevel2, SubtaskLevel3 } from "../types/task.ts";

export type { Task, SubtaskLevel2, SubtaskLevel3 };
export type Subtask = SubtaskLevel2;

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  fetchTasks: () => Promise<void>;
  addTask: (task: Partial<Task>) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task | null>;
  deleteTask: (id: string) => Promise<boolean>;
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
      const newTask = data.data;
      set({ tasks: [newTask, ...get().tasks] });
      return newTask;
    } catch {
      return null;
    }
  },
  updateTask: async (id, updates) => {
    try {
      const { data } = await api.put(`/tasks/${id}`, updates);
      const updatedTask = data.data;
      set({
        tasks: get().tasks.map((t) => (t.id === id ? updatedTask : t))
      });
      return updatedTask;
    } catch {
      return null;
    }
  },
  deleteTask: async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      set({ tasks: get().tasks.filter((t) => t.id !== id) });
      return true;
    } catch {
      return false;
    }
  }
}));
