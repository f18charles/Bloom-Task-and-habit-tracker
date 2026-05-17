import { create } from "zustand";
import api from "../api/axios.ts";

export interface Habit {
  id: string;
  title: string;
  frequency: "DAILY" | "WEEKLY";
  points: number;
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
    const { data } = await api.get("/habits");
    set({ habits: data.data, isLoading: false });
  },
  addHabit: async (habit) => {
    const { data } = await api.post("/habits", habit);
    set({ habits: [...get().habits, data.data] });
  },
  logHabit: async (id) => {
    const { data } = await api.post(`/habits/${id}/log`);
    // Optimistic update or refetch
    set({
      habits: get().habits.map((h) => 
        h.id === id ? { ...h, logs: [...(h.logs || []), data.data] } : h
      )
    });
  },
  deleteHabit: async (id) => {
    await api.delete(`/habits/${id}`);
    set({ habits: get().habits.filter((h) => h.id !== id) });
  }
}));
