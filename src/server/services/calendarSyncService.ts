import { google } from "googleapis";
import { prisma } from "../lib/prisma.ts";
import { Task } from "@prisma/client";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "PASTE_YOUR_CLIENT_ID_HERE";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "PASTE_YOUR_CLIENT_SECRET_HERE";
const RAW_APP_URL = process.env.APP_URL || "";
const APP_URL = RAW_APP_URL.endsWith('/') ? RAW_APP_URL.slice(0, -1) : RAW_APP_URL;

const REDIRECT_URI = APP_URL ? `${APP_URL}/api/calendar/callback` : "http://localhost:3000/api/calendar/callback";

export const createOAuthClient = () => {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
};

export async function getAuthenticatedClient(userId: string) {
  const oauth2Client = createOAuthClient();
  const tokenRecord = await prisma.googleToken.findUnique({ where: { userId } });

  if (!tokenRecord) return null;

  oauth2Client.setCredentials({
    access_token: tokenRecord.accessToken,
    refresh_token: tokenRecord.refreshToken,
    expiry_date: tokenRecord.expiresAt.getTime(),
  });

  // Check if token is expired
  if (tokenRecord.expiresAt.getTime() < Date.now()) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await prisma.googleToken.update({
        where: { userId },
        data: {
          accessToken: credentials.access_token!,
          expiresAt: new Date(credentials.expiry_date!),
        },
      });
    } catch (error) {
      console.error("Error refreshing Google token:", error);
      return null;
    }
  }

  return oauth2Client;
}

export async function syncTaskToGoogle(userId: string, task: Task) {
  const auth = await getAuthenticatedClient(userId);
  if (!auth || !task.dueDate) return;

  const calendar = google.calendar({ version: "v3", auth });

  const event = {
    summary: task.title,
    description: task.description || "",
    start: {
      dateTime: task.dueDate.toISOString(),
    },
    end: {
      dateTime: new Date(task.dueDate.getTime() + 60 * 60 * 1000).toISOString(),
    },
  };

  try {
    if (task.googleEventId) {
      await calendar.events.update({
        calendarId: "primary",
        eventId: task.googleEventId,
        requestBody: event,
      });
    } else {
      const res = await calendar.events.insert({
        calendarId: "primary",
        requestBody: event,
      });
      await prisma.task.update({
        where: { id: task.id },
        data: { googleEventId: res.data.id },
      });
    }
  } catch (error) {
    console.error("Error syncing task to Google Calendar:", error);
  }
}

export async function syncFromGoogle(userId: string) {
  const auth = await getAuthenticatedClient(userId);
  if (!auth) return;

  const calendar = google.calendar({ version: "v3", auth });
  
  // Fetch events since last 24 hours or so
  const timeMin = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = res.data.items || [];
    for (const event of events) {
      // Check if event already exists in our DB
      const existingTask = await prisma.task.findFirst({
        where: { googleEventId: event.id! },
      });

      if (!existingTask && event.summary) {
        await prisma.task.create({
          data: {
            userId,
            title: event.summary,
            description: event.description,
            dueDate: event.start?.dateTime ? new Date(event.start.dateTime) : (event.start?.date ? new Date(event.start.date) : null),
            googleEventId: event.id,
          },
        });
      }
    }
    await prisma.googleToken.update({
      where: { userId },
      data: { lastSyncedAt: new Date() }
    });
  } catch (error) {
    console.error("Error syncing from Google Calendar:", error);
  }
}
