import { create } from "zustand";
import api from "../api/axios.ts";

export interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  allDay: boolean;
  googleEventId?: string;
  isFromGoogle: boolean;
  createdAt: string;
}

interface EventState {
  events: Event[];
  isLoading: boolean;
  error: string | null;
  fetchEvents: () => Promise<void>;
  createEvent: (event: Partial<Event> & { syncToGoogle?: boolean }) => Promise<void>;
  updateEvent: (id: string, updates: Partial<Event> & { syncToGoogle?: boolean }) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
}

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  isLoading: false,
  error: null,
  fetchEvents: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/events");
      set({ events: data.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || "Failed to fetch events", isLoading: false });
    }
  },
  createEvent: async (event) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post("/events", event);
      set({ events: [...get().events, data.data], isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || "Failed to create event", isLoading: false });
      throw err;
    }
  },
  updateEvent: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.patch(`/events/${id}`, updates);
      set({
        events: get().events.map((e) => (e.id === id ? data.data : e)),
        isLoading: false
      });
    } catch (err: any) {
      set({ error: err.response?.data?.error || "Failed to update event", isLoading: false });
      throw err;
    }
  },
  deleteEvent: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/events/${id}`);
      set({ 
        events: get().events.filter((e) => e.id !== id),
        isLoading: false 
      });
    } catch (err: any) {
      set({ error: err.response?.data?.error || "Failed to delete event", isLoading: false });
      throw err;
    }
  }
}));
