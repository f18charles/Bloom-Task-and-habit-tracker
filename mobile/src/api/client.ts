import axios, { AxiosError } from "axios";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";

const TOKEN_KEY = "bloom_token";
const BACKEND_PORT = 3000;

const trimUrl = (url: string) => url.replace(/\/+$/, "");

// In development the Expo dev server already knows the machine's LAN address
// (e.g. "192.168.1.200:8081"), so reuse that host for the backend on port 3000.
// This makes physical devices and emulators work without hardcoding an IP.
function devServerHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants.expoGoConfig as { debuggerHost?: string } | null)?.debuggerHost ||
    "";
  if (!hostUri) return null;
  // Strip scheme/path and the port, keep the host only.
  return (
    hostUri
      .replace(/^[a-z]+:\/\//i, "")
      .replace(/\/.*$/, "")
      .replace(/:\d+$/, "")
      .replace(/^\[|\]$/g, "") || null
  );
}

function resolveApiBaseUrl(): string {
  // 1. Explicit override always wins (useful for local dev or previews).
  const explicit = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicit) return trimUrl(explicit);

  // 2. The deployed backend configured in app.json.
  const configured = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  if (configured) return trimUrl(configured);

  // 3. Fall back to the machine serving the Expo bundle (local development).
  const host = devServerHost();
  if (host) {
    const isLoopback = host === "localhost" || host === "127.0.0.1" || host === "::1";
    if (!isLoopback) return `http://${host}:${BACKEND_PORT}`;
    // Android emulator maps the host loopback to 10.0.2.2.
    return Platform.OS === "android"
      ? `http://10.0.2.2:${BACKEND_PORT}`
      : `http://127.0.0.1:${BACKEND_PORT}`;
  }

  // 4. Platform defaults when nothing else is configured.
  return Platform.OS === "android"
    ? `http://10.0.2.2:${BACKEND_PORT}`
    : `http://127.0.0.1:${BACKEND_PORT}`;
}

export const API_BASE_URL: string = resolveApiBaseUrl();

export const tokenStore = {
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  set: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

export const mobileApi = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

mobileApi.interceptors.request.use(async (config) => {
  const token = await tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

mobileApi.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const url = error.config?.url ?? "";
    const isAuthForm = url.includes("/auth/login") || url.includes("/auth/register");
    if (error.response?.status === 401 && !isAuthForm) {
      await tokenStore.clear();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

// The backend wraps every payload as { data: ... }; unwrap it here once.
export const api = {
  get: async <T>(url: string) => (await mobileApi.get<{ data: T }>(url)).data.data,
  post: async <T>(url: string, body?: unknown) =>
    (await mobileApi.post<{ data: T }>(url, body)).data.data,
  put: async <T>(url: string, body?: unknown) =>
    (await mobileApi.put<{ data: T }>(url, body)).data.data,
  patch: async <T>(url: string, body?: unknown) =>
    (await mobileApi.patch<{ data: T }>(url, body)).data.data,
  del: async <T>(url: string) => (await mobileApi.delete<{ data: T }>(url)).data.data,
};

export function errorMessage(err: unknown): string {
  const e = err as AxiosError<{ error?: string }>;
  if (e?.response) {
    if (e.response.status === 429) return "Too many attempts. Please wait a few minutes.";
    return e.response.data?.error || `Request failed (${e.response.status})`;
  }
  if (e?.code === "ECONNABORTED") return "The server took too long to respond.";
  if (e?.request) return "Can't reach the server. Check your connection.";
  return "Something went wrong.";
}
