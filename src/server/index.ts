import { Express } from "express";
import authRoutes from "./routes/auth.ts";
import taskRoutes from "./routes/tasks.ts";
import habitRoutes from "./routes/habits.ts";
import userRoutes from "./routes/users.ts";
import calendarRoutes from "./routes/calendar.ts";
import { errorHandler } from "./middleware/errorHandler.ts";

export function setupBackend(app: Express) {
  app.use("/api/auth", authRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/habits", habitRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/calendar", calendarRoutes);

  app.use(errorHandler);
}
