import { Response } from "express";
import { prisma } from "../lib/prisma.ts";
import { AuthRequest } from "../middleware/auth.ts";
import { startOfDay, endOfDay, subDays } from "date-fns";

export const getHabits = async (req: AuthRequest, res: Response) => {
  try {
    const habits = await prisma.habit.findMany({
      where: { userId: req.user?.id },
      include: {
        logs: {
          where: {
            completedAt: {
              gte: subDays(new Date(), 30) // Last 30 days of logs for streaks
            }
          }
        }
      }
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
        points: points || 5
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

    // Check if already logged today
    const todayLog = await prisma.habitLog.findFirst({
      where: {
        habitId: id,
        completedAt: {
          gte: startOfDay(new Date()),
          lte: endOfDay(new Date())
        }
      }
    });

    if (todayLog) {
      return res.status(400).json({ error: "Already logged today" });
    }

    const log = await prisma.habitLog.create({
      data: { habitId: id }
    });

    // Update user points
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { points: { increment: habit.points } }
    });

    res.json({ data: log });
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
  // Logic for streaks could go here
  res.json({ data: { streak: 5 } }); // Mock for now
};
