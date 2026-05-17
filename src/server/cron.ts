import cron from "node-cron";
import { prisma } from "./lib/prisma.ts";
import { syncFromGoogle } from "./services/calendarSyncService.ts";

export function setupCronJobs() {
  // Run daily at midnight
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
}
