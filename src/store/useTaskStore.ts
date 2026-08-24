import { create } from "zustand";
import api from "../api/axios.ts";
import { Task, SubtaskLevel2, SubtaskLevel3 } from "../types/task.ts";
import { useToastStore } from "./useToastStore.ts";

export type { Task, SubtaskLevel2, SubtaskLevel3 };
export type Subtask = SubtaskLevel2;

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  recentlyUpdatedTaskId: string | null;
  fetchTasks: () => Promise<void>;
  addTask: (task: Partial<Task>) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Task>, options?: { silent?: boolean; customMessage?: string }) => Promise<Task | null>;
  deleteTask: (id: string) => Promise<boolean>;
  setRecentlyUpdatedTaskId: (id: string | null) => void;
}

let recentTaskTimer: any = null;

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  recentlyUpdatedTaskId: null,
  setRecentlyUpdatedTaskId: (id: string | null) => {
    if (recentTaskTimer) clearTimeout(recentTaskTimer);
    set({ recentlyUpdatedTaskId: id });
    if (id) {
      recentTaskTimer = setTimeout(() => {
        set({ recentlyUpdatedTaskId: null });
      }, 3500);
    }
  },
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
      get().setRecentlyUpdatedTaskId(newTask.id);
      useToastStore.getState().addToast(`Task "${newTask.title}" created successfully!`, "success");
      return newTask;
    } catch {
      return null;
    }
  },
  updateTask: async (id, updates, options = {}) => {
    try {
      const { data } = await api.put(`/tasks/${id}`, updates);
      const updatedTask = data.data;
      set({
        tasks: get().tasks.map((t) => (t.id === id ? updatedTask : t))
      });
      get().setRecentlyUpdatedTaskId(id);

      if (!options.silent) {
        if (options.customMessage) {
          useToastStore.getState().addToast(options.customMessage, "success");
        } else if (updates.status === "DONE") {
          useToastStore.getState().addToast(`"${updatedTask.title}" marked as Completed! 🎉`, "success");
        } else if (updates.status) {
          const statusLabels: Record<string, string> = {
            TODO: "To Do",
            IN_PROGRESS: "In Progress",
            DONE: "Done"
          };
          useToastStore.getState().addToast(`Task moved to ${statusLabels[updates.status] || updates.status}`, "success");
        } else {
          useToastStore.getState().addToast(`Task "${updatedTask.title}" updated successfully!`, "success");
        }
      }
      return updatedTask;
    } catch {
      return null;
    }
  },
  deleteTask: async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      set({ tasks: get().tasks.filter((t) => t.id !== id) });
      useToastStore.getState().addToast("Task deleted successfully", "info");
      return true;
    } catch {
      return false;
    }
  }
}));
