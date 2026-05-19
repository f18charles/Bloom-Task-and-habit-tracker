// This is the main server entry point that integrates Vite with Express.
import express from "express";
import path from "path";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";

import { setupBackend } from "./src/server/index.ts";
import { setupCronJobs } from "./src/server/cron.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust the first proxy (required for rate limiting work correctly behind a reverse proxy)
  app.set("trust proxy", 1);

  // Middleware for JSON bodies
  app.use(express.json());

  // Rate Limiting
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window`
    message: { error: "Too many requests from this IP, please try again later." },
    standardHeaders: 'draft-7', // Use standard headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    limit: 10, // Strict limit for auth
    message: { error: "Too many login attempts, please try again in 15 minutes." },
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });

  app.use("/api/auth", authLimiter);
  app.use("/api", generalLimiter);

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
