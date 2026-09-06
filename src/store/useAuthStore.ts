import { create } from "zustand";
import api from "../api/axios.ts";

interface User {
  id: string;
  email: string;
  displayName: string;
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

const getInitialUser = (): User | null => {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("bloom-user") : null;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const initialToken = typeof window !== "undefined" ? localStorage.getItem("bloom-token") : null;
const initialUser = getInitialUser();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  token: initialToken,
  isLoading: !!initialToken && !initialUser,
  setUser: (user) => {
    if (user) localStorage.setItem("bloom-user", JSON.stringify(user));
    else localStorage.removeItem("bloom-user");
    set({ user });
  },
  setToken: (token) => {
    if (token) localStorage.setItem("bloom-token", token);
    else localStorage.removeItem("bloom-token");
    set({ token });
  },
  login: async (credentials) => {
    const { data } = await api.post("/auth/login", credentials);
    const user = data.data.user;
    const token = data.data.token;
    set({ user, token, isLoading: false });
    localStorage.setItem("bloom-token", token);
    localStorage.setItem("bloom-user", JSON.stringify(user));
  },
  register: async (registerData) => {
    const { data } = await api.post("/auth/register", registerData);
    const user = data.data.user;
    const token = data.data.token;
    set({ user, token, isLoading: false });
    localStorage.setItem("bloom-token", token);
    localStorage.setItem("bloom-user", JSON.stringify(user));
  },
  logout: () => {
    localStorage.removeItem("bloom-token");
    localStorage.removeItem("bloom-user");
    set({ user: null, token: null, isLoading: false });
  },
  checkAuth: async () => {
    const token = localStorage.getItem("bloom-token");
    if (!token) {
      set({ user: null, token: null, isLoading: false });
      localStorage.removeItem("bloom-user");
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      const user = data.data;
      set({ user, isLoading: false });
      localStorage.setItem("bloom-user", JSON.stringify(user));
    } catch {
      localStorage.removeItem("bloom-token");
      localStorage.removeItem("bloom-user");
      set({ user: null, token: null, isLoading: false });
    }
  }
}));
