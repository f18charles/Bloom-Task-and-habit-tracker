import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
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
