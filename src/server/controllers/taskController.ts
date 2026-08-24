import { Response } from "express";
import { prisma } from "../lib/prisma.ts";
import { AuthRequest } from "../middleware/auth.ts";
import { syncTaskToGoogle } from "../services/calendarSyncService.ts";
import { Task, SubtaskLevel2, SubtaskLevel3 } from "../../types/task.ts";
import { randomUUID } from "crypto";

function parseTasks(userTasks: any): Task[] {
  if (!userTasks) return [];
  if (Array.isArray(userTasks)) return userTasks as Task[];
  if (typeof userTasks === "string") {
    try {
      return JSON.parse(userTasks);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Strictly sanitizes and enforces a maximum of 3 levels:
 * Level 1: Root Task
 * Level 2: Subtask
 * Level 3: Leaf Sub-subtask (cannot have children)
 */
function sanitizeSubtasks(subtasks: any[] = []): SubtaskLevel2[] {
  if (!Array.isArray(subtasks)) return [];
  return subtasks
    .filter((st2) => st2 && typeof st2 === "object" && typeof st2.title === "string")
    .map((st2) => {
      const level2Id = st2.id || randomUUID();
      const level2Title = st2.title.trim();
      const level2Completed = Boolean(st2.isCompleted);
      const level2CreatedAt = st2.createdAt || new Date().toISOString();

      const level3Items: SubtaskLevel3[] = Array.isArray(st2.subtasks)
        ? st2.subtasks
            .filter((st3: any) => st3 && typeof st3 === "object" && typeof st3.title === "string")
            .map((st3: any) => ({
              id: st3.id || randomUUID(),
              title: st3.title.trim(),
              isCompleted: Boolean(st3.isCompleted),
              createdAt: st3.createdAt || new Date().toISOString()
              // Strict rule: Level 3 items cannot have children
            }))
        : [];

      return {
        id: level2Id,
        title: level2Title,
        isCompleted: level2Completed,
        createdAt: level2CreatedAt,
        subtasks: level3Items
      };
    });
}

export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { tasks: true }
    });
    const tasks = parseTasks(user?.tasks);
    res.json({ data: tasks });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
};

export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      title, 
      description, 
      status, 
      priority, 
      dueDate, 
      reminderAt,
      isRecurring,
      recurrenceRule,
      points, 
      syncToGoogle, 
      subtasks 
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Task title is required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { tasks: true }
    });
    const tasks = parseTasks(user?.tasks);

    const taskId = randomUUID();
    const newTask: Task = {
      id: taskId,
      title: title.trim(),
      description: description ? description.trim() : "",
      status: status || "TODO",
      priority: priority || "MEDIUM",
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      reminderAt: reminderAt ? new Date(reminderAt).toISOString() : undefined,
      isRecurring: Boolean(isRecurring),
      recurrenceRule: recurrenceRule || undefined,
      points: points || 10,
      createdAt: new Date().toISOString(),
      completedAt: status === "DONE" ? new Date().toISOString() : null,
      subtasks: sanitizeSubtasks(subtasks)
    };

    if (syncToGoogle && newTask.dueDate) {
      try {
        const googleEventId = await syncTaskToGoogle(req.user!.id, newTask);
        if (googleEventId) newTask.googleEventId = googleEventId;
      } catch (err) {
        console.warn("Failed to sync new task to Google Calendar:", err);
      }
    }

    const updatedTasks = [newTask, ...tasks];

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { tasks: updatedTasks as any }
    });

    res.json({ data: newTask });
  } catch (error) {
    res.status(500).json({ error: "Failed to create task" });
  }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      status, 
      priority, 
      dueDate, 
      reminderAt,
      isRecurring,
      recurrenceRule,
      points, 
      syncToGoogle, 
      subtasks 
    } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { tasks: true, points: true }
    });

    const tasks = parseTasks(user?.tasks);
    const taskIndex = tasks.findIndex((t) => t.id === id);

    if (taskIndex === -1) {
      return res.status(404).json({ error: "Task not found" });
    }

    const existingTask = tasks[taskIndex];
    const wasDone = existingTask.status === "DONE";
    const nextStatus = status !== undefined ? status : existingTask.status;
    const isDone = nextStatus === "DONE";
    const completedAt = !wasDone && isDone 
      ? new Date().toISOString() 
      : (wasDone && !isDone ? null : existingTask.completedAt);

    const updatedTask: Task = {
      ...existingTask,
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(priority !== undefined ? { priority } : {}),
      ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate).toISOString() : undefined } : {}),
      ...(reminderAt !== undefined ? { reminderAt: reminderAt ? new Date(reminderAt).toISOString() : undefined } : {}),
      ...(isRecurring !== undefined ? { isRecurring: Boolean(isRecurring) } : {}),
      ...(recurrenceRule !== undefined ? { recurrenceRule: recurrenceRule || undefined } : {}),
      ...(points !== undefined ? { points } : {}),
      completedAt,
      ...(subtasks !== undefined ? { subtasks: sanitizeSubtasks(subtasks) } : {})
    };

    if (syncToGoogle && updatedTask.dueDate) {
      try {
        const googleEventId = await syncTaskToGoogle(req.user!.id, updatedTask);
        if (googleEventId) updatedTask.googleEventId = googleEventId;
      } catch (err) {
        console.warn("Failed to sync task update to Google Calendar:", err);
      }
    }

    tasks[taskIndex] = updatedTask;

    let pointsDelta = 0;
    if (!wasDone && isDone) {
      pointsDelta = updatedTask.points || 10;
    } else if (wasDone && !isDone) {
      pointsDelta = -(existingTask.points || 10);
    }

    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        tasks: tasks as any,
        ...(pointsDelta !== 0 ? { points: { increment: pointsDelta } } : {})
      }
    });

    res.json({ data: updatedTask });
  } catch (error) {
    res.status(500).json({ error: "Failed to update task" });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { tasks: true }
    });

    const tasks = parseTasks(user?.tasks);
    const existingIndex = tasks.findIndex((t) => t.id === id);

    if (existingIndex === -1) {
      return res.status(404).json({ error: "Task not found" });
    }

    const filteredTasks = tasks.filter((t) => t.id !== id);

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { tasks: filteredTasks as any }
    });

    res.json({ data: { success: true } });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete task" });
  }
};
