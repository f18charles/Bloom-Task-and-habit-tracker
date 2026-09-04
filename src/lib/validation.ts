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

export const subtaskLevel3Schema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Subtask title is required."),
  isCompleted: z.boolean().default(false),
  createdAt: z.string().optional(),
});

export const subtaskLevel2Schema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Subtask title is required."),
  isCompleted: z.boolean().default(false),
  createdAt: z.string().optional(),
  subtasks: z.array(subtaskLevel3Schema).optional().default([]),
});

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.string().optional().nullable(),
  reminderAt: z.string().optional().nullable(),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).optional().nullable(),
  syncToGoogle: z.boolean().optional(),
  subtasks: z.array(subtaskLevel2Schema).optional().default([]),
});
