import { Response } from "express";
import { prisma } from "../lib/prisma.ts";
import { AuthRequest } from "../middleware/auth.ts";
import { subDays, startOfDay } from "date-fns";

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

    // Points over time (simplified)
    const pointsHistory = [
      { name: 'Mon', points: 20 },
      { name: 'Tue', points: 45 },
      { name: 'Wed', points: 30 },
      { name: 'Thu', points: 60 },
      { name: 'Fri', points: 80 },
      { name: 'Sat', points: 50 },
      { name: 'Sun', points: 90 },
    ];

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
