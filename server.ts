// This is the main server entry point that integrates Vite with Express.
import express from "express";
import path from "path";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";

import { setupBackend } from "./src/server/index.ts";
import { setupCronJobs } from "./src/server/cron.ts";

if (!process.env.JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET environment variable is not set.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust the first proxy (required for rate limiting work correctly behind a reverse proxy)
  app.set("trust proxy", 1);

  // Middleware for JSON bodies
  app.use(express.json());

  // Rate Limiting
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    // Key by email so one account's lockout doesn't affect others.
    // Fall back to IP only if email is missing (malformed request).
    keyGenerator: (req) => {
      const email = req.body?.email?.toLowerCase?.()?.trim();
      return email || req.ip || "unknown";
    },
    message: { error: "Too many login attempts for this account. Please try again in 15 minutes." },
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: (req) => !!req.headers.authorization,
    validate: false,
  });

  app.use("/api/auth/login", authLimiter);

  // Setup Backend API routes
  setupBackend(app);
  
  // Setup Background Jobs
  setupCronJobs();

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Bloom server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
