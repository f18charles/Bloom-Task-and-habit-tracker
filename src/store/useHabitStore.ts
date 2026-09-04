import { create } from "zustand";
import api from "../api/axios.ts";
import { useToastStore } from "./useToastStore.ts";

export interface Habit {
  id: string;
  title: string;
  frequency: "DAILY" | "WEEKLY";
  logs: { completedAt: string }[];
}

interface HabitState {
  habits: Habit[];
  isLoading: boolean;
  fetchHabits: () => Promise<void>;
  addHabit: (habit: Partial<Habit>) => Promise<void>;
  logHabit: (id: string) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  isLoading: false,
  fetchHabits: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get("/habits");
      set({ habits: data.data || [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
  addHabit: async (habit) => {
    try {
      const { data } = await api.post("/habits", habit);
      set({ habits: [...get().habits, data.data] });
      useToastStore.getState().addToast(`Habit "${data.data.title}" created successfully!`, "success");
    } catch {
      // Handled via toast interceptor
    }
  },
  logHabit: async (id) => {
    try {
      const { data } = await api.post(`/habits/${id}/log`);
      const currentHabit = get().habits.find(h => h.id === id);
      set({
        habits: get().habits.map((h) => 
          h.id === id ? { ...h, logs: [...(h.logs || []), data.data] } : h
        )
      });
      useToastStore.getState().addToast(`Logged "${currentHabit?.title || "Habit"}" for today! 🎉`, "success");
    } catch {
      // Handled via toast interceptor
    }
  },
  deleteHabit: async (id) => {
    try {
      await api.delete(`/habits/${id}`);
      set({ habits: get().habits.filter((h) => h.id !== id) });
      useToastStore.getState().addToast("Habit deleted successfully", "info");
    } catch {
      // Handled via toast interceptor
    }
  }
}));
