import { prisma } from "../lib/prisma.ts";
import { addDays, addWeeks, addMonths } from "date-fns";
import { Task } from "../../types/task.ts";
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

export async function processRecurringTasks() {
  const users = await prisma.user.findMany({
    select: { id: true, tasks: true }
  });

  for (const user of users) {
    const tasks = parseTasks(user.tasks);
    let hasChanges = false;
    const newTasksToAppend: Task[] = [];

    for (const task of tasks) {
      if (task.isRecurring && task.status === "DONE" && task.dueDate && task.recurrenceRule) {
        let nextDueDate: Date | null = null;
        const taskDueDate = new Date(task.dueDate);
        if (task.recurrenceRule === "DAILY") nextDueDate = addDays(taskDueDate, 1);
        else if (task.recurrenceRule === "WEEKLY") nextDueDate = addWeeks(taskDueDate, 1);
        else if (task.recurrenceRule === "MONTHLY") nextDueDate = addMonths(taskDueDate, 1);

        if (nextDueDate) {
          const nextDueDateIso = nextDueDate.toISOString();
          const alreadyCreated = tasks.some(
            t => t.title === task.title && t.dueDate === nextDueDateIso && t.isRecurring
          );

          if (!alreadyCreated) {
            newTasksToAppend.push({
              id: randomUUID(),
              title: task.title,
              description: task.description,
              status: "TODO",
              priority: task.priority,
              dueDate: nextDueDateIso,
              points: task.points || 10,
              isRecurring: true,
              recurrenceRule: task.recurrenceRule,
              createdAt: new Date().toISOString(),
              completedAt: null,
              subtasks: []
            });

            task.isRecurring = false;
            hasChanges = true;
          }
        }
      }
    }

    if (hasChanges || newTasksToAppend.length > 0) {
      const updatedTasks = [...newTasksToAppend, ...tasks];
      await prisma.user.update({
        where: { id: user.id },
        data: { tasks: updatedTasks as any }
      });
    }
  }
}
