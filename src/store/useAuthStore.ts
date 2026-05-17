import { create } from "zustand";
import api from "../api/axios.ts";

interface User {
  id: string;
  email: string;
  displayName: string;
  points: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (credentials: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem("bloom-token"),
  isLoading: true,
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) localStorage.setItem("bloom-token", token);
    else localStorage.removeItem("bloom-token");
    set({ token });
  },
  login: async (credentials) => {
    const { data } = await api.post("/auth/login", credentials);
    set({ user: data.data.user, token: data.data.token });
    localStorage.setItem("bloom-token", data.data.token);
  },
  register: async (registerData) => {
    const { data } = await api.post("/auth/register", registerData);
    set({ user: data.data.user, token: data.data.token });
    localStorage.setItem("bloom-token", data.data.token);
  },
  logout: () => {
    localStorage.removeItem("bloom-token");
    set({ user: null, token: null });
  },
  checkAuth: async () => {
    const token = localStorage.getItem("bloom-token");
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data.data, isLoading: false });
    } catch (error) {
      localStorage.removeItem("bloom-token");
      set({ user: null, token: null, isLoading: false });
    }
  }
}));
