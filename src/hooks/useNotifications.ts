import { useEffect } from "react";

export const useNotifications = () => {
  useEffect(() => {
    try {
      if ("Notification" in window && typeof Notification.requestPermission === "function") {
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
          Promise.resolve(Notification.requestPermission()).catch(() => {});
        }
      }
    } catch {
      // Ignore notification permission errors in iframe
    }
  }, []);

  const sendNotification = (title: string, options?: NotificationOptions) => {
    try {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
          icon: "/vite.svg",
          ...options
        });
      }
    } catch {
      // Ignore notification creation errors
    }
  };

  return { sendNotification };
};

