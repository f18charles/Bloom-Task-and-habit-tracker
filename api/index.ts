import express from "express";
import rateLimit from "express-rate-limit";
import { setupBackend } from "../src/server/index.ts";

const app = express();

// Trust proxy for rate limiting on Vercel
app.set("trust proxy", 1);

// Standard JSON parsers
app.use(express.json());

// Load auth rate limiter from configuration
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => {
    const email = req.body?.email?.toLowerCase?.()?.trim();
    return email || req.ip || "unknown";
  },
  message: { error: "Too many login attempts for this account. Please try again in 15 minutes." },
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req) => !!req.headers.authorization,
  validate: false,
});

app.use("/api/auth/login", authLimiter);

// Setup backend endpoint routes
setupBackend(app);

// Export Express app as standard serverless handler for Vercel
export default app;
