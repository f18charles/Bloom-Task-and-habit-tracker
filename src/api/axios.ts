import axios from "axios";
import { useToastStore } from "../store/useToastStore.ts";

const api = axios.create({
  baseURL: "/api"
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("bloom-token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // Network failure
      console.error("Network error:", error);
      useToastStore.getState().addToast("Connection lost — check your internet connection", "error");
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    if (status === 401) {
      localStorage.removeItem("bloom-token");
      if (window.location.pathname !== "/auth") {
        window.location.href = "/auth";
        useToastStore.getState().addToast("Session expired. Please log in again.", "warning");
      }
    } else if (status === 429) {
      useToastStore.getState().addToast("Too many requests — please slow down and try again", "warning");
    } else if (status >= 500) {
      console.error("Server error:", error);
      useToastStore.getState().addToast("Something went wrong on our end — please try again shortly", "error");
    } else if (status >= 400) {
      const errorMessage = data?.error || data?.message || "An unexpected error occurred";
      useToastStore.getState().addToast(errorMessage, "error");
    }

    return Promise.reject(error);
  }
);

export default api;
