import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Replace with your backend server URL (e.g. https://your-app.run.app or http://10.0.2.2:3000 for Android Emulator)
export const API_BASE_URL = "https://ais-dev-6nd3enspzs6jqsf7eermaz-351970123508.europe-west2.run.app";

export const mobileApi = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

mobileApi.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("bloom_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
