import { Response } from "express";
import { prisma } from "../lib/prisma.ts";
import { AuthRequest } from "../middleware/auth.ts";
import { syncTaskToGoogle } from "../services/calendarSyncService.ts";

export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.user?.id },
      include: { subtasks: true },
      orderBy: { createdAt: "desc" }
    });
    res.json({ data: tasks });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
};

export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, status, priority, dueDate, points, syncToGoogle, subtasks } = req.body;
    const task = await prisma.task.create({
      data: {
        userId: req.user!.id,
        title,
        description,
        status: status || "TODO",
        priority: priority || "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null,
        points: points || 10,
        subtasks: subtasks ? {
          create: subtasks.map((s: any) => ({
            title: s.title,
            isCompleted: s.isCompleted || false
          }))
        } : undefined
      },
      include: { subtasks: true }
    });

    if (syncToGoogle && task.dueDate) {
      await syncTaskToGoogle(req.user!.id, task);
    }

    res.json({ data: task });
  } catch (error) {
    res.status(500).json({ error: "Failed to create task" });
  }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, dueDate, points, syncToGoogle, subtasks } = req.body;

    const existingTask = await prisma.task.findUnique({ 
      where: { id },
      include: { subtasks: true }
    });
    if (!existingTask || existingTask.userId !== req.user?.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const wasDone = existingTask.status === "DONE";
    const isDone = status === "DONE";
    const completedAt = !wasDone && isDone ? new Date() : (wasDone && !isDone ? null : existingTask.completedAt);

    // Subtask sync: simple clear and recreate for consistency if IDs not provided
    // Better: Upsert if ID exists, else create. But for MVP let's do simple.
    const task = await prisma.task.update({
      where: { id },
      data: {
        title,
        description,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        points,
        completedAt,
        subtasks: subtasks ? {
          deleteMany: {},
          create: subtasks.map((s: any) => ({
            title: s.title,
            isCompleted: s.isCompleted || false
          }))
        } : undefined
      },
      include: { subtasks: true }
    });

    if (syncToGoogle && task.dueDate) {
      await syncTaskToGoogle(req.user!.id, task);
    }

    // Award points if task marked as done
    if (!wasDone && isDone) {
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { points: { increment: task.points } }
      });
      // Check for user badges could go here
    } else if (wasDone && !isDone) {
      // Revert points if changed back from DONE
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { points: { decrement: task.points } }
      });
    }

    res.json({ data: task });
  } catch (error) {
    res.status(500).json({ error: "Failed to update task" });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existingTask = await prisma.task.findUnique({ where: { id } });
    if (!existingTask || existingTask.userId !== req.user?.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await prisma.task.delete({ where: { id } });
    res.json({ data: { success: true } });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete task" });
  }
};
