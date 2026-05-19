import { Response } from "express";
import { prisma } from "../lib/prisma.ts";
import { AuthRequest } from "../middleware/auth.ts";
import { subDays, startOfDay } from "date-fns";
import { Parser } from "json2csv";

export const getStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: { tasks: true, habits: true, badges: true }
        }
      }
    });

    const completedTasksCount = await prisma.task.count({
      where: { userId, status: "DONE" }
    });

    // Recent activity (last 5)
    const recentTasks = await prisma.task.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5
    });

    // Points history for the last 7 days
    const pointsHistory = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const start = startOfDay(date);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);

      const taskPoints = await prisma.task.aggregate({
        where: {
          userId,
          completedAt: { gte: start, lte: end }
        },
        _sum: { points: true }
      });

      const habitPoints = await prisma.habitLog.findMany({
        where: {
          habit: { userId },
          completedAt: { gte: start, lte: end }
        },
        include: { habit: true }
      });

      const totalHabitPoints = habitPoints.reduce((sum, log) => sum + (log.habit.points || 0), 0);
      const totalPoints = (taskPoints._sum.points || 0) + totalHabitPoints;

      pointsHistory.push({
        name: date.toLocaleDateString('en-US', { weekday: 'short' }),
        points: totalPoints
      });
    }

    res.json({
      data: {
        points: user?.points || 0,
        tasksCompleted: completedTasksCount,
        habitsActive: user?._count.habits || 0,
        badgesEarned: user?._count.badges || 0,
        recentActivity: recentTasks,
        pointsHistory
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};

export const exportUserData = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const tasks = await prisma.task.findMany({ where: { userId } });
    const habits = await prisma.habit.findMany({ where: { userId } });
    
    const combinedData = tasks.map(t => ({
      type: "TASK",
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      createdAt: t.createdAt
    })).concat(habits.map(h => ({
      type: "HABIT",
      id: h.id,
      title: h.title,
      status: "N/A",
      priority: "N/A",
      createdAt: h.createdAt
    })));

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
