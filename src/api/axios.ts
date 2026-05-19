import axios from "axios";

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
      // You could trigger a toast here if you had a toast provider
      return Promise.reject(error);
    }

    const { status } = error.response;

    if (status === 401) {
      localStorage.removeItem("bloom-token");
      if (window.location.pathname !== "/auth") {
        window.location.href = "/auth";
      }
    } else if (status === 429) {
      alert(error.response.data.error || "Too many requests. Please slow down.");
    } else if (status >= 500) {
      console.error("Server error:", error);
    }

    return Promise.reject(error);
  }
);

export default api;
