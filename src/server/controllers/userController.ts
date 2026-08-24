import { Response } from "express";
import { prisma } from "../lib/prisma.ts";
import { AuthRequest } from "../middleware/auth.ts";
import { subDays, startOfDay } from "date-fns";
import { Parser } from "json2csv";
import { Task } from "../../types/task.ts";

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

export const getStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: { habits: true }
        }
      }
    });

    const tasks = parseTasks(user?.tasks);
    const completedTasksCount = tasks.filter(t => t.status === "DONE").length;

    // Recent activity (last 5 tasks sorted by createdAt desc)
    const recentTasks = [...tasks]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    // Points history for the last 7 days
    const pointsHistory = [];
    const taskHistory = [];
    const habitHistory = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const start = startOfDay(date);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);

      // Filter tasks done in this day range
      const tasksDoneInDay = tasks.filter(t => {
        if (t.status !== "DONE" || !t.completedAt) return false;
        const compDate = new Date(t.completedAt);
        return compDate >= start && compDate <= end;
      });
      const taskPointsSum = tasksDoneInDay.reduce((sum, t) => sum + (t.points || 10), 0);
      const tasksCount = tasksDoneInDay.length;

      const habitPoints = await prisma.habitLog.findMany({
        where: {
          habit: { userId },
          completedAt: { gte: start, lte: end }
        },
        include: { habit: true }
      });

      const totalHabitPoints = habitPoints.reduce((sum, log) => sum + (log.habit.points || 0), 0);
      const totalPoints = taskPointsSum + totalHabitPoints;
      const habitsCount = habitPoints.length;

      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

      pointsHistory.push({
        name: dayName,
        points: totalPoints
      });

      taskHistory.push({
        day: dayName,
        count: tasksCount
      });

      habitHistory.push({
        day: dayName,
        count: habitsCount
      });
    }

    res.json({
      data: {
        points: user?.points || 0,
        tasksCompleted: completedTasksCount,
        habitsActive: user?._count.habits || 0,
        recentActivity: recentTasks,
        pointsHistory,
        taskHistory,
        habitHistory
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};

export const exportUserData = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tasks: true }
    });
    const tasks = parseTasks(user?.tasks);
    const habits = await prisma.habit.findMany({ where: { userId } });
    
    const combinedData: Array<{
      type: string;
      id: string;
      title: string;
      status: string;
      priority: string;
      createdAt: string | Date;
    }> = [
      ...tasks.map(t => ({
        type: "TASK",
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt
      })),
      ...habits.map(h => ({
        type: "HABIT",
        id: h.id,
        title: h.title,
        status: "N/A",
        priority: "N/A",
        createdAt: h.createdAt
      }))
    ];

    if (combinedData.length === 0) {
      return res.status(404).json({ error: "No data to export" });
    }

    const fields = ['type', 'id', 'title', 'status', 'priority', 'createdAt'];
    const parser = new Parser({ fields });
    const csv = parser.parse(combinedData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=bloom_export.csv');
    res.status(200).send(csv);
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ error: "Failed to export data" });
  }
};
