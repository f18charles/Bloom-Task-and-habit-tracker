import cron from "node-cron";
import { prisma } from "./lib/prisma.ts";
import { syncFromGoogle } from "./services/calendarSyncService.ts";
import { processRecurringTasks } from "./services/taskRecurrenceService.ts";
import { sendDailyDigest } from "./services/emailService.ts";

export function setupCronJobs() {
  // Run daily at midnight: Google Sync
  cron.schedule("0 0 * * *", async () => {
    console.log("Running daily Google Calendar sync...");
    const usersWithTokens = await prisma.googleToken.findMany({
      select: { userId: true }
    });

    for (const token of usersWithTokens) {
      try {
        await syncFromGoogle(token.userId);
      } catch (error) {
        console.error(`Failed to sync for user ${token.userId}:`, error);
      }
    }
  });

  // Run every hour: Task Recurrence
  cron.schedule("0 * * * *", async () => {
    console.log("Processing recurring tasks...");
    try {
      await processRecurringTasks();
    } catch (error) {
      console.error("Failed to process recurring tasks:", error);
    }
  });

  // Run daily at 8 AM: Email Digest
  cron.schedule("0 8 * * *", async () => {
    console.log("Sending daily digests...");
    const users = await prisma.user.findMany({
      include: {
        tasks: { where: { status: { not: "DONE" } } },
        habits: true
      }
    });

    for (const user of users) {
      try {
        const habitsToComplete = user.habits; // Simplification
        await sendDailyDigest(user, user.tasks, habitsToComplete);
      } catch (error) {
        console.error(`Failed to send digest for user ${user.id}:`, error);
      }
    }
  });
}
