import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters long."),
});

export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters long."),
  displayName: z.string().min(2, "Name must be at least 2 characters long."),
});

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  dueDate: z.string().optional(),
  points: z.number().int().positive().default(10),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).optional(),
});
