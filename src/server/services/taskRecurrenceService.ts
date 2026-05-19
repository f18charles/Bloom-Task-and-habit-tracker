import { prisma } from "../lib/prisma.ts";
import { addDays, addWeeks, addMonths } from "date-fns";

export async function processRecurringTasks() {
  const recurringTasks = await prisma.task.findMany({
    where: {
      isRecurring: true,
      status: "DONE"
    },
    include: {
      subtasks: true
    }
  });

  for (const task of recurringTasks) {
    // Check if we already created the next one today or if it's needed
    // Simple logic: if a recurring task is DONE, we spawn the next one and mark the current one as non-recurring (historic record)
    // or we just spawn the next one if it doesn't exist yet with same future due date.
    
    let nextDueDate: Date | null = null;
    if (task.dueDate && task.recurrenceRule) {
      if (task.recurrenceRule === "DAILY") nextDueDate = addDays(task.dueDate, 1);
      else if (task.recurrenceRule === "WEEKLY") nextDueDate = addWeeks(task.dueDate, 1);
      else if (task.recurrenceRule === "MONTHLY") nextDueDate = addMonths(task.dueDate, 1);
    }

    if (nextDueDate) {
      // Check if next task already created
      const alreadyCreated = await prisma.task.findFirst({
        where: {
          userId: task.userId,
          title: task.title,
          dueDate: nextDueDate,
          isRecurring: true
        }
      });

      if (!alreadyCreated) {
        await prisma.task.create({
          data: {
            userId: task.userId,
            title: task.title,
            description: task.description,
            status: "TODO",
            priority: task.priority,
            dueDate: nextDueDate,
            points: task.points,
            isRecurring: true,
            recurrenceRule: task.recurrenceRule,
            subtasks: {
              create: task.subtasks ? [] : undefined // Simplified: we don't clone subtasks for now to avoid complexity
            }
          }
        });

        // Mark the old one as no longer recurring so we don't process it again
        await prisma.task.update({
          where: { id: task.id },
          data: { isRecurring: false }
        });
      }
    }
  }
}
