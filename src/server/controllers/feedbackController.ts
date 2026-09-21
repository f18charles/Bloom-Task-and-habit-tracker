import { Response } from "express";
import { prisma } from "../lib/prisma.ts";
import { AuthRequest } from "../middleware/auth.ts";

export const submitFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { category, rating, message, title, pageUrl, extraData } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Feedback message is required." });
    }

    // Build the jsonb payload
    const feedbackData = {
      category: category || "GENERAL",
      rating: typeof rating === "number" && rating >= 1 && rating <= 5 ? Math.round(rating) : null,
      title: typeof title === "string" ? title.trim() : null,
      message: message.trim(),
      pageUrl: typeof pageUrl === "string" ? pageUrl : "/settings",
      device: {
        userAgent: req.headers["user-agent"] || "unknown",
        platform: req.headers["sec-ch-ua-platform"] || "unknown",
      },
      userEmail: req.user?.email || null,
      submittedAt: new Date().toISOString(),
      ...(extraData && typeof extraData === "object" ? extraData : {}),
    };

    const saved = await prisma.feedback.create({
      data: {
        userId: userId || null,
        feedback: feedbackData,
      },
    });

    return res.status(201).json({
      message: "Feedback submitted successfully.",
      data: saved,
    });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return res.status(500).json({ error: "Failed to submit feedback." });
  }
};

export const getUserFeedbacks = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const feedbacks = await prisma.feedback.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return res.json({ data: feedbacks });
  } catch (error) {
    console.error("Error fetching feedbacks:", error);
    return res.status(500).json({ error: "Failed to fetch feedbacks." });
  }
};
