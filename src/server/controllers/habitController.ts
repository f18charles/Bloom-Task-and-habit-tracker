import { Response } from "express";
import { prisma } from "../lib/prisma.ts";
import { AuthRequest } from "../middleware/auth.ts";
import { format } from "date-fns";

interface HabitLogEntry {
  id: string;
  completedAt: string;
}

function parseLogs(logs: any): HabitLogEntry[] {
  if (!logs) return [];
  if (Array.isArray(logs)) return logs as HabitLogEntry[];
  if (typeof logs === "string") {
    try {
      return JSON.parse(logs);
    } catch {
      return [];
    }
  }
  return [];
}

export const getHabits = async (req: AuthRequest, res: Response) => {
  try {
    const habits = await prisma.habit.findMany({
      where: { userId: req.user?.id },
      orderBy: { createdAt: "desc" }
    });
    res.json({ data: habits });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch habits" });
  }
};

export const createHabit = async (req: AuthRequest, res: Response) => {
  try {
    const { title, frequency, reminderTime, points } = req.body;
    const habit = await prisma.habit.create({
      data: {
        userId: req.user!.id,
        title,
        frequency: frequency || "DAILY",
        reminderTime,
        points: points || 5,
        logs: []
      }
    });
    res.json({ data: habit });
  } catch (error) {
    res.status(500).json({ error: "Failed to create habit" });
  }
};

export const logHabit = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const habit = await prisma.habit.findUnique({ where: { id } });
    if (!habit || habit.userId !== req.user?.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const currentLogs = parseLogs(habit.logs);
    const today = format(new Date(), "yyyy-MM-dd");

    // Check if already logged today
    const alreadyLoggedToday = currentLogs.some(
      l => format(new Date(l.completedAt), "yyyy-MM-dd") === today
    );

    if (alreadyLoggedToday) {
      return res.status(400).json({ error: "Already logged today" });
    }

    const newLog: HabitLogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      completedAt: new Date().toISOString()
    };

    const updatedLogs = [...currentLogs, newLog];

    // Save updated logs to the Habit jsonb column
    await prisma.habit.update({
      where: { id },
      data: { logs: updatedLogs as any }
    });

    // Update user points
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { points: { increment: habit.points } }
    });

    res.json({ data: newLog });
  } catch (error) {
    res.status(500).json({ error: "Failed to log habit" });
  }
};

export const deleteHabit = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const habit = await prisma.habit.findUnique({ where: { id } });
    if (!habit || habit.userId !== req.user?.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await prisma.habit.delete({ where: { id } });
    res.json({ data: { success: true } });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete habit" });
  }
};

export const getHabitStats = async (req: AuthRequest, res: Response) => {
  res.json({ data: { streak: 5 } });
};
