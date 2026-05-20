import { Response } from "express";
import { prisma } from "../lib/prisma.ts";
import { AuthRequest } from "../middleware/auth.ts";
import { syncEventToGoogle, getAuthenticatedClient } from "../services/calendarSyncService.ts";
import { google } from "googleapis";

export const getEvents = async (req: AuthRequest, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      where: { userId: req.user?.id },
      orderBy: { startTime: "asc" }
    });
    res.json({ data: events });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
};

export const createEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, startTime, endTime, allDay, syncToGoogle } = req.body;
    const event = await prisma.event.create({
      data: {
        userId: req.user!.id,
        title,
        description,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        allDay: !!allDay,
      }
    });

    if (syncToGoogle) {
      await syncEventToGoogle(req.user!.id, event);
    }

    res.json({ data: event });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: "Failed to create event" });
  }
};

export const updateEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, startTime, endTime, allDay, syncToGoogle } = req.body;

    const existingEvent = await prisma.event.findUnique({
      where: { id }
    });

    if (!existingEvent || existingEvent.userId !== req.user?.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        title,
        description,
        startTime: startTime ? new Date(startTime) : existingEvent.startTime,
        endTime: endTime ? new Date(endTime) : null,
        allDay: allDay !== undefined ? !!allDay : existingEvent.allDay,
      }
    });

    if (syncToGoogle || updatedEvent.googleEventId) {
      await syncEventToGoogle(req.user!.id, updatedEvent);
    }

    res.json({ data: updatedEvent });
  } catch (error) {
    res.status(500).json({ error: "Failed to update event" });
  }
};

export const deleteEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingEvent = await prisma.event.findUnique({
      where: { id }
    });

    if (!existingEvent || existingEvent.userId !== req.user?.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (existingEvent.googleEventId) {
      try {
        const auth = await getAuthenticatedClient(req.user!.id);
        if (auth) {
          const calendar = google.calendar({ version: "v3", auth });
          await calendar.events.delete({
            calendarId: "primary",
            eventId: existingEvent.googleEventId,
          });
        }
      } catch (gError) {
        console.error("Error deleting event from Google Calendar:", gError);
      }
    }

    await prisma.event.delete({
      where: { id }
    });

    res.json({ data: { success: true } });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete event" });
  }
};
