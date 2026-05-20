import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../lib/prisma.ts";
import { AuthRequest } from "../middleware/auth.ts";

const JWT_SECRET = process.env.JWT_SECRET || "bloom-secret-key-123";

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, displayName, points: 0 }
    });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ data: { user: { id: user.id, email: user.email, displayName: user.displayName, points: user.points }, token } });
  } catch (error) {
    res.status(500).json({ error: "Failed to register" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ data: { user: { id: user.id, email: user.email, displayName: user.displayName, points: user.points }, token } });
  } catch (error) {
    res.status(500).json({ error: "Failed to login" });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user?.id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ data: { id: user.id, email: user.email, displayName: user.displayName, points: user.points } });
  } catch (error) {
    res.status(500).json({ error: "Failed to get user" });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    
    // Always return success even if user not found to prevent email enumeration
    if (!user) {
      console.log(`[FORGOT PASSWORD] Requested for un-registered email: ${email}`);
      return res.json({ message: "If that email is registered, we've sent a link to reset your password." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    // Delete any previous unused password resets for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id }
    });

    await prisma.passwordResetToken.create({
      data: {
        token: resetToken,
        expiresAt,
        userId: user.id
      }
    });

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

    console.log(`\n==================================================`);
    console.log(`[MOCK MAIL] Send reset to ${email}: ${resetUrl}`);
    console.log(`==================================================\n`);

    return res.json({ message: "If that email is registered, we've sent a link to reset your password." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Failed to process forgot password" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: "Token and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const resetTokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token }
    });

    if (!resetTokenRecord || resetTokenRecord.used || new Date() > new Date(resetTokenRecord.expiresAt)) {
      return res.status(400).json({ error: "Invalid or expired password reset token" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetTokenRecord.userId },
        data: { passwordHash }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetTokenRecord.id },
        data: { used: true }
      })
    ]);

    return res.json({ message: "Your password has been reset successfully. You can now log in." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
};
