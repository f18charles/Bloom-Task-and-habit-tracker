import { google } from "googleapis";
import { prisma } from "../lib/prisma.ts";
import { Task, Event } from "@prisma/client";

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

export async function syncEventToGoogle(userId: string, appEvent: Event) {
  const auth = await getAuthenticatedClient(userId);
  if (!auth || !appEvent.startTime) return;

  const calendar = google.calendar({ version: "v3", auth });

  let startVal: any = {};
  let endVal: any = {};

  if (appEvent.allDay) {
    startVal = { date: appEvent.startTime.toISOString().split('T')[0] };
    endVal = { 
      date: appEvent.endTime 
        ? appEvent.endTime.toISOString().split('T')[0] 
        : appEvent.startTime.toISOString().split('T')[0] 
    };
  } else {
    startVal = { dateTime: appEvent.startTime.toISOString() };
    endVal = { 
      dateTime: appEvent.endTime 
        ? appEvent.endTime.toISOString() 
        : new Date(appEvent.startTime.getTime() + 60 * 60 * 1000).toISOString() 
    };
  }

  const googleEvent = {
    summary: appEvent.title,
    description: appEvent.description || "",
    start: startVal,
    end: endVal,
  };

  try {
    if (appEvent.googleEventId) {
      await calendar.events.update({
        calendarId: "primary",
        eventId: appEvent.googleEventId,
        requestBody: googleEvent,
      });
    } else {
      const res = await calendar.events.insert({
        calendarId: "primary",
        requestBody: googleEvent,
      });
      await prisma.event.update({
        where: { id: appEvent.id },
        data: { googleEventId: res.data.id },
      });
    }
  } catch (error) {
    console.error("Error syncing event to Google Calendar:", error);
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

    const googleEvents = res.data.items || [];
    for (const gEvent of googleEvents) {
      // Check if event already exists in our DB
      const existingEvent = await prisma.event.findFirst({
        where: { googleEventId: gEvent.id! },
      });

      if (!existingEvent && gEvent.summary) {
        await prisma.event.create({
          data: {
            userId,
            title: gEvent.summary,
            description: gEvent.description,
            startTime: gEvent.start?.dateTime ? new Date(gEvent.start.dateTime) : (gEvent.start?.date ? new Date(gEvent.start.date) : new Date()),
            endTime: gEvent.end?.dateTime ? new Date(gEvent.end.dateTime) : (gEvent.end?.date ? new Date(gEvent.end.date) : null),
            allDay: !!gEvent.start?.date,
            googleEventId: gEvent.id,
            isFromGoogle: true,
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
